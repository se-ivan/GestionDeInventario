-- AddForeignKey
ALTER TABLE "public"."apartados" ADD CONSTRAINT "apartados_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "public"."sucursales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
