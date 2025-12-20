-- AlterTable
ALTER TABLE "public"."books" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."dulces" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "books_deleted_at_idx" ON "public"."books"("deleted_at");

-- CreateIndex
CREATE INDEX "dulces_deleted_at_idx" ON "public"."dulces"("deleted_at");
