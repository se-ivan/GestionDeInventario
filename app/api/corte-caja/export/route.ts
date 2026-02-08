import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import * as XLSX from 'xlsx';
import { auth } from '@/auth';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const cutId = searchParams.get('id');

    const session = await auth();
    if (!session?.user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    if (!cutId) return NextResponse.json({ message: 'Missing ID' }, { status: 400 });

    const cut = await prisma.corteCaja.findUnique({
        where: { id: Number(cutId) },
        include: { sucursal: true, user: true }
    });

    if (!cut) return NextResponse.json({ message: 'Corte not found' }, { status: 404 });

    // Fetch details
    const sales = await prisma.sale.findMany({
        where: {
            userId: cut.userId,
            sucursalId: cut.sucursalId,
            createdAt: {
                gte: cut.fechaApertura,
                lte: cut.fechaCierre || new Date() // If active, shows current
            }
        },
        include: { details: { include: { book: true, dulce: true } } },
        orderBy: { createdAt: 'desc' }
    });

    const expenses = await prisma.expense.findMany({
        where: {
            userId: cut.userId,
            sucursalId: cut.sucursalId,
            createdAt: {
                gte: cut.fechaApertura,
                lte: cut.fechaCierre || new Date()
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    // Create Workbook
    const wb = XLSX.utils.book_new();

    // 1. Sheet RESUMEN
    const resumenData = [
        ["REPORTE DE CORTE DE CAJA"],
        [""],
        ["Sucursal", cut.sucursal.nombre],
        ["Usuario", cut.user.nombre],
        ["Apertura", cut.fechaApertura.toLocaleString("es-MX", { timeZone: "America/Mexico_City" })],
        ["Cierre", cut.fechaCierre ? cut.fechaCierre.toLocaleString("es-MX", { timeZone: "America/Mexico_City" }) : "En Curso"],
        [""],
        ["Monto Inicial (Fondo)", Number(cut.montoInicial)],
        ["(+) Ventas Totales", Number(cut.ventasSistema)],
        ["(-) Gastos Totales", Number(cut.gastosSistema)],
        ["(=) Total Esperado", Number(cut.montoInicial) + Number(cut.ventasSistema) - Number(cut.gastosSistema)],
        [""],
        ["Monto Real (Contado)", Number(cut.montoFinal || 0)],
        ["Diferencia", Number(cut.diferencia || 0)],
        [""],
        ["Observaciones", cut.observaciones || "Ninguna"]
    ];

    const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
    XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");

    // 2. Sheet VENTAS
    const ventasMap = sales.map(s => ([
        s.id,
        s.createdAt.toLocaleTimeString("es-MX", { timeZone: "America/Mexico_City" }),
        s.details.map(d => `${d.cantidad_vendida}x ${d.book?.titulo || d.dulce?.nombre}`).join(", "),
        Number(s.montoTotal),
        s.metodoPago
    ]));
    
    // Add Summary at bottom
    const totalVentas = sales.reduce((acc, s) => acc + Number(s.montoTotal), 0);
    ventasMap.push(["", "", "TOTAL", totalVentas, ""]);

    const wsVentas = XLSX.utils.aoa_to_sheet([["ID", "Hora", "Detalle", "Monto", "Metodo Pago"], ...ventasMap]);
    XLSX.utils.book_append_sheet(wb, wsVentas, "Ventas");

    // 3. Sheet GASTOS
    const gastosMap = expenses.map(e => ([
        e.id,
        e.createdAt.toLocaleTimeString("es-MX", { timeZone: "America/Mexico_City" }),
        e.concepto,
        e.categoria,
        Number(e.monto)
    ]));

    // Add Summary
    const totalGastos = expenses.reduce((acc, e) => acc + Number(e.monto), 0);
    gastosMap.push(["", "", "", "TOTAL", totalGastos]);

    const wsGastos = XLSX.utils.aoa_to_sheet([["ID", "Hora", "Concepto", "Categoría", "Monto"], ...gastosMap]);
    XLSX.utils.book_append_sheet(wb, wsGastos, "Gastos");

    // Generate Buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Return Response
    return new NextResponse(buffer, {
        headers: {
            'Content-Disposition': `attachment; filename="CorteCaja_${cut.id}_${new Date().toISOString().split('T')[0]}.xlsx"`,
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
    });
}
