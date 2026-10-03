'use client';

import { useState } from 'react';
import { Images, Trash2, UserRound } from 'lucide-react';
import { thumbOf } from '@/lib/admin/media';
import { Button, Card } from '../ui';
import { MediaPicker } from '../media/media-picker';

/**
 * Portrait de l'expert : une image de la médiathèque (existante ou ajoutée
 * dans le sélecteur). Cadre vertical 3:4, comme les lames de la galerie du
 * site (recadrage au centre-haut : un portrait vertical, visage dans le tiers
 * supérieur, rend le mieux). Sans photo, le site affiche un monogramme.
 * Le choix s'enregistre avec le reste du formulaire.
 */
export function PortraitCard({
  value,
  name,
  onChange,
}: {
  /** Adresse de l'image (`/uploads/<nom>`), ou `''`. */
  value: string;
  name: string;
  onChange: (url: string) => void;
}) {
  const [picking, setPicking] = useState(false);

  return (
    <Card
      title="Portrait"
      description="Facultatif. Sans photo, le site affiche les initiales."
    >
      <div className="flex items-start gap-4">
        <div className="relative aspect-[3/4] w-28 shrink-0 overflow-hidden rounded-xl border border-line bg-sunken sm:w-32">
          {value ? (
            // Image publique servie par l'API via `/uploads/*` : pas d'optimisation Next nécessaire dans le portail.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbOf(value)}
              alt={name ? `Portrait de ${name}` : 'Portrait'}
              className="size-full object-cover object-[50%_25%]"
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
            Une image de la médiathèque, ou une nouvelle (JPEG, PNG ou WebP, 5
            Mo au plus). Enregistrez ensuite le profil.
          </p>
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
