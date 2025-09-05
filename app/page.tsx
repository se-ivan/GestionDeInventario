"use client"

import type React from "react"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShoppingCartIcon, Package, BarChart3, BookOpen, Search, Loader2, Minus, Plus } from "lucide-react"
import Link from "next/link"

interface Book {
  id: number
  isbn: string
  titulo: string
  autor: string
  precio: number
  stock: number
}

interface CartItem extends Book {
  quantity: number
}

export default function PointOfSale() {
  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState<Book[]>([])
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const addToCart = (book: Book) => {
    setCartItems((prev) => {
      const existingItem = prev.find((item) => item.id === book.id)
      if (existingItem) {
        return prev.map((item) =>
          item.id === book.id ? { ...item, quantity: Math.min(item.quantity + 1, book.stock) } : item,
        )
      }
      return [...prev, { ...book, quantity: 1 }]
    })
  }

  const updateCartQuantity = (bookId: number, quantity: number) => {
    if (quantity === 0) {
      setCartItems((prev) => prev.filter((item) => item.id !== bookId))
    } else {
      setCartItems((prev) => prev.map((item) => (item.id === bookId ? { ...item, quantity } : item)))
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchTerm.trim()) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/books/search?q=${encodeURIComponent(searchTerm)}`)
      if (response.ok) {
        const books = await response.json()
        setSearchResults(books)
      }
    } catch (error) {
      console.error("Error searching books:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const processSale = async () => {
    if (cartItems.length === 0) return

    setIsLoading(true)
    try {
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: cartItems.map((item) => ({
            book_id: item.id,
            quantity: item.quantity,
            unit_price: item.precio,
          })),
        }),
      })

      if (response.ok) {
        setCartItems([])
        alert("Venta procesada exitosamente")
      }
    } catch (error) {
      console.error("Error processing sale:", error)
      alert("Error al procesar la venta")
    } finally {
      setIsLoading(false)
    }
  }

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const totalAmount = cartItems.reduce((total, item) => total + item.precio * item.quantity, 0)

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      

      {/* Contenido Principal */}
      <main className="flex-1 grid grid-cols-3 xl:grid-cols-4 gap-8 p-8 overflow-y-auto">
        {/* Panel de Búsqueda y Resultados */}
        <div className="col-span-3 xl:col-span-3 flex flex-col gap-8">
          <header>
            <h1 className="text-3xl font-bold text-slate-800">Punto de Venta</h1>
            <p className="text-slate-500 mt-1">Busca libros por título o autor y añádelos al carrito.</p>
          </header>

          {/* Barra de Búsqueda */}
          <form onSubmit={handleSearch}>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por título, autor o ISBN..."
                className="w-full pl-12 pr-4 py-3.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-400" />
            </div>
          </form>

          {/* Resultados de Búsqueda */}
          <div className="flex-1">
            {isLoading && !searchResults.length ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
              </div>
            ) : searchResults.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {searchResults.map((book) => (
                  <Card key={book.id} className="flex flex-col">
                    <div className="p-5 flex-1">
                      <h3 className="font-semibold text-slate-800 line-clamp-2">{book.titulo}</h3>
                      <p className="text-sm text-slate-500 mt-1">{book.autor}</p>
                      <p className="text-sm text-slate-400 mt-2">Stock: {book.stock}</p>
                    </div>
                    <div className="p-4 border-t border-slate-200 flex items-center justify-between">
                      <p className="font-bold text-lg text-blue-600">{new Intl.NumberFormat('es-MX', {
                      style: 'currency',
                      currency: 'MXN',
                    }).format(book.precio)}</p>
                      <Button onClick={() => addToCart(book)} size="sm" disabled={book.stock === 0}>
                        Añadir
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <BookOpen className="mx-auto h-16 w-16 text-slate-300" />
                <h3 className="mt-4 text-lg font-medium text-slate-700">Encuentra el libro que buscas</h3>
                <p className="mt-1 text-slate-500">Los resultados de tu búsqueda aparecerán aquí.</p>
              </div>
            )}
          </div>
        </div>

        {/* Panel del Carrito de Compras */}
        <aside className="col-span-3 xl:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full max-h-[calc(100vh-4rem)]">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 flex items-center">
              <ShoppingCartIcon className="h-6 w-6 mr-3 text-blue-600" />
              Resumen de Venta
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Total de productos: <span className="font-semibold text-blue-600">{totalItems}</span>
            </p>
          </div>

          {cartItems.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
              <ShoppingCartIcon className="h-16 w-16 text-slate-300" />
              <p className="mt-4 font-medium text-slate-600">El carrito está vacío</p>
              <p className="text-sm text-slate-400 mt-1">Añade libros desde los resultados de búsqueda.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-2">
              <div className="space-y-2">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 p-4 rounded-lg hover:bg-slate-50">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-slate-800 truncate">{item.titulo}</p>
                      <p className="text-xs text-slate-500">${item.precio.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="font-medium w-6 text-center">{item.quantity}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="font-semibold text-slate-700 w-16 text-right">
                      ${(item.precio * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {cartItems.length > 0 && (
            <div className="p-6 border-t border-slate-200 bg-slate-50/50 rounded-b-xl">
              <div className="space-y-4">
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="font-semibold text-slate-800">${totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-baseline text-2xl font-bold">
                  <span className="text-slate-800">Total</span>
                  <span className="text-blue-600">${totalAmount.toFixed(2)}</span>
                </div>
              </div>
              <Button onClick={processSale} disabled={isLoading} className="w-full mt-6" size="lg">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Procesando...
                  </>
                ) : (
                  "Finalizar Venta"
                )}
              </Button>
            </div>
          )}
        </aside>
      </main>
    </div>
  )
}
