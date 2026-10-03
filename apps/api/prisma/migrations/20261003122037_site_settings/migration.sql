-- CreateTable
CREATE TABLE "site_settings" (
    "id" TEXT NOT NULL DEFAULT 'site',
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "addressFr" TEXT NOT NULL,
    "addressEn" TEXT,
    "officeDays" INTEGER[],
    "opensAt" TEXT NOT NULL,
    "closesAt" TEXT NOT NULL,
    "linkedinUrl" TEXT,
    "facebookUrl" TEXT,
    "xUrl" TEXT,
    "youtubeUrl" TEXT,
    "contactRecipientEmail" TEXT,
    "contactAutoReply" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);
