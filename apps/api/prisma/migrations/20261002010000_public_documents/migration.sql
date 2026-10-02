-- NB : colonnes obligatoires ajoutées sans valeur par défaut — sûr car public_documents est vide
-- (aucun code ne créait de document public avant cette migration).

-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('REPORT', 'GUIDE', 'DATASHEET', 'BROCHURE');

-- AlterTable
ALTER TABLE "public_documents" ADD COLUMN     "category" "DocumentCategory" NOT NULL,
ADD COLUMN     "excerptEn" TEXT,
ADD COLUMN     "excerptFr" TEXT,
ADD COLUMN     "pages" INTEGER,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "serviceId" TEXT,
ADD COLUMN     "slug" TEXT NOT NULL,
ADD COLUMN     "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "storedName" TEXT NOT NULL,
ADD COLUMN     "year" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "public_documents_slug_key" ON "public_documents"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "public_documents_storedName_key" ON "public_documents"("storedName");

-- CreateIndex
CREATE INDEX "public_documents_status_publishedAt_idx" ON "public_documents"("status", "publishedAt");

-- AddForeignKey
ALTER TABLE "public_documents" ADD CONSTRAINT "public_documents_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

