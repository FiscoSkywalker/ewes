'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import {
  ArrowUpRight,
  BookOpen,
  FileDown,
  Languages,
  LockKeyhole,
} from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { SectionHeading } from '@/components/public/section-heading';

interface NewsItem {
  type: string;
  date: string;
  title: string;
}

interface ResourceFact {
  value: string;
  label: string;
}

const FACT_ICONS = [Languages, FileDown, LockKeyhole];

/** Section "Actualités & ressources" de l'Accueil — homepage uniquement. */
export function ResourcesSection() {
  const t = useTranslations('Resources');
  const news = t.raw('news') as NewsItem[];
  const facts = t.raw('facts') as ResourceFact[];

  return (
    <section className="relative min-h-screen overflow-hidden px-6 py-28 text-white md:px-16">
      <div className="absolute inset-0" data-section-parallax>
        <Image
          src="/assets/images/ewes-laboratory-cinematic.png"
          alt=""
          fill
          sizes="100vw"
          className="scale-110 object-cover"
        />
      </div>
      <div className="absolute inset-0 bg-primary-deep/90" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_40%,rgba(121,173,193,.28),transparent_36%)]" />

      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.2fr_.8fr]">
        <div>
          <SectionHeading
            eyebrow={t('eyebrow')}
            title={t('title')}
            description={t('description')}
            className="[&_h2]:!text-white [&_p]:!text-white/65 [&_.eyebrow]:!text-water"
          />

          <div className="mt-10 border-y border-white/18" data-stagger>
            {news.map((item, index) => (
              <Link
                key={item.title}
                href="/realisations"
                className="group grid grid-cols-[38px_1fr_auto] items-center gap-4 border-b border-white/16 py-5 last:border-b-0"
              >
                <span className="font-heading text-xl text-water">
                  0{index + 1}
                </span>
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-water">
                    {item.type} · {item.date}
                  </div>
                  <h3 className="mt-1 font-heading text-xl font-semibold leading-tight text-white">
                    {item.title}
                  </h3>
                </div>
                <ArrowUpRight
                  size={17}
                  className="text-white/60 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-white"
                />
              </Link>
            ))}
          </div>

          <div
            className="mt-10 grid grid-cols-1 border-t border-white/18 sm:grid-cols-3"
            data-stagger
          >
            {facts.map(({ value, label }, index) => {
              const Icon = FACT_ICONS[index] ?? Languages;
              return (
                <div
                  key={label}
                  className={`py-5 sm:px-5 ${index > 0 ? 'border-t border-white/18 sm:border-l sm:border-t-0' : ''}`}
                >
                  <Icon size={18} className="text-water" />
                  <div className="mt-4 font-heading text-3xl font-semibold text-white">
                    {value}
                  </div>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-white/48">
                    {label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative min-h-[590px]">
          <div className="absolute inset-x-0 bottom-0 top-0">
            <Image
              src="/assets/images/ewes-engineer-cutout-clean.png"
              alt={t('imageAlt')}
              fill
              sizes="(min-width: 1024px) 40vw, 80vw"
              className="object-contain object-bottom drop-shadow-[0_30px_45px_rgba(0,0,0,.24)]"
            />
          </div>
          <div className="absolute bottom-8 right-0 z-10 max-w-[230px] bg-white p-5 text-sand shadow-2xl">
            <BookOpen size={20} className="text-primary" />
            <h3 className="mt-4 font-heading text-xl font-semibold">
              {t('centerDocTitle')}
            </h3>
            <p className="mt-2 text-[11px] leading-5 text-sand/58">
              {t('centerDocText')}
            </p>
            <Link
              href="/documents"
              className="mt-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-primary"
            >
              {t('exploreLabel')} <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
