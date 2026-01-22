// File: app/api/cron/report-books-list/route.ts
// Descripción: Reporte exclusivo de LIBROS VENDIDOS (Título, Cantidad, Hora, Precio)
// Agrupado por pestañas de Sucursal.

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import * as XLSX from 'xlsx';

// --- CONFIGURACIÓN ---
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// --- UTILIDADES ---
function pad2(n: number) { return String(n).padStart(2, '0'); }
function formatDateDDMMYYYY(d: Date) { return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`; }

function toNumber(value: any): number {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  try {
    // @ts-ignore
    if (typeof value.toNumber === 'function') return value.toNumber();
    // @ts-ignore
    if (typeof value.toString === 'function') return Number(value.toString()) || 0;
  } catch {}
  return 0;
}

// Función de envío a WhatsApp (Reutilizada y adaptada para este reporte)
// --- FUNCIÓN CORREGIDA PARA 2 PARÁMETROS ---
async function enviarExcelPorWhatsApp(
  buffer: Buffer,
  reportId: string,
  fechaStr: string
) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const recipientPhone = '5214431715040';
  const templateName = 'documento_contable'; 

  if (!token || !phoneId) return;

  // 1. Subir archivo
  const formData = new FormData();
  formData.append('messaging_product', 'whatsapp');
  const blob = new Blob([new Uint8Array(buffer)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  formData.append('file', blob, `Lista_Libros_Vendidos_${fechaStr}.xlsx`);

  const uploadRes = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/media`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData as any
  });
  
  const uploadJson = await uploadRes.json();
  if (!uploadRes.ok) throw new Error(`Error subiendo archivo: ${JSON.stringify(uploadJson)}`);
  const mediaId = uploadJson.id;

  // 2. Enviar mensaje con plantilla (AJUSTADO A 2 PARÁMETROS)
  const payload = {
    messaging_product: 'whatsapp',
    to: recipientPhone,
    type: 'template',
    template: {
      name: templateName,
      language: { code: 'es_MX' },
      components: [
        {
          type: 'header',
          parameters: [{ type: 'document', document: { id: mediaId, filename: `Libros_Vendidos_${fechaStr}.xlsx` } }]
        },
        {
          type: 'body',
          parameters: [
            // Variable {{1}}: Combinamos "Reporte" + ID para usar solo un espacio
            { type: 'text', text: `Venta Libros ${reportId}` }, 
            // Variable {{2}}: La fecha
            { type: 'text', text: fechaStr }       
          ]
        }
      ]
    }
  };

  const msgRes = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!msgRes.ok) {
    const errJson = await msgRes.json();
    throw new Error(`Error enviando mensaje: ${JSON.stringify(errJson)}`);
  }
}

// --- Lógica de Fechas (Corte quincenal) ---
function computeRangeFor15And25(startParam?: string | null, endParam?: string | null) {
  if (startParam && endParam) {
    const s = new Date(startParam); s.setHours(0,0,0,0);
    const e = new Date(endParam); e.setHours(23,59,59,999);
    return { start: s, end: e };
  }
  const today = new Date();
  const day = today.getDate();

  if (day === 15) {
    // Corte del día 15: Trae del 25 del mes pasado al 15 de este mes (o ajustar según tu lógica exacta de quincena)
    // Ajuste estándar quincenal: 1 al 15
    const start = new Date(today); start.setDate(1); start.setHours(0,0,0,0);
    const end = new Date(today); end.setHours(23,59,59,999);
    return { start, end };
  }
  if (day === 29 || day === 30 || day === 31 || day === 25) { 
    // Corte fin de mes (o día 25): Trae del 16 al día actual
    const start = new Date(today); start.setDate(16); start.setHours(0,0,0,0);
    const end = new Date(today); end.setHours(23,59,59,999);
    return { start, end };
  }
  
  // Default: Últimos 15 días si se ejecuta en otro momento
  const end = new Date(); end.setHours(23,59,59,999);
  const start = new Date(); start.setDate(start.getDate() - 15); start.setHours(0,0,0,0);
  return { start, end };
}

// Helper celda numérica Excel
function numCell(value: number) { return { v: toNumber(value), t: 'n', z: '#,##0.00' } as any; }

