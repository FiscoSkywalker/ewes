'use client';

import { useTranslations } from 'next-intl';
import { Building, Calendar, CheckCircle, Cpu, MapPin, X } from 'lucide-react';
import type { Project } from '@/data/projects';

interface ProjectModalProps {
  project: Project | null;
  onClose: () => void;
}

/**
 * Fiche technique d'une réalisation, partagée entre la section Accueil et la
 * page /realisations (blueprint/12_Realisations_Portfolio_System.md).
 */
export function ProjectModal({ project, onClose }: ProjectModalProps) {
  const t = useTranslations('ProjectModal');
  const tStatus = useTranslations('Projects.statusLabels');

  if (!project) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-primary-deep/45 p-4 backdrop-blur-md md:p-8"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto border border-primary/25 bg-surface-elevated p-6 text-sand shadow-[0_24px_80px_rgba(37,78,95,0.2)] md:p-10"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-6 top-6 border border-border bg-surface p-2 text-muted transition-colors hover:border-primary/50 hover:text-sand"
          aria-label={t('closeAriaLabel')}
        >
          <X size={18} />
        </button>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span className="rounded-sm border border-primary/40 bg-primary/10 px-2.5 py-0.5 font-mono text-xs font-semibold uppercase tracking-wider text-primary">
            {project.category.replace('_', ' ')}
          </span>
          <span className="flex items-center gap-1.5 border border-primary/10 bg-primary/5 px-2.5 py-0.5 font-mono text-xs text-sand/65">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {tStatus(project.status)}
          </span>
        </div>

        <h2 className="mb-2 text-2xl font-bold tracking-tight md:text-3xl">
          {project.title}
        </h2>
        <div className="mb-8 flex flex-wrap items-center gap-4 font-mono text-xs text-muted">
          <span className="flex items-center gap-1 text-sand/65">
            <MapPin size={13} className="text-primary" />
            {project.region} ({project.country})
          </span>
          <span className="flex items-center gap-1 text-sand/65">
            <Building size={13} className="text-primary" />
            {t('clientLabel')} : {project.client}
          </span>
          <span className="flex items-center gap-1 text-sand/65">
            <Calendar size={13} className="text-primary" />
            {project.year}
          </span>
        </div>

        <div className="mb-8 flex flex-col gap-4 border border-primary/20 bg-gradient-to-r from-primary-deep/60 via-surface to-surface p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1 font-mono text-xs uppercase tracking-wider text-primary">
              {project.keyMetric.label}
            </div>
            <div className="font-mono text-3xl font-bold tracking-tight text-sand md:text-4xl">
              {project.keyMetric.value}
            </div>
          </div>
          <div className="max-w-xs font-sans text-xs text-sand/65 sm:text-right">
            {t('expertiseNote')}
          </div>
        </div>

        <div className="mb-8 space-y-4 font-sans text-sm leading-relaxed text-sand/75 md:text-base">
          <p className="font-medium text-sand">{project.summary}</p>
          <p className="text-sm leading-relaxed text-sand/65">
            {project.description}
          </p>
        </div>

        <div className="border-t border-border pt-6">
          <h3 className="mb-4 flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-primary">
            <Cpu size={14} />
            {t('specTitle')}
          </h3>

          <div className="mb-6 grid grid-cols-1 gap-4 font-sans text-xs md:grid-cols-2">
            {project.technicalDetails.capacity && (
              <div className="rounded-sm border border-border bg-surface p-3.5">
                <span className="mb-1 block font-mono text-[11px] uppercase text-muted">
                  {t('capacityLabel')}
                </span>
                <span className="font-medium text-sand">
                  {project.technicalDetails.capacity}
                </span>
              </div>
            )}
            {project.technicalDetails.footprint && (
              <div className="rounded-sm border border-border bg-surface p-3.5">
                <span className="mb-1 block font-mono text-[11px] uppercase text-muted">
                  {t('footprintLabel')}
                </span>
                <span className="font-medium text-sand">
                  {project.technicalDetails.footprint}
                </span>
              </div>
            )}
            {project.technicalDetails.impact && (
              <div className="rounded-sm border border-border bg-surface p-3.5 md:col-span-2">
                <span className="mb-1 block font-mono text-[11px] uppercase text-muted">
                  {t('impactLabel')}
                </span>
                <span className="font-medium text-sand">
                  {project.technicalDetails.impact}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {project.technicalDetails.technologies.map((tech) => (
              <span
                key={tech}
                className="flex items-center gap-1.5 border border-border bg-surface px-2.5 py-1 font-sans text-xs text-sand/70"
              >
                <CheckCircle size={13} className="text-primary" />
                {tech}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-8 flex justify-end border-t border-border pt-6">
          <button
            onClick={onClose}
            className="bg-primary px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-primary-hover"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
}
