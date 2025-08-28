"use client"

import { useState, useEffect } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface ChartData {
  date: string
  sales: number
  revenue: number
}

interface SalesChartProps {
  period: "today" | "week" | "month"
}

export function SalesChart({ period }: SalesChartProps) {
  const [data, setData] = useState<ChartData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchChartData()
  }, [period])

  const fetchChartData = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/dashboard/chart?period=${period}`)
      if (response.ok) {
        const chartData = await response.json()
        setData(chartData)
      }
    } catch (error) {
      console.error("Error fetching chart data:", error)
      // Mock data for demonstration
      const mockData = generateMockData(period)
      setData(mockData)
    } finally {
      setIsLoading(false)
    }
  }

  const generateMockData = (period: string): ChartData[] => {
    const days = period === "month" ? 30 : 7
    const data: ChartData[] = []

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)

      data.push({
        date: date.toLocaleDateString("es-ES", {
          month: "short",
          day: "numeric",
        }),
        sales: Math.floor(Math.random() * 20) + 5,
        revenue: Math.floor(Math.random() * 500) + 100,
      })
    }

    return data
  }

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <p className="text-muted-foreground">Cargando gráfico...</p>
      </div>
    )
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="date" className="text-xs fill-muted-foreground" tick={{ fontSize: 12 }} />
          <YAxis className="text-xs fill-muted-foreground" tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              color: "hsl(var(--card-foreground))",
            }}
            formatter={(value, name) => [
              name === "revenue" ? `$${value}` : value,
              name === "revenue" ? "Ingresos" : "Ventas",
            ]}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: "hsl(var(--primary))", strokeWidth: 2 }}
          />
          <Line
            type="monotone"
            dataKey="sales"
            stroke="hsl(var(--secondary))"
            strokeWidth={2}
            dot={{ fill: "hsl(var(--secondary))", strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: "hsl(var(--secondary))", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
