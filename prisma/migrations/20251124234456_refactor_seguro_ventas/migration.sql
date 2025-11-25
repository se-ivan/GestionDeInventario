/*
  Warnings:

  - The `rol` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[isbn]` on the table `books` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('ADMIN', 'VENDEDOR', 'CONTADOR');

-- CreateEnum
CREATE TYPE "public"."DiscountType" AS ENUM ('PORCENTAJE', 'MONTO_FIJO');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."PaymentMethod" ADD VALUE 'TARJETA_DEBITO';
ALTER TYPE "public"."PaymentMethod" ADD VALUE 'TARJETA_CREDITO';

-- DropForeignKey
ALTER TABLE "public"."sale_details" DROP CONSTRAINT "sale_details_book_id_fkey";

-- AlterTable
ALTER TABLE "public"."books" ADD COLUMN     "tasa_iva" DECIMAL(5,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."inventario" ADD COLUMN     "min_stock" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "ubicacion" TEXT;

-- AlterTable
ALTER TABLE "public"."sale_details" ADD COLUMN     "impuesto_aplicado" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."sales" ADD COLUMN     "cliente_id" INTEGER,
ADD COLUMN     "descuento_total" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "estado" TEXT NOT NULL DEFAULT 'COMPLETADA',
ADD COLUMN     "impuestos" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "requiere_factura" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "sucursal_id" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "user_id" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "public"."sucursales" ADD COLUMN     "serieFacturacion" TEXT;

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true,
DROP COLUMN "rol",
ADD COLUMN     "rol" "public"."UserRole" NOT NULL DEFAULT 'VENDEDOR';

-- CreateTable
CREATE TABLE "public"."discount_campaigns" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "codigo_cupon" TEXT,
    "tipo" "public"."DiscountType" NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_fin" TIMESTAMP(3) NOT NULL,
    "aplicar_a_genero" TEXT,
    "aplicar_a_book_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discount_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."cortes_caja" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "sucursal_id" INTEGER NOT NULL,
    "fecha_apertura" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_cierre" TIMESTAMP(3),
    "monto_inicial" DECIMAL(10,2) NOT NULL,
    "ventas_sistema" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "monto_final" DECIMAL(10,2),
    "diferencia" DECIMAL(10,2),
    "observaciones" TEXT,

    CONSTRAINT "cortes_caja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."facturas" (
    "id" SERIAL NOT NULL,
    "sale_id" INTEGER NOT NULL,
    "rfc" TEXT NOT NULL,
    "razon_social" TEXT NOT NULL,
    "regimen_fiscal" TEXT NOT NULL,
    "uso_cfdi" TEXT NOT NULL,
    "uuid" TEXT,
    "xmlUrl" TEXT,
    "pdfUrl" TEXT,

    CONSTRAINT "facturas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "discount_campaigns_codigo_cupon_key" ON "public"."discount_campaigns"("codigo_cupon");

-- CreateIndex
CREATE UNIQUE INDEX "facturas_sale_id_key" ON "public"."facturas"("sale_id");

-- CreateIndex
CREATE UNIQUE INDEX "books_isbn_key" ON "public"."books"("isbn");

-- CreateIndex
CREATE INDEX "books_isbn_idx" ON "public"."books"("isbn");

-- AddForeignKey
ALTER TABLE "public"."discount_campaigns" ADD CONSTRAINT "discount_campaigns_aplicar_a_book_id_fkey" FOREIGN KEY ("aplicar_a_book_id") REFERENCES "public"."books"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sales" ADD CONSTRAINT "sales_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "public"."sucursales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sales" ADD CONSTRAINT "sales_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sale_details" ADD CONSTRAINT "sale_details_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cortes_caja" ADD CONSTRAINT "cortes_caja_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."facturas" ADD CONSTRAINT "facturas_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
