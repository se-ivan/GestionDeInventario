"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { 
  Candy, Plus, Search, Loader2, Package, Tag, 
  DollarSign, MapPin, Barcode, Scale, Store, ArrowLeft,
  CheckCircle2, XCircle, X 
} from "lucide-react"
import { Sucursal } from "@/lib/types"
import { DulceGrid } from "../../components/dulce-grid" 

// --- 1. COMPONENTE MODAL (FEEDBACK) ---
interface ModalProps {
  isOpen: boolean
  onClose: () => void
  type: 'success' | 'error'
  title: string
  message: string
}

const ModalFeedback = ({ isOpen, onClose, type, title, message }: ModalProps) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl p-6 mx-4 transform transition-all animate-in zoom-in-95 duration-200 border border-slate-100">
        
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors">
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col items-center text-center space-y-4">
          <div className={`p-3 rounded-full ${type === 'success' ? 'bg-green-100' : 'bg-red-100'}`}>
            {type === 'success' ? (
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            ) : (
              <XCircle className="h-10 w-10 text-red-600" />
            )}
          </div>

          <div className="space-y-2">
            <h3 className={`text-xl font-bold ${type === 'success' ? 'text-green-700' : 'text-red-700'}`}>
              {title}
            </h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              {message}
            </p>
          </div>

          <Button 
            onClick={onClose}
            className={`w-full font-bold mt-2 ${
              type === 'success' 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
          >
            {type === 'success' ? 'Continuar' : 'Entendido'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// --- 2. PÁGINA PRINCIPAL ---

interface DulceFormData {
  id?: number 
  nombre: string
  codigoBarras: string
  marca: string
  lineaProducto: string
  peso: string
  sabor: string
  precioCompra: number
  precioVenta: number
  tasaIva: number
  sucursalId: number
  stock: number
  minStock: number
  ubicacion: string
}

const INITIAL_FORM: DulceFormData = {
  nombre: "",
  codigoBarras: "",
  marca: "",
  lineaProducto: "",
  peso: "",
  sabor: "",
  precioCompra: 0,
  precioVenta: 0,
  tasaIva: 8,
  sucursalId: 0,
  stock: 0,
  minStock: 10,
  ubicacion: ""
}

export default function DulceriaPage() {
  const [view, setView] = useState<'list' | 'form'>('list')
  const [dulces, setDulces] = useState<any[]>([])
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  
  const [formData, setFormData] = useState<DulceFormData>(INITIAL_FORM)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [currentSucursalId, setCurrentSucursalId] = useState<number>(0);

  // Estados Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [modalConfig, setModalConfig] = useState<{
    type: 'success' | 'error',
    title: string,
    message: string
  }>({ type: 'success', title: '', message: '' })

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    fetchSucursales()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
        setPage(1)
        fetchDulces(1, searchTerm)
    }, 400) 
    return () => clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    fetchDulces(page, searchTerm)
  }, [page])

  const fetchSucursales = async () => {
    try {
      const res = await fetch('/api/sucursales')
      if (res.ok) {
        const data = await res.json();
        setSucursales(data);
        if (data.length > 0 && currentSucursalId === 0) setCurrentSucursalId(data[0].id);
      }
    } catch (e) { console.error(e) }
  }

  const fetchDulces = async (pageNum = 1, query = "") => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/dulces?page=${pageNum}&limit=20&q=${encodeURIComponent(query)}`)
      if (res.ok) {
          const { data, meta } = await res.json()
          setDulces(data)
          setTotalPages(meta.totalPages)
          setTotalItems(meta.total)
      }
    } catch (e) { console.error(e) }
    finally { setIsLoading(false) }
  }

  const handleUpdateStock = async (id: number, newStock: number) => {
    if (currentSucursalId === 0) {
        showModal('error', 'Sin Sucursal', "No se ha detectado una sucursal activa.");
        return;
    }
    try {
        const currentDulce = dulces.find(d => d.id === id);
        if(!currentDulce) return;

        const payload = {
            ...currentDulce, 
            id: id,
            stock: newStock,
            sucursalId: currentSucursalId, 
            precioVenta: Number(currentDulce.precioVenta), 
            precioCompra: Number(currentDulce.precioCompra),
            tasaIva: Number(currentDulce.tasaIva)
        };

        const res = await fetch('/api/dulces', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            setDulces(prev => prev.map(d => {
                if (d.id === id) {
                    const updatedInv = d.inventario.map((inv: any) => {
                        if (inv.sucursalId === currentSucursalId) return { ...inv, stock: newStock };
                        return inv;
                    });
                    if (!d.inventario.find((inv: any) => inv.sucursalId === currentSucursalId)) {
                        updatedInv.push({ sucursalId: currentSucursalId, stock: newStock });
                    }
                    return { ...d, inventario: updatedInv };
                }
                return d;
            }));
        }
    } catch (e) {
        showModal('error', 'Error', "No se pudo actualizar el stock.");
    }
  }

  const handleDelete = async (id: number) => {
    try {
        const res = await fetch(`/api/dulces?id=${id}`, { method: 'DELETE' });
        if (res.ok) {
            setDulces(prev => prev.filter(d => d.id !== id));
        } else {
            const data = await res.json();
            showModal('error', 'Error al Eliminar', data.message);
        }
    } catch (e) { 
        showModal('error', 'Error de Conexión', "No se pudo eliminar el producto.");
    }
  }

  const handleEdit = (dulce: any) => {
    const inv = dulce.inventario.find((i: any) => i.sucursalId === currentSucursalId) || 
                (dulce.inventario.length > 0 ? dulce.inventario[0] : {});
    
    setFormData({
        id: dulce.id,
        nombre: dulce.nombre,
        codigoBarras: dulce.codigoBarras || "",
        marca: dulce.marca || "",
        lineaProducto: dulce.lineaProducto || "",
        peso: dulce.peso || "",
        sabor: dulce.sabor || "",
        precioCompra: Number(dulce.precioCompra),
        precioVenta: Number(dulce.precioVenta),
        tasaIva: Number(dulce.tasaIva),
        sucursalId: inv.sucursalId || currentSucursalId, 
        stock: inv.stock || 0,
        minStock: inv.minStock || 10,
        ubicacion: inv.ubicacion || ""
    });
    setIsEditing(true);
    setView('form');
  }

  const handleCreateNew = () => {
    setFormData({...INITIAL_FORM, sucursalId: currentSucursalId});
    setIsEditing(false);
    setView('form');
  }

  const handleInputChange = (field: keyof DulceFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const showModal = (type: 'success' | 'error', title: string, message: string) => {
    setModalConfig({ type, title, message })
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    // Si fue éxito, regresar a la lista y refrescar
    if (modalConfig.type === 'success') {
        if (!isEditing) setFormData(INITIAL_FORM) 
        setIsEditing(false)
        setView('list') 
        fetchDulces(page, searchTerm) 
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    if (formData.sucursalId === 0) {
        showModal('error', 'Falta Sucursal', 'Por favor selecciona una sucursal.')
        setIsSubmitting(false)
        return
    }

    try {
      const method = isEditing ? 'PUT' : 'POST';
      const res = await fetch('/api/dulces', {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        showModal(
            'success', 
            isEditing ? '¡Guardado con éxito!' : '¡Registrado con éxito!',
            isEditing ? 'La información del producto ha sido actualizada correctamente.' : 'El producto se ha añadido al inventario.'
        )
      } else {
        const error = await res.json()
        showModal('error', 'Error al Guardar', error.message || 'Error desconocido')
      }
    } catch (e) {
        showModal('error', 'Error de Red', 'No se pudo conectar con el servidor.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      
      {/* MODAL */}
      <ModalFeedback 
        isOpen={modalOpen}
        onClose={handleCloseModal}
        type={modalConfig.type}
        title={modalConfig.title}
        message={modalConfig.message}
      />

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <Candy className="h-8 w-8 text-blue-700" />
            Gestión de Dulcería
          </h1>
          <p className="text-slate-500 mt-1">Administra catálogo e inventario de dulces.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto items-center">
          
          <div className="flex items-center gap-2 mr-4 bg-white px-3 py-1.5 rounded-md border border-slate-200 shadow-sm">
             <Store className="h-4 w-4 text-slate-400" />
             <select 
                className="bg-transparent text-sm text-slate-700 font-medium outline-none cursor-pointer"
                value={currentSucursalId}
                onChange={(e) => {
                    setCurrentSucursalId(Number(e.target.value));
                    fetchDulces(); 
                }}
             >
                {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
             </select>
          </div>

          {view === 'form' ? (
             <Button onClick={() => setView('list')} className={`bg-blue-600 hover:bg-blue-700`}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Inventario
             </Button>
          ) : (
             <Button 
                onClick={handleCreateNew}
                className={`bg-blue-600 hover:bg-blue-700`}
             >
                <Plus className="mr-2 h-4 w-4" /> Nuevo Producto
             </Button>
          )}
        </div>
      </div>

      {/* VISTA: LISTA */}
      {view === 'list' && (
        <div className="space-y-6">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
                placeholder="Buscar dulce por nombre, marca o código..." 
                className="pl-10 h-11 bg-white shadow-sm border-slate-200 focus-visible:ring-blue-700"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
            />
            {isLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-700" />
                </div>
            )}
          </div>

          {dulces.length === 0 && !isLoading ? (
             <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
                <Candy className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500 font-medium">No se encontraron productos.</p>
                <p className="text-slate-400 text-sm">Intenta otra búsqueda o agrega un nuevo producto.</p>
             </div>
          ) : (
             <><DulceGrid
                dulces={dulces.map(d => {
                  const inv = d.inventario.find((i: any) => i.sucursalId === currentSucursalId)
                  return {
                    ...d,
                    stockTotal: inv ? inv.stock : 0,
                    sucursalId: currentSucursalId
                  }
                })}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onUpdateStock={handleUpdateStock} /><div className="flex items-center justify-between space-x-2 py-4">
                  <div className="text-sm text-slate-500">
                    Total: {totalItems} items | Página {page} de {totalPages}
                  </div>
                  <div className="space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1 || isLoading}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages || isLoading}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div></>
          )}
        </div>
      )}

      {/* VISTA: FORMULARIO (PLACEHOLDERS RESTAURADOS) */}
      {view === 'form' && (
        <div className="max-w-4xl mx-auto animate-in slide-in-from-bottom-4 duration-300">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <Card className="p-6 space-y-4 shadow-sm border-slate-200">
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
                  <Package className="text-blue-700 h-5 w-5" />
                  <h2 className="font-semibold text-slate-800">
                    {isEditing ? "Editar Producto" : "Información del Producto"}
                  </h2>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre del Producto <span className="text-red-500">*</span></Label>
                    <Input id="nombre" placeholder="Ej. Paleta Payaso Mini" value={formData.nombre} onChange={e => handleInputChange('nombre', e.target.value)} required />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="codigo">Código de Barras</Label>
                      <div className="relative">
                        <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input id="codigo" className="pl-9" placeholder="EAN / UPC" value={formData.codigoBarras} onChange={e => handleInputChange('codigoBarras', e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="marca">Marca / Fabricante</Label>
                      <div className="relative">
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input id="marca" className="pl-9" placeholder="Ej. Ricolino" value={formData.marca} onChange={e => handleInputChange('marca', e.target.value)} />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="linea">Línea</Label>
                      <Input id="linea" placeholder="Ej. Picante" value={formData.lineaProducto} onChange={e => handleInputChange('lineaProducto', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sabor">Sabor</Label>
                      <Input id="sabor" placeholder="Ej. Fresa" value={formData.sabor} onChange={e => handleInputChange('sabor', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="peso">Peso</Label>
                      <div className="relative">
                        <Scale className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input id="peso" className="pl-9" placeholder="Ej. 45g" value={formData.peso} onChange={e => handleInputChange('peso', e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              <div className="space-y-6">
                <Card className="p-6 space-y-4 shadow-sm border-slate-200">
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
                    <DollarSign className="text-blue-700 h-5 w-5" />
                    <h2 className="font-semibold text-slate-800">Precios e Impuestos</h2>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="precioCompra">Costo Compra ($)</Label>
                      <Input type="number" step="0.01" min="0" placeholder="0.00" value={formData.precioCompra} onChange={e => handleInputChange('precioCompra', Number(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="precioVenta">Precio Venta ($) <span className="text-red-500">*</span></Label>
                      <Input 
                        type="number" 
                        className="font-bold text-blue-700/80 bg-blue-700/5 border-blue-700/20" 
                        step="0.50" 
                        min="0" 
                        placeholder="0.00"
                        value={formData.precioVenta} 
                        onChange={e => handleInputChange('precioVenta', Number(e.target.value))} 
                        required 
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="iva">Impuestos (IVA/IEPS %)</Label>
                    <select 
                      id="iva" 
                      className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
                      value={formData.tasaIva}
                      onChange={e => handleInputChange('tasaIva', Number(e.target.value))}
                    >
                      <option value="0">0% (Tasa Cero)</option>
                      <option value="8">8% (IEPS Dulces)</option>
                      <option value="16">16% (IVA Estándar)</option>
                    </select>
                  </div>
                </Card>

                <Card className={`p-6 space-y-4 shadow-sm border-slate-200 ${isEditing ? 'bg-white' : 'bg-blue-700/5'}`}>
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-blue-700/10">
                    <Store className="text-blue-700 h-5 w-5" />
                    <h2 className="font-semibold text-slate-800">
                        {isEditing ? "Editar Inventario" : "Inventario Inicial"}
                    </h2>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sucursal">Sucursal <span className="text-red-500">*</span></Label>
                    <select 
                        className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
                        value={formData.sucursalId}
                        onChange={e => handleInputChange('sucursalId', Number(e.target.value))}
                        required
                    >
                        <option value="0">-- Seleccionar --</option>
                        {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="stock">Stock Actual</Label>
                      <Input 
                        type="number" 
                        min="0" 
                        placeholder="0"
                        value={formData.stock} 
                        onChange={e => handleInputChange('stock', Number(e.target.value))} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="minStock">Alerta Mínima</Label>
                      <Input type="number" min="1" placeholder="10" value={formData.minStock} onChange={e => handleInputChange('minStock', Number(e.target.value))} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ubicacion">Ubicación Física</Label>
                    <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input id="ubicacion" className="pl-9" placeholder="Ej. Pasillo 3, Estante A" value={formData.ubicacion} onChange={e => handleInputChange('ubicacion', e.target.value)} />
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            <div className="flex gap-4 mt-8 pt-4 border-t border-slate-200">
              <Button type="button" variant="ghost" onClick={() => setView('list')} className="flex-1 text-slate-600 hover:bg-slate-100 font-bold h-12 text-lg">
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1 bg-blue-600 text-white hover:bg-blue-700 font-bold h-12 text-lg shadow-lg">
                {isSubmitting ? <><Loader2 className="mr-2 animate-spin" /> Guardando...</> : (isEditing ? "Guardar Cambios" : "Registrar Producto")}
              </Button>
            </div>
          </form>
        </div>
      )}

    </div>
  )
}