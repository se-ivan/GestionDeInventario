import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/sales/recent
export async function GET() {
  try {
    const recentSales = await prisma.sale.findMany({
      take: 10,
      orderBy: {
        fecha: "desc", // Tu schema usa 'fecha' para la fecha de venta
      },
      include: {
        // Relación con detalles para contar libros
        details: {
          select: {
            cantidad_vendida: true,
          },
        },
        // Relación con Usuario (para saber quién vendió)
        user: {
          select: {
            nombre: true,
          },
        },
        // Relación con Sucursal (útil si tienes múltiples puntos de venta)
        sucursal: {
          select: {
            nombre: true,
          },
        },
      },
    });

    // Transformamos los datos para el frontend
    const transformedSales = recentSales.map((sale) => ({
      id: sale.id,
      fecha: sale.fecha.toISOString(),
      
      // Prisma devuelve Decimal, lo convertimos a Number para el JSON
      monto_total: Number(sale.montoTotal),
      
      // Sumamos la cantidad de libros vendidos en esta transacción
      items_count: sale.details.reduce(
        (total, detail) => total + detail.cantidad_vendida,
        0
      ),
      
      // Datos extra útiles gracias a tu nuevo schema
      vendedor: sale.user?.nombre || "Desconocido",
      sucursal: sale.sucursal?.nombre || "General",
      metodo_pago: sale.metodoPago.replace(/_/g, " "), // Ej: "TARJETA_DEBITO" -> "TARJETA DEBITO"
      estado: sale.estado
    }));

    return NextResponse.json(transformedSales);
  } catch (error) {
    console.error("Error fetching recent sales:", error);
    return NextResponse.json(
      { error: "Failed to fetch recent sales" },
      { status: 500 }
    );
  }
}