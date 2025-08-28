import { NextResponse } from "next/server"

// Mock sales data - In production, replace with actual database connection
const recentSales = [
  { id: 1, fecha: new Date(Date.now() - 1000 * 60 * 30).toISOString(), monto_total: 48.49, items_count: 3 },
  { id: 2, fecha: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), monto_total: 71.48, items_count: 2 },
  { id: 3, fecha: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), monto_total: 35.98, items_count: 1 },
  { id: 4, fecha: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(), monto_total: 52.75, items_count: 4 },
  { id: 5, fecha: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(), monto_total: 29.99, items_count: 2 },
  { id: 6, fecha: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(), monto_total: 67.25, items_count: 3 },
  { id: 7, fecha: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(), monto_total: 41.5, items_count: 1 },
  { id: 8, fecha: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), monto_total: 89.99, items_count: 5 },
]

// GET /api/sales/recent - Get recent sales
export async function GET() {
  try {
    // Sort by date (most recent first) and limit to 10
    const sortedSales = recentSales
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      .slice(0, 10)

    return NextResponse.json(sortedSales)
  } catch (error) {
    console.error("Error fetching recent sales:", error)
    return NextResponse.json({ error: "Failed to fetch recent sales" }, { status: 500 })
  }
}
