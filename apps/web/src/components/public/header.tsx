'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { LogIn, Menu, X } from 'lucide-react';
import { Link, usePathname } from '@/i18n/navigation';
import { LanguageSelector } from './language-selector';

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
      <header
        className={`pointer-events-auto fixed inset-x-0 top-0 z-40 px-4 transition-transform duration-500 md:px-8 ${
          headerHidden ? '-translate-y-[120%]' : 'translate-y-0'
        }`}
      >
        <div
          className={`mx-auto flex items-center justify-between transition-[max-width,background-color,border-color,padding,box-shadow,border-radius] duration-500 ${
            isScrolled
              ? 'mt-3 max-w-[1180px] rounded-full border border-sand/10 bg-surface-elevated/88 px-4 py-2 shadow-[0_14px_45px_rgba(34,76,93,.14)] backdrop-blur-xl md:px-5'
              : 'mt-0 max-w-[1440px] rounded-none border border-transparent bg-transparent px-0 py-5 shadow-none'
          }`}
        >
          <Link
            href="/"
            className="group flex items-center gap-3 text-left"
            aria-label="Retour à l’accueil"
          >
            <span className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-primary text-sm font-black text-background">
              EW
              <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-water/80" />
            </span>
            <span className="hidden flex-col sm:flex">
              <span className="font-heading text-lg font-bold leading-none tracking-[0.12em] text-sand transition-colors group-hover:text-primary">
                EWES
              </span>
              <span className="mt-1 text-[9px] uppercase tracking-[0.18em] text-muted">
                Environnement · Eau · Ingénierie
              </span>
            </span>
          </Link>

          <nav
            className="hidden items-center gap-[clamp(.6rem,1vw,1.1rem)] xl:flex"
            aria-label="Navigation principale"
          >
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative whitespace-nowrap py-2 text-[10px] font-bold uppercase tracking-[0.1em] transition-colors 2xl:text-[11px] ${
                    isActive ? 'text-primary' : 'text-sand/65 hover:text-sand'
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
            <Link
              href="/documents"
              className={`hidden h-10 items-center gap-2 whitespace-nowrap rounded-full border px-4 text-[10px] font-bold uppercase tracking-[0.12em] transition-all md:inline-flex ${
                isScrolled
                  ? 'border-primary bg-primary text-white hover:bg-primary-hover'
                  : 'border-sand/22 bg-white/18 text-sand backdrop-blur-sm hover:bg-white/38'
              }`}
              title="Accès à l’espace documentaire privé"
            >
              <LogIn size={13} />
              Connexion
            </Link>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-sand/15 text-sand xl:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Ouvrir le menu"
              aria-expanded={mobileOpen}
            >
              <Menu size={18} />
            </button>
          </div>
        </div>
      </header>

      <div
        className={`pointer-events-auto fixed inset-0 z-50 bg-background/96 px-6 py-5 backdrop-blur-2xl transition-all duration-300 xl:hidden ${
          mobileOpen ? 'visible opacity-100' : 'invisible opacity-0'
        }`}
        aria-hidden={!mobileOpen}
      >
        <div className="flex items-center justify-between">
          <span className="font-heading text-2xl font-bold tracking-[0.14em] text-sand">
            EWES
          </span>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-sand/15 text-sand"
            onClick={() => setMobileOpen(false)}
            aria-label="Fermer le menu"
          >
            <X size={20} />
          </button>
        </div>
        <nav className="mt-14 flex flex-col" aria-label="Navigation mobile">
          {navItems.map((item, index) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-between border-b border-sand/10 py-4 text-left font-heading text-3xl font-semibold text-sand"
            >
              <span className="whitespace-nowrap">{item.label}</span>
              <span className="text-xs font-sans text-primary">
                0{index + 1}
              </span>
            </Link>
          ))}
        </nav>
        <div className="mt-8">
          <LanguageSelector />
        </div>
        <Link
          href="/documents"
          onClick={() => setMobileOpen(false)}
          className="primary-button mt-5 w-full"
        >
          <LogIn size={14} />
          Connexion
        </Link>
      </div>
    </>
  );
}
