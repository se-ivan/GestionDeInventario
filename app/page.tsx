"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  ShoppingCartIcon, BookOpen, Search, Loader2, Minus, Plus,
  Store, Trash2, Percent, CheckCircle2, Candy, ScanBarcode, ArrowUpRight, AlertCircle, FileDown
} from "lucide-react"
import { Sucursal } from "@/lib/types"
import { logout } from "@/actions/logout"

interface ProductEntry {
  uniqueId: string;
  id: number;
  type: 'BOOK' | 'DULCE' | 'CONSIGNACION';
  titulo: string;
  subtitulo: string;
  precio: number;
  stock: number;
  ubicacion: string | null;
  sucursalId: number;
  rawBook?: any;
  rawDulce?: any;
  rawConsignacion?: any;
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
  
  // Estado para Gastos (Expenses - System Action Plan)
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false)
  const [isExpenseSubmitting, setIsExpenseSubmitting] = useState(false)
  const [newExpense, setNewExpense] = useState({
    amount: "",
    concept: "",
    category: "VARIOS"
  })

  // Feedback Modal State
  const [feedbackModal, setFeedbackModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
    downloadUrl?: string;
  }>({ isOpen: false, type: 'success', title: '', message: '' })

  const [lastSale, setLastSale] = useState<{ id: number; total: number } | null>(null)

  // --- CASH REGISTER STATE ---
  const [cashSession, setCashSession] = useState<any>(null)
  const [isLoadingSession, setIsLoadingSession] = useState(true)
  const [isOpenSessionModalOpen, setIsOpenSessionModalOpen] = useState(false) // Modal to OPEN
  const [isCloseSessionModalOpen, setIsCloseSessionModalOpen] = useState(false) // Modal to CLOSE
  const [openAmount, setOpenAmount] = useState("") 
  const [closeAmount, setCloseAmount] = useState("") // Real cash
  const [isClosingSession, setIsClosingSession] = useState(false) // Spinner state
  
  // --- LOAD SESSION ---
  useEffect(() => {
    checkCashSession()
  }, [])

  const checkCashSession = async () => {
    setIsLoadingSession(true)
    try {
        const res = await fetch('/api/corte-caja')
        if (res.ok) {
            const data = await res.json()
            if (data.active) {
                setCashSession(data.data)
                if (data.data.sucursalId) {
                  setSelectedSucursal(data.data.sucursalId);
                }
                setIsOpenSessionModalOpen(false)
            } else {
                setCashSession(null)
                // NO FORZAMOS APERTURA AL INICIO PARA NO BLOQUEAR NAVEGACIÓN
                // setIsOpenSessionModalOpen(true) 
            }
        }
    } catch(e) { console.error(e) }
    finally { setIsLoadingSession(false) }
  }

  const handleOpenRegister = async () => {
     if (!selectedSucursal) {
         setFeedbackModal({isOpen: true, type: 'error', title: 'Error', message: 'Selecciona una sucursal'})
         return
     }
     
     try {
         const res = await fetch('/api/corte-caja', {
             method: 'POST',
             headers: {'Content-Type': 'application/json'},
             body: JSON.stringify({ montoInicial: openAmount, sucursalId: selectedSucursal })
         })
         
         if (res.ok) {
             const session = await res.json()
             setCashSession(session)
             setIsOpenSessionModalOpen(false)
             checkCashSession() // Refresh full data
         } else {
             const err = await res.json()
             alert(err.message)
         }
     } catch(e) { alert("Error al abrir caja") }
  }

  const handleCloseRegister = async () => {
      if (!cashSession) return
      
      setIsClosingSession(true)
      try {
          // 1. Close
          const res = await fetch('/api/corte-caja', {
              method: 'PUT',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ id: cashSession.id, montoFinal: closeAmount })
          })

          if (res.ok) {
              const closedSession = await res.json()
              // 2. Download Excel (Optional: Auto-trigger or just let user click)
              // window.open(`/api/corte-caja/export?id=${closedSession.id}`, '_blank')
              
              setFeedbackModal({
                  isOpen: true, 
                  type: 'success', 
                  title: '¡Corte realizado!', 
                  message: 'El turno se ha cerrado correctamente.',
                  downloadUrl: `/api/corte-caja/export?id=${closedSession.id}`
              })
              setIsCloseSessionModalOpen(false)
              setCashSession(null)
              // setIsOpenSessionModalOpen(true) // YA NO FORZAMOS APERTURA INMEDIATA
              setCartItems([]) // Clear cart
              setOpenAmount("")
              setCloseAmount("")
          } else {
              alert("Error al cerrar caja")
          }
      } catch(e) { console.error(e); alert("Error de red") }
      finally { setIsClosingSession(false) }
  }

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

  const handleRegisterExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSucursal) {
      setFeedbackModal({
        isOpen: true,
        type: 'error',
        title: 'Atención',
        message: 'Por favor selecciona una sucursal primero para registrar el gasto.'
      })
      return
    }
    
    setIsExpenseSubmitting(true)
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monto: newExpense.amount,
          concepto: newExpense.concept,
          categoria: newExpense.category,
          sucursalId: selectedSucursal,
          userId: 1 
        })
      })

      if (res.ok) {
        setFeedbackModal({
          isOpen: true,
          type: 'success',
          title: '¡Registro Exitoso!',
          message: `El gasto de $${newExpense.amount} ha sido guardado correctamente.`
        })
        setIsExpenseModalOpen(false)
        setNewExpense({ amount: "", concept: "", category: "VARIOS" })
      } else {
        const errorData = await res.json()
        setFeedbackModal({
          isOpen: true,
          type: 'error',
          title: 'Error al Guardar',
          message: errorData.error || 'Hubo un problema al procesar la solicitud.'
        })
      }
    } catch (error) {
      console.error(error)
      setFeedbackModal({
        isOpen: true,
        type: 'error',
        title: 'Error de Red',
        message: 'No se pudo conectar con el servidor.'
      })
    } finally {
      setIsExpenseSubmitting(false)
    }
  }


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


  const handleDownload = () => {
    // 1. Obtenemos la fecha LOCAL del usuario
    const today = new Date();
    
    // Truco: 'en-CA' formatea automáticamente como YYYY-MM-DD usando la zona horaria local
    const localDate = today.toLocaleDateString('en-CA'); 
    
    // 2. Enviamos la fecha explícita a la API
    // Ejemplo de URL generada: /api/cron/report?date=2023-10-27
    window.open(`/api/reporte?date=${localDate}`, '_blank');
  };

  // Efecto DEBOUNCE para búsqueda automática
  useEffect(() => {
     const timer = setTimeout(() => {
        if (searchTerm.trim() && selectedSucursal) {
           executeSearch();
        } else if (searchTerm.trim() === "") {
           setSearchResults([]);
        }
     }, 400); // 400ms delay

     return () => clearTimeout(timer);
  }, [searchTerm, selectedSucursal]);    

  const executeSearch = async () => {
    if (!searchTerm.trim() || !selectedSucursal) return

    setIsLoading(true)
    try {
      // ✅ CORRECCIÓN: Ejecutamos las tres búsquedas simultáneamente
      const [resBooks, resDulces, resConsig] = await Promise.all([
        fetch(`/api/books?q=${encodeURIComponent(searchTerm)}`),
        fetch(`/api/dulces?q=${encodeURIComponent(searchTerm)}`),
        fetch(`/api/consignaciones/search?q=${encodeURIComponent(searchTerm)}&sucursalId=${selectedSucursal}`)
      ]);

      const results: ProductEntry[] = [];

      // Procesar Libros
      if (resBooks.ok) {
        const books = await resBooks.json();
        books.forEach((book: any) => {
          const inv = book.inventario.find((i: any) => i.sucursalId === selectedSucursal);
          const stock = inv ? inv.stock : 0;
          // Filtro: Solo mostrar si hay stock > 0
          if (stock > 0) {
            results.push({
                uniqueId: `book-${book.id}`,
                id: book.id,
                type: 'BOOK',
                titulo: book.titulo,
                subtitulo: book.autor,
                precio: Number(book.precioVenta),
                stock: stock,
                ubicacion: inv ? inv.ubicacion : null,
                sucursalId: selectedSucursal!,
                rawBook: book
            });
          }
        });
      }

      // ✅ Procesar Dulces 
      if (resDulces.ok) {
        const responseData = await resDulces.json();
        // La API devuelve { data: [], meta: {} }, así que obtenemos .data
        const dulcesList = Array.isArray(responseData) ? responseData : (responseData.data || []);
        
        if (Array.isArray(dulcesList)) {
            dulcesList.forEach((dulce: any) => {
              const inv = dulce.inventario.find((i: any) => i.sucursalId === selectedSucursal);
              const stock = inv ? inv.stock : 0;
              // Filtro: Solo mostrar si hay stock > 0
              if (stock > 0) {
                 results.push({
                    uniqueId: `dulce-${dulce.id}`,
                    id: dulce.id,
                    type: 'DULCE',
                    titulo: dulce.nombre,
                    subtitulo: dulce.marca || "Sin Marca",
                    precio: Number(dulce.precioVenta),
                    stock: stock,
                    ubicacion: inv ? inv.ubicacion : null,
                    sucursalId: selectedSucursal!,
                    rawDulce: dulce
                 });
              }
            });
        }
      }

      // ✅ Procesar Consignaciones
      if (resConsig.ok) {
        const items = await resConsig.json();
        items.forEach((item: any) => {
            const inv = item.inventario.find((i: any) => i.sucursalId === selectedSucursal);
            if(inv && inv.stock > 0) { 
                results.push({
                    uniqueId: `consig-${item.id}`,
                    id: item.id,
                    type: 'CONSIGNACION',
                    titulo: item.nombre,
                    subtitulo: `Consignación: ${item.proveedor || "Varios"}`,
                    precio: Number(item.precioVenta),
                    stock: inv.stock,
                    ubicacion: null,
                    sucursalId: inv.sucursalId,
                    rawConsignacion: item
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch();
  }

  const addToCart = (entry: ProductEntry) => {
    if (!cashSession) {
        setIsOpenSessionModalOpen(true)
        return
    }

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
            <div className="flex gap-2 items-center">
               {!cashSession ? (
                   <Button 
                      className="bg-emerald-600 hover:bg-emerald-700 animate-pulse"
                      onClick={() => setIsOpenSessionModalOpen(true)}
                   >
                     Abrir Caja
                   </Button>
               ) : (
                   <Button 
                      variant="destructive"
                      onClick={() => {
                          checkCashSession() // Refresh numbers before opening modal
                          setIsCloseSessionModalOpen(true)
                      }}
                   >
                     Cerrar Caja
                   </Button>
               )}
               
               <Dialog open={isExpenseModalOpen} onOpenChange={setIsExpenseModalOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline"
                      className="bg-white text-primary border-primary hover:bg-slate-50 border"
                    >
                      Registrar Gasto
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Registrar Gasto / Egreso</DialogTitle>
                      <DialogDescription>
                         Registra una salida de dinero de la caja de la sucursal actual.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleRegisterExpense} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="concept">Concepto</Label>
                            <Input 
                                id="concept"
                                value={newExpense.concept} 
                                onChange={e => setNewExpense({...newExpense, concept: e.target.value})}
                                placeholder="Ej. Pago de Luz, Cloro, Comida" 
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="amount">Monto</Label>
                                <Input 
                                    id="amount"
                                    type="number" 
                                    min="0"
                                    step="0.01"
                                    value={newExpense.amount} 
                                    onChange={e => setNewExpense({...newExpense, amount: e.target.value})}
                                    placeholder="0.00" 
                                    className="font-mono"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="category">Categoría</Label>
                                <select 
                                    id="category"
                                    className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={newExpense.category}
                                    onChange={e => setNewExpense({...newExpense, category: e.target.value})}
                                >
                                    <option value="INSUMOS">INSUMOS</option>
                                    <option value="SERVICIOS">SERVICIOS</option>
                                    <option value="LIMPIEZA">LIMPIEZA</option>
                                    <option value="MANTENIMIENTO">MANTENIMIENTO</option>
                                    <option value="NOMINA">NÓMINA</option>
                                    <option value="VARIOS">VARIOS</option>
                                    <option value="MERCANCIA">MERCANCÍA (EXTERNA)</option>
                                </select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsExpenseModalOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={isExpenseSubmitting}>
                                {isExpenseSubmitting ? <Loader2 className="animate-spin mr-2" /> : null}
                                Registrar Egreso
                            </Button>
                        </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Store className="text-slate-400" />
            <select
              value={selectedSucursal || ""}
              onChange={(e) => handleSucursalChange(Number(e.target.value))}
              disabled={!!cashSession}
              className={`bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 block p-2.5 min-w-[200px] ${cashSession ? 'opacity-50 cursor-not-allowed' : ''}`}
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

      <Dialog open={isExpenseModalOpen} onOpenChange={setIsExpenseModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Salida de Efectivo</DialogTitle>
            <DialogDescription>
              Ingresa los detalles del gasto. Esto se descontará del efectivo en caja.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRegisterExpense} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="expense-amount">Monto ($)</Label>
              <Input
                id="expense-amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={newExpense.amount}
                onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-concept">Concepto / Descripción</Label>
              <Input
                id="expense-concept"
                placeholder="Ej. Compra de Pinol"
                value={newExpense.concept}
                onChange={(e) => setNewExpense({ ...newExpense, concept: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-category">Categoría</Label>
              <select
                id="expense-category"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={newExpense.category}
                onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
              >
                <option value="VARIOS">Varios</option>
                <option value="LIMPIEZA">Limpieza</option>
                <option value="PAPELERIA">Papelería</option>
                <option value="MANTENIMIENTO">Mantenimiento</option>
                <option value="INSUMOS">Insumos</option>
                <option value="ALIMENTOS">Alimentos</option>
                <option value="TRANSPORTE">Transporte</option>
                <option value="SERVICIOS">Servicios</option>
              </select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsExpenseModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isExpenseSubmitting} className="bg-primary hover:bg-primary/90 text-white">
                {isExpenseSubmitting ? "Guardando..." : "Guardar Gasto"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: ABRIR CAJA (Bloqueante) */}
      <Dialog open={isOpenSessionModalOpen} onOpenChange={setIsOpenSessionModalOpen}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={e => { if(!cashSession) {/* Do nothing if blocking is desired, but user asked for non-blocking */} }}>
            <DialogHeader>
                <DialogTitle>Apertura de Caja</DialogTitle>
                <DialogDescription>
                    Para comenzar a vender, ingresa el fondo inicial de efectivo.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label>Sucursal</Label>
                    <select
                        value={selectedSucursal || ""}
                        onChange={(e) => handleSucursalChange(Number(e.target.value))}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                        <option value="" disabled>Seleccionar...</option>
                        {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                    </select>
                </div>
                <div className="space-y-2">
                    <Label>Monto Inicial (Fondo)</Label>
                    <Input 
                        type="number" 
                        value={openAmount} 
                        onChange={e => setOpenAmount(e.target.value)} 
                        placeholder="Ej. 500.00"
                        autoFocus 
                    />
                </div>
            </div>
            <DialogFooter className="flex justify-between gap-2 sm:gap-0">
                <div className="flex-1 flex justify-start">
                   <Button variant="ghost" onClick={() => logout()}>
                       Cerrar Sesión
                   </Button>
                </div>
                <Button onClick={handleOpenRegister} disabled={!selectedSucursal || !openAmount}>
                    Iniciar Turno
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: CERRAR CAJA */}
      <Dialog open={isCloseSessionModalOpen} onOpenChange={setIsCloseSessionModalOpen}>
        <DialogContent className="sm:max-w-lg">
            <DialogHeader>
                <DialogTitle>Cierre de Caja - {cashSession?.sucursal?.nombre}</DialogTitle>
                <DialogDescription>
                    Verifica los montos antes de cerrar el turno.
                </DialogDescription>
            </DialogHeader>
            {cashSession && (
                <div className="space-y-4 py-4">
                     <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg">
                         <div>
                             <p className="text-xs text-slate-500">Fondo Inicial</p>
                             <p className="font-semibold">${Number(cashSession.montoInicial).toFixed(2)}</p>
                         </div>
                         <div>
                             <p className="text-xs text-slate-500">Ventas Sistema</p>
                             <p className="font-semibold text-green-600">+${Number(cashSession.ventasSistema).toFixed(2)}</p>
                         </div>
                         <div>
                             <p className="text-xs text-slate-500">Gastos Registrados</p>
                             <p className="font-semibold text-red-600">-${Number(cashSession.gastosSistema).toFixed(2)}</p>
                         </div>
                         <div className="border-t border-slate-200 pt-2 mt-2 col-span-2">
                             <p className="text-sm font-bold text-slate-700">Total Esperado en Caja</p>
                             <p className="text-2xl font-black text-slate-900">${(Number(cashSession.totalEsperado)).toFixed(2)}</p>
                         </div>
                     </div>

                     <div className="space-y-2">
                         <Label className="text-base">Efectivo Real (Conteo Físico)</Label>
                         <Input 
                            type="number" 
                            className="text-lg font-bold h-12"
                            placeholder="0.00"
                            value={closeAmount}
                            onChange={e => setCloseAmount(e.target.value)}
                         />
                         {closeAmount && (
                             <div className={`text-sm font-medium ${Number(closeAmount) - Number(cashSession.totalEsperado) >= -1 && Number(closeAmount) - Number(cashSession.totalEsperado) <= 1 ? 'text-green-600' : 'text-red-600'}`}>
                                 Diferencia: ${(Number(closeAmount) - Number(cashSession.totalEsperado)).toFixed(2)}
                             </div>
                         )}
                     </div>
                </div>
            )}
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsCloseSessionModalOpen(false)} disabled={isClosingSession}>Cancelar</Button>
                <Button variant="destructive" onClick={handleCloseRegister} disabled={!closeAmount || isClosingSession}>
                    {isClosingSession ? <><Loader2 className="mr-2 animate-spin" /> Cerrando...</> : "Confirmar Cierre"}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DE FEEDBACK (ÉXITO/ERROR) */}
      <Dialog open={feedbackModal.isOpen} onOpenChange={(open) => setFeedbackModal(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent className="sm:max-w-md border-0 shadow-lg">
          <DialogHeader className="items-center pb-2">
            <div className={`flex h-16 w-16 items-center justify-center rounded-full ${feedbackModal.type === 'success' ? 'bg-emerald-100' : 'bg-red-100'} mb-4`}>
              {feedbackModal.type === 'success' ? (
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              ) : (
                <AlertCircle className="h-8 w-8 text-red-600" />
              )}
            </div>
            <DialogTitle className="text-center text-xl font-bold text-slate-800">{feedbackModal.title}</DialogTitle>
            <DialogDescription className="text-center text-slate-500 text-base pt-1">
              {feedbackModal.message}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center pt-2 gap-2 flex flex-col sm:flex-row">
            {feedbackModal.downloadUrl && (
                <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto gap-2"
                    onClick={() => window.open(feedbackModal.downloadUrl, '_blank')}
                >
                    <FileDown className="h-4 w-4" /> Descargar Excel
                </Button>
            )}
            <Button 
              type="button" 
              className={`w-full sm:w-auto min-w-[140px] font-bold ${feedbackModal.type === 'success' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
              onClick={() => setFeedbackModal(prev => ({ ...prev, isOpen: false }))}
            >
              {feedbackModal.downloadUrl ? 'Cerrar' : 'Entendido'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}