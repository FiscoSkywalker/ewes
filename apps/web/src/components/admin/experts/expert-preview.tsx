'use client';

import { useState } from 'react';
import { thumbOf } from '@/lib/admin/media';
import {
  initials,
  objectPositionOf,
  type ExpertFormValues,
} from '@/lib/admin/experts';
import { Card, SegmentedControl } from '../ui';

type Locale = 'fr' | 'en';

/**
 * Aperçu de la fiche d'un expert telle que la galerie du site la dévoile :
 * portrait (ou monogramme), pastille du pôle, nom, fonction, présentation,
 * spécialités, années d'expérience — FR/EN avec le même repli sur le français.
 * Simplifié : les polices et l'animation se voient sur le site.
 */
export function ExpertPreview({
  values,
  poleName,
}: {
  values: ExpertFormValues;
  /** Nom du pôle choisi ; absent, pas de pastille (comme sur le site). */
  poleName: string | null;
}) {
  const [locale, setLocale] = useState<Locale>('fr');
  const english = locale === 'en';
  const role = (english && values.roleEn) || values.roleFr;
  const bio = (english && values.bioEn) || values.bioFr;
  const specialties =
    english && values.specialtiesEn.length > 0
      ? values.specialtiesEn
      : values.specialtiesFr;
  const name = values.fullName || 'Nom de l’expert';

  return (
    <Card
      title="Aperçu"
      description="La fiche dévoilée dans la galerie « Équipe & experts »."
      actions={
        <SegmentedControl<Locale>
          label="Langue de l’aperçu"
          size="sm"
          value={locale}
          onChange={setLocale}
          options={[
            { value: 'fr', label: 'FR' },
            { value: 'en', label: 'EN' },
          ]}
        />
      }
    >
      <div
        role="group"
        aria-label="Aperçu de la fiche de l’expert"
        className="relative aspect-[3/4] overflow-hidden rounded-xl bg-[#0d2530] text-white"
      >
        {values.photoUrl ? (
          // Image publique servie par l'API via `/uploads/*` : pas d'optimisation Next nécessaire dans le portail.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbOf(values.photoUrl)}
            alt=""
            className="absolute inset-0 size-full object-cover"
            style={{ objectPosition: objectPositionOf(values.photoFocal) }}
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center bg-[#16384a] text-6xl font-bold text-white/70">
            {initials(values.fullName) || '·'}
          </span>
        )}
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-linear-to-t from-[#0a1d26] via-[#0a1d26]/55 to-transparent"
        />
        <div className="absolute inset-x-0 bottom-0 space-y-2.5 p-5">
          {poleName && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-[0.14em] backdrop-blur-sm">
              <span className="size-1.5 rounded-full bg-white/80" />
              Pôle {poleName}
            </span>
          )}
          <p
            className={
              values.fullName
                ? 'text-2xl font-bold leading-tight'
                : 'text-2xl font-bold leading-tight text-white/50'
            }
          >
            {name}
          </p>
          <p className="text-[13px] font-semibold text-white/90">
            {role || 'Fonction'}
          </p>
          {bio && (
            <p className="line-clamp-3 text-xs leading-relaxed text-white/75">
              {bio}
            </p>
          )}
          {specialties.length > 0 && (
            <ul className="flex flex-wrap gap-1">
              {specialties.slice(0, 6).map((item) => (
                <li
                  key={item}
                  className="rounded-full border border-white/25 bg-black/30 px-2 py-0.5 text-[10.5px] font-semibold"
                >
                  {item}
                </li>
              ))}
            </ul>
          )}
          {values.yearsOfExperience && (
            <p className="flex items-end gap-1.5 pt-1">
              <span className="text-4xl font-bold leading-none text-transparent [-webkit-text-stroke:1px_#fff]">
                {values.yearsOfExperience}
              </span>
              <span className="pb-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-white/80">
                {english ? 'years of experience' : 'ans d’expérience'}
              </span>
            </p>
          )}
        </div>
      </div>
      {english && !(values.roleEn && (values.bioEn || !values.bioFr)) && (
        <p className="mt-2 text-xs text-ink-subtle">
          Version anglaise incomplète : le site en anglais affiche le français
          pour ce qui manque.
        </p>
      )}
    </Card>
  );
}
