-- AlterTable
ALTER TABLE "experts" ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "specialtiesEn" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "specialtiesFr" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "yearsOfExperience" INTEGER;

-- CreateIndex
CREATE INDEX "experts_sortOrder_idx" ON "experts"("sortOrder");
