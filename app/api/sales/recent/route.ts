import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

// GET /api/sales/recent - Get recent sales
export async function GET() {
  try {
    const recentSales = await prisma.sale.findMany({
      take: 10,
      orderBy: {
        fecha: 'desc'
      },
      include: {
        details: {
          select: {
            cantidadVendida: true
          }
        }
      }
    })

    // Transform the data to match the expected format
    const transformedSales = recentSales.map(sale => ({
      id: sale.id,
      fecha: sale.fecha.toISOString(),
      monto_total: Number(sale.montoTotal),
      items_count: sale.details.reduce((total, detail) => total + detail.cantidadVendida, 0)
    }))

    return NextResponse.json(transformedSales)
  } catch (error) {
    console.error("Error fetching recent sales:", error)
    return NextResponse.json({ error: "Failed to fetch recent sales" }, { status: 500 })
  }
}
