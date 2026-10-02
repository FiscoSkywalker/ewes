-- Contexte de requête et index de consultation.
-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "userAgent" TEXT;

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_createdAt_idx" ON "audit_logs"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_action_createdAt_idx" ON "audit_logs"("action", "createdAt");


-- Journal en écriture seule, garanti par la base et non par la seule API :
--   * DELETE interdit ;
--   * UPDATE interdit, sauf l'anonymisation actorId -> NULL (suppression d'un
--     utilisateur, ON DELETE SET NULL) qui ne change aucune autre colonne.
CREATE OR REPLACE FUNCTION audit_logs_guard() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'audit_logs est en écriture seule : suppression interdite';
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

CREATE TRIGGER audit_logs_guard
  BEFORE UPDATE OR DELETE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION audit_logs_guard();
