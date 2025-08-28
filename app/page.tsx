"use client"

import { useState } from "react"
import { BookSearch } from "@/components/book-search"
import { ShoppingCart } from "@/components/shopping-cart"
import { BookGrid } from "@/components/book-grid"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShoppingCartIcon, Package, BarChart3, BookOpen } from "lucide-react"
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
  const [searchResults, setSearchResults] = useState<Book[]>([])
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
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

  const getTotalAmount = () => {
    return cartItems.reduce((total, item) => total + item.precio * item.quantity, 0)
  }

  const handleSearch = async (query: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/books/search?q=${encodeURIComponent(query)}`)
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
        setIsCartOpen(false)
        // Show success message or redirect
        alert("Venta procesada exitosamente")
      }
    } catch (error) {
      console.error("Error processing sale:", error)
      alert("Error al procesar la venta")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Package className="h-6 w-6 sm:h-8 sm:w-8 text-primary flex-shrink-0" />
              <h1 className="text-sm sm:text-xl font-semibold text-card-foreground truncate">
                <span className="hidden sm:inline">Sistema de Gestión - Librería</span>
                <span className="sm:hidden">Librería</span>
              </h1>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <Link href="/inventory" className="hidden sm:block">
                <Button variant="outline" size="sm">
                  <Package className="h-4 w-4 mr-2" />
                  Inventario
                </Button>
              </Link>
              <Link href="/dashboard" className="hidden sm:block">
                <Button variant="outline" size="sm">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Panel de Control
                </Button>
              </Link>

              <div className="sm:hidden flex gap-1">
                <Link href="/inventory">
                  <Button variant="outline" size="sm" className="p-2 bg-transparent">
                    <Package className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/dashboard">
                  <Button variant="outline" size="sm" className="p-2 bg-transparent">
                    <BarChart3 className="h-4 w-4" />
                  </Button>
                </Link>
              </div>

              <Button variant="outline" size="sm" onClick={() => setIsCartOpen(true)} className="relative p-2 sm:px-3">
                <ShoppingCartIcon className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Carrito</span>
                {cartItems.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-accent text-accent-foreground text-xs rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center text-[10px] sm:text-xs">
                    {cartItems.reduce((sum, item) => sum + item.quantity, 0)}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-8">
          {/* Search and Results */}
          <div className="xl:col-span-2 space-y-4 sm:space-y-6">
            <Card className="p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold text-card-foreground mb-4">Buscar Libros</h2>
              <BookSearch onSearch={handleSearch} onAddToCart={addToCart} isLoading={isLoading} />
            </Card>

            {searchResults.length > 0 && (
              <Card className="p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-card-foreground mb-4">
                  Resultados de Búsqueda ({searchResults.length})
                </h3>
                <BookGrid books={searchResults} onAddToCart={addToCart} />
              </Card>
            )}
          </div>

          {/* Cart Summary */}
          <div className="space-y-4 sm:space-y-6">
            <Card className="p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-card-foreground mb-4">Resumen de Venta</h3>

              {cartItems.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <ShoppingCartIcon className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm sm:text-base">No hay productos en el carrito</p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex items-start gap-3 py-2 border-b border-border">
                      <div className="w-8 h-10 bg-primary/10 rounded flex items-center justify-center flex-shrink-0">
                        <BookOpen className="h-4 w-4 text-primary/60" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm line-clamp-1">{item.titulo}</p>
                        <p className="text-xs text-muted-foreground truncate">{item.autor}</p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-sm text-primary font-semibold">
                            ${item.precio.toFixed(2)} x {item.quantity}
                          </p>
                          <p className="font-semibold text-sm">${(item.precio * item.quantity).toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="pt-3 sm:pt-4 border-t border-border">
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span>Total:</span>
                      <span className="text-primary">${getTotalAmount().toFixed(2)}</span>
                    </div>
                  </div>

                  <Button onClick={processSale} disabled={isLoading} className="w-full mt-4" size="lg">
                    {isLoading ? "Procesando..." : "Finalizar Venta"}
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </div>
      </main>

      {/* Shopping Cart Modal */}
      <ShoppingCart
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={updateCartQuantity}
        onProcessSale={processSale}
        isLoading={isLoading}
      />
    </div>
  )
}
