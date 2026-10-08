import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  ArticleType,
  ContentStatus,
  DatePrecision,
  DocumentCategory,
  PrismaClient,
  Role,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';

/**
 * Crée le premier compte ADMINISTRATEUR de dev/recette. La désignation des
 * Gestionnaires/Utilisateurs initiaux définitifs reste en attente côté
 * client (blueprint/21_Backlog_and_Session_Handoff.md §5) — ce script est un
 * point d'entrée manuel en attendant l'écran de gestion des utilisateurs
 * (Phase 04, backlog "Gestion des utilisateurs / rôles / droits").
 * Idempotent : ne fait rien si l'e-mail existe déjà.
 */
/** Reprend le titre/l'introduction statiques de /a-propos (messages `AboutPage`). */
async function seedAboutPage(prisma: PrismaClient) {
  const existing = await prisma.page.findUnique({
    where: { slug: 'a-propos' },
  });
  if (existing) {
    console.log('Page a-propos déjà présente — rien à faire.');
    return;
  }
  await prisma.page.create({
    data: {
      slug: 'a-propos',
      titleFr: 'Née de l’université, tournée vers le terrain.',
      titleEn: 'Born at university, focused on the field.',
      contentFr:
        'EWES SARL est issue du Pôle de l’Environnement de l’Interface Université de Lubumbashi–Société (IUS). Dotée d’une équipe multidisciplinaire d’experts congolais et étrangers, elle intervient en environnement, en eau et en travaux d’ingénierie, en collaboration avec des partenaires belges, français et canadiens.',
      contentEn:
        'EWES SARL grew out of the Environment Centre of the University of Lubumbashi–Society Interface (IUS). With a multidisciplinary team of Congolese and international experts, it works in environment, water and engineering works, in collaboration with Belgian, French and Canadian partners.',
      status: ContentStatus.PUBLISHED,
      publishedAt: new Date(),
    },
  });
  console.log('Page a-propos créée (publiée).');
}

