import { type NextRequest, NextResponse } from "next/server"

// GET /api/dashboard/chart?period=week - Get chart data
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get("period") || "week"

    const days = period === "month" ? 30 : 7
    const data = []

    // Generate mock chart data
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)

      // Simulate varying sales data
      const baseRevenue = 100 + Math.random() * 400
      const baseSales = 5 + Math.floor(Math.random() * 15)

      // Add some patterns (weekends lower, mid-week higher)
      const dayOfWeek = date.getDay()
      const weekendMultiplier = dayOfWeek === 0 || dayOfWeek === 6 ? 0.7 : 1.2

      data.push({
        date: date.toLocaleDateString("es-ES", {
          month: "short",
          day: "numeric",
        }),
        sales: Math.floor(baseSales * weekendMultiplier),
        revenue: Math.floor(baseRevenue * weekendMultiplier),
      })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching chart data:", error)
    return NextResponse.json({ error: "Failed to fetch chart data" }, { status: 500 })
  }
}
