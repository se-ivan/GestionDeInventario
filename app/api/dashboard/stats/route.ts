import { NextResponse } from "next/server"

// Mock data - In production, replace with actual database queries
const books = [
  { id: 1, stock: 15 },
  { id: 2, stock: 8 },
  { id: 3, stock: 12 },
  { id: 4, stock: 6 },
  { id: 5, stock: 20 },
  { id: 6, stock: 10 },
  { id: 7, stock: 14 },
  { id: 8, stock: 9 },
  { id: 9, stock: 11 },
  { id: 10, stock: 25 },
  { id: 11, stock: 3 },
  { id: 12, stock: 2 },
]

const sales = [
  { fecha: new Date().toISOString(), monto_total: 48.49 },
  { fecha: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), monto_total: 71.48 },
  { fecha: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), monto_total: 35.98 },
  { fecha: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), monto_total: 89.99 },
  { fecha: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), monto_total: 52.75 },
]

// GET /api/dashboard/stats - Get dashboard statistics
export async function GET() {
  try {
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const startOfWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

    // Calculate today's sales
    const todaySales = sales.filter((sale) => new Date(sale.fecha) >= startOfDay)
    const todayRevenue = todaySales.reduce((sum, sale) => sum + sale.monto_total, 0)

    // Calculate weekly revenue
    const weeklySales = sales.filter((sale) => new Date(sale.fecha) >= startOfWeek)
    const weeklyRevenue = weeklySales.reduce((sum, sale) => sum + sale.monto_total, 0)

    // Calculate monthly revenue
    const monthlySales = sales.filter((sale) => new Date(sale.fecha) >= startOfMonth)
    const monthlyRevenue = monthlySales.reduce((sum, sale) => sum + sale.monto_total, 0)

    // Calculate low stock count
    const lowStockCount = books.filter((book) => book.stock <= 5).length

    const stats = {
      todaySales: todaySales.length,
      todayRevenue,
      totalBooks: books.length,
      lowStockCount,
      weeklyRevenue,
      monthlyRevenue,
      totalCustomers: sales.length, // Simplified - each sale = 1 customer
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    return NextResponse.json({ error: "Failed to fetch dashboard stats" }, { status: 500 })
  }
}
