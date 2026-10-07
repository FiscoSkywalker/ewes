-- Extension de trigrammes : accélère les recherches partielles (ILIKE '%mot%').
-- pg_trgm est livrée avec PostgreSQL (contrib) et « de confiance » : aucun super-utilisateur requis.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateIndex
CREATE INDEX "articles_titleFr_trgm_idx" ON "articles" USING GIN ("titleFr" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "articles_titleEn_trgm_idx" ON "articles" USING GIN ("titleEn" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "articles_slug_trgm_idx" ON "articles" USING GIN ("slug" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "articles_excerptFr_trgm_idx" ON "articles" USING GIN ("excerptFr" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "articles_excerptEn_trgm_idx" ON "articles" USING GIN ("excerptEn" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "articles_contextFr_trgm_idx" ON "articles" USING GIN ("contextFr" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "articles_contextEn_trgm_idx" ON "articles" USING GIN ("contextEn" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "contact_messages_name_trgm_idx" ON "contact_messages" USING GIN ("name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "contact_messages_organization_trgm_idx" ON "contact_messages" USING GIN ("organization" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "contact_messages_email_trgm_idx" ON "contact_messages" USING GIN ("email" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "contact_messages_phone_trgm_idx" ON "contact_messages" USING GIN ("phone" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "contact_messages_message_trgm_idx" ON "contact_messages" USING GIN ("message" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "media_originalName_trgm_idx" ON "media" USING GIN ("originalName" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "public_documents_titleFr_trgm_idx" ON "public_documents" USING GIN ("titleFr" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "public_documents_titleEn_trgm_idx" ON "public_documents" USING GIN ("titleEn" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "public_documents_slug_trgm_idx" ON "public_documents" USING GIN ("slug" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "public_documents_excerptFr_trgm_idx" ON "public_documents" USING GIN ("excerptFr" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "public_documents_excerptEn_trgm_idx" ON "public_documents" USING GIN ("excerptEn" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "realisations_titleFr_trgm_idx" ON "realisations" USING GIN ("titleFr" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "realisations_titleEn_trgm_idx" ON "realisations" USING GIN ("titleEn" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "realisations_clientName_trgm_idx" ON "realisations" USING GIN ("clientName" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "realisations_location_trgm_idx" ON "realisations" USING GIN ("location" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "realisations_slug_trgm_idx" ON "realisations" USING GIN ("slug" gin_trgm_ops);
