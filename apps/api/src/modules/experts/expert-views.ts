import type { Expert, Service } from '@prisma/client';

export type ExpertWithService = Expert & {
  service: Pick<Service, 'id' | 'slug' | 'nameFr'> | null;
};

/** Vue du portail : le profil tel quel, avec le pôle de rattachement. */
export function toAdminView(expert: ExpertWithService) {
  return expert;
}

/**
 * Vue publique : ni identifiant, ni statut, ni dates internes. Le pôle n'est
 * donné que par son slug (le site en tire l'accent de couleur et le nom).
 */
export function toPublicView(expert: ExpertWithService) {
  return {
    fullName: expert.fullName,
    roleFr: expert.roleFr,
    roleEn: expert.roleEn,
    bioFr: expert.bioFr,
    bioEn: expert.bioEn,
    specialtiesFr: expert.specialtiesFr,
    specialtiesEn: expert.specialtiesEn,
    yearsOfExperience: expert.yearsOfExperience,
    photoUrl: expert.photoUrl,
    poleSlug: expert.service?.slug ?? null,
  };
}
