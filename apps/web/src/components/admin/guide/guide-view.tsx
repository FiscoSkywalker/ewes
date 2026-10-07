'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  ArrowUp,
  ChevronDown,
  CircleHelp,
  SearchX,
} from 'lucide-react';
import { cx } from '@/lib/admin/cx';
import {
  questionMatches,
  questionsFor,
  searchTerms,
  topicMatches,
  topicsFor,
  type GuideTopic,
} from '@/lib/admin/guide';
import type { NavTone } from '@/lib/admin/navigation';
import { ROLE_PROFILES } from '@/lib/admin/users';
import type { Role } from '@/lib/admin/roles';
import { Button, ButtonLink, EmptyState, SearchInput } from '../ui';
import { GuideBlockView, Rich } from './guide-blocks';

const TILE: Record<NavTone, string> = {
  brand: 'bg-brand-soft text-brand',
  env: 'bg-env-soft text-env',
  ing: 'bg-ing-soft text-ing',
  neutral: 'bg-sunken text-ink-muted',
};

function plural(count: number, one: string, many = `${one}s`) {
  return `${count} ${count > 1 ? many : one}`;
}

function TopicCard({ topic }: { topic: GuideTopic }) {
  const Icon = topic.icon;
  return (
    <a
      href={`#${topic.id}`}
      className="group flex items-start gap-3.5 rounded-2xl border border-line bg-panel p-4 transition-all hover:-translate-y-0.5 hover:border-line-strong hover:shadow-panel"
    >
      <span
        aria-hidden="true"
        className={cx(
          'grid size-10 shrink-0 place-items-center rounded-xl',
          TILE[topic.tone],
        )}
      >
        <Icon size={19} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-semibold text-ink">
          {topic.title}
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed text-ink-muted">
          {topic.summary}
        </span>
      </span>
      <ArrowRight
        size={16}
        aria-hidden="true"
        className="mt-1 shrink-0 text-ink-subtle transition-transform group-hover:translate-x-0.5"
      />
    </a>
  );
}

function TopicSection({ topic, role }: { topic: GuideTopic; role: Role }) {
  const Icon = topic.icon;
  const titleId = `${topic.id}-title`;
  return (
    <section
      id={topic.id}
      aria-labelledby={titleId}
      className="scroll-mt-4 rounded-2xl border border-line bg-panel"
    >
      <header className="flex flex-wrap items-start gap-x-4 gap-y-3 border-b border-line px-5 py-4 sm:px-6">
        <span
          aria-hidden="true"
          className={cx(
            'grid size-10 shrink-0 place-items-center rounded-xl',
            TILE[topic.tone],
          )}
        >
          <Icon size={19} />
        </span>
        <div className="min-w-0 flex-1 basis-56">
          <h2 id={titleId} className="text-base font-semibold text-ink">
            {topic.title}
          </h2>
          <p className="mt-0.5 text-[13px] text-ink-muted">{topic.summary}</p>
        </div>
        {topic.screen && (
          <ButtonLink
            href={topic.screen.href}
            variant="secondary"
            size="sm"
            iconRight={ArrowRight}
          >
            Ouvrir : {topic.screen.label}
          </ButtonLink>
        )}
      </header>

      <div className="space-y-7 px-5 py-6 sm:px-6">
        {topic.blocks.map((block, index) => (
          <GuideBlockView key={index} block={block} role={role} />
        ))}
      </div>

      <footer className="border-t border-line px-5 py-2.5 sm:px-6">
        <a
          href="#sommaire"
          className="inline-flex items-center gap-1.5 rounded text-xs font-medium text-ink-subtle hover:text-ink"
        >
          <ArrowUp size={13} aria-hidden="true" />
          Retour au sommaire
        </a>
      </footer>
    </section>
  );
}

/**
 * Le guide d'utilisation : sommaire, rubriques écran par écran, questions
 * fréquentes — limités à ce que le rôle de la personne lui permet de faire.
 * Tout est statique et local : la recherche filtre le contenu déjà chargé.
 */
