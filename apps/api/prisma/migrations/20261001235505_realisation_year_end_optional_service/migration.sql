-- DropForeignKey
ALTER TABLE "realisations" DROP CONSTRAINT "realisations_serviceId_fkey";

-- AlterTable
ALTER TABLE "realisations" ADD COLUMN     "yearEnd" INTEGER,
ALTER COLUMN "serviceId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "realisations" ADD CONSTRAINT "realisations_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;