// --- HANDLER PRINCIPAL ---
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const forceMode = searchParams.get('force') === 'true';
  const startParam = searchParams.get('startDate');
  const endParam = searchParams.get('endDate');

  // Validación básica de seguridad
  const authHeader = request.headers.get('authorization');
  if (!forceMode && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { start, end } = computeRangeFor15And25(startParam, endParam);

    // 1. Obtener Ventas con Detalles filtrados SOLO para Libros
    const ventas = await prisma.sale.findMany({
      where: {
        fecha: { gte: start, lte: end },
        estado: 'COMPLETADA',
        // Solo traemos ventas que tengan al menos un libro
        details: { some: { bookId: { not: null } } }
      },
      include: {
        sucursal: true,
        details: {
          where: { bookId: { not: null } }, // Filtra los detalles: ignora dulces aquí
          include: { book: true }
        }
      },
      orderBy: { fecha: 'asc' }
    });

    if (ventas.length === 0) {
      return NextResponse.json({ message: 'No se vendieron libros en este periodo.' });
    }

    // 2. Procesar datos por Sucursal
    const librosPorSucursal: Record<string, any[]> = {};
    const sucursales = new Set<string>();

    for (const venta of ventas) {
      const nomSucursal = venta.sucursal?.nombre || 'General';
      sucursales.add(nomSucursal);

      if (!librosPorSucursal[nomSucursal]) librosPorSucursal[nomSucursal] = [];

      // Aplanar los detalles para crear filas
      for (const detalle of venta.details) {
        if (!detalle.book) continue; // seguridad extra

        librosPorSucursal[nomSucursal].push({
          Fecha: new Date(venta.fecha).toLocaleDateString('es-MX'),
          Hora: new Date(venta.fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
          Titulo: detalle.book.titulo,
          Autor: detalle.book.autor,
          Cantidad: detalle.cantidad_vendida,
          PrecioUnitario: toNumber(detalle.precioUnitario),
          Subtotal: toNumber(detalle.subtotal) // Cantidad * Precio (menos descuentos si aplica lógica interna)
        });
      }
    }

    // 3. Generar Excel
    const workbook = XLSX.utils.book_new();

    // Crear una hoja por cada sucursal
    for (const suc of Array.from(sucursales)) {
      const data = librosPorSucursal[suc];
      
      // Convertir a hoja con encabezados
      const ws = XLSX.utils.json_to_sheet(data.map(item => ({
        Fecha: item.Fecha,
        Hora: item.Hora,
        Libro: item.Titulo,
        Autor: item.Autor,
        Cant: item.Cantidad,
        'P. Unitario': item.PrecioUnitario,
        Subtotal: item.Subtotal
      })));

      // Formato de anchos de columna
      ws['!cols'] = [
        { wch: 12 }, // Fecha
        { wch: 8 },  // Hora
        { wch: 40 }, // Libro
        { wch: 20 }, // Autor
        { wch: 6 },  // Cant
        { wch: 12 }, // Precio
        { wch: 12 }  // Subtotal
      ];

      // Formato de moneda para columnas F (6) y G (7) [indices 5 y 6]
      // Recorremos celdas para aplicar formato numérico
      Object.keys(ws).forEach(cellKey => {
        if (cellKey.startsWith('!')) return;
        const cell = ws[cellKey];
        if (cell.t === 'n' && (cellKey.startsWith('F') || cellKey.startsWith('G'))) {
          cell.z = '$#,##0.00';
        }
      });

      // Añadir hoja al libro. Limpiamos nombre para que sea válido en Excel
      const sheetName = suc.replace(/[^a-zA-Z0-9 ]/g, "").substring(0, 30);
      XLSX.utils.book_append_sheet(workbook, ws, sheetName);
    }

    // 4. Enviar a WhatsApp
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    // Generar ID del reporte (ej. "LIBR-01")
    const today = new Date();
    const reportId = `LIB-${today.getDate()}-${today.getMonth() + 1}`;
    const fechaReporte = formatDateDDMMYYYY(end);

    try {
      await enviarExcelPorWhatsApp(excelBuffer, reportId, fechaReporte);
    } catch (e) {
      console.error(e);
      return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Reporte de libros vendidos enviado',
      sales_processed: ventas.length
    });

  } catch (error) {
    console.error('Error generando reporte de libros:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// Para usarlo con Cron Scheduler de Vercel (vercel.json):
// { "path": "/api/cron/report-books-list", "schedule": "0 22 15,28 * *" }