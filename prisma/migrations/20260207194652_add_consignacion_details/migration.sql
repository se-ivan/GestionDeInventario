/*
  Warnings:

  - A unique constraint covering the columns `[isbn]` on the table `consignaciones` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."consignaciones" ADD COLUMN     "anio_publicacion" INTEGER,
ADD COLUMN     "autor" TEXT,
ADD COLUMN     "coleccion" TEXT,
ADD COLUMN     "editorial" TEXT,
ADD COLUMN     "genero" TEXT,
ADD COLUMN     "isbn" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "consignaciones_isbn_key" ON "public"."consignaciones"("isbn");
