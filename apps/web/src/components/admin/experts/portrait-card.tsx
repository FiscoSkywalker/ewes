'use client';

import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Crosshair, Images, RotateCcw, Trash2, UserRound } from 'lucide-react';
import { cx, focusRing } from '@/lib/admin/cx';
import {
  DEFAULT_FOCAL,
  objectPositionOf,
  type FocalPoint,
} from '@/lib/admin/experts';
import { thumbOf } from '@/lib/admin/media';
import { Button, Card } from '../ui';
import { MediaPicker } from '../media/media-picker';

const clamp = (value: number) => Math.min(100, Math.max(0, Math.round(value)));

/**
 * Portrait de l'expert : une image de la médiathèque (existante ou ajoutée
 * dans le sélecteur), recadrée en 3:4 sur le site comme dans l'aperçu. Le
 * **point focal** dit quelle zone doit toujours rester visible (le visage) :
 * on le place sur l'image entière, l'aperçu du cadrage suit. Sans point choisi,
 * le cadrage par défaut vise le quart supérieur, centré. Sans photo, le site
 * affiche un monogramme. Le choix s'enregistre avec le reste du formulaire.
 */
export function PortraitCard({
  value,
  name,
  focal,
  onChange,
  onFocalChange,
}: {
  /** Adresse de l'image (`/uploads/<nom>`), ou `''`. */
  value: string;
  name: string;
  /** Point focal choisi ; `null` : cadrage par défaut. */
  focal: FocalPoint | null;
  onChange: (url: string) => void;
  onFocalChange: (focal: FocalPoint | null) => void;
}) {
  const [picking, setPicking] = useState(false);

  return (
    <Card
      title="Portrait"
      description="Facultatif. Sans photo, le site affiche les initiales."
    >
      <div className="space-y-4">
        {value && (
          <FocalPicker
            src={thumbOf(value)}
            focal={focal}
            onChange={onFocalChange}
          />
        )}
        <div className="flex items-start gap-4">
          <div className="relative aspect-[3/4] w-28 shrink-0 overflow-hidden rounded-xl border border-line bg-sunken sm:w-32">
            {value ? (
              // Image publique servie par l'API via `/uploads/*` : pas d'optimisation Next nécessaire dans le portail.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumbOf(value)}
                alt={name ? `Portrait de ${name}` : 'Portrait'}
                className="size-full object-cover"
                style={{ objectPosition: objectPositionOf(focal) }}
              />
            ) : (
              <span className="grid size-full place-items-center text-ink-subtle">
                <UserRound size={32} aria-hidden="true" />
              </span>
            )}
          </div>
          <div className="min-w-0 space-y-2">
            <Button
              variant="secondary"
              size="sm"
              icon={Images}
              onClick={() => setPicking(true)}
            >
              {value ? 'Remplacer' : 'Choisir une image'}
            </Button>
            {value && (
              <Button
                variant="ghost"
                size="sm"
                icon={Trash2}
                onClick={() => onChange('')}
              >
                <span className="text-bad">Retirer la photo</span>
              </Button>
            )}
            <p className="text-xs leading-relaxed text-ink-subtle">
              {value
                ? 'Aperçu du cadrage sur le site. '
                : 'Une image de la médiathèque, ou une nouvelle (JPEG, PNG ou WebP, 5 Mo au plus). '}
              Enregistrez ensuite le profil.
            </p>
          </div>
        </div>
      </div>

      <MediaPicker
        open={picking}
        onClose={() => setPicking(false)}
        onConfirm={([media]) => {
          if (media) onChange(media.url);
        }}
        title="Choisir le portrait"
        confirmLabel="Utiliser cette image"
      />
    </Card>
  );
}

/**
 * Image entière avec un repère à placer sur le visage : clic ou toucher,
 * glisser, ou flèches du clavier (1 %, avec Maj 10 %). Les coordonnées sont
 * des pourcentages de l'image, indépendants de la taille d'affichage.
 */
function FocalPicker({
  src,
  focal,
  onChange,
}: {
  src: string;
  focal: FocalPoint | null;
  onChange: (focal: FocalPoint | null) => void;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const point = focal ?? DEFAULT_FOCAL;

  const place = (event: PointerEvent<HTMLDivElement>) => {
    const box = frame.current?.getBoundingClientRect();
    if (!box || box.width === 0 || box.height === 0) return;
    onChange({
      x: clamp(((event.clientX - box.left) / box.width) * 100),
      y: clamp(((event.clientY - box.top) / box.height) * 100),
    });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 10 : 1;
    const move: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const delta = move[event.key];
    if (!delta) return;
    event.preventDefault();
    onChange({
      x: clamp(point.x + delta[0]),
      y: clamp(point.y + delta[1]),
    });
  };

  return (
    <div className="space-y-2">
      <div
        ref={frame}
        role="group"
        tabIndex={0}
        aria-label="Point focal du portrait"
        aria-describedby="focal-help"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          setDragging(true);
          place(event);
        }}
        onPointerMove={(event) => {
          if (dragging) place(event);
        }}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
        onKeyDown={onKeyDown}
        className={cx(
          'relative mx-auto w-full max-w-60 cursor-crosshair touch-none select-none overflow-hidden rounded-xl border border-line bg-sunken',
          focusRing,
        )}
      >
        {/* Image publique servie par l'API via `/uploads/*` : pas d'optimisation Next nécessaire dans le portail. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          draggable={false}
          className="block h-auto w-full"
        />
        <span
          aria-hidden="true"
          className={cx(
            'pointer-events-none absolute grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 bg-black/25 shadow-[0_0_0_1px_rgba(0,0,0,0.45)]',
            focal ? 'border-white' : 'border-dashed border-white/80',
          )}
          style={{ left: `${point.x}%`, top: `${point.y}%` }}
        >
          <span className="size-1.5 rounded-full bg-white" />
        </span>
      </div>
      <p
        id="focal-help"
        className="flex items-start gap-1.5 text-xs leading-relaxed text-ink-subtle"
      >
        <Crosshair size={13} aria-hidden="true" className="mt-0.5 shrink-0" />
        <span>
          Touchez ou cliquez sur le visage : cette zone reste visible quand le
          site recadre la photo (flèches du clavier pour affiner).
          <span role="status" className="ml-1 font-medium text-ink-muted">
            {focal
              ? `Point focal : ${focal.x} % · ${focal.y} %.`
              : 'Cadrage par défaut.'}
          </span>
        </span>
      </p>
      {focal && (
        <Button
          variant="ghost"
          size="sm"
          icon={RotateCcw}
          onClick={() => onChange(null)}
        >
          Rétablir le cadrage par défaut
        </Button>
      )}
    </div>
  );
}
