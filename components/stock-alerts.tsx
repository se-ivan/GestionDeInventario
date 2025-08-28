"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Package } from "lucide-react"

interface Book {
  id: number
  isbn: string
  titulo: string
  autor: string
  precio: number
  stock: number
}

interface StockAlertsProps {
  books: Book[]
}

export function StockAlerts({ books }: StockAlertsProps) {
  if (books.length === 0) return null

  return (
    <Card className="p-4 border-accent/20 bg-accent/5">
      <div className="flex items-center gap-3 mb-4">
        <AlertTriangle className="h-5 w-5 text-accent" />
        <h3 className="font-semibold text-card-foreground">Alertas de Stock Bajo</h3>
        <Badge variant="secondary">{books.length} libros</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {books.map((book) => (
          <div key={book.id} className="flex items-center gap-3 p-3 bg-card rounded-lg border">
            <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{book.titulo}</p>
              <p className="text-xs text-muted-foreground truncate">{book.autor}</p>
            </div>
            <Badge variant={book.stock === 0 ? "destructive" : "secondary"}>
              {book.stock === 0 ? "Sin stock" : `${book.stock} unidades`}
            </Badge>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <p className="text-sm text-muted-foreground">
          Se recomienda reabastecer estos productos para evitar quedarse sin stock.
        </p>
      </div>
    </Card>
  )
}
