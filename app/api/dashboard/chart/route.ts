import { type NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

// GET /api/dashboard/chart?period=week - Get chart data
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get("period") || "week"

    const days = period === "month" ? 30 : 7
    const data = []

    // Get sales data for the specified period
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)

      // Get sales for this specific day
      const dailySales = await prisma.sale.findMany({
        where: {
          fecha: {
            gte: startOfDay,
            lt: endOfDay
          }
        },
        select: {
          montoTotal: true
        }
      })

      const salesCount = dailySales.length
      const revenue = dailySales.reduce((sum, sale) => sum + Number(sale.montoTotal), 0)

      data.push({
        date: date.toLocaleDateString("es-ES", {
          month: "short",
          day: "numeric",
        }),
        sales: salesCount,
        revenue: Math.floor(revenue),
      })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching chart data:", error)
    return NextResponse.json({ error: "Failed to fetch chart data" }, { status: 500 })
  }
}
