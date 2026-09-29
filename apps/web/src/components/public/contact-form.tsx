'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Send } from 'lucide-react';
import { EWES_CONTACT } from '@/data/contact';

interface Sector {
  value: string;
  label: string;
  /** Libellé court affiché dans le choix du besoin. */
  short: string;
}

/**
 * Formulaire de contact (composant client isolé — blueprint/16_Rendering_State_Strategy.md
 * §4). Le module NestJS `contact` (blueprint/21 backlog, Phase 02) n'est pas
 * encore construit : plutôt que de simuler une confirmation d'envoi non
 * vérifiée (interdit par blueprint/19_AI_Coding_Rules.md §7), le formulaire
 * ouvre la messagerie de l'utilisateur avec le message pré-rempli. À
 * remplacer par un POST vers l'API une fois le module disponible.
 *
 * Style « nuit » : le formulaire vit dans le bloc Contact (`ContactBlock`),
 * sur fond nuit, à l'Accueil comme sur /contact.
 */
export function ContactForm() {
  const t = useTranslations('ContactPage');
  const sectors = t.raw('sectors') as Sector[];

  const [formData, setFormData] = useState({
    name: '',
    organization: '',
    email: '',
    phone: '',
    sector: sectors[0]?.value ?? '',
    message: '',
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const sectorLabel =
      sectors.find((s) => s.value === formData.sector)?.label ??
      formData.sector;
    const subject = `${t('quickContactTitle')} — ${formData.name}`;
    const body = [
      `${t('fields.name')}: ${formData.name}`,
      `${t('fields.organization')}: ${formData.organization}`,
      `${t('fields.email')}: ${formData.email}`,
      `${t('fields.phone')}: ${formData.phone}`,
      `${t('fields.sector')}: ${sectorLabel}`,
      '',
      formData.message,
    ].join('\n');

    // Navigation side effect inside a submit handler, not during render —
    // the react-hooks/immutability rule flags any assignment to `window.location`
    // regardless of context, so it's disabled for this one intentional line.
    // eslint-disable-next-line react-hooks/immutability
    window.location.href = `mailto:${EWES_CONTACT.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const fieldClass =
    'w-full rounded-none border-0 border-b border-on-night/20 bg-transparent py-2.5 text-sm text-on-night placeholder:text-on-night-muted/45 focus:border-malachite-bright focus:outline-none';
  const labelClass =
    'font-mono text-[10px] uppercase tracking-[0.12em] text-on-night-muted';

  return (
    <form
      onSubmit={handleSubmit}
      className="grid content-start gap-6 border border-on-night/12 bg-night-deep/60 p-5 backdrop-blur-md sm:p-8 lg:p-10"
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
                onChange={() =>
                  setFormData({ ...formData, sector: sector.value })
                }
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
          <span className={labelClass}>{t('fields.name')}</span>
          <input
            type="text"
            required
            autoComplete="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder={t('fields.namePlaceholder')}
            className={fieldClass}
          />
        </label>
        <label className="grid gap-1.5">
          <span className={labelClass}>{t('fields.organization')}</span>
          <input
            type="text"
            required
            autoComplete="organization"
            value={formData.organization}
            onChange={(e) =>
              setFormData({ ...formData, organization: e.target.value })
            }
            placeholder={t('fields.organizationPlaceholder')}
            className={fieldClass}
          />
        </label>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <label className="grid gap-1.5">
          <span className={labelClass}>{t('fields.email')}</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            placeholder={t('fields.emailPlaceholder')}
            className={fieldClass}
          />
        </label>
        <label className="grid gap-1.5">
          <span className={labelClass}>{t('fields.phone')}</span>
          <input
            type="tel"
            autoComplete="tel"
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
            placeholder={t('fields.phonePlaceholder')}
            className={fieldClass}
          />
        </label>
      </div>

      <label className="grid gap-1.5">
        <span className={labelClass}>{t('fields.message')}</span>
        <textarea
          rows={4}
          required
          value={formData.message}
          onChange={(e) =>
            setFormData({ ...formData, message: e.target.value })
          }
          placeholder={t('fields.messagePlaceholder')}
          className={`${fieldClass} resize-y`}
        />
      </label>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-4 pt-2">
        <button type="submit" className="primary-button on-night">
          {t('submitLabel')}
          <Send size={14} />
        </button>
        <p className="max-w-sm text-[11px] leading-5 text-on-night-muted/80">
          {t('formNote')}
        </p>
      </div>
    </form>
  );
}
