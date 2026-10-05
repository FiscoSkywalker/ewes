'use client';

import { useRef, useState, type DragEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
  Camera,
  ImagePlus,
  KeyRound,
  Trash2,
} from 'lucide-react';
import { relativeTime } from '@/lib/admin/format';
import {
  AVATAR_MAX_SOURCE_BYTES,
  AVATAR_TYPES,
  removeAvatar,
  uploadAvatar,
  type Account,
} from '@/lib/admin/profile';
import { PersonAvatar, useAvatarSrc } from '../avatar';
import { TopoLines } from '../topo-lines';
import { applyProfile, type Session } from '../session';
import { Button, Skeleton, StatusChip, useConfirm, useToast } from '../ui';
import { AvatarCropDialog } from './avatar-crop-dialog';

const longDate = new Intl.DateTimeFormat('fr', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/**
 * En-tête de « Mon profil » : la personne d'abord. Sa photo (ou ses
 * initiales) en grand, avec de quoi la changer, soit par le bouton, soit en
 * déposant un fichier dessus. Le choix passe toujours par le recadrage avant
 * d'être enregistré.
 */
export function ProfileHero({
  session,
  account,
}: {
  session: Session;
  /** `undefined` tant que la sécurité du compte se charge. */
  account: Account | undefined;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const src = useAvatarSrc(session.avatarVersion);
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [over, setOver] = useState(false);
  const hasPhoto = session.avatarVersion !== null;

  function choose(candidate: File | undefined) {
    if (!candidate) return;
    if (!AVATAR_TYPES.includes(candidate.type)) {
      toast.error('Format non pris en charge', {
        description: 'Choisissez une photo JPEG, PNG ou WebP.',
      });
      return;
    }
    if (candidate.size > AVATAR_MAX_SOURCE_BYTES) {
      toast.error('Photo trop lourde', {
        description: 'Choisissez une image de moins de 25 Mo.',
      });
      return;
    }
    setFile(candidate);
  }

  async function save(image: Blob) {
    try {
      const saved = await uploadAvatar(image);
      applyProfile(queryClient, saved);
      setFile(null);
      toast.success('Photo de profil mise à jour');
    } catch (error) {
      toast.error(error);
      throw error;
    }
  }

  async function remove() {
    const done = await confirm({
      title: 'Retirer votre photo de profil ?',
      description:
        'Vos initiales s’afficheront à la place. Vous pourrez ajouter une photo à tout moment.',
      tone: 'danger',
      confirmLabel: 'Retirer la photo',
      onConfirm: async () => {
        applyProfile(queryClient, await removeAvatar());
      },
    });
    if (done) toast.success('Photo de profil retirée');
  }

  // Le survol d'un enfant déclenche `dragleave` sur le parent : on ne s'éteint que hors de la zone.
  function onDragLeave(event: DragEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setOver(false);
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setOver(false);
    choose(event.dataTransfer.files[0]);
  }

  const passwordChangedAt = account?.passwordChangedAt ?? null;

  return (
    <section
      aria-label="Votre profil"
      className="animate-rise-in overflow-hidden rounded-3xl border border-line bg-panel shadow-panel"
    >
      <div className="relative h-32 overflow-hidden bg-gradient-to-br from-[#1b4a5c] via-[#276977] to-[#1c7a57] sm:h-40">
        <TopoLines className="absolute inset-0 h-full w-full scale-125 text-white/25" />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(60%_90%_at_85%_0%,rgb(255_255_255/0.16),transparent)]"
        />
      </div>

      <div className="flex flex-col gap-5 px-5 pb-6 sm:flex-row sm:items-end sm:gap-7 sm:px-8">
        <div
          onDragEnter={(event) => {
            if (event.dataTransfer.types.includes('Files')) {
              event.preventDefault();
              setOver(true);
            }
          }}
          onDragOver={(event) => {
            if (event.dataTransfer.types.includes('Files')) {
              event.preventDefault();
            }
          }}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className="relative -mt-16 w-fit shrink-0 sm:-mt-20"
        >
          <PersonAvatar
            name={session.fullName}
            src={src}
            size="hero"
            className="ring-4 ring-panel"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            aria-label={
              hasPhoto
                ? 'Changer la photo de profil'
                : 'Ajouter une photo de profil'
            }
            title={hasPhoto ? 'Changer la photo' : 'Ajouter une photo'}
            className="absolute bottom-1 right-1 grid size-10 place-items-center rounded-full bg-brand text-on-brand shadow-pop ring-4 ring-panel transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <Camera size={17} aria-hidden="true" />
          </button>
          {over && (
            <span
              aria-hidden="true"
              className="absolute inset-0 grid place-items-center rounded-full border-2 border-dashed border-white bg-brand/85 text-center text-xs font-semibold text-on-brand"
            >
              <span className="flex flex-col items-center gap-1">
                <ImagePlus size={22} />
                Déposer la photo
              </span>
            </span>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={AVATAR_TYPES.join(',')}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(event) => {
              choose(event.target.files?.[0]);
              // Rechoisir le même fichier doit rouvrir le recadrage.
              event.target.value = '';
            }}
          />
        </div>

        <div className="min-w-0 flex-1 sm:pb-1 sm:pt-5">
          <p className="mb-2 flex flex-wrap items-center gap-2">
            <StatusChip kind="role" value={session.role} />
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-balance text-ink sm:text-[30px]">
            {session.fullName}
          </h1>
          <p className="mt-1 text-sm text-ink-muted [overflow-wrap:anywhere]">
            {session.email}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-ink-subtle">
            {account ? (
              <>
                <span className="flex items-center gap-1.5">
                  <CalendarDays size={14} aria-hidden="true" />
                  Membre depuis le{' '}
                  {longDate.format(new Date(account.createdAt))}
                </span>
                <span className="flex items-center gap-1.5">
                  <KeyRound size={14} aria-hidden="true" />
                  {passwordChangedAt
                    ? `Mot de passe modifié ${relativeTime(passwordChangedAt)}`
                    : 'Mot de passe d’origine'}
                </span>
              </>
            ) : (
              <Skeleton className="h-4 w-64" />
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:pb-1">
          <Button
            variant="secondary"
            icon={Camera}
            onClick={() => inputRef.current?.click()}
          >
            {hasPhoto ? 'Changer la photo' : 'Ajouter une photo'}
          </Button>
          {hasPhoto && (
            <Button variant="ghost" icon={Trash2} onClick={() => void remove()}>
              Retirer
            </Button>
          )}
        </div>
      </div>

      <AvatarCropDialog
        file={file}
        onClose={() => setFile(null)}
        onSave={save}
      />
    </section>
  );
}
