import type { ComponentProps, ReactNode } from 'react';
import { Loader2, type LucideIcon } from 'lucide-react';
import { Link } from '@/i18n/navigation';

/**
 * Boutons et liens d'action du site public (blueprint/05_UI_UX_System.md §4).
 *
 * - `Button` / `ButtonLink` / `ButtonAnchor` : l'appel à l'action en pilule
 *   (style `.primary-button` de globals.css, repris du prototype validé).
 *   `tone="night"` sur les sections nuit.
 * - `TextLink` : action secondaire, texte souligné en capitales (« Voir
 *   tout », « Nous contacter »).
 *
 * Utilisables dans les Server Components comme dans les îlots client.
 */

export type ActionTone = 'paper' | 'night';

interface ActionStyleProps {
  tone?: ActionTone;
  /** Icône après le libellé (flèche le plus souvent). */
  icon?: LucideIcon;
  /** Icône avant le libellé. */
  leadingIcon?: LucideIcon;
  className?: string;
  children: ReactNode;
}

/**
 * Classes du bouton, pour les liens qui ont leur propre composant
 * (`ScrollLink`, `DocumentLink`, `next/link` vers `/admin`).
 */
export function buttonClass(tone: ActionTone = 'paper', className?: string) {
  return ['primary-button', tone === 'night' && 'on-night', className]
    .filter(Boolean)
    .join(' ');
}

function Content({
  icon: Icon,
  leadingIcon: LeadingIcon,
  children,
}: Pick<ActionStyleProps, 'icon' | 'leadingIcon' | 'children'>) {
  return (
    <>
      {LeadingIcon && <LeadingIcon size={15} aria-hidden="true" />}
      {children}
      {Icon && <Icon size={15} aria-hidden="true" />}
    </>
  );
}

/** Lien interne localisé (préfixe de langue ajouté automatiquement). */
export function ButtonLink({
  tone,
  icon,
  leadingIcon,
  className,
  children,
  ...props
}: ActionStyleProps &
  Omit<ComponentProps<typeof Link>, 'className' | 'children'>) {
  return (
    <Link className={buttonClass(tone, className)} {...props}>
      <Content icon={icon} leadingIcon={leadingIcon}>
        {children}
      </Content>
    </Link>
  );
}

/**
 * Lien hors routage localisé : fichier à télécharger, carte, portail
 * d'administration (`/admin`, racine distincte non localisée).
 */
export function ButtonAnchor({
  tone,
  icon,
  leadingIcon,
  className,
  children,
  ...props
}: ActionStyleProps & Omit<ComponentProps<'a'>, 'className' | 'children'>) {
  return (
    <a className={buttonClass(tone, className)} {...props}>
      <Content icon={icon} leadingIcon={leadingIcon}>
        {children}
      </Content>
    </a>
  );
}

export interface ButtonProps
  extends
    ActionStyleProps,
    Omit<ComponentProps<'button'>, 'className' | 'children'> {
  /** Envoi en cours : bouton verrouillé, indicateur à la place de l'icône. */
  pending?: boolean;
}

export function Button({
  tone,
  icon,
  leadingIcon,
  pending = false,
  disabled,
  type = 'button',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={buttonClass(tone, className)}
      {...props}
    >
      <Content icon={pending ? undefined : icon} leadingIcon={leadingIcon}>
        {children}
      </Content>
      {pending && (
        <Loader2 size={15} aria-hidden="true" className="animate-spin" />
      )}
    </button>
  );
}

const TEXT_LINK_TONE: Record<ActionTone, string> = {
  paper:
    'border-sand/25 text-sand hover:border-sand focus-visible:outline-primary',
  night:
    'border-on-night/25 text-on-night hover:border-malachite-bright hover:text-malachite-bright focus-visible:outline-malachite-bright',
};

/** Action secondaire : texte souligné en capitales, flèche facultative. */
export function TextLink({
  tone = 'paper',
  icon: Icon,
  leadingIcon: LeadingIcon,
  className,
  children,
  ...props
}: ActionStyleProps &
  Omit<ComponentProps<typeof Link>, 'className' | 'children'>) {
  return (
    <Link
      className={[
        'inline-flex w-fit items-center gap-2 border-b pb-1 text-xs font-bold uppercase tracking-[0.12em] transition-colors outline-offset-4 focus-visible:outline-2',
        TEXT_LINK_TONE[tone],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {LeadingIcon && <LeadingIcon size={14} aria-hidden="true" />}
      {children}
      {Icon && <Icon size={14} aria-hidden="true" />}
    </Link>
  );
}
