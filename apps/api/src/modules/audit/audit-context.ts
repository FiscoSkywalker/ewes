import { AsyncLocalStorage } from 'node:async_hooks';

/** Contexte de la requête HTTP en cours, joint automatiquement à chaque entrée d'audit. */
export interface AuditRequestContext {
  ipAddress?: string;
  userAgent?: string;
}

export const auditContextStorage = new AsyncLocalStorage<AuditRequestContext>();
