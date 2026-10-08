import { timingSafeEqual } from 'node:crypto';
import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

/**
 * Revalidation à la demande déclenchée par l'API NestJS à la publication /
 * dépublication d'un contenu (blueprint/16_Rendering_State_Strategy.md §2).
 * Protégée par un secret partagé ; seuls les tags `page:<slug>`, `service:<slug>`, `realisation:<slug>`,
 * `article:<slug>`, `document:<slug>`, `services`, `key-figures`, `site-settings`, `experts`, `realisations`, `articles` et
 * `documents` sont acceptés.
 *
 * `{ "all": true }` invalide toutes les pages d'un coup. Utilisé par le déploiement
 * (ops/deploy/deploy.sh) : l'image du site est construite sans accès à l'API, donc ses
 * pages sont pré-rendues avec les textes de repli et sans les tags ci-dessus ; seule une
 * invalidation par chemin les fait relire l'API à la première visite.
 */
const TAG_PATTERN =
  /^(?:(?:page|service|realisation|article|document):[a-z0-9]+(?:-[a-z0-9]+)*|services|key-figures|site-settings|experts|realisations|articles|documents)$/;

function secretMatches(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const expected = process.env.REVALIDATE_SECRET;
  if (!expected) {
    return NextResponse.json({ code: 'NOT_CONFIGURED' }, { status: 503 });
  }
  if (!secretMatches(request.headers.get('x-revalidate-secret'), expected)) {
    return NextResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    tag?: unknown;
    all?: unknown;
  } | null;
  if (body?.all === true) {
    revalidatePath('/', 'layout');
    return NextResponse.json({ revalidated: true, all: true });
  }
  if (typeof body?.tag !== 'string' || !TAG_PATTERN.test(body.tag)) {
    return NextResponse.json({ code: 'BAD_REQUEST' }, { status: 400 });
  }

  // expire: 0 — jamais de version périmée servie : une dépublication doit
  // retirer le contenu immédiatement (blueprint/09_Business_Rules.md).
  revalidateTag(body.tag, { expire: 0 });
  return NextResponse.json({ revalidated: true, tag: body.tag });
}
