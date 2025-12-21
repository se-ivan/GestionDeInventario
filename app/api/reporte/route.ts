// File: app/api/cron/report/route.ts

import { NextResponse } from 'next/server';
import fs from 'fs';
import prisma from '@/lib/prisma';
import * as XLSX from 'xlsx';

// --- CONFIGURACIÓN ---
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const UPLOADED_FILE_PATH = '/mnt/data/Corte_Ventas.xlsx'; // archivo opcional previamente subido (se adjuntará si existe)

// --- UTILIDADES ---
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
    } catch { }
    return 0;
}

// Helper: crear celda numérica para XLSX
function numCell(value: number) {
    return { v: toNumber(value), t: 'n', z: '#,##0.00' } as any;
}

// --- HANDLER PRINCIPAL (GET) ---
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);

    // Puedes usar ?date=2023-10-27 para descargar un día específico, o por defecto "hoy"
    const dateParam = searchParams.get('date');

    // Seguridad opcional: si quieres proteger este botón, descomenta esto y envía un token o verifica sesión
    // const authHeader = request.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) { return new NextResponse('Unauthorized', { status: 401 }); }

    try {
        // 1. CONFIGURAR RANGO DE FECHAS (Todo el día: 00:00:00 a 23:59:59)
        let baseDate = dateParam ? new Date(dateParam) : new Date();

        // Validar fecha invalida
        if (isNaN(baseDate.getTime())) baseDate = new Date();

        const startDate = new Date(baseDate);
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(baseDate);
        endDate.setHours(23, 59, 59, 999);

        console.log(`Generando reporte para: ${startDate.toLocaleString()} a ${endDate.toLocaleString()}`);

        // 2. CONSULTA A BASE DE DATOS
        const ventas = await prisma.sale.findMany({
            where: { fecha: { gte: startDate, lte: endDate }, estado: 'COMPLETADA' },
            include: {
                sucursal: true,
                user: true,
                datosFactura: true,
                // Incluimos ambas relaciones para tener la data completa en memoria
                details: { include: { book: true, dulce: true } }
            },
            orderBy: { fecha: 'desc' }
        });

        if (!ventas || ventas.length === 0) {
            // Retornamos un mensaje simple o un Excel vacío con aviso
            return NextResponse.json({ message: 'No hay ventas registradas en este día.' }, { status: 404 });
        }

        // 3. LÓGICA DE EXCEL (Idéntica a tu código original para mantener el formato)
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

        for (const venta of ventas) {
            const suc = venta.sucursal?.nombre ?? 'SIN_SUCURSAL';
            const metodo = String(venta.metodoPago || 'OTRO').replace(/_/g, ' ');
            const monto = toNumber(venta.montoTotal);
            const impuestos = toNumber(venta.impuestos);
            const descuento = toNumber((venta as any).descuentoTotal ?? 0);

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

        // --- Construir hojas principales ---
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

        // --- Crear Workbook ---
        const workbook = XLSX.utils.book_new();

        const wsMetodo = XLSX.utils.json_to_sheet(sheetMetodoRows);
        wsMetodo['!cols'] = [{ wch: 25 }].concat(sucursales.map(() => ({ wch: 18 }))).concat([{ wch: 18 }]);
        Object.keys(wsMetodo).forEach(k => { if (k[0] !== '!') { const cell = wsMetodo[k]; if (cell.t === 'n') cell.z = '#,##0.00'; } });
        XLSX.utils.book_append_sheet(workbook, wsMetodo, 'Por_Metodo');

        const wsSucursal = XLSX.utils.json_to_sheet(sheetSucursalRows);
        wsSucursal['!cols'] = [{ wch: 30 }].concat(metodos.map(() => ({ wch: 18 }))).concat([{ wch: 18 }]);
        Object.keys(wsSucursal).forEach(k => { if (k[0] !== '!') { const cell = wsSucursal[k]; if (cell.t === 'n') cell.z = '#,##0.00'; } });
        XLSX.utils.book_append_sheet(workbook, wsSucursal, 'Por_Sucursal');

        // Hojas detalle
        for (const s of sucursales) {
            const rowsAOA: any[] = [];
            rowsAOA.push([`DETALLE GENERAL - ${s}`], []);
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
            rowsAOA.push([], ['', '', '', '', '', 'TOTAL GENERAL', numCell(subtotalGeneral), '', ''], []);

            const metodoKeys = Object.keys(detallePorSucursal[s].porMetodo).sort();
            for (const m of metodoKeys) {
                rowsAOA.push([`VENTAS POR ${m.toUpperCase()}`], [], header);
                const methodRows = detallePorSucursal[s].porMetodo[m];
                let subtotalMetodo = 0;
                for (const mr of methodRows) {
                    rowsAOA.push([
                        mr.Fecha, mr.Hora, mr.Folio, mr.MetodoPago, mr.Vendedor, mr.Cliente,
                        numCell(mr.MontoTotal), numCell(mr.Impuestos), numCell(mr.DescuentoTotal)
                    ]);
                    subtotalMetodo += toNumber(mr.MontoTotal);
                }
                rowsAOA.push([], ['', '', '', '', '', `SUBTOTAL ${m}`, numCell(subtotalMetodo), '', ''], []);
            }

            const ws = XLSX.utils.aoa_to_sheet(rowsAOA);
            ws['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 8 }, { wch: 18 }, { wch: 24 }, { wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
            XLSX.utils.book_append_sheet(workbook, ws, `Detalle_${s}`.substring(0, 31));
        }

        // Adjuntar archivo previo si existe (para mantener tu lógica anterior)
        try {
            if (fs.existsSync(UPLOADED_FILE_PATH)) {
                const existingWb = XLSX.readFile(UPLOADED_FILE_PATH);
                existingWb.SheetNames.forEach((sn, idx) => {
                    XLSX.utils.book_append_sheet(workbook, existingWb.Sheets[sn], `CortePrevio_${idx}_${sn}`.substring(0, 31));
                });
            }
        } catch (e) { }

        // 4. GENERAR BUFFER DE DESCARGA
        const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        // Formatear nombre del archivo para la descarga: "Corte_Diario_27-10-2023.xlsx"
        const fileName = `Corte_Diario_${startDate.getDate()}-${startDate.getMonth() + 1}-${startDate.getFullYear()}.xlsx`;

        // 5. RETORNAR EL ARCHIVO AL NAVEGADOR
        return new NextResponse(excelBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${fileName}"`,
                'Content-Length': excelBuffer.length.toString(),
            },
        });

    } catch (error) {
        console.error('Error generando reporte:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Error desconocido' },
            { status: 500 }
        );
    }
}