'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { CircleAlert, TriangleAlert, X } from 'lucide-react';
import { describeError } from '@/lib/api/backend';
import { cx } from '@/lib/admin/cx';
import { Button } from './button';
import { Field, Input } from './field';

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-5xl',
} as const;

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  /** Boutons d'action, alignés à droite (le principal en dernier). */
  footer?: ReactNode;
  size?: keyof typeof SIZES;
  /** `false` pendant une requête : ni Échap, ni clic extérieur, ni croix. */
  dismissible?: boolean;
  /**
   * Pictogramme d'en-tête (ex. avertissement d'une action destructive). Le
   * focus initial va à l'élément portant `data-autofocus`.
   */
  icon?: ReactNode;
  children?: ReactNode;
}

/**
 * Fenêtre modale sur l'élément natif `<dialog>` (`showModal`) : couche
 * supérieure, focus piégé et rendu à l'élément d'origine, reste de la page
 * inerte, Échap géré par le navigateur. Le contenu n'est monté qu'à
 * l'ouverture (un formulaire repart vierge).
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  footer,
  size = 'md',
  dismissible = true,
  icon,
  children,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // Focus initial explicite : `data-autofocus` (premier champ d'un
      // formulaire, « Annuler » d'une confirmation) plutôt que la croix.
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        if (dismissible) onClose();
      }}
      onClose={() => {
        // Fermeture forcée par le navigateur (Chrome ignore un 2e refus
        // d'Échap) : on reste cohérent avec l'état de l'écran.
        if (!open) return;
        if (dismissible) onClose();
        else ref.current?.showModal();
      }}
      onClick={(event) => {
        // Clic sur le voile (l'élément <dialog> lui-même, hors du panneau).
        if (event.target === ref.current && dismissible) onClose();
      }}
      className={cx(
        'm-auto w-[calc(100%-2rem)] overflow-visible rounded-2xl border border-line bg-raised p-0 text-ink shadow-pop',
        'backdrop:bg-[#041014]/50 backdrop:backdrop-blur-[3px]',
        'animate-dialog-in',
        SIZES[size],
      )}
    >
      {open && (
        <div className="flex max-h-[85dvh] flex-col">
          <header className="flex items-start gap-3.5 px-5 pb-1 pt-5">
            {icon}
            <div className="min-w-0 flex-1">
              <h2
                id={titleId}
                className="text-base font-semibold tracking-tight text-balance text-ink"
              >
                {title}
              </h2>
              {description && (
                <div
                  id={descriptionId}
                  className="mt-1 text-[13px] leading-relaxed text-ink-muted"
                >
                  {description}
                </div>
              )}
            </div>
            {dismissible && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer"
                className="-mr-1 -mt-1 grid size-8 shrink-0 place-items-center rounded-lg text-ink-subtle hover:bg-ink/5 hover:text-ink"
              >
                <X size={17} aria-hidden="true" />
              </button>
            )}
          </header>
          {children && (
            <div className="portal-scroll min-h-0 flex-1 overflow-y-auto px-5 py-3">
              {children}
            </div>
          )}
          {footer && (
            <footer className="mt-2 flex flex-col-reverse gap-2 border-t border-line bg-sunken/50 px-5 py-3.5 sm:flex-row sm:justify-end">
              {footer}
            </footer>
          )}
        </div>
      )}
    </dialog>
  );
}

// --- Confirmation ---

export interface ConfirmOptions {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` : suppression, révocation, changement de rôle… */
  tone?: 'default' | 'danger';
  /**
   * Texte à recopier pour confirmer une action irréversible (ex. le nom de
   * l'élément supprimé) — blueprint/14_Admin_Backoffice.md §4.
   */
  confirmationText?: string;
  /**
   * Action à exécuter. La fenêtre reste ouverte, bouton verrouillé, jusqu'à
   * la réponse du serveur ; un échec s'affiche dans la fenêtre (pas de
   * succès présumé, blueprint/16_Rendering_State_Strategy.md §6).
   */
  onConfirm?: () => Promise<unknown> | unknown;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * `const confirm = useConfirm();`
 * `if (await confirm({ title, tone: 'danger', onConfirm: () => api.delete() })) toast.success(…)`
 * — résout `true` une fois l'action réussie, `false` si l'utilisateur annule.
 */
