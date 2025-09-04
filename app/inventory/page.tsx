"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { BookForm } from "@/components/book-form"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Package, Plus, Search, AlertTriangle, BookOpen, ShoppingCart, BarChart3, Edit, Trash2 } from "lucide-react"

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

  const stats = [
    {
      title: "Total Libros",
      value: books.length.toString(),
      icon: Package,
      color: "text-blue-600",
    },
    {
      title: "Stock Bajo",
      value: lowStockBooks.length.toString(),
      icon: AlertTriangle,
      color: "text-yellow-600",
    },
    {
      title: "Total Unidades",
      value: books.reduce((sum, book) => sum + book.stock, 0).toString(),
      icon: Package,
      color: "text-green-600",
    },
    {
      title: "Valor Total",
      value: `$${getTotalValue().toFixed(2)}`,
      icon: Package,
      color: "text-purple-600",
    },
  ]

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Gestión de Inventario</h1>
            <p className="text-slate-500 mt-1">Administra, agrega y edita todos los libros de tu tienda.</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-5 w-5 mr-2" />
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
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                  <p className="text-3xl font-bold text-slate-800 mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-full bg-slate-100 ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="overflow-hidden">
          <div className="p-5 flex justify-between items-center border-b border-slate-200">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Libros en Inventario</h2>
              <p className="text-sm text-slate-500 mt-1">{filteredBooks.length} resultados encontrados</p>
            </div>
            <div className="relative w-full max-w-sm">
              <input
                type="text"
                placeholder="Buscar por título, autor o ISBN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            </div>
          </div>
          <table className="w-full text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Título</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Autor</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">ISBN</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Precio</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    Cargando libros...
                  </td>
                </tr>
              ) : filteredBooks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No se encontraron libros
                  </td>
                </tr>
              ) : (
                filteredBooks.map((book) => (
                  <tr key={book.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-800">{book.titulo}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-600">{book.autor}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-500">{book.isbn}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-600">${book.precio.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                          book.stock < 5
                            ? "bg-yellow-100 text-yellow-800"
                            : book.stock < 10
                              ? "bg-blue-100 text-blue-800"
                              : "bg-green-100 text-green-800"
                        }`}
                      >
                        {book.stock} unidades
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                      <Button variant="ghost" size="sm" className="p-2 h-auto" onClick={() => setEditingBook(book)}>
                        <Edit className="h-4 w-4 text-slate-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-2 h-auto"
                        onClick={() => handleDeleteBook(book.id)}
                      >
                        <Trash2 className="h-4 w-4 text-slate-500 hover:text-red-600" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
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
