-- Purge de l'archive du journal d'audit : 5 ans après la date de l'événement (durée annoncée
-- dans la politique de confidentialité). Même principe que l'archivage : l'archive reste en
-- écriture seule, et une ligne n'en sort que par audit_logs_archive_purge_before(), qui refuse
-- tout cutoff plus récent que 5 ans.
CREATE OR REPLACE FUNCTION audit_logs_archive_guard() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF current_setting('ewes.audit_purging', true) IS DISTINCT FROM 'on' THEN
      RAISE EXCEPTION 'audit_logs_archive est en écriture seule : suppression interdite';
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
     OR NEW."archivedAt" IS DISTINCT FROM OLD."archivedAt"
     OR NEW."actorId" IS NOT NULL THEN
    RAISE EXCEPTION 'audit_logs_archive est en écriture seule : modification interdite';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprime, par lots, les entrées archivées créées avant `cutoff` (UTC) ; renvoie le nombre
-- supprimé (0 = rien à faire).
CREATE OR REPLACE FUNCTION audit_logs_archive_purge_before(cutoff timestamptz, batch_size integer DEFAULT 5000)
RETURNS integer AS $$
DECLARE
  purged integer;
BEGIN
  IF cutoff > now() - interval '5 years' THEN
    RAISE EXCEPTION 'audit_logs_archive_purge_before: seules les entrées de plus de 5 ans peuvent être supprimées';
  END IF;
  IF batch_size < 1 THEN
    RAISE EXCEPTION 'audit_logs_archive_purge_before: batch_size doit être positif';
  END IF;

  PERFORM set_config('ewes.audit_purging', 'on', true);
  WITH due AS (
    SELECT id FROM audit_logs_archive
    WHERE "createdAt" < (cutoff AT TIME ZONE 'UTC')
    ORDER BY "createdAt", id
    LIMIT batch_size
  )
  DELETE FROM audit_logs_archive a USING due WHERE a.id = due.id;
  GET DIAGNOSTICS purged = ROW_COUNT;
  PERFORM set_config('ewes.audit_purging', 'off', true);
  RETURN purged;
END;
$$ LANGUAGE plpgsql;