export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext);
  if (!confirm)
    throw new Error('useConfirm doit être utilisé sous ConfirmProvider');
  return confirm;
}

interface PendingConfirm {
  options: ConfirmOptions;
  resolve: (confirmed: boolean) => void;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<PendingConfirm | null>(null);

  const confirm = useCallback<ConfirmFn>(
    (options) =>
      new Promise<boolean>((resolve) => {
        setCurrent((previous) => {
          previous?.resolve(false);
          return { options, resolve };
        });
      }),
    [],
  );

  const settle = (confirmed: boolean) => {
    current?.resolve(confirmed);
    setCurrent(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog pending={current} onSettle={settle} />
    </ConfirmContext.Provider>
  );
}

function ConfirmDialog({
  pending,
  onSettle,
}: {
  pending: PendingConfirm | null;
  onSettle: (confirmed: boolean) => void;
}) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [typed, setTyped] = useState('');

  // Nouvelle demande : saisie et erreur remises à zéro. (Pas de `key` : le
  // <dialog> doit rester le même élément pour rendre le focus à l'origine.)
  const [lastPending, setLastPending] = useState(pending);
  if (pending !== lastPending) {
    setLastPending(pending);
    setRunning(false);
    setError(null);
    setTyped('');
  }
  const options = pending?.options;
  const danger = options?.tone === 'danger';
  const mustType = options?.confirmationText;
  const canConfirm = !mustType || typed.trim() === mustType;

  async function run() {
    if (!options || !canConfirm || running) return;
    setError(null);
    if (!options.onConfirm) {
      onSettle(true);
      return;
    }
    setRunning(true);
    try {
      await options.onConfirm();
      onSettle(true);
    } catch (caught) {
      setError(caught);
      setRunning(false);
    }
  }

  const errorInfo = error ? describeError(error) : null;

  return (
    <Dialog
      open={Boolean(pending)}
      onClose={() => onSettle(false)}
      dismissible={!running}
      size="md"
      title={options?.title}
      description={options?.description}
      icon={
        danger ? (
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-bad-soft text-bad">
            <TriangleAlert size={19} aria-hidden="true" />
          </span>
        ) : undefined
      }
      footer={
        <>
          <Button
            variant="secondary"
            onClick={() => onSettle(false)}
            disabled={running}
            data-autofocus={mustType ? undefined : true}
          >
            {options?.cancelLabel ?? 'Annuler'}
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            loading={running}
            disabled={!canConfirm}
            onClick={run}
          >
            {options?.confirmLabel ?? 'Confirmer'}
          </Button>
        </>
      }
    >
      {(mustType || errorInfo) && (
        <div className="flex flex-col gap-3">
          {mustType && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void run();
              }}
            >
              <Field
                label={
                  <>
                    Pour confirmer, saisissez{' '}
                    <strong className="font-semibold">{mustType}</strong>
                  </>
                }
                required
              >
                <Input
                  value={typed}
                  onChange={(event) => setTyped(event.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  disabled={running}
                  data-autofocus
                />
              </Field>
            </form>
          )}
          {errorInfo && (
            <div
              role="alert"
              className="flex gap-2.5 rounded-xl border border-bad/25 bg-bad-soft px-3.5 py-3 text-[13px]"
            >
              <CircleAlert
                size={16}
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-bad"
              />
              <div>
                <p className="font-medium text-ink">{errorInfo.title}</p>
                <p className="mt-0.5 text-ink-muted">{errorInfo.message}</p>
                {errorInfo.requestId && (
                  <p className="mt-1 font-mono text-[11px] text-ink-subtle">
                    Référence : {errorInfo.requestId}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}
