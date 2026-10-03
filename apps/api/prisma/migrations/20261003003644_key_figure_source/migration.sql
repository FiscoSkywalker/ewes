-- CreateEnum
CREATE TYPE "KeyFigureSource" AS ENUM ('FIXED', 'YEARS_SINCE', 'MISSIONS', 'TRAININGS');

-- AlterTable
ALTER TABLE "key_figures" ADD COLUMN     "source" "KeyFigureSource" NOT NULL DEFAULT 'FIXED';

-- Reprise : un chiffre qui avait une année de départ était déjà « années écoulées ».
UPDATE "key_figures" SET "source" = 'YEARS_SINCE' WHERE "sinceYear" IS NOT NULL;
