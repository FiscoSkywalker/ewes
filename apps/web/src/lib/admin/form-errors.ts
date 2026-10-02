import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError, describeError, fieldErrors } from '@/lib/api/backend';

interface ApplyOptions<T extends FieldValues> {
  setError: UseFormSetError<T>;
  /** Champs du formulaire : un refus de l'API sur un autre champ n'a pas de place à l'écran. */
  fields: readonly string[];
  /** Codes d'erreur métier rattachés à un champ, ex. `{ DOCUMENT_SLUG_TAKEN: 'slug' }`. */
  codes?: Record<string, Path<T>>;
  /** Refus portés par un champ hors formulaire (ex. `file`) ; renvoie `true` s'il l'a placé. */
  onExtraField?: (field: string, message: string) => boolean;
}

/**
 * Place les refus de l'API sous leurs champs (`details` par champ,
 * blueprint/08 §2, et codes métier). Renvoie le message à afficher en tête
 * de formulaire si rien n'a pu être placé, `null` sinon.
 */
export function applyApiErrors<T extends FieldValues>(
  error: unknown,
  { setError, fields, codes = {}, onExtraField }: ApplyOptions<T>,
): string | null {
  let placed = false;
  for (const [field, message] of Object.entries(fieldErrors(error))) {
    if (fields.includes(field)) {
      setError(field as Path<T>, { message });
      placed = true;
    } else if (onExtraField?.(field, message)) {
      placed = true;
    }
  }
  if (error instanceof ApiError && codes[error.code]) {
    setError(codes[error.code], { message: error.message });
    placed = true;
  }
  return placed ? null : describeError(error).message;
}
