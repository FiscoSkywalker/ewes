'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import NextLink from 'next/link';
import { ArrowUpRight, LogIn, Menu, X } from 'lucide-react';
import { Link, usePathname } from '@/i18n/navigation';
import { BrandLogo } from './brand-logo';
import { LanguageSelector } from './language-selector';
import { buttonClass } from '@/components/public/ui';

/**
 * En-tête public partagé par toutes les pages (blueprint/05_UI_UX_System.md
 * §6). Reprend l'identité visuelle du prototype immersif (transparent sur le
 * hero, pilule flottante au défilement) mais navigue vers de vraies routes
 * i18n plutôt que de défiler vers des sections internes à l'Accueil.
 */
export function Header() {
  const t = useTranslations('Nav');
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const lastScrollRef = useRef(0);

  const navItems = [
    { href: '/', label: t('home') },
    { href: '/a-propos', label: t('about') },
    { href: '/services', label: t('services') },
    { href: '/realisations', label: t('realisations') },
    { href: '/actualites', label: t('news') },
    { href: '/documents', label: t('documents') },
    { href: '/contact', label: t('contact') },
  ] as const;

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  useEffect(() => {
    const handleScroll = () => {
      const current = window.scrollY;
      const movingDown = current > lastScrollRef.current;
      setHeaderHidden(movingDown && current > 180 && !mobileOpen);
      setIsScrolled(current > 42);
      lastScrollRef.current = current;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [mobileOpen]);

  return (
    <>
      <a
        href="#contenu"
        className="sr-only z-[60] rounded-full bg-sand px-5 py-3 text-sm font-semibold text-paper focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        {t('skipToContent')}
      </a>
      <header
        className={`pointer-events-auto fixed inset-x-0 top-0 z-40 px-4 transition-transform duration-500 md:px-8 ${
          headerHidden ? '-translate-y-[120%]' : 'translate-y-0'
        }`}
      >
        <div
          className={`mx-auto flex items-center justify-between transition-[max-width,background-color,border-color,padding,box-shadow,border-radius] duration-500 ${
            isScrolled
              ? 'mt-3 max-w-[1180px] rounded-full border border-sand/10 bg-surface-elevated/92 px-4 py-2 shadow-[0_14px_45px_rgba(34,76,93,.14)] backdrop-blur-md md:px-5'
              : 'mt-0 max-w-[1440px] rounded-none border border-transparent bg-transparent px-0 py-5 shadow-none'
          }`}
        >
          <Link
            href="/"
            className="group flex items-center gap-3 text-left"
            aria-label={t('homeAriaLabel')}
          >
            <BrandLogo
              priority
              className={`transition-[height] duration-500 ${isScrolled ? 'h-10' : 'h-14'}`}
            />
            <span className="hidden border-l border-sand/15 pl-3 text-xs font-bold uppercase leading-4 tracking-[0.1em] text-muted 2xl:block">
              {t('tagline')}
            </span>
          </Link>

          <nav
            className="hidden items-center gap-[clamp(.6rem,1vw,1.1rem)] xl:flex"
            aria-label={t('mainNavAriaLabel')}
          >
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative whitespace-nowrap py-2 text-[13px] font-semibold transition-colors 2xl:text-sm ${
                    isActive
                      ? 'text-primary-deep'
                      : 'text-sand/85 hover:text-sand'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span className="absolute inset-x-0 -bottom-0.5 mx-auto h-1 w-1 rounded-full bg-primary" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden lg:block">
              <LanguageSelector compact={isScrolled} />
            </div>
            <NextLink
              href="/admin/login"
              className={`hidden h-10 items-center gap-2 whitespace-nowrap rounded-full border px-4 text-xs font-bold uppercase tracking-[0.1em] transition-all md:inline-flex ${
                isScrolled
                  ? 'border-primary bg-primary text-white hover:bg-primary-hover'
                  : 'border-sand/22 bg-white/18 text-sand backdrop-blur-sm hover:bg-white/38'
              }`}
              title={t('loginTitle')}
            >
              <LogIn size={13} />
              {t('login')}
            </NextLink>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-sand/15 text-sand xl:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label={t('openMenu')}
              aria-expanded={mobileOpen}
            >
              <Menu size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Menu plein écran : défile s'il dépasse la hauteur visible (petits
          téléphones, barre d'adresse Safari affichée), tailles indexées sur
          `dvh` pour tenir d'un bloc sur un écran courant. */}
      <div
        className={`pointer-events-auto fixed inset-0 z-50 flex flex-col overflow-y-auto overscroll-contain bg-background/96 px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-2xl transition-all duration-300 xl:hidden ${
          mobileOpen ? 'visible opacity-100' : 'invisible opacity-0'
        }`}
        aria-hidden={!mobileOpen}
        data-lenis-prevent
      >
        <div className="flex shrink-0 items-center justify-between gap-3">
          <BrandLogo className="h-11" />
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-sand/15 text-sand"
              onClick={() => setMobileOpen(false)}
              aria-label={t('closeMenu')}
            >
              <X size={20} />
            </button>
          </div>
        </div>
        <nav
          className="mb-6 mt-[clamp(1rem,4dvh,3.5rem)] flex flex-col"
          aria-label={t('mobileNavAriaLabel')}
        >
          {navItems.map((item, index) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-between gap-4 border-b border-sand/10 py-[clamp(.5rem,1.6dvh,1rem)] text-left font-heading text-[clamp(1.375rem,4dvh,1.875rem)] font-semibold leading-tight text-sand"
            >
              <span>{item.label}</span>
              <span className="text-xs font-sans text-primary">
                0{index + 1}
              </span>
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex shrink-0 flex-col items-center gap-4">
          <Link
            href="/contact"
            onClick={() => setMobileOpen(false)}
            className={buttonClass('paper', 'w-full')}
          >
            {t('contactCta')}
            <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
          <NextLink
            href="/admin/login"
            onClick={() => setMobileOpen(false)}
            className="inline-flex items-center gap-2 py-1 text-sm text-sand/80 underline-offset-4 hover:text-sand hover:underline"
          >
            <LogIn size={14} aria-hidden="true" />
            {t('login')}
          </NextLink>
        </div>
      </div>
    </>
  );
}
