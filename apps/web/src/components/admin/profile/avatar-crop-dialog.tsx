'use client';

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { ImageOff, Loader2, Minus, Move, Plus } from 'lucide-react';
import { AVATAR_OUTPUT_SIZE } from '@/lib/admin/profile';
import { Button, Dialog, IconButton } from '../ui';

/** Côté (px) de la zone de recadrage affichée ; la photo enregistrée est de `AVATAR_OUTPUT_SIZE`. */
const VIEW = 288;
const MAX_ZOOM = 4;
const KEY_STEP = 12;

interface Point {
  x: number;
  y: number;
}

interface AvatarCropDialogProps {
  /** Photo choisie ; `null` : fenêtre fermée. */
  file: File | null;
  onClose: () => void;
  /** Reçoit la photo recadrée ; rejeter garde la fenêtre ouverte (l'appelant a déjà affiché l'erreur). */
  onSave: (image: Blob) => Promise<void>;
}

/**
 * Recadrage de la photo de profil : on déplace et on zoome l'image sous un
 * masque rond, ce qui reste visible est ce qui sera enregistré. Tout se fait
 * dans le navigateur (aucune bibliothèque) ; l'API recadre et ré-encode de
 * toute façon, ceci sert à choisir le cadrage plutôt qu'à le garantir.
 */
export function AvatarCropDialog({
  file,
  onClose,
  onSave,
}: AvatarCropDialogProps) {
  const [saving, setSaving] = useState(false);
  return (
    <Dialog
      open={file !== null}
      onClose={onClose}
      dismissible={!saving}
      title="Recadrer votre photo"
      description="Déplacez et zoomez : la partie visible dans le cercle sera votre photo de profil."
    >
      {file && (
        <CropWorkspace
          // Une autre photo repart de zéro.
          key={`${file.name}:${file.size}:${file.lastModified}`}
          file={file}
          saving={saving}
          onCancel={onClose}
          onSave={async (image) => {
            setSaving(true);
            try {
              await onSave(image);
            } finally {
              setSaving(false);
            }
          }}
        />
      )}
    </Dialog>
  );
}

type Loaded =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; image: HTMLImageElement; url: string };

