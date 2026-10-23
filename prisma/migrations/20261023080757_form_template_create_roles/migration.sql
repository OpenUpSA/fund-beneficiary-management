-- AlterTable
ALTER TABLE "FormTemplate" ADD COLUMN     "createRoles" "Role"[] DEFAULT ARRAY[]::"Role"[];

-- Data migration: give every existing template a create permission. Admins and
-- Programme Officers could already create forms (LDA users could not), so they keep
-- that ability on every template, now including report templates. SUPER_USER is
-- always allowed and never stored.
UPDATE "FormTemplate" SET "createRoles" = ARRAY['PROGRAMME_OFFICER', 'ADMIN']::"Role"[];
