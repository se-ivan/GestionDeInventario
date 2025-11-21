import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import * as XLSX from 'xlsx';

async function enviarExcelPorWhatsApp(buffer: Buffer) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const recipientPhone = "5214431866632"; // ✅ Corregido con lada de México

  console.log("--- Iniciando subida a WhatsApp ---");

  // 1. Subir Archivo
  const formData = new FormData();
  const blob = new Blob([new Uint8Array(buffer)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  formData.append('file', blob, 'resumen_ventas.xlsx');
  formData.append('type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  formData.append('messaging_product', 'whatsapp');

  const uploadRes = await fetch(`https://graph.facebook.com/v17.0/${phoneId}/media`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });

  const uploadData = await uploadRes.json();
  
  // 🛑 DETECTOR DE ERRORES EN SUBIDA
  if (!uploadRes.ok) {
    console.error("❌ Error subiendo archivo a Meta:", JSON.stringify(uploadData, null, 2));
    throw new Error(`Error Meta Upload: ${uploadData.error?.message || 'Unknown'}`);
  }
  
  console.log("✅ Archivo subido, ID:", uploadData.id);
  const mediaId = uploadData.id;

  // 2. Enviar Mensaje
  const msgRes = await fetch(`https://graph.facebook.com/v17.0/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: recipientPhone,
      type: "document",
      document: {
        id: mediaId,
        filename: "Resumen_Contable.xlsx",
        caption: "Reporte de Ventas"
      }
    })
  });

  const msgData = await msgRes.json();

  // 🛑 DETECTOR DE ERRORES EN ENVÍO
  if (!msgRes.ok) {
    console.error("❌ Error enviando mensaje:", JSON.stringify(msgData, null, 2));
    throw new Error(`Error Meta Send: ${msgData.error?.message || 'Unknown'}`);
  }

  console.log("✅ Mensaje enviado correctamente:", msgData);
}
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const forceMode = searchParams.get('force') === 'true';

  // 1. Validar seguridad (opcional pero recomendado para Cron Jobs)
  const authHeader = request.headers.get('authorization');
  if (!forceMode && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    // 2. Definir el rango de fechas (últimos 7, 21 o 31 días según lógica)
    // Para este ejemplo, tomamos las ventas desde el último corte.
    // Supongamos que el cron corre y pide "lo de la semana".
    const startDate = new Date();
    if (!forceMode && ![7, 21, 31].includes(startDate.getDate())) {
        return NextResponse.json({ message: `Hoy es día ${startDate.getDate()}, no toca reporte.` });
    }
    startDate.setDate(startDate.getDate() - 7); // Ajustable

    // 3. Obtener datos de la DB
    const ventas = await prisma.sale.findMany({
      where: {
        fecha: { gte: startDate }
      },
      include: {
        details: {
          include: { book: true } // Necesitamos el libro para ver el costo original
        }
      }
    });

    // 4. Procesar datos para el Contador
    const dataParaExcel = ventas.flatMap(venta => 
      venta.details.map(detalle => {
        const costo = Number(detalle.book.precioCompra);
        const ventaUnit = Number(detalle.precioUnitario);
        const descuento = Number(detalle.descuento);
        const precioFinal = ventaUnit - descuento;
        const margen = precioFinal - costo;

        return {
          "Fecha": venta.fecha.toISOString().split('T')[0],
          "ID Venta": venta.id,
          "Método Pago": venta.metodoPago,
          "Libro": detalle.book.titulo,
          "Cantidad": detalle.cantidadVendida,
          "Precio Venta": precioFinal,
          "Costo (Libro)": costo,
          "Descuento": descuento,
          "Subtotal": Number(detalle.subtotal),
          "Margen Ganancia": margen * detalle.cantidadVendida
        };
      })
    );

    // 5. Crear el libro de Excel
    const worksheet = XLSX.utils.json_to_sheet(dataParaExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Resumen Ventas");

    // 6. Generar Buffer (Binario)
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // 7. LLAMAR A TU FUNCIÓN DE WHATSAPP
    await enviarExcelPorWhatsApp(excelBuffer); 

    return NextResponse.json({ success: true, count: ventas.length });

  } catch (error) {
    console.error(error);
    return new NextResponse('Error generating report', { status: 500 });
  }
}
