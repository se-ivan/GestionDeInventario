"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { BookForm } from "@/components/book-form"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Package, Plus, Search, AlertTriangle, Edit, Trash2 } from "lucide-react"
import { SucursalForm } from "@/components/sucursal-form"
import { Book, Sucursal, InventarioEntry, BookFormData } from "@/lib/types"

export default function InventoryPage() {
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [inventory, setInventory] = useState<InventarioEntry[]>([])
  const [filteredInventory, setFilteredInventory] = useState<InventarioEntry[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddBookDialogOpen, setIsAddBookDialogOpen] = useState(false);
  const [isAddSucursalDialogOpen, setIsAddSucursalDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<InventarioEntry | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchInventory()
    fetchSucursales()
  }, [])

  useEffect(() => {
    const filtered = inventory.filter((entry) => {
      if (!entry.book || !entry.sucursal) return false
      const lowercasedQuery = searchQuery.toLowerCase()
      return (
        entry.book.titulo.toLowerCase().includes(lowercasedQuery) ||
        entry.book.autor.toLowerCase().includes(lowercasedQuery) ||
        (entry.book.isbn && entry.book.isbn.toLowerCase().includes(lowercasedQuery)) ||
        entry.sucursal.nombre.toLowerCase().includes(lowercasedQuery)
      )
    })
    setFilteredInventory(filtered)
  }, [inventory, searchQuery])

  const fetchInventory = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/inventario');
      if (res.ok) {
        const data = await res.json();
        setInventory(data);
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
      await fetch('/api/sucursales', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      fetchSucursales();
      setIsAddSucursalDialogOpen(false);
    } catch (error) {
      console.error("Error adding sucursal:", error);
    }
  };

  const handleAddBook = async (data: BookFormData) => {
    try {
      await fetch('/api/books', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      fetchInventory();
      setIsAddBookDialogOpen(false);
    } catch (error) {
      console.error("Error adding book:", error);
    }
  };

  const handleUpdateEntry = async (data: { bookData: Partial<Book>, inventoryData: { bookId: number, sucursalId: number, stock: number } }) => {
    try {
      await fetch(`/api/books/${data.inventoryData.bookId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.bookData),
      });

      await fetch(`/api/inventario`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.inventoryData),
      });
      
      setEditingEntry(null);
      fetchInventory();
    } catch (error) {
      console.error("Error al actualizar la entrada:", error);
      alert("Ocurrió un error al guardar los cambios.");
    }
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
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Gestión de Inventario</h1>
            <p className="text-slate-500 mt-1 pr-3">Administra el stock de libros en todas tus sucursales.</p>
          </div>
          <div className="flex gap-4 md:flex-row flex-col">
            <Dialog open={isAddSucursalDialogOpen} onOpenChange={setIsAddSucursalDialogOpen}><DialogTrigger asChild><Button><Plus className="h-5 w-5 mr-2" />Agregar Sucursal</Button></DialogTrigger><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Agregar Nueva Sucursal</DialogTitle></DialogHeader><SucursalForm onSubmit={handleAddSucursal} onCancel={() => setIsAddSucursalDialogOpen(false)} /></DialogContent></Dialog>
            <Dialog open={isAddBookDialogOpen} onOpenChange={setIsAddBookDialogOpen}><DialogTrigger asChild><Button><Plus className="h-5 w-5 mr-2" />Agregar Libro</Button></DialogTrigger><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Agregar Nuevo Libro</DialogTitle></DialogHeader><BookForm onSubmit={handleAddBook} onCancel={() => setIsAddBookDialogOpen(false)} sucursales={sucursales} onTransfer={async () => {}} /></DialogContent></Dialog>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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

        <Card className="overflow-x-scroll">
          <div className="p-5 flex justify-between items-center border-b border-slate-200">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Libros en Inventario</h2>
              <p className="text-sm text-slate-500 mt-1">{filteredInventory.length} resultados encontrados</p>
            </div>
            <div className="relative w-full max-w-sm">
              <input type="text" placeholder="Buscar por título, autor, ISBN o sucursal..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            </div>
          </div>
          <table className="w-full  text-center">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Título</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Autor</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Sucursal</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Precio</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Costo Unitario</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">ISBN</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <tr><td colSpan={7} className="text-center p-8">Cargando inventario...</td></tr>
              ) : filteredInventory.length === 0 ? (
                <tr><td colSpan={7} className="text-center p-8">No se encontraron registros.</td></tr>
              ) : (
                filteredInventory.map((entry) => (
                  <tr key={`${entry.bookId}-${entry.sucursalId}`} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium">{entry.book.titulo}</td>
                    <td className="px-6 py-4 text-slate-600">{entry.book.autor}</td>
                    <td className="px-6 py-4 text-slate-600 font-semibold">{entry.sucursal.nombre}</td>
                    <td className="px-6 py-4 text-slate-600">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(entry.book.precioVenta)}</td>
                    <td className="px-6 py-4 text-slate-600">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(entry.book.precioCompra)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${entry.stock <= 5 ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}`}>
                        {entry.stock} unidades
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{entry.book.isbn}</td>
                    <td className="px-6 py-4 ">
                      <Button variant="ghost" size="sm" className="p-2 h-auto" onClick={() => setEditingEntry(entry)}><Edit className="h-4 w-4 text-slate-500" /></Button>
                      <Button variant="ghost" size="sm" className="p-2 h-auto" onClick={() => handleDeleteEntry(entry.bookId, entry.sucursalId)}><Trash2 className="h-4 w-4 text-slate-500 hover:text-red-600" /></Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
    </div>
  )
}