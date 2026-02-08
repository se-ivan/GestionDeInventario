"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { BookForm } from "@/components/book-form"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Package, Plus, Search, AlertTriangle, Edit, Trash2, FileDown } from "lucide-react"
import { SucursalForm } from "@/components/sucursal-form"
import { Book, Sucursal, InventarioEntry, BookFormData } from "@/lib/types"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { 
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select"
import { ArrowRightLeft } from "lucide-react"
import { DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

export default function InventoryPage() {
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  // inventory ahora contiene solo los datos de la página actual
  const [inventory, setInventory] = useState<InventarioEntry[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [hideNoStock, setHideNoStock] = useState(false) // Este filtro ahora debe ser server-side o manejado post-fetch si la paginación lo permite, pero mejor ignorarlo por desempeño puro por ahora o implementarlo en backend después.

  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Dialogs
  const [isAddBookDialogOpen, setIsAddBookDialogOpen] = useState(false);
  const [isAddSucursalDialogOpen, setIsAddSucursalDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<InventarioEntry | null>(null)
  const [isTransferOpen, setIsTransferOpen] = useState(false)

  // Transfer Data
  const [transferData, setTransferData] = useState({
      bookId: 0,
      nombreProducto: "",
      fromSucursalId: "",
      toSucursalId: "",
      quantity: "1",
      maxStock: 0
  })

  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchSucursales()
  }, [])

  // Efecto para buscar con Debounce y paginación
  useEffect(() => {
    const timer = setTimeout(() => {
        fetchInventory(page, searchQuery);
    }, 500); // 500ms debounce
    return () => clearTimeout(timer);
  }, [page, searchQuery]); // Re-fetch cuando cambia página o búsqueda

  const fetchInventory = async (pageNum = 1, query = "") => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', pageNum.toString());
      params.set('limit', '20'); // Items por página
      if(query) params.set('q', query);
      
      const res = await fetch(`/api/inventario?${params.toString()}`);
      if (res.ok) {
        const { data, meta } = await res.json();
        setInventory(data); // Ahora data es la lista paginada
        setTotalPages(meta.totalPages);
        setTotalItems(meta.total);
      }
    } catch (error) {
      console.error("Error fetching inventory:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSucursales = async () => {
    try {
      const res = await fetch('/api/sucursales');
      if (res.ok) {
        const data = await res.json();
        setSucursales(data);
      }
    } catch (error) {
      console.error("Error fetching sucursales:", error);
    }
  };

  const handleAddSucursal = async (data: { nombre: string; direccion?: string }) => {
    try {
      const response = await fetch('/api/sucursales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) throw new Error("Error al crear sucursal");

      fetchSucursales();
      setIsAddSucursalDialogOpen(false);
    } catch (error) {
      console.error("Error adding sucursal:", error);
      // Opcional: Podrías querer lanzar el error aquí también si SucursalForm maneja errores
    }
  };



  const openTransferModal = (entry: InventarioEntry) => {
      // Pre-fill
      setTransferData({
          bookId: entry.bookId,
          nombreProducto: entry.book?.titulo || "Libro",
          fromSucursalId: entry.sucursalId.toString(),
          toSucursalId: "", // User must select
          quantity: "1",
          maxStock: entry.stock
      })
      setIsTransferOpen(true)
  }

  // --- AQUÍ ESTÁ EL CAMBIO IMPORTANTE PARA EL ISBN ---
  const handleAddBook = async (data: BookFormData) => {
    // 1. Eliminamos el try/catch envolvente para permitir que el error suba
    const response = await fetch('/api/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    // 2. Si el backend dice error (ej. 409 Conflict), lanzamos el error
    if (!response.ok) {
      const errorData = await response.json();
      // Esto le manda el mensaje "Ya existe un libro con este ISBN" al BookForm
      throw new Error(errorData.message || "Error al crear el libro");
    }

    // 3. Solo si todo sale bien, actualizamos la tabla y cerramos
    await fetchInventory();
    setIsAddBookDialogOpen(false);
  };

  const handleUpdateEntry = async (data: { bookData: Partial<Book>, inventoryData: { bookId: number, sucursalId: number, stock: number } }) => {
    // Paso 1: Actualizar datos del libro
    const resBook = await fetch(`/api/books/${data.inventoryData.bookId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data.bookData),
    });

    if (!resBook.ok) {
      const err = await resBook.json();
      throw new Error(err.message || "Error al actualizar el libro");
    }

    // Paso 2: Actualizar datos de inventario
    const resInv = await fetch(`/api/inventario`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data.inventoryData),
    });

    if (!resInv.ok) {
      const err = await resInv.json();
      throw new Error(err.message || "Error al actualizar inventario");
    }

    // Éxito
    setEditingEntry(null);
    await fetchInventory();
  };

  const handleTransfer = async (data: { bookId: number, sourceSucursalId: number, destSucursalId: number, quantity: number }) => {
    try {
      const response = await fetch('/api/inventario/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message);
      }
      alert("Transferencia realizada con éxito!");
      setEditingEntry(null);
      setIsTransferOpen(false);
      fetchInventory();
    } catch (error: any) {
      console.error("Error en la transferencia:", error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleDeleteEntry = async (bookId: number, sucursalId: number) => {
    if (!confirm("¿Seguro que quieres eliminar este registro?")) return;
    try {
      await fetch('/api/inventario', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookId, sucursalId }) });
      fetchInventory();
    } catch (error) {
      console.error("Error deleting entry:", error);
    }
  };

  const [loading, setLoading] = useState(false);

  const handleDownload = () => {
    setLoading(true);
    // Usamos window.open para forzar la descarga directa del stream de la API
    // Se abrirá brevemente una pestaña y se cerrará al descargar
    window.open('/api/export/inventory', '_blank');

    // Reseteamos el loading después de un momento (ya que no podemos saber cuándo termina la descarga con window.open)
    setTimeout(() => setLoading(false), 2000);
  };

  const stats = [
    {
      title: "Registros de Inventario",
      value: inventory.length.toString(),
      icon: Package,
      color: "text-blue-600",
    },
    {
      title: "Stock Bajo (< 5)",
      value: inventory.filter(entry => entry.stock < 5).length.toString(),
      icon: AlertTriangle,
      color: "text-yellow-600",
    },
    {
      title: "Total Unidades",
      value: inventory.reduce((sum, entry) => sum + entry.stock, 0).toString(),
      icon: Package,
      color: "text-green-600",
    },
    {
      title: "Valor Total Inventario",
      value: `$${inventory.reduce((total, entry) => {
        return entry.book ? total + (entry.book.precioVenta * entry.stock) : total;
      }, 0).toFixed(2)}`,
      icon: Package,
      color: "text-purple-600",
    },
  ];

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      <main className="flex-1 flex flex-col p-8 overflow-hidden gap-6 h-full">
        {/* Sección Superior que se mantiene pero puede hacer scroll si es necesario en pantallas muy pequeñas, 
            pero la idea es que Stats y Header consuman espacio fijo arriba */}
        <div className="flex-shrink-0 space-y-8">
          <header className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Gestión de Inventario</h1>
              <p className="text-slate-500 mt-1 pr-3">Administra el stock de libros en todas tus sucursales.</p>
            </div>
            <div className="flex gap-4 md:flex-row flex-col">
              <Button
                onClick={handleDownload}
                variant="outline"
                disabled={loading}
                className="gap-2 border-green-600 text-green-700 hover:bg-green-50"
              >
                <FileDown className="h-4 w-4" />
                {loading ? "Generando..." : "Descargar Inventario Global"}
              </Button>
              <Dialog open={isAddSucursalDialogOpen} onOpenChange={setIsAddSucursalDialogOpen}><DialogTrigger asChild><Button><Plus className="h-5 w-5 mr-2" />Agregar Sucursal</Button></DialogTrigger><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Agregar Nueva Sucursal</DialogTitle></DialogHeader><SucursalForm onSubmit={handleAddSucursal} onCancel={() => setIsAddSucursalDialogOpen(false)} /></DialogContent></Dialog>
              <Dialog open={isAddBookDialogOpen} onOpenChange={setIsAddBookDialogOpen}><DialogTrigger asChild><Button><Plus className="h-5 w-5 mr-2" />Agregar Libro</Button></DialogTrigger><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Agregar Nuevo Libro</DialogTitle></DialogHeader><BookForm onSubmit={handleAddBook} onCancel={() => setIsAddBookDialogOpen(false)} sucursales={sucursales} onTransfer={async () => { }} /></DialogContent></Dialog>
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <Card key={index} className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                    <p className="text-3xl font-bold text-slate-800 mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-full bg-slate-100 ${stat.color}`}><stat.icon className="h-6 w-6" /></div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Card flexible que ocupa el resto del espacio y maneja el scroll de la tabla */}
        <Card className="flex flex-col flex-1 overflow-hidden min-h-0 shadow-md">
          {/* Header de la tabla (Sticky relative to table container) */}
          <div className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 gap-4 flex-shrink-0 bg-white z-10">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Libros en Inventario</h2>
              <p className="text-sm text-slate-500 mt-1">Mostrando {inventory.length} de {totalItems} resultados (Página {page} de {totalPages})</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 items-center w-full sm:w-auto">
                <div className="flex items-center space-x-2">
                    <Switch id="no-stock" checked={hideNoStock} onCheckedChange={setHideNoStock} />
                    <Label htmlFor="no-stock">Ocultar sin stock</Label>
                </div>
                <div className="relative w-full sm:w-80">
                  <input 
                    type="text" 
                    placeholder="Buscar por título, autor, ISBN..." 
                    value={searchQuery} 
                    onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setPage(1); // Reset a primera página al buscar
                    }} 
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                </div>
            </div>
          </div>
          
          {/* Contenedor scrolleable para la tabla */}
          <div className="flex-1 overflow-auto bg-white relative">
            <table className="w-full text-center relative border-collapse">
              <thead className="bg-slate-50 sticky top-0 z-20 shadow-sm">
                <tr>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Título</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Autor</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Sucursal</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Precio</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Costo Unitario</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Stock</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">ISBN</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                          <td colSpan={8} className="p-4">
                              <div className="h-8 bg-slate-100 rounded animate-pulse w-full"></div>
                          </td>
                      </tr>
                  ))
                ) : inventory.length === 0 ? (
                  <tr><td colSpan={8} className="text-center p-8">No se encontraron registros.</td></tr>
                ) : (
                  inventory.map((entry) => (
                    <tr key={`${entry.bookId}-${entry.sucursalId}`} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium">{entry.book.titulo}</td>
                      <td className="px-6 py-4 text-slate-600">{entry.book.autor}</td>
                      <td className="px-6 py-4 text-slate-600 font-semibold">{entry.sucursal.nombre}</td>
                      <td className="px-6 py-4 text-slate-600">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(entry.book.precioVenta)}</td>
                      <td className="px-6 py-4 text-slate-600">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(entry.book.precioCompra)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                             entry.stock === 0 
                               ? "bg-red-100 text-red-800"
                               : entry.stock <= 5 
                                 ? "bg-yellow-100 text-yellow-800" 
                                 : "bg-green-100 text-green-800"
                        }`}>
                          {entry.stock} unidades
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">{entry.book.isbn}</td>
                      <td className="px-6 py-4 ">
                        <Button variant="ghost" size="sm" className="p-2 h-auto" title="Transferir Stock" onClick={() => openTransferModal(entry)}><ArrowRightLeft className="h-4 w-4 text-blue-500" /></Button>
                        <Button variant="ghost" size="sm" className="p-2 h-auto" onClick={() => setEditingEntry(entry)}><Edit className="h-4 w-4 text-slate-500" /></Button>
                        <Button variant="ghost" size="sm" className="p-2 h-auto" onClick={() => handleDeleteEntry(entry.bookId, entry.sucursalId)}><Trash2 className="h-4 w-4 text-slate-500 hover:text-red-600" /></Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Footer de Paginación */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
              <Button 
                variant="outline" 
                onClick={() => setPage(page - 1)} 
                disabled={page <= 1 || isLoading}
              >
                  Anterior
              </Button>
              <span className="text-sm text-slate-600">
                  Página {page} de {totalPages || 1}
              </span>
              <Button 
                variant="outline" 
                onClick={() => setPage(page + 1)} 
                disabled={page >= totalPages || isLoading}
              >
                  Siguiente
              </Button>
          </div>
        </Card>
      </main>

      <Dialog open={!!editingEntry} onOpenChange={() => setEditingEntry(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Gestionar Inventario</DialogTitle>
          </DialogHeader>
          {editingEntry && (
            <BookForm
              initialData={editingEntry}
              onSubmit={handleUpdateEntry}
              onCancel={() => setEditingEntry(null)}
              isEditing
              sucursales={sucursales}
              onTransfer={handleTransfer}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Transferencia */}
      <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Transferir Stock de Libro</DialogTitle>
              </DialogHeader>
              <div className="py-4 space-y-4">
                   <div className="p-3 bg-slate-50 rounded-md">
                       <Label className="text-xs text-muted-foreground">Producto</Label>
                       <div className="font-semibold text-lg">{transferData.nombreProducto}</div>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                           <Label>Desde Sucursal</Label>
                           <Select 
                              disabled // Lock 'From' because we selected a specific row
                              value={transferData.fromSucursalId} 
                           >
                              <SelectTrigger>
                                  <SelectValue placeholder="Origen" />
                              </SelectTrigger>
                              <SelectContent>
                                  {sucursales.map(s => (
                                      <SelectItem key={s.id} value={s.id.toString()}>{s.nombre}</SelectItem>
                                  ))}
                              </SelectContent>
                           </Select>
                       </div>
                       
                       <div className="space-y-2">
                           <Label>Para Sucursal</Label>
                           <Select 
                              value={transferData.toSucursalId} 
                              onValueChange={(val) => setTransferData({...transferData, toSucursalId: val})}
                           >
                              <SelectTrigger>
                                  <SelectValue placeholder="Destino" />
                              </SelectTrigger>
                              <SelectContent>
                                  {sucursales
                                      .filter((s:any) => s.id.toString() !== transferData.fromSucursalId)
                                      .map((s: any) => (
                                      <SelectItem key={s.id} value={s.id.toString()}>
                                          {s.nombre}
                                      </SelectItem>
                                  ))}
                              </SelectContent>
                           </Select>
                       </div>
                   </div>
                   
                   <div className="space-y-2">
                       <Label>Cantidad a Transferir (Max: {transferData.maxStock})</Label>
                       <Input 
                          type="number" 
                          min="1" 
                          max={transferData.maxStock}
                          value={transferData.quantity}
                          onChange={(e) => setTransferData({...transferData, quantity: e.target.value})}
                       />
                   </div>
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setIsTransferOpen(false)}>Cancelar</Button>
                  <Button onClick={() => {
                      const qty = parseInt(transferData.quantity);
                      if (!transferData.toSucursalId) { alert("Selecciona una sucursal destino"); return; }
                      if (isNaN(qty) || qty <= 0 || qty > transferData.maxStock) { alert("Cantidad inválida"); return; }
                      handleTransfer({
                          bookId: transferData.bookId,
                          sourceSucursalId: parseInt(transferData.fromSucursalId),
                          destSucursalId: parseInt(transferData.toSucursalId),
                          quantity: qty
                      });
                  }}>Transferir</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </div>
  )
}
