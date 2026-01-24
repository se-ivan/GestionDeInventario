-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "permisos" TEXT[] DEFAULT ARRAY[]::TEXT[];
