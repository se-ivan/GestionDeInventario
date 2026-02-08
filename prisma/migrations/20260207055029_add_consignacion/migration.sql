-- AlterTable
ALTER TABLE "public"."sale_details" ADD COLUMN     "consignacion_id" INTEGER;

-- CreateTable
CREATE TABLE "public"."consignaciones" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "proveedor" TEXT,
    "precio_venta" DECIMAL(10,2) NOT NULL,
    "ganancia_libreria" DECIMAL(10,2) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consignaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."inventario_consignaciones" (
    "consignacion_id" INTEGER NOT NULL,
    "sucursal_id" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "inventario_consignaciones_pkey" PRIMARY KEY ("consignacion_id","sucursal_id")
);

-- AddForeignKey
ALTER TABLE "public"."inventario_consignaciones" ADD CONSTRAINT "inventario_consignaciones_consignacion_id_fkey" FOREIGN KEY ("consignacion_id") REFERENCES "public"."consignaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inventario_consignaciones" ADD CONSTRAINT "inventario_consignaciones_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "public"."sucursales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sale_details" ADD CONSTRAINT "sale_details_consignacion_id_fkey" FOREIGN KEY ("consignacion_id") REFERENCES "public"."consignaciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
