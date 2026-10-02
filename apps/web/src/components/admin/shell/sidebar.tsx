'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronRight,
  ExternalLink,
  LifeBuoy,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from 'lucide-react';
import type {
  NavBadge,
  NavGroup,
  NavItem,
  NavTone,
  ResolvedRoute,
} from '@/lib/admin/navigation';

const TONE_TEXT: Record<NavTone, string> = {
  brand: 'text-brand',
  env: 'text-env',
  ing: 'text-ing',
  neutral: 'text-ink-muted',
};

const TONE_BAR: Record<NavTone, string> = {
  brand: 'bg-brand',
  env: 'bg-env',
  ing: 'bg-ing',
  neutral: 'bg-ink-muted',
};

const BADGE_STYLE: Record<NavBadge, string> = {
  'contacts-new': 'bg-brand text-on-brand',
  'emails-failed': 'bg-bad text-white dark:text-[#2a0b08]',
};

const BADGE_LABEL: Record<NavBadge, (n: number) => string> = {
  'contacts-new': (n) => `${n} message${n > 1 ? 's' : ''} à traiter`,
  'emails-failed': (n) => `${n} envoi${n > 1 ? 's' : ''} en échec`,
};

interface SidebarProps {
  groups: NavGroup[];
  route: ResolvedRoute | null;
  badges: Partial<Record<NavBadge, number>>;
  /** Rail d'icônes (desktop uniquement : le tiroir mobile est toujours déplié). */
  collapsed: boolean;
  onToggleCollapsed: () => void;
  /** Tiroir mobile ouvert (sous `lg`). */
  mobileOpen: boolean;
  onCloseMobile: () => void;
  /** « Administration » ou « Espace documentaire » selon le rôle. */
  areaLabel: string;
}

