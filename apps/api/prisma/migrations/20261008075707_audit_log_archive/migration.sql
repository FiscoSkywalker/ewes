-- CreateTable
CREATE TABLE "audit_logs_archive" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "beforeData" JSONB,
    "afterData" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_archive_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_archive_actorId_createdAt_idx" ON "audit_logs_archive"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_archive_entityType_entityId_createdAt_idx" ON "audit_logs_archive"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_archive_action_createdAt_idx" ON "audit_logs_archive"("action", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_archive_createdAt_id_idx" ON "audit_logs_archive"("createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_id_idx" ON "audit_logs"("createdAt" DESC, "id" DESC);

-- AddForeignKey
ALTER TABLE "audit_logs_archive" ADD CONSTRAINT "audit_logs_archive_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Archivage du journal d'audit (rétention : 12 mois en ligne, puis archive).
--
-- Le journal reste en écriture seule. Une ligne ne quitte `audit_logs` que par
-- `audit_logs_archive_before()` : elle est copiée dans `audit_logs_archive`
-- dans la même instruction (donc la même transaction) que sa suppression.
-- Aucune ligne n'est perdue, et rien de plus récent que 12 mois ne peut partir.
-- ---------------------------------------------------------------------------

-- `audit_logs` : la suppression n'est acceptée que dans cette fonction, qui
-- lève un drapeau valable le temps de sa transaction (`set_config(..., true)`).
CREATE OR REPLACE FUNCTION audit_logs_guard() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF current_setting('ewes.audit_archiving', true) IS DISTINCT FROM 'on' THEN
      RAISE EXCEPTION 'audit_logs est en écriture seule : suppression interdite';
    END IF;
    RETURN OLD;
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW."action" IS DISTINCT FROM OLD."action"
     OR NEW."entityType" IS DISTINCT FROM OLD."entityType"
     OR NEW."entityId" IS DISTINCT FROM OLD."entityId"
     OR NEW."beforeData" IS DISTINCT FROM OLD."beforeData"
     OR NEW."afterData" IS DISTINCT FROM OLD."afterData"
     OR NEW."ipAddress" IS DISTINCT FROM OLD."ipAddress"
     OR NEW."userAgent" IS DISTINCT FROM OLD."userAgent"
     OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt"
     OR NEW."actorId" IS NOT NULL THEN
    RAISE EXCEPTION 'audit_logs est en écriture seule : modification interdite';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- `audit_logs_archive` : écriture seule, sans exception de suppression. Seule
-- l'anonymisation `actorId -> NULL` (utilisateur supprimé) reste possible.
CREATE OR REPLACE FUNCTION audit_logs_archive_guard() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'audit_logs_archive est en écriture seule : suppression interdite';
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW."action" IS DISTINCT FROM OLD."action"
     OR NEW."entityType" IS DISTINCT FROM OLD."entityType"
     OR NEW."entityId" IS DISTINCT FROM OLD."entityId"
     OR NEW."beforeData" IS DISTINCT FROM OLD."beforeData"
     OR NEW."afterData" IS DISTINCT FROM OLD."afterData"
     OR NEW."ipAddress" IS DISTINCT FROM OLD."ipAddress"
     OR NEW."userAgent" IS DISTINCT FROM OLD."userAgent"
     OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt"
     OR NEW."archivedAt" IS DISTINCT FROM OLD."archivedAt"
     OR NEW."actorId" IS NOT NULL THEN
    RAISE EXCEPTION 'audit_logs_archive est en écriture seule : modification interdite';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_logs_archive_guard
  BEFORE UPDATE OR DELETE ON "audit_logs_archive"
  FOR EACH ROW EXECUTE FUNCTION audit_logs_archive_guard();

CREATE OR REPLACE FUNCTION audit_logs_archive_truncate_guard() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs_archive est en écriture seule : TRUNCATE interdit';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_logs_archive_truncate_guard
  BEFORE TRUNCATE ON "audit_logs_archive"
  FOR EACH STATEMENT EXECUTE FUNCTION audit_logs_archive_truncate_guard();

-- Déplace vers l'archive, par lots, les entrées créées avant `cutoff` (UTC) et
-- renvoie le nombre déplacé (0 = rien à faire). Refuse tout `cutoff` plus
-- récent que 12 mois : la durée de conservation en ligne est garantie ici,
-- pas seulement par l'application.
CREATE OR REPLACE FUNCTION audit_logs_archive_before(cutoff timestamptz, batch_size integer DEFAULT 5000)
RETURNS integer AS $$
DECLARE
  moved integer;
BEGIN
  IF cutoff > now() - interval '12 months' THEN
    RAISE EXCEPTION 'audit_logs_archive_before: seules les entrées de plus de 12 mois peuvent être archivées';
  END IF;
  IF batch_size < 1 THEN
    RAISE EXCEPTION 'audit_logs_archive_before: batch_size doit être positif';
  END IF;

  PERFORM set_config('ewes.audit_archiving', 'on', true);
  WITH due AS (
    SELECT id FROM audit_logs
    WHERE "createdAt" < (cutoff AT TIME ZONE 'UTC')
    ORDER BY "createdAt", id
    LIMIT batch_size
  ),
  moved_rows AS (
    DELETE FROM audit_logs a USING due WHERE a.id = due.id RETURNING a.*
  )
  INSERT INTO audit_logs_archive
    (id, "actorId", "action", "entityType", "entityId", "beforeData", "afterData", "ipAddress", "userAgent", "createdAt")
  SELECT id, "actorId", "action", "entityType", "entityId", "beforeData", "afterData", "ipAddress", "userAgent", "createdAt"
  FROM moved_rows;
  GET DIAGNOSTICS moved = ROW_COUNT;
  PERFORM set_config('ewes.audit_archiving', 'off', true);
  RETURN moved;
END;
$$ LANGUAGE plpgsql;
