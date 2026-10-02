'use client';

import {
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  CircleAlert,
  CircleCheck,
  Info,
  TriangleAlert,
  X,
  type LucideIcon,
} from 'lucide-react';
import { describeError } from '@/lib/api/backend';
import { cx } from '@/lib/admin/cx';

export type ToastTone = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  description?: ReactNode;
  action?: { label: string; onClick: () => void };
  /** Durée d'affichage en ms ; `Infinity` : jusqu'à fermeture manuelle. */
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: number;
  tone: ToastTone;
  title: ReactNode;
  leaving: boolean;
}

const TONES: Record<
  ToastTone,
  { icon: LucideIcon; tile: string; bar: string }
> = {
  success: { icon: CircleCheck, tile: 'text-ok', bar: 'bg-ok' },
  error: { icon: CircleAlert, tile: 'text-bad', bar: 'bg-bad' },
  warning: { icon: TriangleAlert, tile: 'text-warn', bar: 'bg-warn' },
  info: { icon: Info, tile: 'text-brand', bar: 'bg-brand' },
};

const DEFAULT_DURATION: Record<ToastTone, number> = {
  success: 5000,
  info: 5000,
  warning: 8000,
  error: 9000,
};

const MAX_VISIBLE = 4;

export interface ToastApi {
  show: (tone: ToastTone, title: ReactNode, options?: ToastOptions) => number;
  success: (title: ReactNode, options?: ToastOptions) => number;
  info: (title: ReactNode, options?: ToastOptions) => number;
  warning: (title: ReactNode, options?: ToastOptions) => number;
  /** Accepte un titre, ou directement l'erreur levée (message déduit, blueprint/08 §2). */
  error: (titleOrError: unknown, options?: ToastOptions) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

/**
 * Retour bref après une action (« Article publié »). Le toast confirme ce que
 * le serveur a validé — jamais un succès présumé. Pour une erreur qui exige
 * une décision, préférer un message dans l'écran ou la fenêtre concernée.
 */
export function useToast(): ToastApi {
  const toast = useContext(ToastContext);
  if (!toast) throw new Error('useToast doit être utilisé sous ToastProvider');
  return toast;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((list) =>
      list.map((t) => (t.id === id ? { ...t, leaving: true } : t)),
    );
    window.setTimeout(() => {
      setToasts((list) => list.filter((t) => t.id !== id));
    }, 180);
  }, []);

  const show = useCallback<ToastApi['show']>((tone, title, options = {}) => {
    const id = nextId.current++;
    setToasts((list) => [
      ...list.slice(-(MAX_VISIBLE - 1)),
      { id, tone, title, leaving: false, ...options },
    ]);
    return id;
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      show,
      dismiss,
      success: (title, options) => show('success', title, options),
      info: (title, options) => show('info', title, options),
      warning: (title, options) => show('warning', title, options),
      error: (value, options) => {
        if (typeof value === 'string' || isValidElement(value)) {
          return show('error', value, options);
        }
        const info = describeError(value);
        return show('error', info.title, {
          description: info.message,
          ...options,
        });
      },
    }),
    [show, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <section
        aria-label="Messages de confirmation"
        className="pointer-events-none fixed inset-x-3 bottom-3 z-80 flex flex-col items-center gap-2 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:items-end"
      >
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            toast={toast}
            onDismiss={() => dismiss(toast.id)}
          />
        ))}
      </section>
    </ToastContext.Provider>
  );
}

function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: () => void;
}) {
  const tone = TONES[toast.tone];
  const Icon = tone.icon;
  const duration = toast.duration ?? DEFAULT_DURATION[toast.tone];
  const timed = Number.isFinite(duration);

  return (
    <div
      role={toast.tone === 'error' ? 'alert' : 'status'}
      className={cx(
        'toast pointer-events-auto relative w-full max-w-[380px] overflow-hidden rounded-xl border border-line bg-raised shadow-pop transition-[opacity,transform] duration-200',
        toast.leaving ? 'translate-x-2 opacity-0' : 'animate-toast-in',
      )}
    >
      <div className="flex gap-3 px-4 py-3.5">
        <Icon
          size={18}
          aria-hidden="true"
          className={cx('mt-px shrink-0', tone.tile)}
        />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium leading-snug text-ink">
            {toast.title}
          </p>
          {toast.description && (
            <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
              {toast.description}
            </p>
          )}
          {toast.action && (
            <button
              type="button"
              onClick={() => {
                toast.action?.onClick();
                onDismiss();
              }}
              className="mt-2 text-xs font-semibold text-brand hover:text-brand-strong"
            >
              {toast.action.label}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Fermer le message"
          className="-mr-1.5 -mt-1 grid size-7 shrink-0 place-items-center rounded-md text-ink-subtle hover:bg-ink/5 hover:text-ink"
        >
          <X size={15} aria-hidden="true" />
        </button>
      </div>
      {timed && !toast.leaving && (
        <span
          aria-hidden="true"
          onAnimationEnd={onDismiss}
          style={{ animationDuration: `${duration}ms` }}
          className={cx(
            'toast-timer absolute inset-x-0 bottom-0 h-0.5 opacity-60',
            tone.bar,
          )}
        />
      )}
    </div>
  );
}
