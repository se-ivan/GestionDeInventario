"use client"

import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ShoppingCart, Clock } from "lucide-react"

interface Sale {
  id: number
  fecha: string
  monto_total: number
  items_count: number
}

interface RecentSalesProps {
  sales: Sale[]
  isLoading: boolean
}

export function RecentSales({ sales, isLoading }: RecentSalesProps) {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return "Hoy"
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Ayer"
    } else {
      return date.toLocaleDateString("es-ES", {
        month: "short",
        day: "numeric",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg animate-pulse">
            <div className="w-8 h-8 bg-muted rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
            <div className="h-6 bg-muted rounded w-16" />
          </div>
        ))}
      </div>
    )
  }

  if (sales.length === 0) {
    return (
      <div className="text-center py-8">
        <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">No hay ventas recientes</p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-64">
      <div className="space-y-3">
        {sales.map((sale) => (
          <div
            key={sale.id}
            className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg hover:bg-muted/40 transition-colors"
          >
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <ShoppingCart className="h-4 w-4 text-primary" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-medium text-sm text-card-foreground">Venta #{sale.id}</p>
                <Badge variant="secondary" className="text-xs">
                  {sale.items_count} {sale.items_count === 1 ? "libro" : "libros"}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>
                  {formatDate(sale.fecha)} - {formatTime(sale.fecha)}
                </span>
              </div>
            </div>

            <div className="text-right">
              <p className="font-semibold text-primary">${sale.monto_total.toFixed(2)}</p>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
