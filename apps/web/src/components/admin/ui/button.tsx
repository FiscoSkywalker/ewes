import Link from 'next/link';
import type { ComponentProps } from 'react';
import { Loader2, type LucideIcon } from 'lucide-react';
import { cx, focusRing } from '@/lib/admin/cx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-brand text-on-brand shadow-[0_1px_2px_rgba(16,42,52,.12)] hover:bg-brand-strong',
  secondary:
    'border border-line-strong bg-panel text-ink hover:border-brand/40 hover:bg-sunken',
  ghost: 'text-ink-muted hover:bg-ink/5 hover:text-ink',
  danger:
    'bg-bad text-white shadow-[0_1px_2px_rgba(16,42,52,.12)] hover:brightness-110 dark:text-[#2a0b08]',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 gap-1.5 rounded-lg px-3 text-xs',
  md: 'h-10 gap-2 rounded-lg px-4 text-[13px]',
  lg: 'h-11 gap-2 rounded-xl px-5 text-sm',
};

const ICON_SIZE: Record<ButtonSize, number> = { sm: 14, md: 16, lg: 17 };

interface StyleProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  /** Prend toute la largeur disponible. */
  block?: boolean;
}

function buttonClass({
  variant = 'primary',
  size = 'md',
  block,
  className,
}: StyleProps & { className?: string }) {
  return cx(
    'inline-flex shrink-0 select-none items-center justify-center font-medium whitespace-nowrap transition-[background-color,border-color,color,filter,transform] active:translate-y-px disabled:pointer-events-none aria-disabled:pointer-events-none aria-disabled:opacity-55 [&:disabled:not([aria-busy])]:opacity-55',
    focusRing,
    VARIANTS[variant],
    SIZES[size],
    block && 'w-full',
    className,
  );
}

export interface ButtonProps extends StyleProps, ComponentProps<'button'> {
  /**
   * Requête en cours : le bouton se verrouille et l'annonce
   * (blueprint/05_UI_UX_System.md §5), sans changer de largeur.
   */
  loading?: boolean;
}

/**
 * Bouton du portail. `primary` : l'action principale de l'écran (une seule) ;
 * `secondary` : actions courantes ; `ghost` : actions discrètes ; `danger` :
 * action destructive, toujours précédée d'une confirmation (`useConfirm`).
 */
export function Button({
  variant,
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  block,
  loading = false,
  disabled,
  type = 'button',
  className,
  children,
  ...props
}: ButtonProps) {
  const iconSize = ICON_SIZE[size];
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClass({ variant, size, block, className })}
      {...props}
    >
      {loading ? (
        <Loader2 size={iconSize} aria-hidden="true" className="animate-spin" />
      ) : (
        Icon && <Icon size={iconSize} aria-hidden="true" />
      )}
      {children}
      {IconRight && !loading && (
        <IconRight size={iconSize} aria-hidden="true" />
      )}
    </button>
  );
}

export interface ButtonLinkProps
  extends StyleProps, Omit<ComponentProps<typeof Link>, 'className'> {
  className?: string;
}

/** Lien de navigation présenté comme un bouton (ex. « Nouvelle réalisation »). */
export function ButtonLink({
  variant,
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  block,
  className,
  children,
  ...props
}: ButtonLinkProps) {
  const iconSize = ICON_SIZE[size];
  return (
    <Link
      className={buttonClass({ variant, size, block, className })}
      {...props}
    >
      {Icon && <Icon size={iconSize} aria-hidden="true" />}
      {children}
      {IconRight && <IconRight size={iconSize} aria-hidden="true" />}
    </Link>
  );
}

const ICON_BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'size-8 rounded-lg',
  md: 'size-9 rounded-lg',
  lg: 'size-10 rounded-xl',
};

export interface IconButtonProps extends Omit<
  ComponentProps<'button'>,
  'children'
> {
  icon: LucideIcon;
  /** Obligatoire : seul texte accessible du bouton (lu et affiché en infobulle). */
  label: string;
  variant?: Exclude<ButtonVariant, 'primary'>;
  size?: ButtonSize;
}

/** Bouton icône seule : le libellé est obligatoire (lecteurs d'écran, infobulle). */
export function IconButton({
  icon: Icon,
  label,
  variant = 'ghost',
  size = 'md',
  type = 'button',
  className,
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cx(
        'inline-grid shrink-0 place-items-center transition-colors disabled:pointer-events-none disabled:opacity-55',
        focusRing,
        VARIANTS[variant],
        ICON_BUTTON_SIZES[size],
        className,
      )}
      {...props}
    >
      <Icon size={ICON_SIZE[size] + 1} aria-hidden="true" />
    </button>
  );
}
