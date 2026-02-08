-- AddForeignKey
ALTER TABLE "public"."cortes_caja" ADD CONSTRAINT "cortes_caja_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "public"."sucursales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
