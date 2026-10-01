'use client';

import { useId, useRef, useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle, Send } from 'lucide-react';
import {
  CONTACT_MESSAGE_MIN,
  sendContactRequest,
  validateContactRequest,
  type ContactField,
  type ContactRequest,
} from '@/lib/contact-request';

interface Sector {
  value: string;
  label: string;
  /** Libellé court affiché dans le choix du besoin. */
  short: string;
}

interface ContactFormProps {
  /** Notifie le besoin choisi (titre dynamique du bloc Contact de l'Accueil). */
  onSectorChange?: (sector: string) => void;
}

/**
 * Formulaire de contact (composant client isolé — blueprint/16 §4), partagé
 * par l'Accueil et /contact. Erreurs de validation affichées champ par champ
 * (blueprint/15 §3) et reliées aux champs (`aria-invalid`,
 * `aria-describedby`) ; le premier champ invalide reçoit le focus. Champ
 * piège invisible contre les robots. L'envoi passe par
 * `sendContactRequest` (`src/lib/contact-request.ts`), seul point à changer
 * lors du branchement sur l'API.
 *
 * Style « nuit » : le formulaire vit sur fond nuit, à l'Accueil comme sur
 * /contact.
 */
export function ContactForm({ onSectorChange }: ContactFormProps) {
  const t = useTranslations('ContactPage');
  const sectors = t.raw('sectors') as Sector[];
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);

  const [formData, setFormData] = useState<ContactRequest>({
    name: '',
    organization: '',
    email: '',
    phone: '',
    sector: sectors[0]?.value ?? '',
    message: '',
  });
  const [errors, setErrors] = useState<
    ReturnType<typeof validateContactRequest>
  >({});
  const [trap, setTrap] = useState('');

  const update = (field: ContactField, value: string) => {
    setFormData((data) => ({ ...data, [field]: value }));
    // L'erreur disparaît dès que l'utilisateur corrige le champ.
    if (errors[field])
      setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (trap) return; // Robot : on ignore silencieusement.

    const nextErrors = validateContactRequest(formData);
    setErrors(nextErrors);
    const firstInvalid = (Object.keys(nextErrors) as ContactField[]).find(
      (field) => nextErrors[field],
    );
    if (firstInvalid) {
      formRef.current
        ?.querySelector<HTMLElement>(`[name="${firstInvalid}"]`)
        ?.focus();
      return;
    }

    const sectorLabel =
      sectors.find((s) => s.value === formData.sector)?.label ??
      formData.sector;
    await sendContactRequest(
      { ...formData, sector: sectorLabel },
      {
        subject: `${t('quickContactTitle')} — ${formData.name}`,
        name: t('fields.name'),
        organization: t('fields.organization'),
        email: t('fields.email'),
        phone: t('fields.phone'),
        sector: t('fields.sector'),
        message: t('fields.message'),
      },
    );
  };

  const fieldClass = (field: ContactField) =>
    `w-full rounded-none border-0 border-b bg-transparent py-2.5 text-sm text-on-night placeholder:text-on-night-muted/45 focus:outline-none ${
      errors[field]
        ? 'border-copper-bright focus:border-copper-bright'
        : 'border-on-night/20 focus:border-malachite-bright'
    }`;
  const labelClass =
    'font-mono text-[10px] uppercase tracking-[0.12em] text-on-night-muted';

  /** Attributs d'accessibilité + message d'erreur d'un champ. */
  const fieldA11y = (field: ContactField) => ({
    name: field,
    'aria-invalid': errors[field] ? true : undefined,
    'aria-describedby': errors[field] ? `${id}-${field}-error` : undefined,
  });
  const fieldError = (field: ContactField) =>
    errors[field] && (
      <span
        id={`${id}-${field}-error`}
        className="flex items-center gap-1.5 text-xs text-copper-bright"
      >
        <AlertCircle size={12} aria-hidden="true" />
        {t(`errors.${errors[field]}`, { min: CONTACT_MESSAGE_MIN })}
      </span>
    );

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate
      className="relative grid content-start gap-6 border border-on-night/12 bg-night-deep/60 p-5 backdrop-blur-md sm:p-8 lg:p-10"
    >
      <fieldset>
        <legend className={`${labelClass} mb-3`}>{t('needLegend')}</legend>
        <div className="flex flex-wrap gap-2">
          {sectors.map((sector) => (
            <label key={sector.value} className="relative" title={sector.label}>
              <input
                type="radio"
                name="sector"
                value={sector.value}
                checked={formData.sector === sector.value}
                onChange={() => {
                  update('sector', sector.value);
                  onSectorChange?.(sector.value);
                }}
                className="peer absolute inset-0 cursor-pointer opacity-0"
              />
              <span className="inline-block border border-on-night/20 px-3.5 py-2 text-[13px] text-on-night transition-colors peer-checked:border-malachite-bright peer-checked:bg-malachite-bright peer-checked:text-night peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-water-bright">
                {sector.short}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-6 md:grid-cols-2">
        <label className="grid gap-1.5">
          <span className={labelClass}>
            {t('fields.name')} <span aria-hidden="true">*</span>
          </span>
          <input
            type="text"
            required
            autoComplete="name"
            value={formData.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder={t('fields.namePlaceholder')}
            className={fieldClass('name')}
            {...fieldA11y('name')}
          />
          {fieldError('name')}
        </label>
        <label className="grid gap-1.5">
          <span className={labelClass}>
            {t('fields.organization')} <span aria-hidden="true">*</span>
          </span>
          <input
            type="text"
            required
            autoComplete="organization"
            value={formData.organization}
            onChange={(e) => update('organization', e.target.value)}
            placeholder={t('fields.organizationPlaceholder')}
            className={fieldClass('organization')}
            {...fieldA11y('organization')}
          />
          {fieldError('organization')}
        </label>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <label className="grid gap-1.5">
          <span className={labelClass}>
            {t('fields.email')} <span aria-hidden="true">*</span>
          </span>
          <input
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            value={formData.email}
            onChange={(e) => update('email', e.target.value)}
            placeholder={t('fields.emailPlaceholder')}
            className={fieldClass('email')}
            {...fieldA11y('email')}
          />
          {fieldError('email')}
        </label>
        <label className="grid gap-1.5">
          <span className={labelClass}>{t('fields.phone')}</span>
          <input
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            value={formData.phone}
            onChange={(e) => update('phone', e.target.value)}
            placeholder={t('fields.phonePlaceholder')}
            className={fieldClass('phone')}
            name="phone"
          />
        </label>
      </div>

      <label className="grid gap-1.5">
        <span className={labelClass}>
          {t('fields.message')} <span aria-hidden="true">*</span>
        </span>
        <textarea
          rows={4}
          required
          minLength={CONTACT_MESSAGE_MIN}
          value={formData.message}
          onChange={(e) => update('message', e.target.value)}
          placeholder={t('fields.messagePlaceholder')}
          className={`${fieldClass('message')} resize-y`}
          {...fieldA11y('message')}
        />
        {fieldError('message')}
      </label>

      {/* Champ piège : invisible pour les humains, rempli par les robots. */}
      <div
        className="absolute left-[-9999px] h-px w-px overflow-hidden"
        aria-hidden="true"
      >
        <label>
          Website
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={trap}
            onChange={(e) => setTrap(e.target.value)}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-4 pt-2">
        <button type="submit" className="primary-button on-night">
          {t('submitLabel')}
          <Send size={14} />
        </button>
        <p className="max-w-sm text-[11px] leading-5 text-on-night-muted/80">
          {t('requiredNote')} {t('privacyNote')} {t('formNote')}
        </p>
      </div>
    </form>
  );
}
