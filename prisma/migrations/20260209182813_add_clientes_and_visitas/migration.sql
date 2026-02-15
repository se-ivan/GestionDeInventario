-- CreateTable
CREATE TABLE "public"."clientes" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT,
    "telefono" TEXT,
    "direccion" TEXT,
    "codigo_barras" TEXT,
    "sku" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'GENERAL',
    "matricula" TEXT,
    "semestre" TEXT,
    "grupo" TEXT,
    "turno" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."visitas" (
    "id" SERIAL NOT NULL,
    "cliente_id" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "motivo" TEXT,

    CONSTRAINT "visitas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clientes_email_key" ON "public"."clientes"("email");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_codigo_barras_key" ON "public"."clientes"("codigo_barras");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_sku_key" ON "public"."clientes"("sku");

-- CreateIndex
CREATE INDEX "clientes_codigo_barras_idx" ON "public"."clientes"("codigo_barras");

-- CreateIndex
CREATE INDEX "clientes_nombre_idx" ON "public"."clientes"("nombre");

-- CreateIndex
CREATE INDEX "visitas_cliente_id_idx" ON "public"."visitas"("cliente_id");

-- CreateIndex
CREATE INDEX "visitas_fecha_idx" ON "public"."visitas"("fecha");

-- AddForeignKey
ALTER TABLE "public"."visitas" ADD CONSTRAINT "visitas_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
