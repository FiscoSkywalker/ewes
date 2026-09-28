import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
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
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
