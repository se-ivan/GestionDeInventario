-- CreateEnum
CREATE TYPE "public"."PaymentMethod" AS ENUM ('EFECTIVO', 'TARJETA', 'TRANSFERENCIA');

-- AlterTable
ALTER TABLE "public"."books" ADD COLUMN     "precio_compra" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."sale_details" ADD COLUMN     "descuento" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."sales" ADD COLUMN     "metodo_pago" "public"."PaymentMethod" NOT NULL DEFAULT 'EFECTIVO';

-- CreateTable
CREATE TABLE "public"."busquedas_pendientes" (
    "id" SERIAL NOT NULL,
    "titulo" VARCHAR(255) NOT NULL,
    "autor" VARCHAR(255),
    "isbn" VARCHAR(20),
    "editorial" VARCHAR(255),
    "genero" VARCHAR(100),
    "descripcion" TEXT,
    "precio_estimado" DECIMAL(10,2),
    "cliente_nombre" VARCHAR(255) NOT NULL,
    "cliente_telefono" VARCHAR(20) NOT NULL,
    "cliente_email" VARCHAR(255),
    "cliente_notas" TEXT,
    "estado" VARCHAR(50) DEFAULT 'pendiente',
    "prioridad" VARCHAR(20) DEFAULT 'media',
    "fecha_solicitud" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "fecha_limite" DATE,
    "fecha_actualizacion" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "notas_internas" TEXT,
    "precio_encontrado" DECIMAL(10,2),
    "proveedor_encontrado" VARCHAR(255),

    CONSTRAINT "busquedas_pendientes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_busquedas_cliente_telefono" ON "public"."busquedas_pendientes"("cliente_telefono");

-- CreateIndex
CREATE INDEX "idx_busquedas_estado" ON "public"."busquedas_pendientes"("estado");

-- CreateIndex
CREATE INDEX "idx_busquedas_fecha_solicitud" ON "public"."busquedas_pendientes"("fecha_solicitud");

-- CreateIndex
CREATE INDEX "idx_busquedas_prioridad" ON "public"."busquedas_pendientes"("prioridad");
