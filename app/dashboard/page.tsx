"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SalesChart } from "@/components/sales-chart"
import { RecentSales } from "@/components/recent-sales"
import { StockAlerts } from "@/components/stock-alerts"
import { TrendingUp, DollarSign, Package, ShoppingCart, ArrowLeft, Calendar, Users, AlertTriangle } from "lucide-react"
import Link from "next/link"

interface DashboardStats {
  todaySales: number
  todayRevenue: number
  totalBooks: number
  lowStockCount: number
  weeklyRevenue: number
  monthlyRevenue: number
  totalCustomers: number
}

interface Sale {
  id: number
  fecha: string
  monto_total: number
  items_count: number
}

interface Book {
  id: number
  titulo: string
  autor: string
  stock: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0,
    todayRevenue: 0,
    totalBooks: 0,
    lowStockCount: 0,
    weeklyRevenue: 0,
    monthlyRevenue: 0,
    totalCustomers: 0,
  })
  const [recentSales, setRecentSales] = useState<Sale[]>([])
  const [lowStockBooks, setLowStockBooks] = useState<Book[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<"today" | "week" | "month">("today")

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setIsLoading(true)
    try {
      // Fetch dashboard stats
      const statsResponse = await fetch("/api/dashboard/stats")
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData)
      }

      // Fetch recent sales
      const salesResponse = await fetch("/api/sales/recent")
      if (salesResponse.ok) {
        const salesData = await salesResponse.json()
        setRecentSales(salesData)
      }

      // Fetch low stock books
      const booksResponse = await fetch("/api/books/low-stock")
      if (booksResponse.ok) {
        const booksData = await booksResponse.json()
        setLowStockBooks(booksData)
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getCurrentPeriodRevenue = () => {
    switch (selectedPeriod) {
      case "today":
        return stats.todayRevenue
      case "week":
        return stats.weeklyRevenue
      case "month":
        return stats.monthlyRevenue
      default:
        return stats.todayRevenue
    }
  }

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case "today":
        return "Hoy"
      case "week":
        return "Esta Semana"
      case "month":
        return "Este Mes"
      default:
        return "Hoy"
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver al POS
                </Button>
              </Link>
              <TrendingUp className="h-8 w-8 text-primary" />
              <h1 className="text-xl font-semibold text-card-foreground">Panel de Control</h1>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={selectedPeriod === "today" ? "default" : "outline"}
                onClick={() => setSelectedPeriod("today")}
              >
                Hoy
              </Button>
              <Button
                size="sm"
                variant={selectedPeriod === "week" ? "default" : "outline"}
                onClick={() => setSelectedPeriod("week")}
              >
                Semana
              </Button>
              <Button
                size="sm"
                variant={selectedPeriod === "month" ? "default" : "outline"}
                onClick={() => setSelectedPeriod("month")}
              >
                Mes
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Ingresos {getPeriodLabel()}</p>
                  <p className="text-xl font-bold text-card-foreground">${getCurrentPeriodRevenue().toFixed(2)}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary/10 rounded-lg">
                  <ShoppingCart className="h-5 w-5 text-secondary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Ventas Hoy</p>
                  <p className="text-xl font-bold text-card-foreground">{stats.todaySales}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <Package className="h-5 w-5 text-accent" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Total Libros</p>
                  <p className="text-xl font-bold text-card-foreground">{stats.totalBooks}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-destructive/10 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Stock Bajo</p>
                  <p className="text-xl font-bold text-card-foreground">{stats.lowStockCount}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Charts and Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Chart */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-card-foreground">Ventas por Día</h3>
                <Badge variant="secondary">Últimos 7 días</Badge>
              </div>
              <SalesChart period={selectedPeriod} />
            </Card>

            {/* Recent Sales */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-card-foreground">Ventas Recientes</h3>
                <Badge variant="secondary">{recentSales.length} ventas</Badge>
              </div>
              <RecentSales sales={recentSales} isLoading={isLoading} />
            </Card>
          </div>

          {/* Stock Alerts */}
          {lowStockBooks.length > 0 && <StockAlerts books={lowStockBooks} />}

          {/* Additional Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-6 w-6 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Promedio Diario</p>
                  <p className="text-lg font-semibold text-card-foreground">
                    ${(stats.monthlyRevenue / 30).toFixed(2)}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Users className="h-6 w-6 text-secondary" />
                <div>
                  <p className="text-sm text-muted-foreground">Clientes Atendidos</p>
                  <p className="text-lg font-semibold text-card-foreground">{stats.totalCustomers}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-6 w-6 text-accent" />
                <div>
                  <p className="text-sm text-muted-foreground">Ticket Promedio</p>
                  <p className="text-lg font-semibold text-card-foreground">
                    ${stats.todaySales > 0 ? (stats.todayRevenue / stats.todaySales).toFixed(2) : "0.00"}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