async function seedAdmin(
  prisma: PrismaClient,
  email: string,
  password: string,
) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Utilisateur ${email} déjà présent — rien à faire.`);
    return;
  }

  await prisma.user.create({
    data: {
      email,
      passwordHash: await argon2.hash(password, { type: argon2.argon2id }),
      fullName: 'Administrateur EWES',
      role: Role.ADMINISTRATEUR,
    },
  });

  console.log(`Utilisateur administrateur créé : ${email}`);
}

interface PoleMessages {
  title: string;
  description: string;
  services?: { title: string; text?: string; desc?: string }[];
  items?: { title: string; text?: string; desc?: string }[];
}

/** Pôles du site public : clé de messages -> slug, espace de noms, liste de prestations. */
const SERVICE_POLES = [
  { slug: 'environnement', pole: 'env', namespace: 'Environment' },
  { slug: 'eau', pole: 'eau', namespace: 'Water' },
  { slug: 'ingenierie', pole: 'ing', namespace: 'Engineering' },
] as const;

function readMessages(locale: 'fr' | 'en') {
  // Import initial : les textes de /services vivent aujourd'hui dans apps/web/messages.
  return JSON.parse(
    readFileSync(
      new URL(`../../web/messages/${locale}.json`, import.meta.url),
      'utf-8',
    ),
  ) as Record<string, any>;
}

/** Importe les trois pôles et leurs prestations (publiés). Idempotent par slug. */
async function seedServices(prisma: PrismaClient) {
  const fr = readMessages('fr');
  const en = readMessages('en');

  for (const [index, { slug, pole, namespace }] of SERVICE_POLES.entries()) {
    if (await prisma.service.findUnique({ where: { slug } })) {
      console.log(`Service ${slug} déjà présent — rien à faire.`);
      continue;
    }
    const frPole = fr[namespace] as PoleMessages;
    const enPole = en[namespace] as PoleMessages;
    const frList = frPole.services ?? frPole.items ?? [];
    const enList = enPole.services ?? enPole.items ?? [];

    await prisma.service.create({
      data: {
        slug,
        nameFr: fr.ServicesOverview.poles[pole],
        nameEn: en.ServicesOverview.poles[pole],
        taglineFr: frPole.title,
        taglineEn: enPole.title,
        descriptionFr: frPole.description,
        descriptionEn: enPole.description,
        sortOrder: index,
        status: ContentStatus.PUBLISHED,
        publishedAt: new Date(),
        offerings: {
          create: frList.map((item, position) => ({
            titleFr: item.title,
            titleEn: enList[position]?.title,
            descriptionFr: item.text ?? item.desc ?? '',
            descriptionEn: enList[position]?.text ?? enList[position]?.desc,
            sortOrder: position,
          })),
        },
      },
    });
    console.log(`Service ${slug} créé (${frList.length} prestations).`);
  }
}

interface ExpertMessage {
  name: string;
  role: string;
  pole: 'env' | 'eau' | 'ing';
  years: number;
  specialties: string[];
  bio: string;
}

/**
 * Importe les six profils **provisoires** de /a-propos (`AboutPage.team.experts`,
 * personnes fictives) **en brouillon** : un profil est une personne, rien ne
 * devient public sans publication explicite depuis le portail, où l'équipe les
 * remplace par les vrais experts. Idempotent : ne fait rien si la table n'est pas vide.
 */
async function seedExperts(prisma: PrismaClient) {
  if ((await prisma.expert.count()) > 0) {
    console.log('Experts déjà présents — rien à faire.');
    return;
  }
  const fr = readMessages('fr').AboutPage.team.experts as ExpertMessage[];
  const en = readMessages('en').AboutPage.team.experts as ExpertMessage[];
  const slugOf = {
    env: 'environnement',
    eau: 'eau',
    ing: 'ingenierie',
  } as const;
  const services = await prisma.service.findMany({
    select: { id: true, slug: true },
  });

  for (const [index, expert] of fr.entries()) {
    const english = en[index];
    await prisma.expert.create({
      data: {
        fullName: expert.name,
        roleFr: expert.role,
        roleEn: english?.role,
        bioFr: expert.bio,
        bioEn: english?.bio,
        specialtiesFr: expert.specialties,
        specialtiesEn: english?.specialties ?? [],
        yearsOfExperience: expert.years,
        serviceId: services.find((s) => s.slug === slugOf[expert.pole])?.id,
        sortOrder: index,
        status: ContentStatus.DRAFT,
      },
    });
  }
  console.log(`${fr.length} experts provisoires importés (brouillons).`);
}

interface ProjectMessage {
  id: string;
  category: string;
  year: number;
  yearEnd: number | null;
  client: string;
  mission: string;
}

/**
 * Importe les 34 références du profil EWES (`Projects.items`), publiées.
 * Idempotent par slug. Les clients sont cités publiquement dans le profil :
 * `isClientPublic` est donc vrai. Pas de localisation ni d'image source.
 */
async function seedRealisations(prisma: PrismaClient) {
  const fr = readMessages('fr').Projects.items as ProjectMessage[];
  const en = readMessages('en').Projects.items as ProjectMessage[];
  const enById = new Map(en.map((item) => [item.id, item]));

  let created = 0;
  for (const item of fr) {
    if (await prisma.realisation.findUnique({ where: { slug: item.id } })) {
      continue;
    }
    const english = enById.get(item.id);
    await prisma.realisation.create({
      data: {
        slug: item.id,
        titleFr: item.mission,
        titleEn: english?.mission,
        clientName: item.client,
        isClientPublic: true,
        year: item.year,
        yearEnd: item.yearEnd,
        projectType: item.category,
        status: ContentStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });
    created += 1;
  }
  console.log(
    created > 0
      ? `Réalisations : ${created} créées (${fr.length - created} déjà présentes).`
      : 'Réalisations déjà présentes — rien à faire.',
  );
}

interface NewsMessage {
  id: string;
  category: 'survey' | 'training' | 'event' | 'publication';
  date: string;
  context: string;
  title: string;
  excerpt: string;
  imageAlt: string;
  body?: string[];
}

const NEWS_TYPES: Record<NewsMessage['category'], ArticleType> = {
  survey: ArticleType.ENQUETE,
  training: ArticleType.FORMATION,
  event: ArticleType.EVENEMENT,
  publication: ArticleType.PUBLICATION,
};

/** Visuels actuels du site (apps/web/public), en attendant le module `media`. */
const NEWS_IMAGES: Record<string, string> = {
  'barometre-rse-2025': '/assets/images/ewes-news-rse-survey.jpg',
  'metalkol-carbone-2024': '/assets/images/ewes-laboratory-cinematic.png',
  'inspecteurs-2023': '/assets/images/ewes-environment-field.png',
};

/** « 2025 », « 2025-03 » ou « 2025-03-12 » -> date + précision d'affichage. */
function parseNewsDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return {
    publishedAt: new Date(Date.UTC(year, (month || 1) - 1, day || 1)),
    datePrecision: day
      ? DatePrecision.DAY
      : month
        ? DatePrecision.MONTH
        : DatePrecision.YEAR,
  };
}

/** Importe les actualités du site (`News.items`), publiées. Idempotent par slug. */
async function seedArticles(prisma: PrismaClient) {
  const fr = readMessages('fr').News.items as NewsMessage[];
  const en = readMessages('en').News.items as NewsMessage[];
  const enById = new Map(en.map((item) => [item.id, item]));

  let created = 0;
  for (const item of fr) {
    if (await prisma.article.findUnique({ where: { slug: item.id } })) continue;
    const english = enById.get(item.id);
    const image = NEWS_IMAGES[item.id];
    await prisma.article.create({
      data: {
        slug: item.id,
        type: NEWS_TYPES[item.category],
        titleFr: item.title,
        titleEn: english?.title,
        excerptFr: item.excerpt,
        excerptEn: english?.excerpt,
        contextFr: item.context,
        contextEn: english?.context,
        contentFr: item.body?.join('\n\n') ?? '',
        contentEn: english?.body?.join('\n\n'),
        status: ContentStatus.PUBLISHED,
        ...parseNewsDate(item.date),
        images: image
          ? {
              create: [
                { url: image, altFr: item.imageAlt, altEn: english?.imageAlt },
              ],
            }
          : undefined,
      },
    });
    created += 1;
  }
  console.log(
    created > 0
      ? `Actualités : ${created} créées (${fr.length - created} déjà présentes).`
      : 'Actualités déjà présentes — rien à faire.',
  );
}

interface DocumentMessage {
  id: string;
  category: 'report' | 'guide' | 'datasheet' | 'brochure';
  pole: 'env' | 'eau' | 'ing';
  year: string;
  title: string;
  excerpt: string;
}

const DOCUMENT_CATEGORIES: Record<
  DocumentMessage['category'],
  DocumentCategory
> = {
  report: DocumentCategory.REPORT,
  guide: DocumentCategory.GUIDE,
  datasheet: DocumentCategory.DATASHEET,
  brochure: DocumentCategory.BROCHURE,
};

const POLE_SERVICE_SLUGS = {
  env: 'environnement',
  eau: 'eau',
  ing: 'ingenierie',
} as const;

/** PDF valide d'une page (police standard Helvetica, texte WinAnsi). */
function buildPlaceholderPdf(lines: string[]): Buffer {
  const escape = (text: string) =>
    text.replace(/[\\()]/g, (char) => `\\${char}`);
  const text = lines
    .map((line, i) => `${i === 0 ? '' : 'T* '}(${escape(line)}) Tj`)
    .join('\n');
  const content = `BT /F1 16 Tf 56 760 Td 22 TL\n${text}\nET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  ];
  let body = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((object, i) => {
    offsets.push(Buffer.byteLength(body, 'latin1'));
    body += `${i + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefAt = Buffer.byteLength(body, 'latin1');
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    body += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`;
  return Buffer.from(body, 'latin1');
}

/**
 * Importe les 6 documents d'exemple du site (`HomeDocuments.items`), publiés,
 * chacun avec un PDF générique : ces titres sont des exemples fictifs, les
 * fichiers n'ont aucun contenu réel. À supprimer depuis le portail
 * d'administration une fois les vrais documents disponibles. Idempotent par slug.
 */
async function seedPublicDocuments(prisma: PrismaClient) {
  const fr = readMessages('fr').HomeDocuments.items as DocumentMessage[];
  const en = readMessages('en').HomeDocuments.items as DocumentMessage[];
  const enById = new Map(en.map((item) => [item.id, item]));
  const directory = resolve(
    process.env.PUBLIC_MEDIA_PATH ?? './storage/public',
    'documents',
  );
  mkdirSync(directory, { recursive: true });

  let created = 0;
  for (const item of fr) {
    if (await prisma.publicDocument.findUnique({ where: { slug: item.id } })) {
      continue;
    }
    const service = await prisma.service.findUnique({
      where: { slug: POLE_SERVICE_SLUGS[item.pole] },
    });
    const pdf = buildPlaceholderPdf([
      "EWES S.A.R.L. - Document d'exemple",
      '',
      // L'apostrophe typographique n'existe pas en latin1/WinAnsi.
      item.title.replace(/’/g, "'").slice(0, 80),
      '',
      'Fichier générique : ce document est un exemple,',
      'sans contenu réel. Il sera remplacé par la publication',
      "officielle depuis le portail d'administration.",
    ]);
    const storedName = `${randomUUID()}.pdf`;
    writeFileSync(resolve(directory, storedName), pdf, { flag: 'wx' });
    const english = enById.get(item.id);

    await prisma.publicDocument.create({
      data: {
        slug: item.id,
        titleFr: item.title,
        titleEn: english?.title,
        excerptFr: item.excerpt,
        excerptEn: english?.excerpt,
        category: DOCUMENT_CATEGORIES[item.category],
        year: Number(item.year),
        pages: 1,
        serviceId: service?.id,
        status: ContentStatus.PUBLISHED,
        publishedAt: new Date(Date.UTC(Number(item.year), 0, 1)),
        storedName,
        fileUrl: `/files/${storedName}`,
        fileType: 'application/pdf',
        fileSizeBytes: pdf.length,
      },
    });
    created += 1;
  }
  console.log(
    created > 0
      ? `Documents publics : ${created} créés (${fr.length - created} déjà présents).`
      : 'Documents publics déjà présents — rien à faire.',
  );
}

async function main() {
  const email = (
    process.env.SEED_ADMIN_EMAIL ?? 'admin@ewes.example'
  ).toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'change-me-now';
  // Un compte Administrateur au mot de passe d'exemple en production = porte ouverte.
  if (
    process.env.NODE_ENV === 'production' &&
    (password.length < 12 || /change-?me|example/i.test(password))
  ) {
    throw new Error(
      'SEED_ADMIN_PASSWORD doit être défini (12 caractères au moins, hors valeur d’exemple) pour amorcer la production.',
    );
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL as string,
    }),
  });

  try {
    await seedAdmin(prisma, email, password);
    await seedAboutPage(prisma);
    await seedServices(prisma);
    await seedExperts(prisma);
    await seedRealisations(prisma);
    await seedArticles(prisma);
    await seedPublicDocuments(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
