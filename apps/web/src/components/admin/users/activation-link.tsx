'use client';

import { useState } from 'react';
import { Check, Copy, Link2 } from 'lucide-react';
import { INVITATION_VALID_DAYS } from '@/lib/admin/users';
import { Button } from '../ui';

/**
 * Lien d'activation, montré une seule fois à l'administrateur qui invite ou
 * renvoie : s'il n'est pas relisible ensuite, c'est volontaire (seul son
 * hachage est conservé). Sert de secours si l'e-mail n'arrive pas — par
 * exemple tant que la messagerie n'est pas configurée.
 */
export function ActivationLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setFailed(false);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // Presse-papiers refusé (contexte non sécurisé) : le champ reste sélectionnable à la main.
      setFailed(true);
    }
  }

  return (
    <div className="rounded-xl border border-line bg-sunken/60 p-3.5">
      <div className="flex items-center gap-2 text-[13px] font-medium text-ink">
        <Link2 size={15} aria-hidden="true" className="text-ink-subtle" />
        Lien d’activation
      </div>
      <p className="mt-1 text-xs leading-relaxed text-ink-subtle">
        Si l’e-mail n’arrive pas, transmettez ce lien vous-même : il est
        personnel, valable {INVITATION_VALID_DAYS} jours et ne sera plus affiché
        ensuite.
      </p>
      <div className="mt-2.5 flex flex-col gap-2 sm:flex-row">
        <input
          readOnly
          value={url}
          aria-label="Lien d’activation"
          onFocus={(event) => event.currentTarget.select()}
          className="h-10 min-w-0 flex-1 rounded-lg border border-line-strong bg-panel px-3 font-mono text-xs text-ink-muted focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15"
        />
        <Button
          variant="secondary"
          icon={copied ? Check : Copy}
          onClick={copy}
          className="shrink-0"
        >
          {copied ? 'Lien copié' : 'Copier le lien'}
        </Button>
      </div>
      <p role="status" className="sr-only">
        {copied ? 'Lien copié dans le presse-papiers.' : ''}
      </p>
      {failed && (
        <p className="mt-2 text-xs text-warn">
          Copie automatique impossible : sélectionnez le lien et copiez-le avec
          Ctrl C.
        </p>
      )}
    </div>
  );
}
