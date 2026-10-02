import NextLink from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight, FileDown, Lock, Search } from 'lucide-react';
import { buttonClass, EmptyState, TextLink } from '@/components/public/ui';

type Role = 'admin' | 'manager' | 'user';

const ROLE_TONE: Record<Role, string> = {
  admin: 'text-copper-bright',
  manager: 'text-water-bright',
  user: 'text-malachite-bright',
};

interface DocumentsOverviewProps {
  /** Lien vers la page /documents (section de l'Accueil). */
  showPageLink?: boolean;
}

/**
 * Documents publics + aperçu de l'espace documentaire privé
 * (blueprint/11_Document_Management_System.md). Aucun document public n'est
 * encore publié : la liste affiche honnêtement son état vide. La fenêtre de
 * droite est une illustration (dossiers génériques, rôles réels du RBAC),
 * pas un accès à des données. Partagé entre l'Accueil et /documents ;
 * compatible Server Component.
 */
export function DocumentsOverview({
  showPageLink = false,
}: DocumentsOverviewProps) {
  const t = useTranslations('HomeDocuments');
  const tPage = useTranslations('DocumentsPage');
  const folders = t.raw('vault.folders') as { name: string; role: Role }[];

  return (
    <div className="grid gap-14 lg:grid-cols-2 lg:gap-24">
      <div>
        <h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
          {t('publicTitle')}
        </h3>
        <EmptyState
          variant="plain"
          icon={FileDown}
          className="mt-5 border-t border-sand py-8"
          message={tPage('publicListEmpty')}
          action={
            showPageLink && (
              <TextLink href="/documents" icon={ArrowRight} className="mt-6">
                {t('publicLink')}
              </TextLink>
            )
          }
        />
      </div>

      <div className="tone-night self-start bg-night shadow-[12px_12px_0_var(--color-malachite)]">
        <div className="flex items-center gap-3 border-b border-on-night/12 px-4 py-3 font-mono text-[11px]">
          <span className="flex gap-1.5" aria-hidden="true">
            <i className="h-2 w-2 rounded-full bg-on-night/20" />
            <i className="h-2 w-2 rounded-full bg-on-night/20" />
            <i className="h-2 w-2 rounded-full bg-on-night/20" />
          </span>
          <span>{t('vault.windowLabel')}</span>
          <span className="ml-auto flex items-center gap-1.5 text-malachite-bright">
            <Lock size={12} />
            {t('vault.secure')}
          </span>
        </div>

        <div className="p-6 sm:p-8">
          <div aria-hidden="true">
            <div className="flex items-center gap-2.5 border border-on-night/15 px-3.5 py-3 font-mono text-[11px]">
              <Search size={14} className="flex-none" />
              {t('vault.search')}
            </div>
            <ul className="my-5">
              {folders.map((folder) => (
                <li
                  key={folder.name}
                  className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-on-night/12 py-3 text-sm text-on-night"
                >
                  <span className="relative h-3 w-4 flex-none rounded-[1px] border-[1.5px] border-malachite-bright" />
                  {folder.name}
                  <em
                    className={`ml-auto border border-current px-1.5 py-0.5 font-mono text-[10px] not-italic uppercase tracking-[0.08em] ${ROLE_TONE[folder.role]}`}
                  >
                    {t(`vault.roles.${folder.role}`)}
                  </em>
                </li>
              ))}
            </ul>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-on-night-muted/70">
            {t('vault.illustration')}
          </p>
          <p className="mb-6 mt-3 text-sm leading-6">{t('vault.note')}</p>
          {/* next/link brut : /admin est une branche racine non localisée. */}
          <NextLink href="/admin/login" className={buttonClass('night')}>
            {t('vault.cta')} <ArrowRight size={15} />
          </NextLink>
        </div>
      </div>
    </div>
  );
}
