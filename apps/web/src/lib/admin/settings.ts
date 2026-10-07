import { z } from 'zod';
import type { SocialNetworkId } from '@/lib/site-settings';

/** `GET /admin/settings/general`. */
export interface GeneralSettings {
  phone: string;
  email: string;
  addressFr: string;
  addressEn: string | null;
  officeDays: number[];
  opensAt: string;
  closesAt: string;
  linkedinUrl: string | null;
  facebookUrl: string | null;
  xUrl: string | null;
  youtubeUrl: string | null;
  /** `null` : jamais enregistré, les valeurs d'origine du site s'appliquent. */
  updatedAt: string | null;
}

/** `GET /admin/settings/legal` : mentions légales et protection des données (pages légales du site). */
export interface LegalSettings {
  legalRepresentative: string | null;
  legalRccm: string | null;
  legalIdNat: string | null;
  legalNif: string | null;
  legalCapital: string | null;
  hostingName: string | null;
  hostingAddress: string | null;
  privacyEmail: string | null;
  apdReceipt: string | null;
  updatedAt: string | null;
}

/** Mentions que la loi attend d'un site d'entreprise et que le projet ne peut pas deviner. */
export function missingLegalNotices(settings: LegalSettings): string[] {
  const required: [string, string | null][] = [
    ['Registre du commerce (RCCM)', settings.legalRccm],
    ['Identification nationale', settings.legalIdNat],
    ['Numéro d’impôt (NIF)', settings.legalNif],
    ['Hébergeur du site', settings.hostingName],
  ];
  return required.filter(([, value]) => !value).map(([label]) => label);
}

/** État du transport d'e-mails, sans aucun secret (`MailTransportStatus` de l'API). */
export interface MailTransport {
  configured: boolean;
  host: string | null;
  port: number | null;
  security: 'tls' | 'starttls' | null;
  from: string | null;
  authenticated: boolean;
  missing: string[];
}

/** `GET /admin/settings/mail`. */
export interface MailOverview {
  contactRecipientEmail: string | null;
  contactAutoReply: boolean;
  /** Destinataire effectif et d'où il vient. */
  recipient: {
    address: string | null;
    source: 'settings' | 'environment' | 'none';
  };
  transport: MailTransport;
  summary: {
    sentLast30Days: number;
    failed: number;
    pending: number;
    lastSentAt: string | null;
    lastFailedAt: string | null;
  };
  updatedAt: string | null;
}

/** Résultat réel d'un e-mail de test (`POST /admin/settings/mail/test`). */
export interface MailTestResult {
  id: string;
  recipientEmail: string;
  status: 'sent' | 'failed' | 'pending';
  lastError: string | null;
}

// --- Réseaux sociaux -------------------------------------------------------

export interface SocialField {
  id: SocialNetworkId;
  /** Champ du formulaire et de l'API. */
  field: 'linkedinUrl' | 'facebookUrl' | 'xUrl' | 'youtubeUrl';
  label: string;
  placeholder: string;
  hosts: readonly string[];
}

export const SOCIAL_FIELDS: readonly SocialField[] = [
  {
    id: 'linkedin',
    field: 'linkedinUrl',
    label: 'LinkedIn',
    placeholder: 'https://www.linkedin.com/company/ewes',
    hosts: ['linkedin.com'],
  },
  {
    id: 'facebook',
    field: 'facebookUrl',
    label: 'Facebook',
    placeholder: 'https://www.facebook.com/ewes',
    hosts: ['facebook.com', 'fb.com'],
  },
  {
    id: 'x',
    field: 'xUrl',
    label: 'X',
    placeholder: 'https://x.com/ewes',
    hosts: ['x.com', 'twitter.com'],
  },
  {
    id: 'youtube',
    field: 'youtubeUrl',
    label: 'YouTube',
    placeholder: 'https://www.youtube.com/@ewes',
    hosts: ['youtube.com', 'youtu.be'],
  },
];

/** Même contrôle que l'API (qui reste seule juge) : message sous le champ, ou `null` si valide. */
export function socialUrlError(
  network: Pick<SocialField, 'label' | 'hosts'>,
  value: string,
): string | null {
  if (!value.trim()) return null;
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return `Saisissez l’adresse complète de la page ${network.label}, par exemple https://www.${network.hosts[0]}/…`;
  }
  if (url.protocol !== 'https:') return 'L’adresse doit commencer par https://';
  if (url.username || url.password) {
    return 'Retirez les identifiants de l’adresse.';
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  const known = network.hosts.some(
    (allowed) => host === allowed || host.endsWith(`.${allowed}`),
  );
  return known ? null : `Cette adresse ne mène pas à ${network.label}.`;
}

// --- Formulaire « Général » ------------------------------------------------

const HOUR = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

