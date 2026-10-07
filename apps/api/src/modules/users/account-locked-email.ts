const dateFormat = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: 'Africa/Lubumbashi',
});

/**
 * E-mail d'alerte lors d'un verrouillage de compte (échecs de connexion
 * répétés) : c'est le seul moyen pour la vraie personne de savoir que quelqu'un
 * essaie son mot de passe. Texte brut, aucun secret, aucun lien, aucune adresse IP.
 */
export function accountLockedEmail(input: {
  fullName: string;
  failures: number;
  until: Date;
}) {
  return {
    subject: 'Votre compte EWES est temporairement verrouillé',
    text: [
      `Bonjour ${input.fullName},`,
      '',
      `${input.failures} tentatives de connexion avec un mot de passe incorrect ont été faites sur votre compte du portail d’administration d’EWES S.A.R.L.`,
      `Par précaution, la connexion est bloquée jusqu’au ${dateFormat.format(input.until)} ; elle se rouvrira d’elle-même.`,
      '',
      'Si c’est vous, patientez jusqu’à cette heure, ou demandez à un administrateur du portail de déverrouiller votre compte.',
      'Si ce n’est pas vous, quelqu’un cherche peut-être à deviner votre mot de passe : prévenez un administrateur du portail.',
    ].join('\n'),
  };
}
