-- Colonnes ajoutées avec défaut ou facultatives ; index uniques sur colonnes nouvelles (donc sans doublon possible).
-- AlterTable
ALTER TABLE "contact_messages" ADD COLUMN     "contentHash" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'fr',
ADD COLUMN     "organization" TEXT,
ADD COLUMN     "sector" TEXT,
ADD COLUMN     "submissionKey" TEXT;

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "idempotencyKey" TEXT,
ADD COLUMN     "lastError" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "contact_messages_submissionKey_key" ON "contact_messages"("submissionKey");

-- CreateIndex
CREATE INDEX "contact_messages_email_contentHash_createdAt_idx" ON "contact_messages"("email", "contentHash", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_idempotencyKey_key" ON "notifications"("idempotencyKey");

-- CreateIndex
CREATE INDEX "notifications_type_recipientEmail_createdAt_idx" ON "notifications"("type", "recipientEmail", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_failedAt_idx" ON "notifications"("failedAt");

