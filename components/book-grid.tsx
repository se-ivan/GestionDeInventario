"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, BookOpen, User } from "lucide-react"

interface Book {
  id: number
  isbn: string
  titulo: string
  autor: string
  precio: number
  stock: number
}

interface BookGridProps {
  books: Book[]
  onAddToCart: (book: Book) => void
}

export function BookGrid({ books, onAddToCart }: BookGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {books.map((book) => (
        <Card
          key={book.id}
          className="group hover:shadow-lg transition-all duration-200 hover:scale-[1.02] border-border/50"
        >
          <div className="p-4 space-y-4">
            {/* Book Cover Preview */}
            <div className="flex justify-center">
              <div className="w-20 h-28 sm:w-24 sm:h-32 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border-2 border-primary/20 flex flex-col items-center justify-center shadow-sm">
                <BookOpen className="h-8 w-8 text-primary/60 mb-1" />
                <div className="text-xs text-primary/40 font-mono px-1 text-center break-all">
                  {book.isbn.slice(-4)}
                </div>
              </div>
            </div>

            {/* Book Information */}
            <div className="space-y-2 text-center sm:text-left">
              <h4 className="font-semibold text-sm sm:text-base text-card-foreground line-clamp-2 leading-tight">
                {book.titulo}
              </h4>

              <div className="flex items-center justify-center sm:justify-start gap-1 text-muted-foreground">
                <User className="h-3 w-3 flex-shrink-0" />
                <p className="text-xs sm:text-sm truncate">{book.autor}</p>
              </div>

              <p className="text-xs text-muted-foreground font-mono">ISBN: {book.isbn}</p>
            </div>

            {/* Price and Stock */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <span className="font-bold text-lg text-primary">${book.precio.toFixed(2)}</span>
                <Badge
                  variant={book.stock > 5 ? "default" : book.stock > 0 ? "secondary" : "destructive"}
                  className="text-xs w-fit"
                >
                  {book.stock > 0 ? `${book.stock} disponibles` : "Agotado"}
                </Badge>
              </div>

              <Button
                size="sm"
                onClick={() => onAddToCart(book)}
                disabled={book.stock === 0}
                className="h-9 w-9 sm:h-8 sm:w-auto sm:px-3 group-hover:scale-105 transition-transform"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline ml-1">Agregar</span>
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
