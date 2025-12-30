// File: app/api/cron/report-tasa0/route.ts
// Descripción: Reporte específico de VENTAS DE LIBROS CON IMPUESTO 0
// Genera reportes con pestañas (Por_Metodo, Por_Sucursal) y detalles.

import { NextResponse } from 'next/server';
import fs from 'fs';
import prisma from '@/lib/prisma';
import * as XLSX from 'xlsx';

// --- CONFIGURACIÓN ---
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const UPLOADED_FILE_PATH = '/mnt/data/Corte_Ventas.xlsx'; // archivo opcional previamente subido

// --- UTILIDADES ---
function pad2(n: number) { return String(n).padStart(2, '0'); }
function formatDateDDMMYYYY(d: Date) { return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`; }

function toNumber(value: any): number {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = Number(value.replace(/,/g, ''));
    return Number.isFinite(n) ? n : 0;
  }
  try {
    // @ts-ignore
    if (typeof value.toNumber === 'function') return value.toNumber();
    // @ts-ignore
    if (typeof value.toString === 'function') return Number(value.toString()) || 0;
  } catch {}
  return 0;
}

// Reemplaza tu función enviarExcelPorWhatsApp por esta versión más robusta.
async function enviarExcelPorWhatsApp(
  buffer: Buffer | null,
  var1: string,         // ejemplo: reportId
  var2: string,         // ejemplo: tipo
  var3: string,         // ejemplo: fecha
  uploadedFilePath?: string
) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const recipientPhone = '5214431866632';
  const templateName = 'documento_contable'; // Asegúrate que tu plantilla soporte los variables
  const bodyCountEnv = Number(process.env.WHATSAPP_TEMPLATE_BODY_COUNT ?? 2); 
  const bodyCount = Number.isFinite(bodyCountEnv) ? Math.max(0, Math.floor(bodyCountEnv)) : 2;

  if (!token || !phoneId) {
    console.warn('WhatsApp env vars missing; skipping send.');
    return;
  }

  // helper: upload buffer to /{phoneId}/media
  async function uploadBufferGetMediaId(b: Buffer) {
    const formData = new FormData();
    formData.append('messaging_product', 'whatsapp');
    const blob = new Blob([new Uint8Array(b)], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    // MODIFICADO: Nombre de archivo específico para este reporte
    formData.append('file', blob, `Reporte_Libros_Tasa0_${var3}.xlsx`);

    const url = `https://graph.facebook.com/v19.0/${phoneId}/media`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData as any
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = json?.error?.message || JSON.stringify(json);
      throw new Error(`Meta Upload Error: ${err}`);
    }
    return json.id;
  }

  let mediaId: string | undefined;
  try {
    if (buffer) {
      mediaId = await uploadBufferGetMediaId(buffer);
      console.log('Media uploaded via buffer, id=', mediaId);
    }
  } catch (uploadErr) {
    console.error('Buffer upload failed:', uploadErr);
    throw uploadErr;
  }

  if (!mediaId) {
    throw new Error('No se obtuvo mediaId.');
  }

  const candidateVars = [var1 ?? '', var2 ?? '', var3 ?? ''];
  const bodyParams: Array<{ type: 'text'; text: string }> = [];

  for (let i = 0; i < bodyCount; i++) {
    const v = candidateVars[i] ?? '';
    bodyParams.push({ type: 'text', text: String(v) });
  }

  const components: any[] = [
    {
      type: 'header',
      parameters: [
        {
          type: 'document',
          document: { id: mediaId, filename: `Libros_Tasa0_${var3}.xlsx` } // MODIFICADO: Nombre visual en WhatsApp
        }
      ]
    }
  ];
  if (bodyCount > 0) {
    components.push({ type: 'body', parameters: bodyParams });
  }

  const payload = {
    messaging_product: 'whatsapp',
    to: recipientPhone,
    type: 'template',
    template: {
      name: templateName,
      language: { code: 'es_MX' },
      components
    }
  };

  const urlMessages = `https://graph.facebook.com/v19.0/${phoneId}/messages`;
  const res = await fetch(urlMessages, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const resJson = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error('Meta send message error: ' + (resJson.error?.message || JSON.stringify(resJson)));
  }

  return resJson;
}

