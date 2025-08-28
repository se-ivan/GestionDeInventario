"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Edit, Trash2, ChevronLeft, ChevronRight } from "lucide-react"

interface Book {
  id: number
  isbn: string
  titulo: string
  autor: string
  precio: number
  stock: number
  created_at: string
  updated_at: string
}

interface BookTableProps {
  books: Book[]
  onEdit: (book: Book) => void
  onDelete: (bookId: number) => void
  isLoading: boolean
}

export function BookTable({ books, onEdit, onDelete, isLoading }: BookTableProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const totalPages = Math.ceil(books.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentBooks = books.slice(startIndex, endIndex)

  const getStockBadgeVariant = (stock: number) => {
    if (stock === 0) return "destructive"
    if (stock <= 5) return "secondary"
    return "default"
  }

  const getStockBadgeText = (stock: number) => {
    if (stock === 0) return "Sin stock"
    if (stock <= 5) return "Stock bajo"
    return "En stock"
  }

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Cargando inventario...</p>
      </div>
    )
  }

  if (books.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No se encontraron libros</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Autor</TableHead>
              <TableHead>ISBN</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentBooks.map((book) => (
              <TableRow key={book.id}>
                <TableCell className="font-medium">{book.titulo}</TableCell>
                <TableCell>{book.autor}</TableCell>
                <TableCell className="font-mono text-sm">{book.isbn}</TableCell>
                <TableCell className="font-semibold">${book.precio.toFixed(2)}</TableCell>
                <TableCell>{book.stock}</TableCell>
                <TableCell>
                  <Badge variant={getStockBadgeVariant(book.stock)}>{getStockBadgeText(book.stock)}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => onEdit(book)}>
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => onDelete(book.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {startIndex + 1} a {Math.min(endIndex, books.length)} de {books.length} libros
          </p>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>

            <span className="text-sm">
              Página {currentPage} de {totalPages}
            </span>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
