import { DocsNav } from '@/components/admin/private-docs/docs-nav';

/**
 * Cadre des écrans de l'espace documentaire (explorateur, recherche,
 * archives, droits d'accès) : sur petit écran, une rangée de raccourcis entre
 * eux. Application client-side (blueprint/16) ; le périmètre de chaque compte
 * est appliqué par l'API à chaque requête.
 */
export default function DocumentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-5 lg:space-y-6">
      <DocsNav />
      {children}
    </div>
  );
}