// --- Cálculo de rango específico ---
function computeRangeFor15And25(startParam?: string | null, endParam?: string | null) {
  if (startParam && endParam) {
    const s = new Date(startParam); s.setHours(0,0,0,0);
    const e = new Date(endParam); e.setHours(23,59,59,999);
    return { start: s, end: e };
  }

  const today = new Date();
  const day = today.getDate();

  if (day === 15) {
    const end = new Date(today); end.setHours(23,59,59,999);
    const start = new Date(today); start.setMonth(start.getMonth() - 1); start.setDate(25); start.setHours(0,0,0,0);
    return { start, end };
  }

  if (day === 29) {
    const start = new Date(today); start.setDate(15); start.setHours(0,0,0,0);
    const end = new Date(today); end.setHours(23,59,59,999);
    return { start, end };
  }

  const end = new Date(); end.setHours(23,59,59,999);
  const start = new Date(); start.setDate(start.getDate() - 7); start.setHours(0,0,0,0);
  return { start, end };
}

// Helpers celdas Excel
function numCell(value: number) { return { v: toNumber(value), t: 'n', z: '#,##0.00' } as any; }
function textCell(value: any) { return { v: value != null ? String(value) : '', t: 's' } as any; }

// --- HANDLER PRINCIPAL (GET) ---
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const forceMode = searchParams.get('force') === 'true';
  const format = (searchParams.get('format') || 'xlsx').toLowerCase();
  const startParam = searchParams.get('startDate');
  const endParam = searchParams.get('endDate');

  const authHeader = request.headers.get('authorization');
  if (!forceMode && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { start: startDate, end: endDate } = computeRangeFor15And25(startParam, endParam);

    // --- CONSULTA MODIFICADA ---
    const ventas = await prisma.sale.findMany({
      where: { 
        fecha: { gte: startDate, lte: endDate }, 
        estado: 'COMPLETADA',
        // 1. Condición: Impuestos sean 0
        impuestos: 0, 
        // 2. Condición: Que sea libro (buscamos en details si existe algun bookId)
        details: {
            some: {
                bookId: { not: null }
            }
        }
      },
      include: { 
        sucursal: true, 
        user: true, 
        datosFactura: true, 
        details: { include: { book: true } } 
      },
      orderBy: { fecha: 'desc' }
    });

    if (!ventas || ventas.length === 0) {
      return NextResponse.json({ message: 'No hay ventas de libros con Tasa 0 para reportar en el rango.' });
    }

    // --- LOGICA DE PROCESAMIENTO (Igual al reporte original) ---
    const sucursalesSet = new Set<string>();
    const metodosSet = new Set<string>();
    for (const v of ventas) {
      sucursalesSet.add(v.sucursal?.nombre ?? 'SIN_SUCURSAL');
      metodosSet.add(String(v.metodoPago || 'OTRO').replace(/_/g, ' '));
    }
    const sucursales = Array.from(sucursalesSet).sort();
    const metodos = Array.from(metodosSet).sort();

    const pivotMetodo: Record<string, Record<string, number>> = {};
    const pivotSucursal: Record<string, Record<string, number>> = {};
    for (const m of metodos) { pivotMetodo[m] = {}; for (const s of sucursales) pivotMetodo[m][s] = 0; pivotMetodo[m]['TOTAL'] = 0; }
    for (const s of sucursales) { pivotSucursal[s] = {}; for (const m of metodos) pivotSucursal[s][m] = 0; pivotSucursal[s]['TOTAL'] = 0; }

    const detallePorSucursal: Record<string, { general: Array<any>; porMetodo: Record<string, Array<any>> }> = {};
    for (const s of sucursales) detallePorSucursal[s] = { general: [], porMetodo: {} };

    let totalVentasPeriodo = 0;
    let totalImpuestosPeriodo = 0;
    let totalDescuentosPeriodo = 0;

    for (const venta of ventas) {
      const suc = venta.sucursal?.nombre ?? 'SIN_SUCURSAL';
      const metodo = String(venta.metodoPago || 'OTRO').replace(/_/g, ' ');
      const monto = toNumber(venta.montoTotal);
      const impuestos = toNumber(venta.impuestos);
      const descuento = toNumber((venta as any).descuentoTotal ?? (venta as any).descuento_total ?? 0);

      totalVentasPeriodo += monto;
      totalImpuestosPeriodo += impuestos;
      totalDescuentosPeriodo += descuento;

      pivotMetodo[metodo][suc] = (pivotMetodo[metodo][suc] || 0) + monto;
      pivotMetodo[metodo]['TOTAL'] = (pivotMetodo[metodo]['TOTAL'] || 0) + monto;

      pivotSucursal[suc][metodo] = (pivotSucursal[suc][metodo] || 0) + monto;
      pivotSucursal[suc]['TOTAL'] = (pivotSucursal[suc]['TOTAL'] || 0) + monto;

      const fila = {
        Fecha: new Date(venta.fecha).toLocaleDateString('es-MX'),
        Hora: new Date(venta.fecha).toLocaleTimeString('es-MX'),
        Folio: venta.id,
        MetodoPago: metodo,
        Vendedor: venta.user?.nombre ?? 'SIN_VENDEDOR',
        Cliente: venta.datosFactura?.razonSocial ?? 'Público General',
        MontoTotal: monto,
        Impuestos: impuestos,
        DescuentoTotal: descuento
      };

      detallePorSucursal[suc].general.push(fila);
      if (!detallePorSucursal[suc].porMetodo[metodo]) detallePorSucursal[suc].porMetodo[metodo] = [];
      detallePorSucursal[suc].porMetodo[metodo].push(fila);
    }

    const sheetMetodoRows = [];
    for (const m of metodos) {
      const row: any = { MetodoPago: m };
      let filaTotal = 0;
      for (const s of sucursales) {
        const val = pivotMetodo[m][s] ?? 0;
        row[s] = val;
        filaTotal += toNumber(val);
      }
      row['TOTAL'] = filaTotal;
      sheetMetodoRows.push(row);
    }
    const totalRowForMetodo: any = { MetodoPago: 'TOTAL' };
    let grandTotalMetodo = 0;
    for (const s of sucursales) {
      let colSum = 0;
      for (const m of metodos) colSum += toNumber(pivotMetodo[m][s]);
      totalRowForMetodo[s] = colSum;
      grandTotalMetodo += colSum;
    }
    totalRowForMetodo['TOTAL'] = grandTotalMetodo;
    sheetMetodoRows.push(totalRowForMetodo);

    const sheetSucursalRows = [];
    for (const s of sucursales) {
      const row: any = { Sucursal: s };
      let filaTotal = 0;
      for (const m of metodos) {
        const val = pivotSucursal[s][m] ?? 0;
        row[m] = val;
        filaTotal += toNumber(val);
      }
      row['TOTAL'] = filaTotal;
      sheetSucursalRows.push(row);
    }
    const totalRowForSucursal: any = { Sucursal: 'TOTAL' };
    let grandTotalSucursal = 0;
    for (const m of metodos) {
      let colSum = 0;
      for (const s of sucursales) colSum += toNumber(pivotSucursal[s][m]);
      totalRowForSucursal[m] = colSum;
      grandTotalSucursal += colSum;
    }
    totalRowForSucursal['TOTAL'] = grandTotalSucursal;
    sheetSucursalRows.push(totalRowForSucursal);

    // --- Crear workbook ---
    const workbook = XLSX.utils.book_new();

    const wsMetodo = XLSX.utils.json_to_sheet(sheetMetodoRows);
    wsMetodo['!cols'] = [{ wch: 25 }].concat(sucursales.map(() => ({ wch: 18 }))).concat([{ wch: 18 }]);
    Object.keys(wsMetodo).forEach(k => {
      if (k[0] === '!') return;
      const cell = wsMetodo[k];
      if (cell && typeof cell.v === 'number') cell.z = '#,##0.00';
    });
    XLSX.utils.book_append_sheet(workbook, wsMetodo, 'Por_Metodo_Tasa0');

    const wsSucursal = XLSX.utils.json_to_sheet(sheetSucursalRows);
    wsSucursal['!cols'] = [{ wch: 30 }].concat(metodos.map(() => ({ wch: 18 }))).concat([{ wch: 18 }]);
    Object.keys(wsSucursal).forEach(k => {
      if (k[0] === '!') return;
      const cell = wsSucursal[k];
      if (cell && typeof cell.v === 'number') cell.z = '#,##0.00';
    });
    XLSX.utils.book_append_sheet(workbook, wsSucursal, 'Por_Sucursal_Tasa0');

    for (const s of sucursales) {
      const rowsAOA: any[] = [];
      rowsAOA.push([`DETALLE GENERAL (LIBROS TASA 0) - ${s}`]);
      rowsAOA.push([]);
      const header = ['Fecha', 'Hora', 'Folio', 'MetodoPago', 'Vendedor', 'Cliente', 'MontoTotal', 'Impuestos', 'DescuentoTotal'];
      rowsAOA.push(header);

      const generalRows = detallePorSucursal[s].general;
      let subtotalGeneral = 0;
      for (const r of generalRows) {
        rowsAOA.push([
          r.Fecha, r.Hora, r.Folio, r.MetodoPago, r.Vendedor, r.Cliente,
          numCell(r.MontoTotal), numCell(r.Impuestos), numCell(r.DescuentoTotal)
        ]);
        subtotalGeneral += toNumber(r.MontoTotal);
      }
      rowsAOA.push([]);
      rowsAOA.push(['', '', '', '', '', 'TOTAL GENERAL', numCell(subtotalGeneral), '', '']);
      rowsAOA.push([]);

      const metodoKeys = Object.keys(detallePorSucursal[s].porMetodo).sort();
      for (const m of metodoKeys) {
        rowsAOA.push([`VENTAS POR ${m.toUpperCase()}`]);
        rowsAOA.push([]);
        rowsAOA.push(header);

        const methodRows = detallePorSucursal[s].porMetodo[m];
        let subtotalMetodo = 0;
        for (const mr of methodRows) {
          rowsAOA.push([
            mr.Fecha, mr.Hora, mr.Folio, mr.MetodoPago, mr.Vendedor, mr.Cliente,
            numCell(mr.MontoTotal), numCell(mr.Impuestos), numCell(mr.DescuentoTotal)
          ]);
          subtotalMetodo += toNumber(mr.MontoTotal);
        }
        rowsAOA.push([]);
        rowsAOA.push(['', '', '', '', '', `SUBTOTAL ${m}`, numCell(subtotalMetodo), '', '']);
        rowsAOA.push([]);
      }

      const ws = XLSX.utils.aoa_to_sheet(rowsAOA);
      ws['!cols'] = [
        { wch: 12 }, { wch: 10 }, { wch: 8 }, { wch: 18 }, { wch: 24 }, { wch: 30 },
        { wch: 14 }, { wch: 14 }, { wch: 14 }
      ];
      XLSX.utils.book_append_sheet(workbook, ws, `Detalle_${s}`.substring(0, 31));
    }

    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const today = new Date();
    let reportId = '';
    if (today.getDate() === 15) reportId = '01';
    else if (today.getDate() === 25) reportId = '02';
    else reportId = `${String(today.getFullYear()).slice(2)}${pad2(today.getMonth() + 1)}${pad2(today.getDate())}`;
    const reportDateStr = formatDateDDMMYYYY(endDate);

    // MODIFICADO: Título del segundo parámetro para identificarlo en WhatsApp
    try {
      await enviarExcelPorWhatsApp(excelBuffer, reportId, 'Libros Tasa 0', reportDateStr, UPLOADED_FILE_PATH);
    } catch (errSend) {
      console.error('Error enviando archivo por WhatsApp:', errSend);
      return NextResponse.json({
        success: false,
        message: 'No se pudo enviar el archivo por WhatsApp.',
        error: errSend instanceof Error ? errSend.message : String(errSend)
      }, { status: 502 });
    }

    if (format === 'json') {
      return NextResponse.json({
        success: true,
        sales_count: ventas.length,
        periodo: { start: startDate.toISOString(), end: endDate.toISOString() },
        reportId,
        reportDate: reportDateStr,
        totals: { totalVentasPeriodo, totalImpuestosPeriodo, totalDescuentosPeriodo },
        sheets: {
          porMetodoRows: sheetMetodoRows.length,
          porSucursalRows: sheetSucursalRows.length,
          detalleSheets: sucursales.length
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: "Reporte Tasa 0 generado y enviado correctamente",
      sales_count: ventas.length
    });
  } catch (error) {
    console.error('Error en reporte Tasa 0:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
}