export function Sidebar({
  groups,
  route,
  badges,
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onCloseMobile,
  areaLabel,
}: SidebarProps) {
  return (
    <>
      {/* Tiroir mobile : voile + panneau. */}
      <div
        aria-hidden="true"
        onClick={onCloseMobile}
        className={`fixed inset-0 z-40 bg-[#041014]/50 backdrop-blur-[2px] transition-opacity duration-200 lg:hidden ${
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      <aside
        id="portal-sidebar"
        aria-label="Navigation du portail"
        className={`fixed inset-y-0 left-0 z-50 flex w-[288px] flex-col bg-canvas transition-[transform,width] duration-300 ease-[cubic-bezier(.4,0,.2,1)] max-lg:shadow-pop lg:sticky lg:top-0 lg:z-auto lg:h-dvh lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } ${collapsed ? 'lg:w-[76px]' : 'lg:w-[272px]'}`}
      >
        <SidebarBrand
          collapsed={collapsed}
          areaLabel={areaLabel}
          onCloseMobile={onCloseMobile}
        />

        <SidebarNav
          groups={groups}
          route={route}
          badges={badges}
          collapsed={collapsed}
        />

        <div
          className={`flex shrink-0 flex-col gap-0.5 border-t border-line p-3 ${collapsed ? 'items-center' : ''}`}
        >
          <FooterLink
            href="/admin/aide"
            label="Guide d’utilisation"
            icon={<LifeBuoy size={17} aria-hidden="true" />}
            collapsed={collapsed}
          />
          <FooterLink
            href="/"
            external
            label="Voir le site public"
            icon={<ExternalLink size={17} aria-hidden="true" />}
            collapsed={collapsed}
          />
          <button
            type="button"
            onClick={onToggleCollapsed}
            className={`hidden h-9 items-center gap-3 rounded-lg text-[13px] text-ink-muted transition-colors hover:bg-ink/5 hover:text-ink lg:flex ${collapsed ? 'w-10 justify-center' : 'px-2.5'}`}
            aria-label={
              collapsed
                ? 'Déplier la barre latérale'
                : 'Replier la barre latérale'
            }
            title={`${collapsed ? 'Déplier' : 'Replier'} la barre latérale ( [ )`}
          >
            {collapsed ? (
              <PanelLeftOpen size={17} aria-hidden="true" />
            ) : (
              <>
                <PanelLeftClose size={17} aria-hidden="true" />
                <span className="flex-1 text-left">Replier</span>
                <kbd className="rounded border border-line-strong px-1.5 font-mono text-[10px] text-ink-subtle">
                  [
                </kbd>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}

function SidebarBrand({
  collapsed,
  areaLabel,
  onCloseMobile,
}: {
  collapsed: boolean;
  areaLabel: string;
  onCloseMobile: () => void;
}) {
  return (
    <div
      className={`flex h-16 shrink-0 items-center gap-3 ${collapsed ? 'justify-center px-2' : 'px-4'}`}
    >
      <Link
        href="/admin"
        className="flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-brand"
        aria-label={`EWES — ${areaLabel}`}
      >
        <span className="relative block shrink-0">
          <Image
            src="/assets/brand/ewes-logo.png"
            alt=""
            width={640}
            height={256}
            sizes="100px"
            priority
            className={`w-auto dark:hidden ${collapsed ? 'h-6' : 'h-9'}`}
          />
          <Image
            src="/assets/brand/ewes-logo-light.png"
            alt=""
            width={640}
            height={256}
            sizes="100px"
            priority
            className={`hidden w-auto dark:block ${collapsed ? 'h-6' : 'h-9'}`}
          />
        </span>
        <span
          className={`min-w-0 border-l border-line-strong pl-3 leading-tight ${collapsed ? 'hidden' : ''}`}
        >
          <span className="block text-[11px] font-medium uppercase tracking-[0.14em] text-ink-subtle">
            Portail
          </span>
          <span className="block text-[13px] font-semibold leading-tight text-ink">
            {areaLabel}
          </span>
        </span>
      </Link>
      <button
        type="button"
        onClick={onCloseMobile}
        className="ml-auto grid size-9 place-items-center rounded-lg text-ink-muted hover:bg-ink/5 hover:text-ink lg:hidden"
        aria-label="Fermer le menu"
      >
        <X size={18} aria-hidden="true" />
      </button>
    </div>
  );
}

function FooterLink({
  href,
  label,
  icon,
  collapsed,
  external = false,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  collapsed: boolean;
  external?: boolean;
}) {
  return (
    <Link
      href={href}
      {...(external && { target: '_blank', rel: 'noopener' })}
      aria-label={collapsed ? label : undefined}
      title={collapsed ? label : undefined}
      className={`flex h-9 items-center gap-3 rounded-lg text-[13px] text-ink-muted transition-colors hover:bg-ink/5 hover:text-ink ${collapsed ? 'w-10 justify-center' : 'px-2.5'}`}
    >
      {icon}
      <span className={collapsed ? 'sr-only' : ''}>{label}</span>
    </Link>
  );
}

// --- Navigation ---

interface FlyoutState {
  item: NavItem;
  top: number;
}

function SidebarNav({
  groups,
  route,
  badges,
  collapsed,
}: {
  groups: NavGroup[];
  route: ResolvedRoute | null;
  badges: Partial<Record<NavBadge, number>>;
  collapsed: boolean;
}) {
  const activeItemId = route?.item.id;
  const [openIds, setOpenIds] = useState<Set<string>>(
    () => new Set(activeItemId ? [activeItemId] : []),
  );
  const [flyout, setFlyout] = useState<FlyoutState | null>(null);
  const closeTimer = useRef<number | undefined>(undefined);

  // Le sous-menu de la page courante s'ouvre de lui-même à la navigation.
  // (Ajustement d'état pendant le rendu, motif recommandé par React plutôt
  // qu'un effet : https://react.dev/learn/you-might-not-need-an-effect.)
  const [lastActive, setLastActive] = useState(activeItemId);
  if (activeItemId !== lastActive) {
    setLastActive(activeItemId);
    if (activeItemId && !openIds.has(activeItemId)) {
      setOpenIds(new Set(openIds).add(activeItemId));
    }
  }

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  function toggle(id: string) {
    setOpenIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function showFlyout(item: NavItem, element: HTMLElement) {
    if (!collapsed) return;
    window.clearTimeout(closeTimer.current);
    setFlyout({ item, top: element.getBoundingClientRect().top });
  }

  function hideFlyout() {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setFlyout(null), 140);
  }

  return (
    <nav
      className="portal-scroll flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4"
      onScroll={() => setFlyout(null)}
    >
      {groups.map((group, index) => (
        <div key={group.id} className={index > 0 ? 'mt-5' : 'mt-1'}>
          <div
            className={`mb-1.5 flex h-5 items-center text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-subtle ${collapsed ? 'justify-center' : 'px-2.5'}`}
          >
            <span className={collapsed ? 'sr-only' : ''}>{group.label}</span>
            {collapsed && (
              <span aria-hidden="true" className="h-px w-5 bg-line-strong" />
            )}
          </div>
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => (
              <NavEntry
                key={item.id}
                item={item}
                route={route}
                badge={item.badge ? badges[item.badge] : undefined}
                open={openIds.has(item.id)}
                onToggle={() => toggle(item.id)}
                collapsed={collapsed}
                onHover={showFlyout}
                onLeave={hideFlyout}
              />
            ))}
          </ul>
        </div>
      ))}

      {collapsed && flyout && (
        <RailFlyout
          state={flyout}
          route={route}
          badge={flyout.item.badge ? badges[flyout.item.badge] : undefined}
          onEnter={() => window.clearTimeout(closeTimer.current)}
          onLeave={hideFlyout}
        />
      )}
    </nav>
  );
}

function CountBadge({
  kind,
  count,
  compact = false,
}: {
  kind: NavBadge;
  count: number;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <span
        className={`absolute right-1.5 top-1.5 size-2 rounded-full ring-2 ring-canvas ${BADGE_STYLE[kind]}`}
        aria-hidden="true"
      />
    );
  }
  return (
    <span
      className={`ml-auto min-w-5 rounded-full px-1.5 text-center text-[11px] font-semibold leading-5 tabular-nums ${BADGE_STYLE[kind]}`}
    >
      <span aria-hidden="true">{count > 99 ? '99+' : count}</span>
      <span className="sr-only">{BADGE_LABEL[kind](count)}</span>
    </span>
  );
}

function NavEntry({
  item,
  route,
  badge,
  open,
  onToggle,
  collapsed,
  onHover,
  onLeave,
}: {
  item: NavItem;
  route: ResolvedRoute | null;
  badge: number | undefined;
  open: boolean;
  onToggle: () => void;
  collapsed: boolean;
  onHover: (item: NavItem, element: HTMLElement) => void;
  onLeave: () => void;
}) {
  const isActive = route?.item.id === item.id;
  const hasChildren = Boolean(item.children?.length);
  const Icon = item.icon;
  const tone = item.tone ?? 'brand';

  const rowClass = `group relative flex items-center gap-3 rounded-lg text-[13.5px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand ${
    isActive
      ? 'bg-panel font-medium text-ink shadow-[0_1px_2px_rgba(16,42,52,.06)] ring-1 ring-line'
      : 'text-ink-muted hover:bg-ink/5 hover:text-ink'
  } ${collapsed ? 'size-10 justify-center' : 'h-9 w-full px-2.5'}`;

  const icon = (
    <Icon
      size={18}
      strokeWidth={isActive ? 2.1 : 1.8}
      aria-hidden="true"
      className={`shrink-0 transition-colors ${isActive ? TONE_TEXT[tone] : 'text-ink-subtle group-hover:text-ink-muted'}`}
    />
  );

  const hoverProps = {
    onMouseEnter: (event: React.MouseEvent<HTMLElement>) =>
      onHover(item, event.currentTarget),
    onMouseLeave: onLeave,
    onFocus: (event: React.FocusEvent<HTMLElement>) =>
      onHover(item, event.currentTarget),
    onBlur: onLeave,
  };

  // Rail replié : chaque entrée est un lien direct (les sous-entrées sont
  // proposées dans le menu flottant au survol).
  if (collapsed) {
    return (
      <li className="flex justify-center">
        <Link
          href={item.href}
          aria-current={isActive ? 'page' : undefined}
          className={rowClass}
          {...hoverProps}
        >
          {icon}
          <span className="sr-only">
            {item.label}
            {item.badge && badge ? ` — ${BADGE_LABEL[item.badge](badge)}` : ''}
          </span>
          {item.badge && badge ? (
            <CountBadge kind={item.badge} count={badge} compact />
          ) : null}
        </Link>
      </li>
    );
  }

  if (!hasChildren) {
    return (
      <li>
        <Link
          href={item.href}
          aria-current={isActive ? 'page' : undefined}
          className={rowClass}
        >
          {icon}
          <span className="truncate">{item.label}</span>
          {item.badge && badge ? (
            <CountBadge kind={item.badge} count={badge} />
          ) : null}
        </Link>
      </li>
    );
  }

  const submenuId = `submenu-${item.id}`;
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={submenuId}
        className={rowClass}
      >
        {icon}
        <span className="truncate">{item.label}</span>
        {item.badge && badge ? (
          <CountBadge kind={item.badge} count={badge} />
        ) : null}
        <ChevronRight
          size={15}
          aria-hidden="true"
          className={`shrink-0 text-ink-subtle transition-transform duration-200 ${item.badge && badge ? '' : 'ml-auto'} ${open ? 'rotate-90' : ''}`}
        />
      </button>
      <div id={submenuId} className="portal-collapse" data-open={open}>
        <div>
          <ul className="relative ml-[21px] mt-0.5 flex flex-col gap-px border-l border-line-strong py-0.5 pl-3">
            {item.children!.map((child) => {
              const childActive = isActive && route?.leaf?.id === child.id;
              return (
                <li key={child.id} className="relative">
                  {childActive && (
                    <span
                      aria-hidden="true"
                      className={`absolute -left-[13.5px] top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full ${TONE_BAR[tone]}`}
                    />
                  )}
                  <Link
                    href={child.href}
                    tabIndex={open ? undefined : -1}
                    aria-current={childActive ? 'page' : undefined}
                    className={`flex h-8 items-center rounded-md px-2.5 text-[13px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand ${
                      childActive
                        ? 'font-medium text-ink'
                        : 'text-ink-muted hover:bg-ink/5 hover:text-ink'
                    }`}
                  >
                    <span className="truncate">{child.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </li>
  );
}

/** Menu flottant du rail replié : intitulé de l'entrée et ses sous-entrées. */
function RailFlyout({
  state,
  route,
  badge,
  onEnter,
  onLeave,
}: {
  state: FlyoutState;
  route: ResolvedRoute | null;
  badge: number | undefined;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const { item, top } = state;
  const children = item.children ?? [];
  // Rendu dans <body> : la barre latérale porte une translation (tiroir
  // mobile) qui ferait de ce panneau `fixed` un enfant rogné par le menu.
  return createPortal(
    <div
      role="presentation"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{ top }}
      className="animate-fade-in fixed left-[70px] z-50 pl-2"
    >
      <div className="min-w-48 rounded-xl border border-line bg-raised p-1.5 shadow-pop">
        <div className="flex items-center gap-2 px-2.5 py-1.5 text-[13px] font-semibold text-ink">
          {item.label}
          {item.badge && badge ? (
            <CountBadge kind={item.badge} count={badge} />
          ) : null}
        </div>
        {children.length > 0 && (
          <ul className="mt-0.5 border-t border-line pt-1">
            {children.map((child) => {
              const active =
                route?.item.id === item.id && route.leaf?.id === child.id;
              return (
                <li key={child.id}>
                  <Link
                    href={child.href}
                    tabIndex={-1}
                    className={`flex h-8 items-center rounded-md px-2.5 text-[13px] transition-colors ${
                      active
                        ? 'bg-brand-soft font-medium text-ink'
                        : 'text-ink-muted hover:bg-ink/5 hover:text-ink'
                    }`}
                  >
                    {child.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>,
    document.body,
  );
}
