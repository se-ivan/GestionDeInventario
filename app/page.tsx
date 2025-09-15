"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ShoppingCartIcon, BookOpen, Search, Loader2, Minus, Plus, Store } from "lucide-react"
import { Book, Sucursal, InventarioEntry } from "@/lib/types" // Asegúrate de que tus tipos estén definidos

// Define el tipo para un item en el carrito, basado en la entrada de inventario
interface CartItem extends InventarioEntry {
  quantity: number
}

export default function PointOfSale() {
  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState<InventarioEntry[]>([])
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  
  // Estados para la sucursal
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [selectedSucursal, setSelectedSucursal] = useState<number | null>(null)

  // Estado para el método de pago
  const [paymentMethod, setPaymentMethod] = useState<string>("Efectivo")

  // --- LÓGICA DE PERSISTENCIA ---
  useEffect(() => {
    // Al cargar, intenta recuperar los datos desde sessionStorage
    try {
      const savedCart = sessionStorage.getItem('posCart');
      if (savedCart) setCartItems(JSON.parse(savedCart));
      
      const savedSucursal = sessionStorage.getItem('posSucursal');
      if (savedSucursal) setSelectedSucursal(Number(savedSucursal));
    } catch (error) {
      console.error("Error al cargar datos de la sesión:", error);
      sessionStorage.clear();
    }
    fetchSucursales();
  }, []);

  // Guarda los cambios en el carrito o sucursal en sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem('posCart', JSON.stringify(cartItems));
      if (selectedSucursal) {
        sessionStorage.setItem('posSucursal', selectedSucursal.toString());
      }
    } catch (error) {
       console.error("Error al guardar datos en la sesión:", error);
    }
  }, [cartItems, selectedSucursal]);
  
  const fetchSucursales = async () => {
    try {
        const response = await fetch('/api/sucursales');
        if (response.ok) setSucursales(await response.json());
    } catch (error) { console.error("Error fetching sucursales:", error); }
  };

  const handleSucursalChange = (sucursalId: number) => {
    if (cartItems.length > 0 && !confirm("Cambiar de sucursal vaciará tu carrito. ¿Deseas continuar?")) {
      return;
    }
    setSelectedSucursal(sucursalId);
    setCartItems([]);
    setSearchResults([]);
  };

  const addToCart = (entry: InventarioEntry) => {
    setCartItems((prev) => {
      const existingItem = prev.find((item) => item.bookId === entry.bookId);
      if (existingItem) {
        return prev.map((item) =>
          item.bookId === entry.bookId ? { ...item, quantity: Math.min(item.quantity + 1, entry.stock) } : item,
        )
      }
      return [...prev, { ...entry, quantity: 1 }]
    })
  }

  const updateCartQuantity = (bookId: number, quantity: number) => {
    const itemInCart = cartItems.find(item => item.bookId === bookId);
    if (!itemInCart) return;

    if (quantity <= 0) {
      setCartItems((prev) => prev.filter((item) => item.bookId !== bookId))
    } else {
      setCartItems((prev) => prev.map((item) => (item.bookId === bookId ? { ...item, quantity: Math.min(quantity, itemInCart.stock) } : item)))
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchTerm.trim() || !selectedSucursal) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/pos/search?q=${encodeURIComponent(searchTerm)}&sucursalId=${selectedSucursal}`)
      if (response.ok) {
        setSearchResults(await response.json())
      }
    } catch (error) {
      console.error("Error searching books:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const processSale = async () => {
    if (cartItems.length === 0 || !selectedSucursal) return

    setIsLoading(true);
    try {
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sucursalId: selectedSucursal,
          paymentMethod: paymentMethod,
          items: cartItems.map((item) => ({
            book_id: item.bookId,
            quantity: item.quantity,
          })),
        }),
      });

      if (response.ok) {
        setCartItems([]);
        setSearchResults([]);
        setSearchTerm("");
        alert("Venta procesada exitosamente");
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al procesar la venta");
      }
    } catch (error: any) {
      console.error("Error processing sale:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const totalAmount = cartItems.reduce((total, item) => total + Number(item.book.precio) * item.quantity, 0)

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      <main className="flex-1 grid grid-cols-3 xl:grid-cols-4 gap-8 p-8 overflow-y-auto">
        {/* --- PANEL PRINCIPAL DE BÚSQUEDA --- */}
        <div className="col-span-3 xl:col-span-3 flex flex-col gap-8">
          <header>
            <h1 className="text-3xl font-bold text-slate-800">Punto de Venta</h1>
            <div className="mt-4 max-w-sm">
                <Label htmlFor="sucursal-selector" className="text-slate-600">Operando en Sucursal:</Label>
                <select 
                    id="sucursal-selector"
                    value={selectedSucursal || ''}
                    onChange={(e) => handleSucursalChange(Number(e.target.value))}
                    className="mt-1 w-full h-11 px-4 py-2 text-base bg-white border border-slate-300 rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="" disabled>-- Selecciona una sucursal --</option>
                    {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
            </div>
          </header>

          {selectedSucursal ? (
            <>
              <form onSubmit={handleSearch}>
                <div className="relative">
                  <Input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar por título, autor o ISBN..." className="w-full pl-12 pr-4 py-3.5 border border-slate-300 rounded-lg text-base" />
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-400" />
                </div>
              </form>
              
              <div className="flex-1">
                {isLoading ? ( <div className="flex justify-center h-64 items-center"><Loader2 className="h-8 w-8 text-blue-600 animate-spin" /></div> ) : 
                searchResults.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {searchResults.map((entry) => (
                      <Card key={entry.bookId} className="flex flex-col">
                        <div className="p-5 flex-1">
                          <h3 className="font-semibold text-slate-800 line-clamp-2">{entry.book.titulo}</h3>
                          <p className="text-sm text-slate-500 mt-1">{entry.book.autor}</p>
                          <p className="text-sm text-slate-400 mt-2">Stock: <span className="font-medium text-slate-600">{entry.stock}</span></p>
                        </div>
                        <div className="p-4 border-t border-slate-200 flex items-center justify-between">
                          <p className="font-bold text-lg text-blue-600">${Number(entry.book.precio).toFixed(2)}</p>
                          <Button onClick={() => addToCart(entry)} size="sm" disabled={entry.stock === 0}>Añadir</Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16"><BookOpen className="mx-auto h-16 w-16 text-slate-300" /><h3 className="mt-4 text-lg font-medium text-slate-700">Encuentra el libro que buscas</h3><p className="mt-1 text-slate-500">Los resultados de tu búsqueda aparecerán aquí.</p></div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-16 flex flex-col items-center">
                <Store className="mx-auto h-16 w-16 text-slate-300" />
                <h3 className="mt-4 text-lg font-medium text-slate-700">Selecciona una sucursal</h3>
                <p className="mt-1 text-slate-500">Debes elegir una sucursal para comenzar a vender.</p>
            </div>
          )}
        </div>

        {/* --- PANEL DEL CARRITO DE COMPRAS --- */}
        <aside className="col-span-3 xl:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full max-h-[calc(100vh-4rem)]">
          <div className="p-6 border-b border-slate-200"><h2 className="text-xl font-bold text-slate-800 flex items-center"><ShoppingCartIcon className="h-6 w-6 mr-3 text-blue-600" />Resumen de Venta</h2><p className="text-sm text-slate-500 mt-1">Total de productos: <span className="font-semibold text-blue-600">{totalItems}</span></p></div>
          
          {cartItems.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6"><ShoppingCartIcon className="h-16 w-16 text-slate-300" /><p className="mt-4 font-medium text-slate-600">El carrito está vacío</p><p className="text-sm text-slate-400 mt-1">Añade libros desde los resultados.</p></div>
          ) : (
            <div className="flex-1 overflow-y-auto p-2">
              <div className="space-y-2">
                {cartItems.map((item) => (
                  <div key={item.bookId} className="flex items-center gap-4 p-4 rounded-lg hover:bg-slate-50">
                    <div className="flex-1 min-w-0"><p className="font-semibold text-sm text-slate-800 truncate">{item.book.titulo}</p><p className="text-xs text-slate-500">${Number(item.book.precio).toFixed(2)}</p></div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateCartQuantity(item.bookId, item.quantity - 1)}><Minus className="h-4 w-4" /></Button>
                      <span className="font-medium w-6 text-center">{item.quantity}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateCartQuantity(item.bookId, item.quantity + 1)}><Plus className="h-4 w-4" /></Button>
                    </div>
                    <p className="font-semibold text-slate-700 w-20 text-right">${(Number(item.book.precio) * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {cartItems.length > 0 && (
            <div className="p-6 border-t border-slate-200 bg-slate-50/50 rounded-b-xl">
              <div className="mb-6">
                <Label htmlFor="payment-method" className="text-slate-600 font-semibold">Método de Pago</Label>
                <select
                  id="payment-method"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="mt-1 w-full h-11 px-4 py-2 text-base bg-white border border-slate-300 rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Efectivo">💵 Efectivo</option>
                  <option value="Tarjeta">💳 Tarjeta</option>
                  <option value="Transferencia">🏦 Transferencia</option>
                </select>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-baseline"><span className="text-slate-600">Subtotal</span><span className="font-semibold text-slate-800">${totalAmount.toFixed(2)}</span></div>
                <div className="flex justify-between items-baseline text-2xl font-bold"><span className="text-slate-800">Total</span><span className="text-blue-600">${totalAmount.toFixed(2)}</span></div>
              </div>
              <Button onClick={processSale} disabled={isLoading} className="w-full mt-6" size="lg">{isLoading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Procesando...</> : "Finalizar Venta"}</Button>
            </div>
          )}
        </aside>
      </main>
    </div>
  )
}