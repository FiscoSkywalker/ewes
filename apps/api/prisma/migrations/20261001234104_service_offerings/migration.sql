-- AlterTable
ALTER TABLE "services" ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "taglineEn" TEXT,
ADD COLUMN     "taglineFr" TEXT;

-- CreateTable
CREATE TABLE "service_offerings" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "titleFr" TEXT NOT NULL,
    "titleEn" TEXT,
    "descriptionFr" TEXT NOT NULL,
    "descriptionEn" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_offerings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_offerings_serviceId_sortOrder_idx" ON "service_offerings"("serviceId", "sortOrder");

-- AddForeignKey
ALTER TABLE "service_offerings" ADD CONSTRAINT "service_offerings_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;
