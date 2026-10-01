import 'dotenv/config';
import { ContentStatus, PrismaClient, Role } from '@prisma/client';
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
  const existing = await prisma.page.findUnique({ where: { slug: 'a-propos' } });
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

async function main() {
  const email = (
    process.env.SEED_ADMIN_EMAIL ?? 'admin@ewes.example'
  ).toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'change-me-now';

  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL as string,
    }),
  });

  try {
    await seedAdmin(prisma, email, password);
    await seedAboutPage(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