export function GuideView({ role }: { role: Role }) {
  const [query, setQuery] = useState('');
  const terms = useMemo(() => searchTerms(query), [query]);
  const searching = terms.length > 0;

  const topics = useMemo(() => topicsFor(role), [role]);
  const questions = useMemo(() => questionsFor(role), [role]);
  const shownTopics = useMemo(
    () => topics.filter((topic) => topicMatches(topic, terms)),
    [topics, terms],
  );
  const shownQuestions = useMemo(
    () => questions.filter((question) => questionMatches(question, terms)),
    [questions, terms],
  );
  const total = shownTopics.length + shownQuestions.length;

  // Arrivée sur une rubrique par son adresse (`/admin/aide#statuts`) : le
  // contenu n'existe qu'après l'hydratation, le navigateur ne l'a pas trouvé.
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (id) document.getElementById(id)?.scrollIntoView({ block: 'start' });
  }, []);

  const profile = ROLE_PROFILES[role];

  return (
    <div className="space-y-8">
      <div
        id="sommaire"
        className="animate-rise-in scroll-mt-4 space-y-4 [animation-delay:60ms]"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInput
            label="Rechercher dans le guide"
            placeholder="Rechercher dans le guide : publier, mot de passe, droits…"
            value={query}
            onValueChange={setQuery}
            className="min-w-0 flex-1"
          />
          <p className="text-xs text-ink-subtle sm:max-w-xs sm:text-right">
            Ce guide présente ce que le rôle{' '}
            <strong className="font-semibold text-ink-muted">
              {profile.label}
            </strong>{' '}
            permet de faire.
          </p>
        </div>
        <p role="status" aria-live="polite" className="sr-only">
          {searching
            ? `${plural(shownTopics.length, 'rubrique')} et ${plural(shownQuestions.length, 'question')} correspondent à votre recherche.`
            : ''}
        </p>
      </div>

      {searching && total === 0 ? (
        <div className="rounded-2xl border border-line bg-panel">
          <EmptyState
            icon={SearchX}
            title="Aucun résultat dans le guide"
            description={
              <>
                Essayez un mot plus simple (« publier », « document », « compte
                ») ou parcourez le sommaire.
              </>
            }
            action={
              <Button variant="secondary" onClick={() => setQuery('')}>
                Effacer la recherche
              </Button>
            }
          />
        </div>
      ) : (
        <>
          {!searching && (
            <section
              aria-labelledby="summary-title"
              className="animate-rise-in [animation-delay:100ms]"
            >
              <h2
                id="summary-title"
                className="mb-3 text-sm font-semibold text-ink"
              >
                Sommaire
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {topics.map((topic) => (
                  <TopicCard key={topic.id} topic={topic} />
                ))}
                <a
                  href="#questions"
                  className="group flex items-start gap-3.5 rounded-2xl border border-line bg-panel p-4 transition-all hover:-translate-y-0.5 hover:border-line-strong hover:shadow-panel"
                >
                  <span
                    aria-hidden="true"
                    className={cx(
                      'grid size-10 shrink-0 place-items-center rounded-xl',
                      TILE.neutral,
                    )}
                  >
                    <CircleHelp size={19} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-semibold text-ink">
                      Questions fréquentes
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-ink-muted">
                      Les réponses aux situations les plus courantes.
                    </span>
                  </span>
                  <ArrowRight
                    size={16}
                    aria-hidden="true"
                    className="mt-1 shrink-0 text-ink-subtle transition-transform group-hover:translate-x-0.5"
                  />
                </a>
              </div>
            </section>
          )}

          {shownTopics.map((topic) => (
            <TopicSection key={topic.id} topic={topic} role={role} />
          ))}

          {shownQuestions.length > 0 && (
            <section
              id="questions"
              aria-labelledby="questions-title"
              className="scroll-mt-4 rounded-2xl border border-line bg-panel"
            >
              <header className="flex items-start gap-3.5 border-b border-line px-5 py-4 sm:px-6">
                <span
                  aria-hidden="true"
                  className={cx(
                    'grid size-10 shrink-0 place-items-center rounded-xl',
                    TILE.neutral,
                  )}
                >
                  <CircleHelp size={19} />
                </span>
                <div>
                  <h2
                    id="questions-title"
                    className="text-base font-semibold text-ink"
                  >
                    Questions fréquentes
                  </h2>
                  <p className="mt-0.5 text-[13px] text-ink-muted">
                    Cliquez sur une question pour lire la réponse.
                  </p>
                </div>
              </header>
              <div className="divide-y divide-line">
                {shownQuestions.map((question) => (
                  <details
                    key={question.id}
                    id={question.id}
                    // Une recherche déplie les réponses trouvées.
                    open={searching || undefined}
                    className="group scroll-mt-4"
                  >
                    <summary className="flex cursor-pointer list-none items-start gap-3 px-5 py-3.5 text-[13.5px] font-medium text-ink outline-none transition-colors hover:bg-sunken/60 focus-visible:bg-sunken/60 sm:px-6 [&::-webkit-details-marker]:hidden">
                      <span className="min-w-0 flex-1">
                        {question.question}
                      </span>
                      <ChevronDown
                        size={16}
                        aria-hidden="true"
                        className="mt-0.5 shrink-0 text-ink-subtle transition-transform group-open:rotate-180"
                      />
                    </summary>
                    <p className="px-5 pb-4 pr-12 text-[13.5px] leading-relaxed text-ink-muted sm:px-6 sm:pr-14">
                      <Rich text={question.answer} />
                    </p>
                  </details>
                ))}
              </div>
              <footer className="border-t border-line px-5 py-2.5 sm:px-6">
                <a
                  href="#sommaire"
                  className="inline-flex items-center gap-1.5 rounded text-xs font-medium text-ink-subtle hover:text-ink"
                >
                  <ArrowUp size={13} aria-hidden="true" />
                  Retour au sommaire
                </a>
              </footer>
            </section>
          )}

          {!searching && (
            <p className="text-center text-xs text-ink-subtle">
              Une question qui reste sans réponse ? Demandez à un administrateur
              EWES.
            </p>
          )}
        </>
      )}
    </div>
  );
}
