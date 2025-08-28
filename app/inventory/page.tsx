"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { BookForm } from "@/components/book-form"
import { BookTable } from "@/components/book-table"
import { StockAlerts } from "@/components/stock-alerts"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Package, Plus, Search, AlertTriangle, ArrowLeft } from "lucide-react"
import Link from "next/link"

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

export default function InventoryPage() {
  const [books, setBooks] = useState<Book[]>([])
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingBook, setEditingBook] = useState<Book | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lowStockBooks, setLowStockBooks] = useState<Book[]>([])

  useEffect(() => {
    fetchBooks()
  }, [])

  useEffect(() => {
    const filtered = books.filter(
      (book) =>
        book.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.autor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.isbn.includes(searchQuery),
    )
    setFilteredBooks(filtered)

    // Update low stock alerts
    const lowStock = books.filter((book) => book.stock <= 5)
    setLowStockBooks(lowStock)
  }, [books, searchQuery])

  const fetchBooks = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/books")
      if (response.ok) {
        const booksData = await response.json()
        setBooks(booksData)
      }
    } catch (error) {
      console.error("Error fetching books:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddBook = async (bookData: Omit<Book, "id" | "created_at" | "updated_at">) => {
    try {
      const response = await fetch("/api/books", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bookData),
      })

      if (response.ok) {
        const newBook = await response.json()
        setBooks((prev) => [...prev, newBook])
        setIsAddDialogOpen(false)
      }
    } catch (error) {
      console.error("Error adding book:", error)
    }
  }

  const handleUpdateBook = async (bookId: number, bookData: Partial<Book>) => {
    try {
      const response = await fetch(`/api/books/${bookId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bookData),
      })

      if (response.ok) {
        const updatedBook = await response.json()
        setBooks((prev) => prev.map((book) => (book.id === bookId ? updatedBook : book)))
        setEditingBook(null)
      }
    } catch (error) {
      console.error("Error updating book:", error)
    }
  }

  const handleDeleteBook = async (bookId: number) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este libro?")) return

    try {
      const response = await fetch(`/api/books/${bookId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setBooks((prev) => prev.filter((book) => book.id !== bookId))
      }
    } catch (error) {
      console.error("Error deleting book:", error)
    }
  }

  const getTotalValue = () => {
    return books.reduce((total, book) => total + book.precio * book.stock, 0)
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
              <Package className="h-8 w-8 text-primary" />
              <h1 className="text-xl font-semibold text-card-foreground">Gestión de Inventario</h1>
            </div>

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Libro
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Agregar Nuevo Libro</DialogTitle>
                </DialogHeader>
                <BookForm onSubmit={handleAddBook} onCancel={() => setIsAddDialogOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Package className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Libros</p>
                  <p className="text-2xl font-bold text-card-foreground">{books.length}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-accent" />
                <div>
                  <p className="text-sm text-muted-foreground">Stock Bajo</p>
                  <p className="text-2xl font-bold text-card-foreground">{lowStockBooks.length}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Package className="h-8 w-8 text-secondary" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Unidades</p>
                  <p className="text-2xl font-bold text-card-foreground">
                    {books.reduce((sum, book) => sum + book.stock, 0)}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Package className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Valor Total</p>
                  <p className="text-2xl font-bold text-card-foreground">${getTotalValue().toFixed(2)}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Stock Alerts */}
          {lowStockBooks.length > 0 && <StockAlerts books={lowStockBooks} />}

          {/* Search and Filters */}
          <Card className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por título, autor o ISBN..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Badge variant="secondary">{filteredBooks.length} resultados</Badge>
            </div>

            {/* Books Table */}
            <BookTable
              books={filteredBooks}
              onEdit={setEditingBook}
              onDelete={handleDeleteBook}
              isLoading={isLoading}
            />
          </Card>
        </div>
      </main>

      {/* Edit Dialog */}
      <Dialog open={!!editingBook} onOpenChange={() => setEditingBook(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Libro</DialogTitle>
          </DialogHeader>
          {editingBook && (
            <BookForm
              initialData={editingBook}
              onSubmit={(data) => handleUpdateBook(editingBook.id, data)}
              onCancel={() => setEditingBook(null)}
              isEditing
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
