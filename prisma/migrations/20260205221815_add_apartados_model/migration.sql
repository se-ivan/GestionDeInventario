-- CreateEnum
CREATE TYPE "public"."ApartadoStatus" AS ENUM ('ACTIVO', 'COMPLETADO', 'CANCELADO', 'VENCIDO');

-- CreateTable
CREATE TABLE "public"."apartados" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "sucursal_id" INTEGER NOT NULL,
    "cliente_nombre" TEXT NOT NULL,
    "cliente_telefono" TEXT,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_vencimiento" TIMESTAMP(3) NOT NULL,
    "estado" "public"."ApartadoStatus" NOT NULL DEFAULT 'ACTIVO',
    "monto_total" DECIMAL(10,2) NOT NULL,
    "monto_pagado" DECIMAL(10,2) NOT NULL,
    "saldo_pendiente" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "apartados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."apartado_items" (
    "id" SERIAL NOT NULL,
    "apartado_id" INTEGER NOT NULL,
    "book_id" INTEGER,
    "dulce_id" INTEGER,
    "cantidad" INTEGER NOT NULL,
    "precio_unitario" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "apartado_items_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."apartados" ADD CONSTRAINT "apartados_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."apartado_items" ADD CONSTRAINT "apartado_items_apartado_id_fkey" FOREIGN KEY ("apartado_id") REFERENCES "public"."apartados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."apartado_items" ADD CONSTRAINT "apartado_items_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."apartado_items" ADD CONSTRAINT "apartado_items_dulce_id_fkey" FOREIGN KEY ("dulce_id") REFERENCES "public"."dulces"("id") ON DELETE SET NULL ON UPDATE CASCADE;
