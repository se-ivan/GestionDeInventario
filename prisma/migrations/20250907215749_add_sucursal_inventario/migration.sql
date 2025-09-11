/*
  Warnings:

  - You are about to drop the column `stock` on the `books` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."books" DROP COLUMN "stock",
ADD COLUMN     "coleccion" TEXT;

-- CreateTable
CREATE TABLE "public"."sucursales" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sucursales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."inventario" (
    "book_id" INTEGER NOT NULL,
    "sucursal_id" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "inventario_pkey" PRIMARY KEY ("book_id","sucursal_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sucursales_nombre_key" ON "public"."sucursales"("nombre");

-- AddForeignKey
ALTER TABLE "public"."inventario" ADD CONSTRAINT "inventario_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inventario" ADD CONSTRAINT "inventario_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "public"."sucursales"("id") ON DELETE CASCADE ON UPDATE CASCADE;
