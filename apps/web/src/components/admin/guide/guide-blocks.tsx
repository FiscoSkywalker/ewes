import { Check, Lightbulb, TriangleAlert, X } from 'lucide-react';
import { cx } from '@/lib/admin/cx';
import type { GuideBlock } from '@/lib/admin/guide';
import type { Role } from '@/lib/admin/roles';
import { ROLE_PROFILES } from '@/lib/admin/users';
import { Badge } from '../ui';

/** Texte courant avec `**gras**` (nom d'un bouton, d'un champ ou d'un écran). */
export function Rich({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <strong key={index} className="font-semibold text-ink">
            {part}
          </strong>
        ) : (
          part
        ),
      )}
    </>
  );
}

function BlockTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 text-[13px] font-semibold text-ink">{children}</h3>
  );
}

const NOTES = {
  tip: {
    icon: Lightbulb,
    label: 'Bon à savoir',
    box: 'border-brand/20 bg-brand-soft/60',
    tile: 'bg-brand-soft text-brand',
  },
  warn: {
    icon: TriangleAlert,
    label: 'Attention',
    box: 'border-warn/30 bg-warn-soft/70',
    tile: 'bg-warn-soft text-warn',
  },
} as const;

/** Un bloc d'une rubrique du guide. `role` met en évidence le rôle de la personne. */
export function GuideBlockView({
  block,
  role,
}: {
  block: GuideBlock;
  role: Role;
}) {
  switch (block.kind) {
    case 'steps':
      return (
        <div>
          <BlockTitle>{block.title}</BlockTitle>
          <ol className="space-y-3">
            {block.steps.map((step, index) => (
              <li key={step} className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="mt-px grid size-6 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-semibold text-brand"
                >
                  {index + 1}
                </span>
                <span className="min-w-0 pt-0.5 text-[13.5px] leading-relaxed text-ink-muted">
                  <span className="sr-only">Étape {index + 1} : </span>
                  <Rich text={step} />
                </span>
              </li>
            ))}
          </ol>
        </div>
      );

    case 'list':
      return (
        <div>
          <BlockTitle>{block.title}</BlockTitle>
          <ul className="space-y-2.5">
            {block.items.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 text-[13.5px] leading-relaxed text-ink-muted"
              >
                <span
                  aria-hidden="true"
                  className="mt-2 size-1.5 shrink-0 rounded-full bg-ink-subtle"
                />
                <span className="min-w-0">
                  <Rich text={item} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      );

    case 'terms':
      return (
        <div>
          <BlockTitle>{block.title}</BlockTitle>
          <dl className="grid gap-2.5 sm:grid-cols-2">
            {block.items.map((item) => (
              <div
                key={item.term}
                className="rounded-xl border border-line bg-sunken/60 px-4 py-3"
              >
                <dt className="text-[13px] font-semibold text-ink">
                  {item.term}
                </dt>
                <dd className="mt-1 text-[13px] leading-relaxed text-ink-muted">
                  <Rich text={item.text} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      );

    case 'note': {
      const note = NOTES[block.tone];
      const Icon = note.icon;
      return (
        <aside
          className={cx(
            'flex items-start gap-3 rounded-xl border px-4 py-3.5',
            note.box,
          )}
        >
          <span
            aria-hidden="true"
            className={cx(
              'grid size-7 shrink-0 place-items-center rounded-lg',
              note.tile,
            )}
          >
            <Icon size={15} />
          </span>
          <p className="min-w-0 pt-0.5 text-[13.5px] leading-relaxed text-ink-muted">
            <strong className="font-semibold text-ink">{note.label}. </strong>
            <Rich text={block.text} />
          </p>
        </aside>
      );
    }

    case 'roles':
      return (
        <div className="grid gap-3 lg:grid-cols-3">
          {(Object.keys(ROLE_PROFILES) as Role[]).map((key) => {
            const profile = ROLE_PROFILES[key];
            const Icon = profile.icon;
            const mine = key === role;
            return (
              <article
                key={key}
                className={cx(
                  'rounded-xl border p-4',
                  mine ? 'border-brand/40 bg-brand-soft/40' : 'border-line',
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className={cx(
                      'grid size-9 shrink-0 place-items-center rounded-lg',
                      profile.tile,
                    )}
                  >
                    <Icon size={17} />
                  </span>
                  <div className="min-w-0">
                    <h3 className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                      {profile.label}
                      {mine && <Badge tone="brand">Votre rôle</Badge>}
                    </h3>
                    <p className="text-xs text-ink-muted">{profile.tagline}</p>
                  </div>
                </div>
                <ul className="mt-3.5 space-y-2">
                  {profile.can.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2 text-[13px] leading-snug text-ink-muted"
                    >
                      <Check
                        size={14}
                        aria-hidden="true"
                        className="mt-0.5 shrink-0 text-ok"
                      />
                      <span>
                        <span className="sr-only">Peut : </span>
                        {item}
                      </span>
                    </li>
                  ))}
                  {profile.cannot.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2 text-[13px] leading-snug text-ink-subtle"
                    >
                      <X
                        size={14}
                        aria-hidden="true"
                        className="mt-0.5 shrink-0 text-bad"
                      />
                      <span>
                        <span className="sr-only">Ne peut pas : </span>
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      );
  }
}
