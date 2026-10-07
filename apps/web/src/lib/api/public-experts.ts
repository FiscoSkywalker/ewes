import type { Expert } from '@/data/experts';
import { poleOfSlug } from '@/lib/poles';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

/** Durée de repli : la revalidation à la demande reste le mécanisme principal. */
const EXPERTS_REVALIDATE_SECONDS = 86_400;

export const EXPERTS_TAG = 'experts';

interface PublicExpert {
  fullName: string;
  roleFr: string;
  roleEn: string | null;
  bioFr: string | null;
  bioEn: string | null;
  specialtiesFr: string[];
  specialtiesEn: string[];
  yearsOfExperience: number | null;
  photoUrl: string | null;
  photoFocalX: number | null;
  photoFocalY: number | null;
  poleSlug: string | null;
}

/**
 * Lecture serveur des experts publiés, dans une seule langue (repli
 * explicite sur le français). Renvoie `null` si l'API est injoignable ou
 * répond une erreur : l'appelant retombe sur ses profils provisoires. Une
 * liste **vide** est une réponse valable (aucun profil publié) : elle ne
 * déclenche pas le repli, pour que des personnes fictives ne s'affichent
 * jamais à la place d'une équipe volontairement non publiée.
 */
export async function getExperts(locale: string): Promise<Expert[] | null> {
  try {
    const res = await fetch(`${API_URL}/experts`, {
      next: {
        revalidate: EXPERTS_REVALIDATE_SECONDS,
        // Le nom du pôle affiché sur la fiche suit aussi les services.
        tags: [EXPERTS_TAG, 'services'],
      },
    });
    if (!res.ok) return null;
    const { data } = (await res.json()) as { data: PublicExpert[] };
    const english = locale === 'en';
    return data.map((expert, index) => ({
      // Préfixe distinct des profils provisoires (`expert-1`…) pour ne jamais leur emprunter un portrait.
      id: `team-${index}`,
      name: expert.fullName,
      role: (english && expert.roleEn) || expert.roleFr,
      pole: expert.poleSlug ? poleOfSlug(expert.poleSlug) : null,
      specialties:
        english && expert.specialtiesEn.length > 0
          ? expert.specialtiesEn
          : expert.specialtiesFr,
      years: expert.yearsOfExperience,
      bio: ((english && expert.bioEn) || expert.bioFr || '').trim(),
      photo: expert.photoUrl ?? undefined,
      focal:
        expert.photoUrl &&
        expert.photoFocalX !== null &&
        expert.photoFocalY !== null
          ? { x: expert.photoFocalX, y: expert.photoFocalY }
          : undefined,
    }));
  } catch {
    return null;
  }
}
