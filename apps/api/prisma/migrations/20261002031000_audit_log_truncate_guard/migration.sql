-- Complète audit_log_hardening : TRUNCATE contournait le déclencheur par ligne.
CREATE OR REPLACE FUNCTION audit_logs_truncate_guard() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs est en écriture seule : TRUNCATE interdit';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_logs_truncate_guard
  BEFORE TRUNCATE ON "audit_logs"
  FOR EACH STATEMENT EXECUTE FUNCTION audit_logs_truncate_guard();
