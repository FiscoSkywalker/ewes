import { BadRequestException, ValidationError, ValidationPipe } from '@nestjs/common';

export interface FieldIssue {
  /** Chemin du champ (ex. `email`, `items.0.name`). */
  field: string;
  messages: string[];
}

/** Aplati les erreurs imbriquées de class-validator en une liste `{ field, messages }`. */
export function flattenValidationErrors(
  errors: readonly ValidationError[],
  parent = '',
): FieldIssue[] {
  return errors.flatMap((error) => {
    const field = parent ? `${parent}.${error.property}` : error.property;
    const own = error.constraints
      ? [{ field, messages: Object.values(error.constraints) }]
      : [];
    return [...own, ...flattenValidationErrors(error.children ?? [], field)];
  });
}

/**
 * Pipe de validation global (blueprint/10_Security.md §3, 08 §2) : DTO validés
 * systématiquement, champs inconnus refusés, et erreurs rendues **par champ**
 * (`details: [{ field, messages }]`) pour que le client sache quel champ
 * corriger sans interpréter un message humain.
 */
export function createValidationPipe() {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) =>
      new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Validation échouée.',
        details: flattenValidationErrors(errors),
      }),
  });
}
