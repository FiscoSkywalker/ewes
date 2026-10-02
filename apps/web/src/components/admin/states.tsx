import { Compass, ShieldAlert } from 'lucide-react';
import { ButtonLink, EmptyState } from './ui';

/**
 * États d'écran entier propres au portail (blueprint/05_UI_UX_System.md §5 :
 * non autorisé, introuvable), construits sur `EmptyState`.
 */

/** Affiché quand le rôle n'ouvre pas cet écran. Le serveur refuserait de toute façon les données. */
export function AccessDenied({ homeHref }: { homeHref: string }) {
  return (
    <EmptyState
      size="page"
      asPageTitle
      tone="bad"
      icon={ShieldAlert}
      title="Accès non autorisé"
      description="Votre rôle ne permet pas d’ouvrir cet écran. Si vous pensez qu’il s’agit d’une erreur, contactez un administrateur du portail."
      action={
        <ButtonLink href={homeHref}>Retour à l’accueil du portail</ButtonLink>
      }
    />
  );
}

export function PortalNotFound({ homeHref }: { homeHref: string }) {
  return (
    <EmptyState
      size="page"
      asPageTitle
      tone="brand"
      icon={Compass}
      title="Page introuvable"
      description="Cette adresse ne correspond à aucun écran du portail. Utilisez le menu ou la recherche (Ctrl K) pour retrouver votre chemin."
      action={
        <ButtonLink href={homeHref}>Retour à l’accueil du portail</ButtonLink>
      }
    />
  );
}
