const dateFormat = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: 'Africa/Lubumbashi',
});

/**
 * E-mail d'alerte après un changement de mot de passe : c'est le seul moyen
 * pour la vraie personne de s'apercevoir qu'une session volée l'a changé.
 * Texte brut, aucun secret, aucun lien.
 */
export function passwordChangedEmail(input: {
  fullName: string;
  changedAt: Date;
}) {
  return {
    subject: 'Votre mot de passe EWES a été modifié',
    text: [
      `Bonjour ${input.fullName},`,
      '',
      `Le mot de passe de votre compte du portail d’administration d’EWES S.A.R.L. a été modifié le ${dateFormat.format(input.changedAt)}.`,
      'Vos autres appareils ont été déconnectés.',
      '',
      'Si c’est vous, il n’y a rien à faire.',
      'Si ce n’est pas vous, prévenez immédiatement un administrateur du portail : votre compte est peut-être utilisé par quelqu’un d’autre.',
    ].join('\n'),
  };
}
