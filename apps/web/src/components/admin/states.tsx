import Link from 'next/link';
import { Compass, ShieldAlert } from 'lucide-react';

/**
 * États génériques des écrans du portail (blueprint/05_UI_UX_System.md §5 :
 * chargement, vide, erreur, non autorisé).
 */

function StateCard({
  icon,
  tone,
  title,
  children,
  action,
}: {
  icon: React.ReactNode;
  tone: 'bad' | 'brand';
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="animate-rise-in mx-auto flex max-w-md flex-col items-center px-6 py-20 text-center">
      <span
        className={`grid size-16 place-items-center rounded-2xl ${
          tone === 'bad' ? 'bg-bad-soft text-bad' : 'bg-brand-soft text-brand'
        }`}
      >
        {icon}
      </span>
      <h1 className="mt-6 text-xl font-semibold tracking-tight text-ink">
        {title}
      </h1>
      <div className="mt-2 text-sm leading-relaxed text-ink-muted">
        {children}
      </div>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

const buttonClass =
  'inline-flex h-9 items-center rounded-lg bg-brand px-4 text-[13px] font-medium text-on-brand transition-colors hover:bg-brand-strong';

/** Affiché quand le rôle n'ouvre pas cet écran. Le serveur refuserait de toute façon les données. */
export function AccessDenied({ homeHref }: { homeHref: string }) {
  return (
    <StateCard
      tone="bad"
      icon={<ShieldAlert size={28} aria-hidden="true" />}
      title="Accès non autorisé"
      action={
        <Link href={homeHref} className={buttonClass}>
          Retour à l’accueil du portail
        </Link>
      }
    >
      Votre rôle ne permet pas d’ouvrir cet écran. Si vous pensez qu’il s’agit
      d’une erreur, contactez un administrateur du portail.
    </StateCard>
  );
}

export function PortalNotFound({ homeHref }: { homeHref: string }) {
  return (
    <StateCard
      tone="brand"
      icon={<Compass size={28} aria-hidden="true" />}
      title="Page introuvable"
      action={
        <Link href={homeHref} className={buttonClass}>
          Retour à l’accueil du portail
        </Link>
      }
    >
      Cette adresse ne correspond à aucun écran du portail. Utilisez le menu ou
      la recherche (Ctrl K) pour retrouver votre chemin.
    </StateCard>
  );
}