function CropWorkspace({
  file,
  saving,
  onCancel,
  onSave,
}: {
  file: File;
  saving: boolean;
  onCancel: () => void;
  onSave: (image: Blob) => Promise<void>;
}) {
  const [loaded, setLoaded] = useState<Loaded>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.src = url;
    // `decode` applique l'orientation EXIF : une photo de téléphone s'affiche à l'endroit.
    image
      .decode()
      .then(() => {
        if (!cancelled) setLoaded({ status: 'ready', image, url });
      })
      .catch(() => {
        if (!cancelled) setLoaded({ status: 'error' });
      });
    return () => {
      cancelled = true;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  if (loaded.status === 'loading') {
    return (
      <div
        role="status"
        className="grid h-72 place-items-center text-sm text-ink-muted"
      >
        <span className="flex items-center gap-2">
          <Loader2 size={18} aria-hidden="true" className="animate-spin" />
          Ouverture de la photo…
        </span>
      </div>
    );
  }
  if (loaded.status === 'error') {
    return (
      <div className="space-y-5 py-4 text-center" role="alert">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-bad-soft text-bad">
          <ImageOff size={26} aria-hidden="true" />
        </span>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-ink">
            Cette image ne peut pas être lue
          </p>
          <p className="text-[13px] text-ink-muted">
            Le fichier est peut-être corrompu. Essayez une photo JPEG, PNG ou
            WebP.
          </p>
        </div>
        <Button variant="secondary" onClick={onCancel}>
          Fermer
        </Button>
      </div>
    );
  }
  return (
    <Cropper
      image={loaded.image}
      url={loaded.url}
      saving={saving}
      onCancel={onCancel}
      onSave={onSave}
    />
  );
}

function Cropper({
  image,
  url,
  saving,
  onCancel,
  onSave,
}: {
  image: HTMLImageElement;
  url: string;
  saving: boolean;
  onCancel: () => void;
  onSave: (image: Blob) => Promise<void>;
}) {
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  // Échelle qui fait « couvrir » la zone par l'image : à zoom 1, aucun bord vide.
  const baseScale = Math.max(VIEW / width, VIEW / height);

  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Point>(() => ({
    x: (VIEW - width * baseScale) / 2,
    y: (VIEW - height * baseScale) / 2,
  }));
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ pointer: Point; origin: Point } | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  const scale = baseScale * zoom;

  /** L'image ne quitte jamais la zone : pas de bord vide dans le cercle. */
  const clamp = (point: Point, forScale: number): Point => ({
    x: Math.min(0, Math.max(VIEW - width * forScale, point.x)),
    y: Math.min(0, Math.max(VIEW - height * forScale, point.y)),
  });

  /** Zoome autour du centre de la zone : ce qui est au milieu y reste. */
  function zoomTo(next: number) {
    const value = Math.min(MAX_ZOOM, Math.max(1, next));
    const nextScale = baseScale * value;
    const centre = {
      x: (VIEW / 2 - offset.x) / scale,
      y: (VIEW / 2 - offset.y) / scale,
    };
    setOffset(
      clamp(
        {
          x: VIEW / 2 - centre.x * nextScale,
          y: VIEW / 2 - centre.y * nextScale,
        },
        nextScale,
      ),
    );
    setZoom(value);
  }

  // `onWheel` de React est passif : la molette ferait défiler la page au lieu de zoomer.
  const latest = useRef({ zoom, zoomTo });
  useEffect(() => {
    latest.current = { zoom, zoomTo };
  });
  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    function onWheel(event: WheelEvent) {
      event.preventDefault();
      const { zoom: current, zoomTo: apply } = latest.current;
      apply(current * (event.deltaY < 0 ? 1.08 : 1 / 1.08));
    }
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, []);

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      pointer: { x: event.clientX, y: event.clientY },
      origin: offset,
    };
    setDragging(true);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const start = drag.current;
    if (!start) return;
    setOffset(
      clamp(
        {
          x: start.origin.x + event.clientX - start.pointer.x,
          y: start.origin.y + event.clientY - start.pointer.y,
        },
        scale,
      ),
    );
  }

  function onPointerEnd() {
    drag.current = null;
    setDragging(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const moves: Record<string, Point> = {
      ArrowLeft: { x: KEY_STEP, y: 0 },
      ArrowRight: { x: -KEY_STEP, y: 0 },
      ArrowUp: { x: 0, y: KEY_STEP },
      ArrowDown: { x: 0, y: -KEY_STEP },
    };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      setOffset((current) =>
        clamp({ x: current.x + move.x, y: current.y + move.y }, scale),
      );
    } else if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      zoomTo(zoom + 0.25);
    } else if (event.key === '-') {
      event.preventDefault();
      zoomTo(zoom - 0.25);
    }
  }

  async function save() {
    setFailed(false);
    const canvas = document.createElement('canvas');
    canvas.width = AVATAR_OUTPUT_SIZE;
    canvas.height = AVATAR_OUTPUT_SIZE;
    const context = canvas.getContext('2d');
    if (!context) {
      setFailed(true);
      return;
    }
    context.imageSmoothingQuality = 'high';
    // Partie de l'image visible dans la zone, ramenée aux pixels de l'image d'origine.
    context.drawImage(
      image,
      -offset.x / scale,
      -offset.y / scale,
      VIEW / scale,
      VIEW / scale,
      0,
      0,
      AVATAR_OUTPUT_SIZE,
      AVATAR_OUTPUT_SIZE,
    );
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', 0.9),
    );
    if (!blob) {
      setFailed(true);
      return;
    }
    try {
      await onSave(blob);
    } catch {
      // L'appelant a affiché l'erreur ; la fenêtre reste ouverte pour réessayer.
    }
  }

  return (
    <div className="space-y-5 pb-1">
      <div
        ref={viewportRef}
        role="group"
        tabIndex={0}
        aria-label="Zone de recadrage. Flèches pour déplacer la photo, plus et moins pour zoomer."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onKeyDown={onKeyDown}
        style={{ width: VIEW, height: VIEW, touchAction: 'none' }}
        className={`relative mx-auto select-none overflow-hidden rounded-2xl bg-ink/90 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
          dragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt=""
          draggable={false}
          style={{
            width: width * scale,
            height: height * scale,
            transform: `translate(${offset.x}px, ${offset.y}px)`,
          }}
          className="pointer-events-none absolute left-0 top-0 max-w-none"
        />
        {/* Masque : le cercle est la photo finale, le reste est assombri. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_200px_rgb(4_16_20/0.58)] ring-2 ring-white/80"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-2.5 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white/90 backdrop-blur-sm"
        >
          <Move size={12} />
          Glissez pour cadrer
        </span>
      </div>

      <div className="mx-auto flex max-w-72 items-center gap-2">
        <IconButton
          icon={Minus}
          label="Dézoomer"
          size="sm"
          onClick={() => zoomTo(zoom - 0.25)}
          disabled={zoom <= 1}
        />
        <input
          type="range"
          min={1}
          max={MAX_ZOOM}
          step={0.01}
          value={zoom}
          onChange={(event) => zoomTo(Number(event.target.value))}
          aria-label="Zoom"
          className="h-1.5 min-w-0 flex-1 cursor-pointer accent-brand"
        />
        <IconButton
          icon={Plus}
          label="Zoomer"
          size="sm"
          onClick={() => zoomTo(zoom + 0.25)}
          disabled={zoom >= MAX_ZOOM}
        />
      </div>

      {failed && (
        <p role="alert" className="text-center text-xs font-medium text-bad">
          Impossible de préparer la photo. Essayez une autre image.
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onCancel} disabled={saving}>
          Annuler
        </Button>
        <Button onClick={() => void save()} loading={saving}>
          Enregistrer la photo
        </Button>
      </div>
    </div>
  );
}
