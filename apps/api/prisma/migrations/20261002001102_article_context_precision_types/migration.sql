-- CreateEnum
CREATE TYPE "DatePrecision" AS ENUM ('YEAR', 'MONTH', 'DAY');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ArticleType" ADD VALUE 'ENQUETE';
ALTER TYPE "ArticleType" ADD VALUE 'PUBLICATION';

-- AlterTable
ALTER TABLE "articles" ADD COLUMN     "contextEn" TEXT,
ADD COLUMN     "contextFr" TEXT,
ADD COLUMN     "datePrecision" "DatePrecision" NOT NULL DEFAULT 'DAY';
