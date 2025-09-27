import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

// GET /api/dashboard/stats - Get dashboard statistics
export async function GET() {
  try {
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const startOfWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const startOfMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000) // Last 30 days instead of calendar month

    // Calculate today's sales and revenue
    const todaySalesData = await prisma.sale.findMany({
      where: {
        fecha: {
          gte: startOfDay
        }
      },
      select: {
        montoTotal: true
      }
    })

    const todaySales = todaySalesData.length
    const todayRevenue = todaySalesData.reduce((sum, sale) => sum + Number(sale.montoTotal), 0)

    // Calculate weekly revenue
    const weeklySalesData = await prisma.sale.findMany({
      where: {
        fecha: {
          gte: startOfWeek
        }
      },
      select: {
        montoTotal: true
      }
    })

    const weeklyRevenue = weeklySalesData.reduce((sum, sale) => sum + Number(sale.montoTotal), 0)

    // Calculate monthly revenue
    const monthlySalesData = await prisma.sale.findMany({
      where: {
        fecha: {
          gte: startOfMonth
        }
      },
      select: {
        montoTotal: true
      }
    })

    const monthlyRevenue = monthlySalesData.reduce((sum, sale) => sum + Number(sale.montoTotal), 0)

    // Get total books count
    const totalBooks = await prisma.book.count()

    // Calculate low stock count (books with stock <= 2 in any branch)
    const lowStockBooks = await prisma.book.count({
      where: {
        inventario: {
          some: {
            stock: {
              lte: 2
            }
          }
        }
      }
    })

    // Get total customers (unique sales count as simplified customer metric)
    const totalSales = await prisma.sale.count()

    const stats = {
      todaySales,
      todayRevenue,
      totalBooks,
      lowStockCount: lowStockBooks,
      weeklyRevenue,
      monthlyRevenue,
      totalCustomers: totalSales, // Simplified - total sales as customer metric
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    return NextResponse.json({ error: "Failed to fetch dashboard stats" }, { status: 500 })
  }
}
