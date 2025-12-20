-- AlterEnum
ALTER TYPE "public"."PaymentMethod" ADD VALUE 'VALES';

-- DropForeignKey
ALTER TABLE "public"."sale_details" DROP CONSTRAINT "sale_details_book_id_fkey";

-- AlterTable
ALTER TABLE "public"."discount_campaigns" ADD COLUMN     "aplicar_a_dulce_id" INTEGER;

-- AlterTable
ALTER TABLE "public"."sale_details" ADD COLUMN     "dulce_id" INTEGER,
ALTER COLUMN "book_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."sales" ALTER COLUMN "sucursal_id" SET DEFAULT 1;

-- CreateTable
CREATE TABLE "public"."dulces" (
    "id" SERIAL NOT NULL,
    "codigo_barras" TEXT,
    "nombre" TEXT NOT NULL,
    "marca" TEXT,
    "lineaProducto" TEXT,
    "peso" TEXT,
    "sabor" TEXT,
    "precio" DECIMAL(10,2) NOT NULL,
    "precio_compra" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "tasa_iva" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dulces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."inventario_dulces" (
    "dulce_id" INTEGER NOT NULL,
    "sucursal_id" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "min_stock" INTEGER NOT NULL DEFAULT 10,
    "ubicacion" TEXT,

    CONSTRAINT "inventario_dulces_pkey" PRIMARY KEY ("dulce_id","sucursal_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dulces_codigo_barras_key" ON "public"."dulces"("codigo_barras");

-- CreateIndex
CREATE INDEX "dulces_nombre_idx" ON "public"."dulces"("nombre");

-- CreateIndex
CREATE INDEX "dulces_codigo_barras_idx" ON "public"."dulces"("codigo_barras");

-- AddForeignKey
ALTER TABLE "public"."inventario_dulces" ADD CONSTRAINT "inventario_dulces_dulce_id_fkey" FOREIGN KEY ("dulce_id") REFERENCES "public"."dulces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inventario_dulces" ADD CONSTRAINT "inventario_dulces_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "public"."sucursales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."discount_campaigns" ADD CONSTRAINT "discount_campaigns_aplicar_a_dulce_id_fkey" FOREIGN KEY ("aplicar_a_dulce_id") REFERENCES "public"."dulces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sale_details" ADD CONSTRAINT "sale_details_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sale_details" ADD CONSTRAINT "sale_details_dulce_id_fkey" FOREIGN KEY ("dulce_id") REFERENCES "public"."dulces"("id") ON DELETE SET NULL ON UPDATE CASCADE;
