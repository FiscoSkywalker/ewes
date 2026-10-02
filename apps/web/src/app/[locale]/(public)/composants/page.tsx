import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Search,
} from 'lucide-react';
import {
  Button,
  ButtonAnchor,
  ButtonLink,
  EmptyState,
  FilterChip,
  Pagination,
  SectionHeading,
  TextLink,
} from '@/components/public/ui';

export const metadata: Metadata = {
  title: 'Composants du site public',
  robots: { index: false, follow: false },
};

/**
 * Catalogue vivant du kit du site public (blueprint/05_UI_UX_System.md §9 :
 * variantes documentées), dans le vrai contexte du site (polices, langue,
 * en-tête/pied). Outil de développement : 404 en production. Entièrement
 * serveur — les filtres et la pagination de démonstration passent par l'URL.
 */
export default async function PublicComponentsPage({
  params,
  searchParams,
}: PageProps<'/[locale]/composants'>) {
  if (process.env.NODE_ENV === 'production') notFound();
  const { locale } = await params;
  setRequestLocale(locale);

  const query = await searchParams;
  const filter = typeof query.filtre === 'string' ? query.filtre : 'tous';
  const page = Math.max(1, Number(query.page) || 1);
  const href = (next: { filtre?: string; page?: number }) => ({
    pathname: '/composants' as const,
    query: {
      ...(next.filtre && next.filtre !== 'tous' && { filtre: next.filtre }),
      ...(next.page && next.page > 1 && { page: String(next.page) }),
    },
  });

  return (
    <div className="text-sand">
      <section className="bg-paper-muted px-6 pb-16 pt-28 md:px-16 md:pt-36">
        <div className="mx-auto w-full max-w-[1440px]">
          <SectionHeading
            as="h1"
            eyebrow="Développement"
            title="Composants du site public"
            description="Kit partagé (components/public/ui), compatible Server Components. Parcourez la page au clavier (Tab) pour vérifier les focus. Chaque bloc montre un composant sur papier puis, si besoin, sur fond nuit."
            className="max-w-4xl"
          />
        </div>
      </section>

      <Demo
        title="Boutons"
        note="Une action principale par bloc. ButtonLink (lien localisé), ButtonAnchor (fichier, carte, portail), Button (formulaire). pending : envoi en cours."
      >
        <Row>
          <ButtonLink href="/contact" icon={ArrowRight}>
            Nous contacter
          </ButtonLink>
          <ButtonAnchor href="#" icon={ArrowUpRight}>
            Itinéraire
          </ButtonAnchor>
          <Button leadingIcon={ArrowDownToLine}>Télécharger</Button>
          <Button pending>Envoi en cours</Button>
          <Button disabled>Indisponible</Button>
        </Row>
        <Night>
          <ButtonLink href="/contact" tone="night" icon={ArrowRight}>
            Démarrer un projet
          </ButtonLink>
          <Button tone="night" pending>
            Envoi en cours
          </Button>
          <Button tone="night" disabled>
            Indisponible
          </Button>
        </Night>
      </Demo>

      <Demo
        title="Liens d’action secondaires"
        note="TextLink : « Voir tout », « En savoir plus » — jamais en concurrence avec le bouton principal."
      >
        <Row>
          <TextLink href="/actualites" icon={ArrowRight}>
            Toutes les actualités
          </TextLink>
          <TextLink href="/a-propos" icon={ArrowUpRight}>
            En savoir plus
          </TextLink>
        </Row>
        <Night>
          <TextLink href="/contact" tone="night" icon={ArrowUpRight}>
            Nos coordonnées
          </TextLink>
        </Night>
      </Demo>

      <Demo
        title="Filtres"
        note="FilterChip : lien aria-current si le filtre est dans l’URL (ici), bouton aria-pressed dans un îlot client. Variante square pour les registres."
      >
        <Row>
          {[
            ['tous', 'Tous', 34],
            ['environnement', 'Environnement', 15],
            ['eau', 'Eau', 11],
            ['ingenierie', 'Ingénierie', 8],
          ].map(([value, label, count]) => (
            <FilterChip
              key={value}
              href={href({ filtre: String(value), page })}
              active={filter === value}
              count={Number(count)}
            >
              {label}
            </FilterChip>
          ))}
        </Row>
        <Row>
          <FilterChip href={href({ page })} active shape="square" count={34}>
            Toutes
          </FilterChip>
          <FilterChip
            href={href({ filtre: 'eau', page })}
            active={false}
            shape="square"
            count={11}
          >
            Eau
          </FilterChip>
        </Row>
      </Demo>

      <Demo
        title="Pagination"
        note="Masquée s’il n’y a qu’une page ; cibles de 44 px ; liens rel=prev/next quand elle est portée par l’URL."
      >
        <Pagination
          page={page}
          pageCount={9}
          label="Pagination de démonstration"
          hrefFor={(number) => href({ filtre: filter, page: number })}
          className="justify-start"
        />
      </Demo>

      <Demo
        title="États vides"
        note="framed : liste vide ou aucun résultat ; plain : bloc secondaire. Toujours une explication, et l’action qui permet d’en sortir quand elle existe."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <EmptyState
            icon={Search}
            message="Aucune réalisation ne correspond à votre recherche. Essayez un autre mot-clé ou retirez un filtre."
            action={<Button>Réinitialiser</Button>}
          />
          <EmptyState
            align="center"
            message="Aucune actualité publiée pour le moment."
          />
          <EmptyState
            variant="plain"
            message="Aucun document n’est disponible pour le moment."
            action={
              <TextLink href="/contact" icon={ArrowRight}>
                Demander un document
              </TextLink>
            }
          />
        </div>
        <Night>
          <EmptyState
            tone="night"
            message="Aucun événement programmé pour le moment."
          />
        </Night>
      </Demo>

      <Demo
        title="Titres de section"
        note="SectionHeading : as=h1 pour le titre principal d’une page (un seul), h2 par défaut, h3 pour une sous-partie."
      >
        <SectionHeading
          as="h3"
          eyebrow="Pôle Eau"
          title="Exemple de titre de section"
          description="L’eyebrow prend la couleur du pôle de la section (--pole)."
          className="pole-eau max-w-3xl"
        />
      </Demo>
    </div>
  );
}

function Demo({
  title,
  note,
  children,
}: {
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border px-6 py-14 md:px-16">
      <div className="mx-auto w-full max-w-[1440px]">
        <h2 className="font-heading text-2xl font-bold">{title}</h2>
        <p className="mb-8 mt-2 max-w-3xl text-sm leading-7 text-sand/72">
          {note}
        </p>
        <div className="flex flex-col gap-6">{children}</div>
      </div>
    </section>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-4">{children}</div>;
}

function Night({ children }: { children: React.ReactNode }) {
  return (
    <div className="tone-night flex flex-wrap items-center gap-4 rounded-sheet bg-night p-8">
      {children}
    </div>
  );
}
