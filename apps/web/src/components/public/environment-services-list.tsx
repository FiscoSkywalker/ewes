'use client';

import { useTranslations } from 'next-intl';
import {
  Activity,
  ClipboardCheck,
  Droplets,
  FileCheck,
  Leaf,
  Microscope,
  Trash2,
  Wind,
} from 'lucide-react';

interface EnvironmentService {
  title: string;
  text: string;
}

const ICONS = [
  FileCheck,
  ClipboardCheck,
  Droplets,
  Trash2,
  Activity,
  Wind,
  Microscope,
  Leaf,
];

/** Liste des 8 prestations du pôle Environnement — partagée entre l'Accueil et /services. */
export function EnvironmentServicesList() {
  const t = useTranslations('Environment');
  const services = t.raw('services') as EnvironmentService[];

  return (
    <div
      className="pointer-events-auto mt-10 border-b border-sand/20"
      data-stagger
    >
      {services.map(({ title, text }, index) => {
        const Icon = ICONS[index] ?? FileCheck;
        return (
          <article
            key={title}
            className="group grid grid-cols-[42px_1fr] gap-4 border-t border-sand/20 py-6 sm:grid-cols-[62px_230px_1fr] sm:items-start"
          >
            <span className="pt-1 text-pole">
              <Icon size={18} />
            </span>
            <h3 className="font-heading text-xl font-semibold leading-tight text-sand">
              <span className="mr-2 font-sans text-[10px] text-pole">
                0{index + 1}
              </span>
              {title}
            </h3>
            <p className="col-start-2 text-xs leading-5 text-sand/58 sm:col-start-3">
              {text}
            </p>
          </article>
        );
      })}
    </div>
  );
}
