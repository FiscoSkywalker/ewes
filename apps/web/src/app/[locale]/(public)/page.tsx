import { getTranslations } from 'next-intl/server';

/**
 * Accueil — blueprint/15_Public_Site_Pages.md. Rendu SSG + ISR (contenu
 * institutionnel appelé à devenir dynamique en Phase 02 via le module
 * NestJS `pages`). Server Component pur, aucune donnée client requise.
 */
export default async function HomePage() {
  const t = await getTranslations('HomePage');

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-semibold text-(--color-text)">
        {t('title')}
      </h1>
      <p className="text-(--color-text-muted)">{t('intro')}</p>
    </section>
  );
}
