-- AlterTable
ALTER TABLE "FormTemplate" ADD COLUMN     "approveRoles" "Role"[] DEFAULT ARRAY[]::"Role"[],
ADD COLUMN     "fillRoles" "Role"[] DEFAULT ARRAY[]::"Role"[],
ADD COLUMN     "readRoles" "Role"[] DEFAULT ARRAY[]::"Role"[];
