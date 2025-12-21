"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  ShoppingCartIcon, BookOpen, Search, Loader2, Minus, Plus,
  Store, Trash2, Percent, CheckCircle2, Candy, ScanBarcode
} from "lucide-react"
import { Sucursal } from "@/lib/types"

interface ProductEntry {
  uniqueId: string;
  id: number;
  type: 'BOOK' | 'DULCE';
  titulo: string;
  subtitulo: string;
  precio: number;
  stock: number;
  ubicacion: string | null;
  sucursalId: number;
  rawBook?: any;
  rawDulce?: any;
}

interface CartItem extends ProductEntry {
  quantity: number
}

const PAYMENT_METHODS = [
  { id: "EFECTIVO", label: "💵 Efectivo" },
  { id: "TARJETA_DEBITO", label: "💳 Tarjeta Débito" },
  { id: "TARJETA_CREDITO", label: "💳 Tarjeta Crédito" },
  { id: "TRANSFERENCIA", label: "🏦 Transferencia" },
  { id: "VALES", label: "🎫 Vales" },
]

export default function PointOfSale() {
  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState<ProductEntry[]>([])
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [selectedSucursal, setSelectedSucursal] = useState<number | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<string>("EFECTIVO")
  const [discountPercent, setDiscountPercent] = useState<number>(0)
  const [lastSale, setLastSale] = useState<{ id: number; total: number } | null>(null)

  useEffect(() => {
    const loadSession = () => {
      try {
        const savedCart = sessionStorage.getItem('posCart');
        if (savedCart) setCartItems(JSON.parse(savedCart));
        const savedSucursal = sessionStorage.getItem('posSucursal');
        if (savedSucursal) setSelectedSucursal(Number(savedSucursal));
      } catch (e) { console.error("Error cargando sesión", e) }
    }
    loadSession();
    fetchSucursales();
  }, []);

  useEffect(() => {
    sessionStorage.setItem('posCart', JSON.stringify(cartItems));
    if (selectedSucursal) sessionStorage.setItem('posSucursal', selectedSucursal.toString());
  }, [cartItems, selectedSucursal]);

  const fetchSucursales = async () => {
    try {
      const res = await fetch('/api/sucursales');
      if (res.ok) setSucursales(await res.json());
    } catch (error) { console.error(error); }
  };

  const handleSucursalChange = (id: number) => {
    if (cartItems.length > 0) {
      if (!confirm("Cambiar de sucursal vaciará el carrito actual. ¿Continuar?")) return;
    }
    setSelectedSucursal(id);
    setCartItems([]);
    setSearchResults([]);
    setSearchTerm("");
  };


  const handleDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = parseFloat(e.target.value);

    if (isNaN(value)) {
      setDiscountPercent(0);
      return;
    }

    if (value > 100) value = 100;
    if (value < 0) value = 0;

    setDiscountPercent(value);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchTerm.trim() || !selectedSucursal) return

    setIsLoading(true)
    try {
      // ✅ CORRECCIÓN: Ejecutamos ambas búsquedas simultáneamente
      const [resBooks, resDulces] = await Promise.all([
        fetch(`/api/books?q=${encodeURIComponent(searchTerm)}`),
        fetch(`/api/dulces?q=${encodeURIComponent(searchTerm)}`)
      ]);

      const results: ProductEntry[] = [];

      // Procesar Libros
      if (resBooks.ok) {
        const books = await resBooks.json();
        books.forEach((book: any) => {
          const inv = book.inventario.find((i: any) => i.sucursalId === selectedSucursal);
          if (inv) {
            results.push({
              uniqueId: `book-${book.id}`,
              id: book.id,
              type: 'BOOK',
              titulo: book.titulo,
              subtitulo: book.autor,
              precio: Number(book.precioVenta),
              stock: inv.stock,
              ubicacion: inv.ubicacion,
              sucursalId: inv.sucursalId,
              rawBook: book
            });
          }
        });
      }

      // ✅ Procesar Dulces (Nueva Lógica)
      if (resDulces.ok) {
        const dulces = await resDulces.json();
        dulces.forEach((dulce: any) => {
          const inv = dulce.inventario.find((i: any) => i.sucursalId === selectedSucursal);
          // Mostrar incluso si no hay inventario (stock 0) para que sepan que existe
          if (inv || dulce.inventario.length === 0) {
            results.push({
              uniqueId: `dulce-${dulce.id}`,
              id: dulce.id,
              type: 'DULCE',
              titulo: dulce.nombre,
              subtitulo: dulce.marca || "Sin Marca",
              precio: Number(dulce.precioVenta),
              stock: inv ? inv.stock : 0,
              ubicacion: inv ? inv.ubicacion : null,
              sucursalId: inv ? inv.sucursalId : selectedSucursal,
              rawDulce: dulce
            });
          }
        });
      }

      setSearchResults(results);

    } catch (error) {
      console.error("Error buscando:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const addToCart = (entry: ProductEntry) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.uniqueId === entry.uniqueId);
      if (existing) {
        if (existing.quantity >= entry.stock) return prev;
        return prev.map((item) =>
          item.uniqueId === entry.uniqueId ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [...prev, { ...entry, quantity: 1 }]
    })
  }

  const updateQuantity = (uniqueId: string, delta: number) => {
    setCartItems(prev => prev.map(item => {
      if (item.uniqueId === uniqueId) {
        const newQty = item.quantity + delta;
        if (newQty > item.stock) return item;
        if (newQty < 1) return item;
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (uniqueId: string) => {
    setCartItems(prev => prev.filter(i => i.uniqueId !== uniqueId));
  };

  const processSale = async () => {
    if (cartItems.length === 0 || !selectedSucursal) return;

    setIsProcessing(true);
    try {
      // Preparamos el payload exactamente como la API lo espera ahora
      const payload = {
        sucursalId: selectedSucursal,
        paymentMethod: paymentMethod,
        discountPercent: Number(discountPercent), // Aseguramos que sea número
        items: cartItems.map(item => ({
          id: item.id,
          // TypeScript agradecerá que asegures que el tipo es string literal
          type: item.type,
          quantity: item.quantity
        }))
      };

      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        setLastSale({ id: data.saleId, total: Number(data.total) });

        // Limpiar estado post-venta
        setCartItems([]);
        setSearchResults([]);
        setSearchTerm("");
        setDiscountPercent(0); // Reiniciar descuento
      } else {
        throw new Error(data.message || "Error al procesar la venta");
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const subtotalBruto = cartItems.reduce((acc, item) => acc + (item.precio * item.quantity), 0);
  const montoDescuento = subtotalBruto * (discountPercent / 100);
  const totalNeto = subtotalBruto - montoDescuento;
  const ivaEstimado = totalNeto - (totalNeto / 1.16);

  return (
    <div className="flex h-screen bg-slate-100 font-sans overflow-hidden relative">

      {lastSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-sm bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border-0">
            <div className="bg-emerald-600 p-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/20 mb-4 backdrop-blur-md">
                <CheckCircle2 className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">¡Venta Exitosa!</h2>
              <p className="text-emerald-100 mt-1">Ticket #{lastSale.id} generado</p>
            </div>
            <div className="p-6">
              <div className="bg-slate-50 rounded-lg border border-slate-100 p-4 flex justify-between items-center mb-6">
                <span className="text-lg font-bold text-slate-700">Total</span>
                <span className="text-2xl font-bold text-emerald-600">${lastSale.total.toFixed(2)}</span>
              </div>
              <Button onClick={() => setLastSale(null)} size="lg" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold h-12">
                <Plus className="mr-2 h-5 w-5" /> Nueva Venta
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* IZQUIERDA: PRODUCTOS */}
      <main className="flex-1 flex flex-col p-6 gap-6 overflow-hidden">
        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm">
          <div className="flex flex-col gap-3">
            <h1 className="text-2xl font-bold text-slate-800">Punto de Venta</h1>
            <p className="text-sm text-slate-500">
              {selectedSucursal ? `Sucursal: ${sucursales.find(s => s.id === selectedSucursal)?.nombre}` : "Seleccione sucursal"}
            </p>
            <Button
              onClick={() => {
                window.open('/api/reporte/', '_blank');
              }}
            >
              Descargar Corte del Día
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <Store className="text-slate-400" />
            <select
              value={selectedSucursal || ""}
              onChange={(e) => handleSucursalChange(Number(e.target.value))}
              className="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 block p-2.5 min-w-[200px]"
            >
              <option value="" disabled>Seleccionar Sucursal</option>
              {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                type="text"
                className="pl-10 h-12 text-lg"
                placeholder={selectedSucursal ? "Buscar por Nombre, Marca o Código..." : "Seleccione sucursal"}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={!selectedSucursal}
              />
            </div>
            <Button type="submit" size="lg" disabled={isLoading || !selectedSucursal} className="h-12 px-8 bg-blue-600 hover:bg-blue-700">
              {isLoading ? <Loader2 className="animate-spin" /> : "Buscar"}
            </Button>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto pr-2">
          {searchResults.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {searchResults.map((entry) => (
                <Card key={entry.uniqueId} className="flex flex-col justify-between hover:shadow-md transition-shadow border-slate-200">
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${entry.type === 'DULCE' ? 'bg-secondary text-secondary-foreground' : 'bg-blue-100 text-blue-700'}`}>
                        {entry.type === 'DULCE' ? <Candy className="w-3 h-3" /> : <BookOpen className="w-3 h-3" />}
                        {entry.type}
                      </div>
                    </div>
                    <h3 className="font-bold text-slate-800 line-clamp-2 min-h-[3rem] text-sm md:text-base leading-snug" title={entry.titulo}>
                      {entry.titulo}
                    </h3>

                    <p className="text-xs text-slate-500 mt-1 line-clamp-1 flex items-center gap-1">
                      {entry.type === 'DULCE' ? <ScanBarcode className="w-3 h-3" /> : null}
                      {entry.type === 'DULCE' ? "Marca: " : "Autor: "}{entry.subtitulo}
                    </p>

                    <div className="mt-3 flex justify-between items-center text-sm">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${entry.stock > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                        Stock: {entry.stock}
                      </span>
                      {entry.ubicacion && <span className="text-[10px] uppercase tracking-wide text-slate-400 bg-slate-50 px-1 rounded">{entry.ubicacion}</span>}
                    </div>
                  </div>
                  <div className="p-3 border-t bg-slate-50/50 flex items-center justify-between">
                    <span className="text-lg font-bold text-slate-700">${entry.precio.toFixed(2)}</span>
                    <Button
                      size="sm"
                      onClick={() => addToCart(entry)}
                      disabled={entry.stock <= 0}
                      className={`${entry.stock > 0 ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-300'}`}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-80">
              <div className="flex gap-4 mb-4 opacity-50">
                <BookOpen className="w-16 h-16 stroke-1" />
                <Candy className="w-16 h-16 stroke-1" />
              </div>
              <p className="text-lg font-medium text-slate-400">Busca Libros o Dulces</p>
              <p className="text-sm">Todo tu inventario en un solo lugar</p>
            </div>
          )}
        </div>
      </main>

      {/* DERECHA: CARRITO */}
      <aside className="w-96 bg-white shadow-xl flex flex-col border-l border-slate-200 z-10">
        <div className="p-5 border-b border-slate-100 bg-slate-50/80 backdrop-blur flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ShoppingCartIcon className="w-5 h-5 text-blue-600" /> Carrito
          </h2>
          <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">
            {cartItems.reduce((acc, i) => acc + i.quantity, 0)} items
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
              <ShoppingCartIcon className="w-12 h-12 opacity-20" />
              <p className="text-sm">El carrito está vacío</p>
            </div>
          ) : (
            cartItems.map((item) => (
              <div key={item.uniqueId} className="flex gap-3 bg-white border border-slate-100 p-3 rounded-xl shadow-sm group hover:border-blue-200 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate" title={item.titulo}>{item.titulo}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] px-1.5 rounded ${item.type === 'DULCE' ? 'bg-secondary text-secondary-foreground' : 'bg-blue-100 text-blue-700'}`}>
                      {item.type === 'DULCE' ? 'DULCE' : 'LIBRO'}
                    </span>
                    <p className="text-xs text-slate-500">${item.precio.toFixed(2)} c/u</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="font-bold text-slate-800">${(item.precio * item.quantity).toFixed(2)}</span>
                  <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                    <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-white rounded-md" onClick={() => updateQuantity(item.uniqueId, -1)}><Minus className="w-3 h-3" /></Button>
                    <span className="text-xs w-6 text-center font-bold text-slate-700">{item.quantity}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-white rounded-md" onClick={() => updateQuantity(item.uniqueId, 1)}><Plus className="w-3 h-3" /></Button>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all self-center ml-1" onClick={() => removeFromCart(item.uniqueId)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))
          )}
        </div>

        {/* COBRO */}
        <div className="p-5 bg-white border-t border-slate-200 shadow-lg z-20">
          <div className="mb-4 flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-100">
            <div className="flex items-center gap-2 text-slate-500 pl-2">
              <Percent className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wide">Desc.</span>
            </div>
            <Input
              type="number"
              min="0"
              max="100"
              // Usamos value || "" para que si es 0 no se vea un "0" fijo si quieres limpiarlo, 
              // o puedes dejarlo como value={discountPercent}
              value={discountPercent > 0 ? discountPercent : ""}
              onChange={handleDiscountChange} // 👈 Aquí conectamos la nueva función
              placeholder="0%"
              className="h-8 text-right border-0 bg-transparent focus-visible:ring-0 px-1 font-bold text-orange-600 placeholder:text-slate-300"
            />
          </div>

          <div className="space-y-1 mb-4 px-1">
            <div className="flex justify-between items-center text-sm text-slate-500">
              <span>Subtotal</span>
              <span>${subtotalBruto.toFixed(2)}</span>
            </div>
            {discountPercent > 0 && (
              <div className="flex justify-between items-center text-sm text-orange-600 font-medium">
                <span>Descuento ({discountPercent}%)</span>
                <span>-${montoDescuento.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-xs text-slate-400 mt-1 pt-1 border-t border-slate-50 border-dashed">
              <span>IVA Estimado (Base 16%)</span>
              <span>${ivaEstimado.toFixed(2)}</span>
            </div>
          </div>

          <div className="mb-4">
            <Label className="mb-2 block text-[10px] uppercase text-slate-400 font-bold tracking-wider">Método de Pago</Label>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id)}
                  className={`text-xs py-2.5 px-1 rounded-lg border transition-all font-medium ${paymentMethod === method.id
                    ? "bg-slate-800 border-slate-800 text-white shadow-md transform scale-[1.02]"
                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                >
                  {method.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center mb-6 pt-3 border-t border-slate-100">
            <span className="text-lg font-bold text-slate-800">Total</span>
            <span className="text-3xl font-black text-blue-600 tracking-tight">${totalNeto.toFixed(2)}</span>
          </div>

          <Button onClick={processSale} disabled={isProcessing || cartItems.length === 0} className="w-full h-14 text-lg font-bold shadow-lg shadow-blue-100 bg-blue-600 hover:bg-blue-700 transition-all active:scale-[0.98] rounded-xl">
            {isProcessing ? <><Loader2 className="mr-2 animate-spin" /> Procesando...</> : "Cobrar Venta"}
          </Button>
        </div>
      </aside>
    </div>
  )
}