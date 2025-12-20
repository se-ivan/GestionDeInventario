"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Candy, Tag, Trash2, Edit, ScanBarcode, Minus, Plus, AlertTriangle, X } from "lucide-react"

// --- 1. COMPONENTE MODAL DE CONFIRMACIÓN (NUEVO) ---
interface DeleteModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  productName: string
}

const DeleteModal = ({ isOpen, onClose, onConfirm, productName }: DeleteModalProps) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      <div className="relative w-full max-w-sm bg-white rounded-xl shadow-2xl p-6 transform transition-all animate-in zoom-in-95 duration-200 border border-slate-100">
        
        {/* Botón cerrar X */}
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col items-center text-center space-y-4">
          {/* Icono de Alerta */}
          <div className="p-3 rounded-full bg-red-100">
            <AlertTriangle className="h-10 w-10 text-red-600" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-800">¿Eliminar Producto?</h3>
            <p className="text-slate-600 text-sm">
              ¿Estás seguro que deseas eliminar <span className="font-bold text-slate-800">"{productName}"</span>? 
              <br />
              <span className="text-xs text-red-500 mt-1 block">Esta acción no se puede deshacer.</span>
            </p>
          </div>

          <div className="flex gap-3 w-full mt-2">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1 font-bold border-slate-200 hover:bg-slate-50 text-slate-700"
            >
              Cancelar
            </Button>
            <Button 
              onClick={onConfirm}
              className="flex-1 font-bold bg-red-600 hover:bg-red-700 text-white"
            >
              Sí, Eliminar
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// --- FIN MODAL ---

interface Dulce {
  id: number
  codigoBarras: string | null
  nombre: string
  marca: string | null
  lineaProducto: string | null
  precioVenta: number
  stockTotal: number 
  sabor: string | null
  sucursalId?: number 
}

interface DulceGridProps {
  dulces: Dulce[]
  onEdit: (dulce: any) => void
  onDelete: (id: number) => void
  onUpdateStock: (id: number, newStock: number) => void
}

export function DulceGrid({ dulces, onEdit, onDelete, onUpdateStock }: DulceGridProps) {
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  
  // Nuevo estado para controlar qué dulce se está intentando borrar
  const [dulceToDelete, setDulceToDelete] = useState<Dulce | null>(null);

  const handleStockChange = async (dulce: Dulce, delta: number) => {
    const newStock = Math.max(0, dulce.stockTotal + delta);
    setUpdatingId(dulce.id);
    await onUpdateStock(dulce.id, newStock);
    setUpdatingId(null);
  };

  // Función para confirmar la eliminación
  const confirmDelete = () => {
    if (dulceToDelete) {
        onDelete(dulceToDelete.id);
        setDulceToDelete(null); // Cerrar modal
    }
  };

  return (
    <>
        {/* Renderizamos la Modal aquí */}
        <DeleteModal 
            isOpen={!!dulceToDelete}
            onClose={() => setDulceToDelete(null)}
            onConfirm={confirmDelete}
            productName={dulceToDelete?.nombre || "este producto"}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {dulces.map((dulce) => (
            <Card
            key={dulce.id}
            className="group hover:shadow-lg transition-all duration-200 hover:scale-[1.02] border-slate-200"
            >
            <div className="p-4 space-y-4">
                {/* Header / Icono */}
                <div className="flex justify-center">
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-blue-700/10 rounded-full border-2 border-blue-700/20 flex flex-col items-center justify-center shadow-sm relative">
                    <Candy className="h-8 w-8 text-blue-700/70 mb-1" />
                    {dulce.sabor && (
                        <Badge variant="secondary" className="absolute -bottom-2 text-[10px] px-2 py-0 border-blue-700/20 shadow-sm max-w-[90%] truncate">
                            {dulce.sabor}
                        </Badge>
                    )}
                </div>
                </div>

                {/* Info */}
                <div className="space-y-1 text-center">
                <h4 className="font-bold text-sm sm:text-base text-slate-800 line-clamp-2 leading-tight min-h-[2.5rem]" title={dulce.nombre}>
                    {dulce.nombre}
                </h4>

                <div className="flex items-center justify-center gap-1.5 text-slate-500 text-xs">
                    <Tag className="h-3 w-3" />
                    <span className="font-medium">{dulce.marca || "Genérico"}</span>
                </div>

                <div className="flex items-center justify-center gap-1 text-slate-400 text-[10px] font-mono mt-1">
                    <ScanBarcode className="h-3 w-3" />
                    <span>{dulce.codigoBarras || "S/N"}</span>
                </div>
                </div>

                {/* Precio y Stock Control */}
                <div className="flex flex-col items-center gap-3 pt-2 border-t border-slate-100">
                    <span className="font-bold text-lg text-blue-700">${Number(dulce.precioVenta).toFixed(2)}</span>
                    
                    {/* Control de Stock Directo */}
                    <div className="flex items-center bg-blue-700/10 rounded-md p-1 border border-blue-700/20">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 hover:bg-white rounded-sm"
                            onClick={() => handleStockChange(dulce, -1)}
                            disabled={updatingId === dulce.id || dulce.stockTotal <= 0}
                        >
                            <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-xs font-bold w-12 text-center text-slate-700">
                            {updatingId === dulce.id ? "..." : `${dulce.stockTotal} u.`}
                        </span>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 hover:bg-white rounded-sm"
                            onClick={() => handleStockChange(dulce, 1)}
                            disabled={updatingId === dulce.id}
                        >
                            <Plus className="h-3 w-3" />
                        </Button>
                    </div>
                </div>

                {/* Acciones */}
                <div className="flex gap-2 pt-1 w-full">
                <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 h-8 text-xs border-slate-200 text-slate-600 hover:text-blue-700 hover:bg-blue-700/20"
                    onClick={() => onEdit(dulce)}
                >
                    <Edit className="h-3.5 w-3.5 mr-1.5" /> Editar
                </Button>
                <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 w-8 px-0 border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200"
                    onClick={() => setDulceToDelete(dulce)} // CAMBIO: Abrimos modal en vez de confirm nativo
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </Button>
                </div>
            </div>
            </Card>
        ))}
        </div>
    </>
  )
}