import { Role } from '@prisma/client';
import { ROLE_INFO } from './role-info.js';

const dateFormat = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: 'Africa/Lubumbashi',
});

/**
 * E-mail d'invitation. Texte brut ; seul le lien porte un secret (jeton à
 * usage unique, conservé haché en base). Ne reprend rien de saisi hormis le
 * nom de la personne invitée et celui de l'administrateur qui invite.
 */
export function invitationEmail(input: {
  fullName: string;
  role: Role;
  inviterName: string | null;
  url: string;
  expiresAt: Date;
}) {
  const role = ROLE_INFO[input.role];
  const inviter = input.inviterName
    ? `${input.inviterName} vous invite`
    : 'Vous êtes invité(e)';
  return {
    subject: 'Invitation au portail d’administration EWES',
    text: [
      `Bonjour ${input.fullName},`,
      '',
      `${inviter} à rejoindre le portail d’administration d’EWES S.A.R.L. avec le rôle « ${role.label} ».`,
      role.scope,
      '',
      'Pour activer votre compte et choisir votre mot de passe, ouvrez ce lien :',
      input.url,
      '',
      `Ce lien est personnel et à usage unique ; il expire le ${dateFormat.format(input.expiresAt)}.`,
      '',
      'Si vous n’attendiez pas cette invitation, ignorez cet e-mail : aucun compte ne sera créé.',
    ].join('\n'),
  };
}
