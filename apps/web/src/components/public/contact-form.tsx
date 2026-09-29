'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Send } from 'lucide-react';
import { EWES_CONTACT } from '@/data/contact';

interface Sector {
  value: string;
  label: string;
}

/**
 * Formulaire de contact (composant client isolé — blueprint/16_Rendering_State_Strategy.md
 * §4). Le module NestJS `contact` (blueprint/21 backlog, Phase 02) n'est pas
 * encore construit : plutôt que de simuler une confirmation d'envoi non
 * vérifiée (interdit par blueprint/19_AI_Coding_Rules.md §7), le formulaire
 * ouvre la messagerie de l'utilisateur avec le message pré-rempli. À
 * remplacer par un POST vers l'API une fois le module disponible.
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
      <p className="border border-border-subtle bg-surface p-3 text-[11px] leading-5 text-sand/55">
        {t('formNote')}
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block font-mono text-[11px] uppercase text-muted">
            {t('fields.name')}
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder={t('fields.namePlaceholder')}
            className="w-full border border-border bg-surface px-3 py-2.5 text-sand focus:border-primary focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block font-mono text-[11px] uppercase text-muted">
            {t('fields.organization')}
          </label>
          <input
            type="text"
            required
            value={formData.organization}
            onChange={(e) =>
              setFormData({ ...formData, organization: e.target.value })
            }
            placeholder={t('fields.organizationPlaceholder')}
            className="w-full border border-border bg-surface px-3 py-2.5 text-sand focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block font-mono text-[11px] uppercase text-muted">
            {t('fields.email')}
          </label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            placeholder={t('fields.emailPlaceholder')}
            className="w-full border border-border bg-surface px-3 py-2.5 text-sand focus:border-primary focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block font-mono text-[11px] uppercase text-muted">
            {t('fields.phone')}
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
            placeholder={t('fields.phonePlaceholder')}
            className="w-full border border-border bg-surface px-3 py-2.5 text-sand focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block font-mono text-[11px] uppercase text-muted">
          {t('fields.sector')}
        </label>
        <select
          value={formData.sector}
          onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
          className="w-full border border-border bg-surface px-3 py-2.5 font-sans text-sand focus:border-primary focus:outline-none"
        >
          {sectors.map((sector) => (
            <option key={sector.value} value={sector.value}>
              {sector.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block font-mono text-[11px] uppercase text-muted">
          {t('fields.message')}
        </label>
        <textarea
          rows={4}
          required
          value={formData.message}
          onChange={(e) =>
            setFormData({ ...formData, message: e.target.value })
          }
          placeholder={t('fields.messagePlaceholder')}
          className="w-full resize-none border border-border bg-surface px-3 py-2.5 font-sans text-sand focus:border-primary focus:outline-none"
        />
      </div>

      <button
        type="submit"
        className="mt-4 flex w-full items-center justify-center gap-2 bg-primary py-3 font-mono font-bold uppercase tracking-wider text-white transition-colors hover:bg-primary-hover"
      >
        <Send size={14} />
        {t('submitLabel')}
      </button>
    </form>
  );
}
