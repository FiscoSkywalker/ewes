-- NB : private_documents est vide (aucun code ne créait de document privé avant cette migration) :
-- remplacement de fileUrl par storedName (obligatoire, unique) sans risque.

-- AlterTable
ALTER TABLE "private_documents" DROP COLUMN "fileUrl",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "storedName" TEXT NOT NULL,
ADD COLUMN     "uploadedById" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "private_documents_storedName_key" ON "private_documents"("storedName");

-- AddForeignKey
ALTER TABLE "private_documents" ADD CONSTRAINT "private_documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

