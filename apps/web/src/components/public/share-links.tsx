'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Link2, Mail, Share2 } from 'lucide-react';

/**
 * Partage d'un article : partage natif du système quand il existe (mobile),
 * sinon liens de partage classiques (simples URL, aucun script tiers chargé)
 * et copie du lien.
 */
export function ShareLinks({ title }: { title: string }) {
  const t = useTranslations('NewsPage.article');
  const [copied, setCopied] = useState(false);

  const url = () => window.location.href.split('#')[0];
  const open = (build: (url: string, title: string) => string) => () =>
    window.open(build(encodeURIComponent(url()), encodeURIComponent(title)), '_blank', 'noopener,noreferrer');

  const targets = [
    {
      label: 'LinkedIn',
      short: 'in',
      build: (u: string) => `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
    },
    {
      label: 'Facebook',
      short: 'f',
      build: (u: string) => `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    },
    {
      label: 'WhatsApp',
      short: 'wa',
      build: (u: string, ti: string) => `https://wa.me/?text=${ti}%20${u}`,
    },
    {
      label: 'X',
      short: 'x',
      build: (u: string, ti: string) => `https://x.com/intent/post?url=${u}&text=${ti}`,
    },
  ];

  const button =
    'flex h-9 min-w-9 items-center justify-center rounded-full border border-border px-2.5 font-mono text-[11px] font-bold uppercase text-sand transition-colors hover:border-sand hover:bg-sand hover:text-paper';

  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
        {t('share')}
      </p>
      <ul className="mt-3 flex flex-wrap gap-1.5">
        <li>
          <button
            type="button"
            className={button}
            aria-label={t('shareNative')}
            onClick={async () => {
              if (navigator.share) {
                try {
                  await navigator.share({ title, url: url() });
                } catch {
                  // Partage annulé par l'utilisateur.
                }
              } else {
                open(targets[0].build)();
              }
            }}
          >
            <Share2 size={14} />
          </button>
        </li>
        {targets.map((target) => (
          <li key={target.label}>
            <button
              type="button"
              className={button}
              aria-label={t('shareOn', { network: target.label })}
              onClick={open(target.build)}
            >
              {target.short}
            </button>
          </li>
        ))}
        <li>
          <button
            type="button"
            className={button}
            aria-label={t('shareEmail')}
            onClick={() => {
              window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url())}`;
            }}
          >
            <Mail size={14} />
          </button>
        </li>
        <li>
          <button
            type="button"
            className={button}
            aria-label={t('copyLink')}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url());
                setCopied(true);
                window.setTimeout(() => setCopied(false), 2000);
              } catch {
                // Presse-papiers indisponible (contexte non sécurisé).
              }
            }}
          >
            {copied ? <Check size={14} /> : <Link2 size={14} />}
          </button>
        </li>
      </ul>
      <p className="mt-2 h-4 font-mono text-[10px] text-malachite" aria-live="polite">
        {copied ? t('copied') : ''}
      </p>
    </div>
  );
}