/** Mêmes limites que le DTO NestJS : l'API revérifie tout, ses refus s'affichent sous les champs. */
export const generalSchema = z
  .object({
    phone: z
      .string()
      .trim()
      .regex(
        /^\+?(?:\d[ ().-]?){6,14}\d$/,
        'Saisissez un numéro valide, par exemple +243 81 81 53 110.',
      ),
    email: z
      .string()
      .trim()
      .min(1, 'L’adresse e-mail est obligatoire.')
      .pipe(z.email('Saisissez une adresse e-mail valide.')),
    addressFr: z
      .string()
      .trim()
      .min(1, 'L’adresse est obligatoire.')
      .max(300, '300 caractères au plus.'),
    addressEn: z.string().trim().max(300, '300 caractères au plus.'),
    officeDays: z
      .array(z.number().int().min(0).max(6))
      .min(1, 'Choisissez au moins un jour d’ouverture.'),
    opensAt: z.string().regex(HOUR, 'Saisissez une heure, par exemple 08:00.'),
    closesAt: z.string().regex(HOUR, 'Saisissez une heure, par exemple 17:00.'),
    linkedinUrl: z.string().trim().max(200, '200 caractères au plus.'),
    facebookUrl: z.string().trim().max(200, '200 caractères au plus.'),
    xUrl: z.string().trim().max(200, '200 caractères au plus.'),
    youtubeUrl: z.string().trim().max(200, '200 caractères au plus.'),
  })
  .superRefine((values, ctx) => {
    if (
      HOUR.test(values.opensAt) &&
      HOUR.test(values.closesAt) &&
      values.closesAt <= values.opensAt
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['closesAt'],
        message: 'La fermeture doit être après l’ouverture.',
      });
    }
    for (const network of SOCIAL_FIELDS) {
      const message = socialUrlError(network, values[network.field]);
      if (message) {
        ctx.addIssue({ code: 'custom', path: [network.field], message });
      }
    }
  });

export type GeneralFormValues = z.infer<typeof generalSchema>;

export function toGeneralFormValues(
  settings: GeneralSettings,
): GeneralFormValues {
  return {
    phone: settings.phone,
    email: settings.email,
    addressFr: settings.addressFr,
    addressEn: settings.addressEn ?? '',
    officeDays: [...settings.officeDays].sort((a, b) => a - b),
    opensAt: settings.opensAt,
    closesAt: settings.closesAt,
    linkedinUrl: settings.linkedinUrl ?? '',
    facebookUrl: settings.facebookUrl ?? '',
    xUrl: settings.xUrl ?? '',
    youtubeUrl: settings.youtubeUrl ?? '',
  };
}

const orNull = (value: string) => (value === '' ? null : value);

/** Corps JSON : un champ facultatif vidé part en `null` (l'API l'efface). */
export function toGeneralPayload(values: GeneralFormValues) {
  return {
    ...values,
    addressEn: orNull(values.addressEn),
    linkedinUrl: orNull(values.linkedinUrl),
    facebookUrl: orNull(values.facebookUrl),
    xUrl: orNull(values.xUrl),
    youtubeUrl: orNull(values.youtubeUrl),
  };
}

// --- Formulaire « Informations légales » ----------------------------------

const optionalText = (max: number) =>
  z.string().trim().max(max, `${max} caractères au plus.`);

export const legalSchema = z.object({
  legalRepresentative: optionalText(120),
  legalRccm: optionalText(80),
  legalIdNat: optionalText(80),
  legalNif: optionalText(80),
  legalCapital: optionalText(80),
  hostingName: optionalText(160),
  hostingAddress: optionalText(300),
  privacyEmail: z
    .string()
    .trim()
    .max(254, '254 caractères au plus.')
    .refine(
      (value) => value === '' || z.email().safeParse(value).success,
      'Saisissez une adresse e-mail valide.',
    ),
  apdReceipt: optionalText(120),
});

export type LegalFormValues = z.infer<typeof legalSchema>;

export function toLegalFormValues(settings: LegalSettings): LegalFormValues {
  return {
    legalRepresentative: settings.legalRepresentative ?? '',
    legalRccm: settings.legalRccm ?? '',
    legalIdNat: settings.legalIdNat ?? '',
    legalNif: settings.legalNif ?? '',
    legalCapital: settings.legalCapital ?? '',
    hostingName: settings.hostingName ?? '',
    hostingAddress: settings.hostingAddress ?? '',
    privacyEmail: settings.privacyEmail ?? '',
    apdReceipt: settings.apdReceipt ?? '',
  };
}

/** Corps JSON : une mention vidée part en `null` (l'API l'efface, le site ne l'affiche plus). */
export function toLegalPayload(values: LegalFormValues) {
  return {
    legalRepresentative: orNull(values.legalRepresentative),
    legalRccm: orNull(values.legalRccm),
    legalIdNat: orNull(values.legalIdNat),
    legalNif: orNull(values.legalNif),
    legalCapital: orNull(values.legalCapital),
    hostingName: orNull(values.hostingName),
    hostingAddress: orNull(values.hostingAddress),
    privacyEmail: orNull(values.privacyEmail),
    apdReceipt: orNull(values.apdReceipt),
  };
}

// --- Formulaire « Messagerie » ---------------------------------------------

export const mailSchema = z.object({
  contactRecipientEmail: z
    .string()
    .trim()
    .max(254, '254 caractères au plus.')
    .refine(
      (value) => value === '' || z.email().safeParse(value).success,
      'Saisissez une adresse e-mail valide.',
    ),
  contactAutoReply: z.boolean(),
});

export type MailFormValues = z.infer<typeof mailSchema>;

export function toMailFormValues(overview: MailOverview): MailFormValues {
  return {
    contactRecipientEmail: overview.contactRecipientEmail ?? '',
    contactAutoReply: overview.contactAutoReply,
  };
}

export function toMailPayload(values: MailFormValues) {
  return {
    contactRecipientEmail: orNull(values.contactRecipientEmail),
    contactAutoReply: values.contactAutoReply,
  };
}

/** Libellé du chiffrement de la connexion au serveur d'e-mails. */
export const SECURITY_LABELS: Record<
  NonNullable<MailTransport['security']>,
  string
> = {
  tls: 'TLS (connexion chiffrée dès le départ)',
  starttls: 'STARTTLS (chiffrement négocié avec le serveur)',
};
