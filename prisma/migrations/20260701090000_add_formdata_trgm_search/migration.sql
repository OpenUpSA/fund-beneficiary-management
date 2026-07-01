-- Enable trigram matching so ILIKE '%phrase%' over report answers can use an index.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Accelerate substring/phrase search across all report answers. The report's
-- answers live in the `formData` JSONB blob; casting it to text lets a single
-- GIN trigram index serve every keyword/indicator query on the reporting tab
-- (and any future free-text search) without scanning rows.
-- This index is not expressible in schema.prisma, so it is created here directly.
CREATE INDEX IF NOT EXISTS "LocalDevelopmentAgencyForm_formData_trgm_idx"
  ON "LocalDevelopmentAgencyForm"
  USING gin ((("formData")::text) gin_trgm_ops);
