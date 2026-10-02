import type { ContactMessage } from '@prisma/client';

/** Libellés français des besoins, pour l'équipe EWES. */
const SECTOR_LABELS: Record<string, string> = {
  ENVIRONNEMENT: 'Étude d’impact / audit',
  EAU: 'Eau',
  ANALYSES: 'Analyses',
  GESTION: 'Effluents & déchets',
  INGENIERIE: 'Ingénierie',
  FORMATION: 'Formation',
  AUTRE: 'Autre',
};

export const sectorLabel = (sector: string | null) =>
  (sector && SECTOR_LABELS[sector]) || 'Non précisé';

/**
 * E-mail interne : l'équipe répond directement à l'expéditeur (Reply-To).
 * Texte brut : le contenu saisi n'est jamais interprété.
 */
export function teamNotification(message: ContactMessage) {
  const sector = sectorLabel(message.sector);
  return {
    subject: `[Site EWES] Nouveau message de ${message.name} — ${sector}`,
    text: [
      'Nouveau message reçu via le formulaire de contact du site.',
      '',
      `Nom : ${message.name}`,
      `Organisation : ${message.organization ?? '—'}`,
      `E-mail : ${message.email}`,
      `Téléphone : ${message.phone ?? '—'}`,
      `Besoin : ${sector}`,
      `Langue : ${message.locale}`,
      '',
      'Message :',
      message.message,
      '',
      `Référence : ${message.id}`,
      'Répondre à cet e-mail écrit directement à l’expéditeur. Le message reste consultable et son suivi se gère dans le portail d’administration.',
    ].join('\n'),
  };
}

/**
 * Accusé de réception à l'expéditeur, dans sa langue. Ne reprend aucun
 * contenu saisi hormis le nom : il ne peut pas servir à relayer du texte
 * arbitraire vers un tiers.
 */
export function acknowledgement(message: ContactMessage) {
  if (message.locale === 'en') {
    return {
      subject: 'We have received your message — EWES',
      text: [
        `Hello ${message.name},`,
        '',
        'Thank you for contacting EWES S.A.R.L. We have received your message and our team will get back to you as soon as possible.',
        '',
        `Reference: ${message.id}`,
        '',
        'This is an automatic acknowledgement: please do not reply to this address. If you did not send this request, you can ignore this e-mail.',
        '',
        'EWES S.A.R.L. — Environment, Water and Engineering Services, Lubumbashi (DR Congo)',
      ].join('\n'),
    };
  }
  return {
    subject: 'Nous avons bien reçu votre message — EWES',
    text: [
      `Bonjour ${message.name},`,
      '',
      'Merci d’avoir contacté EWES S.A.R.L. Votre message nous est bien parvenu et notre équipe vous répondra dans les meilleurs délais.',
      '',
      `Référence : ${message.id}`,
      '',
      'Ceci est un accusé de réception automatique : merci de ne pas répondre à cette adresse. Si vous n’êtes pas à l’origine de cette demande, vous pouvez ignorer ce message.',
      '',
      'EWES S.A.R.L. — Environnement, Eau et Services d’Ingénierie, Lubumbashi (RD Congo)',
    ].join('\n'),
  };
}
