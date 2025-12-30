"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table"
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from "@/components/ui/dialog"
import { 
  Receipt, Calendar, User, Eye, Trash2, 
  AlertTriangle, Loader2, Store, DollarSign, TrendingUp, ShoppingBag, ArrowUpRight, X
} from "lucide-react"

// --- TIPOS ---
interface SaleItem {
  id: number
  fecha: string
  vendedor: string
  sucursal: string
  metodoPago: string
  total: number
  itemsCount: number
  estado: string
}

interface SaleDetail {
  id: number
  cantidad_vendida: number
  subtotal: string
  book?: { titulo: string, isbn: string }
  dulce?: { nombre: string, codigoBarras: string }
}

interface Stats {
  totalRevenue: number
  totalTransactions: number
  avgTicket: number
}

export default function VentasDashboard() {
  const [sales, setSales] = useState<SaleItem[]>([])
  const [stats, setStats] = useState<Stats>({ totalRevenue: 0, totalTransactions: 0, avgTicket: 0 })
  const [loading, setLoading] = useState(true)
  const [selectedSale, setSelectedSale] = useState<any | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Carga de datos
  const fetchSales = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/sales?limit=50')
      const data = await res.json()
      setSales(data.sales || [])
      setStats(data.stats || { totalRevenue: 0, totalTransactions: 0, avgTicket: 0 })
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSales()
  }, [])

  // Manejadores
  const handleViewDetails = async (saleId: number) => {
    try {
        const res = await fetch(`/api/sales/${saleId}`)
        if(res.ok) {
            const data = await res.json()
            setSelectedSale(data)
            setIsDetailOpen(true)
        }
    } catch (e) { alert("Error cargando detalles") }
  }

  const handleDeleteSale = async () => {
    if(!selectedSale) return
    if(!confirm("¿Cancelar venta? El stock se restaurará automáticamente.")) return

    setIsDeleting(true)
    try {
        const res = await fetch(`/api/sales/${selectedSale.id}`, { method: 'DELETE' })
        if (res.ok) {
            setIsDetailOpen(false)
            fetchSales()
        } else {
            alert("Error al cancelar")
        }
    } catch (e) { alert("Error de conexión") } finally { setIsDeleting(false) }
  }

  // Formatters
  const formatCurrency = (val: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val)
  const formatDate = (date: string) => new Date(date).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit' })

  const getPaymentBadge = (method: string) => {
    const styles: any = {
        'EFECTIVO': 'bg-emerald-50 text-emerald-700 border-emerald-100',
        'TARJETA_DEBITO': 'bg-blue-50 text-blue-700 border-blue-100',
        'TARJETA_CREDITO': 'bg-indigo-50 text-indigo-700 border-indigo-100',
        'TRANSFERENCIA': 'bg-purple-50 text-purple-700 border-purple-100',
    }
    return <Badge variant="outline" className={`${styles[method] || 'bg-slate-50 text-slate-700'} border font-normal`}>{method.replace(/_/g, ' ')}</Badge>
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 font-sans space-y-8">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Reporte de Ventas</h1>
            <p className="text-slate-500">Historial de transacciones y métricas clave.</p>
        </div>
        <Button onClick={fetchSales} variant="outline" className="gap-2 bg-white hover:bg-slate-50 border-slate-200 shadow-sm text-slate-700">
            <TrendingUp className="w-4 h-4" /> Actualizar
        </Button>
      </div>

      {/* STATS CARDS - Diseño limpio sin bordes duros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
            { title: "Ingresos Totales", value: formatCurrency(stats.totalRevenue), icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
            { title: "Transacciones", value: stats.totalTransactions, icon: Receipt, color: "text-blue-600", bg: "bg-blue-50" },
            { title: "Ticket Promedio", value: formatCurrency(stats.avgTicket), icon: ShoppingBag, color: "text-orange-600", bg: "bg-orange-50" }
        ].map((stat, idx) => (
            <Card key={idx} className="p-6 border-none shadow-sm bg-white rounded-xl flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all">
                <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${stat.color}`}>
                    <stat.icon className="w-24 h-24" />
                </div>
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{stat.title}</p>
                    <h3 className="text-3xl font-bold text-slate-800 mt-2">{stat.value}</h3>
                </div>
            </Card>
        ))}
      </div>

      {/* TABLA DE VENTAS - Diseño "Borderless" limpio */}
      <Card className="shadow-sm border-none rounded-xl overflow-hidden bg-white">
        <div className="p-6 border-b border-slate-50">
            <h3 className="font-bold text-lg text-slate-800">Transacciones Recientes</h3>
        </div>
        <div className="overflow-x-auto">
            <Table>
            <TableHeader>
                <TableRow className="border-b border-slate-100 hover:bg-transparent">
                    <TableHead className="w-[80px] font-bold text-slate-400">ID</TableHead>
                    <TableHead className="font-bold text-slate-400">Fecha</TableHead>
                    <TableHead className="font-bold text-slate-400">Sucursal</TableHead>
                    <TableHead className="font-bold text-slate-400">Vendedor</TableHead>
                    <TableHead className="font-bold text-slate-400">Pago</TableHead>
                    <TableHead className="text-center font-bold text-slate-400">Items</TableHead>
                    <TableHead className="text-right font-bold text-slate-400">Total</TableHead>
                    <TableHead className="text-right font-bold text-slate-400"></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {loading ? (
                    <TableRow className="border-0"><TableCell colSpan={8} className="h-32 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2" /> Cargando...</TableCell></TableRow>
                ) : sales.length === 0 ? (
                    <TableRow className="border-0"><TableCell colSpan={8} className="h-32 text-center text-slate-400">Sin movimientos recientes.</TableCell></TableRow>
                ) : (
                    sales.map((sale) => (
                    <TableRow key={sale.id} className="border-0 hover:bg-slate-50/80 transition-colors group cursor-pointer" onClick={() => handleViewDetails(sale.id)}>
                        <TableCell className="font-mono text-slate-400 text-xs">#{sale.id}</TableCell>
                        <TableCell>
                            <div className="flex items-center gap-2 text-slate-700 font-medium">
                                <Calendar className="h-3.5 w-3.5 text-slate-400" /> 
                                {formatDate(sale.fecha)}
                            </div>
                        </TableCell>
                        <TableCell>
                            <div className="flex items-center gap-2 text-slate-600 text-sm">
                                <Store className="h-3.5 w-3.5 text-slate-300" /> {sale.sucursal}
                            </div>
                        </TableCell>
                        <TableCell>
                            <div className="flex items-center gap-2 text-slate-600 text-sm">
                                <User className="h-3.5 w-3.5 text-slate-300" /> {sale.vendedor}
                            </div>
                        </TableCell>
                        <TableCell>{getPaymentBadge(sale.metodoPago)}</TableCell>
                        <TableCell className="text-center">
                            <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-full text-xs font-bold">{sale.itemsCount}</span>
                        </TableCell>
                        <TableCell className="text-right font-bold text-slate-800 text-base">
                            {formatCurrency(sale.total)}
                        </TableCell>
                        <TableCell className="text-right">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-blue-600 hover:bg-blue-50 opacity-0 group-hover:opacity-100 transition-all">
                                <Eye className="h-4 w-4" />
                            </Button>
                        </TableCell>
                    </TableRow>
                    ))
                )}
            </TableBody>
            </Table>
        </div>
      </Card>

      {/* MODAL DETALLE - Mejorada para contenido largo */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 rounded-2xl border-0 shadow-2xl">
            
            {/* Header Modal */}
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h2 className="text-2xl font-bold text-slate-800">Ticket #{selectedSale?.id}</h2>
                        {selectedSale && (
                            <Badge className={`${selectedSale.estado === 'COMPLETADA' ? 'bg-emerald-500' : 'bg-red-500'} hover:bg-emerald-600 border-0`}>
                                {selectedSale.estado}
                            </Badge>
                        )}
                    </div>
                    <p className="text-sm text-slate-500 flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5" /> 
                        {selectedSale && formatDate(selectedSale.fecha)}
                        <span className="mx-1">•</span>
                        <User className="h-3.5 w-3.5" /> 
                        {selectedSale?.user?.nombre}
                    </p>
                </div>
            </div>

            {/* Contenido Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
                {selectedSale && (
                    <div className="space-y-8">
                        
                        {/* Tabla de Productos Interna - Sin bordes, solo espacio */}
                        <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Detalle de Productos</h4>
                            <div className="space-y-1">
                                {/* Encabezados simulados */}
                                <div className="grid grid-cols-12 text-xs font-medium text-slate-400 pb-2 border-b border-slate-50 px-2">
                                    <div className="col-span-6">PRODUCTO</div>
                                    <div className="col-span-2 text-center">CANT.</div>
                                    <div className="col-span-2 text-right">UNITARIO</div>
                                    <div className="col-span-2 text-right">TOTAL</div>
                                </div>

                                {selectedSale.details.map((detail: SaleDetail) => {
                                    const productName = detail.book?.titulo || detail.dulce?.nombre || "N/A";
                                    const code = detail.book?.isbn || detail.dulce?.codigoBarras || "S/C";
                                    const type = detail.book ? "Libro" : "Dulce";
                                    const unitPrice = Number(detail.subtotal) / detail.cantidad_vendida;

                                    return (
                                        <div key={detail.id} className="grid grid-cols-12 items-center py-3 px-2 hover:bg-slate-50 rounded-lg transition-colors group">
                                            <div className="col-span-6 pr-4">
                                                {/* TRUNCATE Y BREAK-WORDS PARA EVITAR BUGS DE DISEÑO */}
                                                <div className="font-medium text-slate-700 text-sm break-words line-clamp-2" title={productName}>
                                                    {productName}
                                                </div>
                                                <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                                                    <span className="font-mono bg-slate-100 px-1 rounded">{code}</span>
                                                    <span className="uppercase tracking-wide">{type}</span>
                                                </div>
                                            </div>
                                            <div className="col-span-2 text-center text-sm font-bold text-slate-600 bg-slate-50/50 py-1 rounded">
                                                {detail.cantidad_vendida}
                                            </div>
                                            <div className="col-span-2 text-right text-sm text-slate-500">
                                                {formatCurrency(unitPrice)}
                                            </div>
                                            <div className="col-span-2 text-right text-sm font-bold text-slate-800">
                                                {formatCurrency(Number(detail.subtotal))}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Totales */}
                        <div className="flex justify-end pt-4 border-t border-slate-100">
                            <div className="w-full sm:w-1/2 space-y-3">
                                <div className="flex justify-between text-sm text-slate-500">
                                    <span>Subtotal Base</span>
                                    <span>{formatCurrency(selectedSale.subtotal)}</span>
                                </div>
                                <div className="flex justify-between text-sm text-slate-500">
                                    <span>Impuestos</span>
                                    <span>{formatCurrency(selectedSale.impuestos)}</span>
                                </div>
                                {Number(selectedSale.descuentoTotal) > 0 && (
                                    <div className="flex justify-between text-sm text-orange-600 font-medium bg-orange-50 px-2 py-1 rounded">
                                        <span>Descuento Aplicado</span>
                                        <span>-{formatCurrency(selectedSale.descuentoTotal)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-end pt-3 border-t border-slate-200 mt-2">
                                    <span className="text-sm font-bold text-slate-600 uppercase tracking-wide">Total a Pagar</span>
                                    <span className="text-3xl font-black text-slate-800">{formatCurrency(selectedSale.montoTotal)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Modal - Acciones Peligrosas separadas */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center gap-4">
                <div className="flex items-center text-xs text-orange-600 bg-orange-50/50 px-3 py-2 rounded-lg border border-orange-100 max-w-sm">
                    <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span>Esta acción cancelará la venta y <b>devolverá los productos al inventario</b>.</span>
                </div>
                
                <Button 
                    variant="destructive" 
                    onClick={handleDeleteSale} 
                    disabled={isDeleting}
                    className="bg-red-600 hover:bg-red-700 shadow-lg shadow-red-100 text-white font-semibold"
                >
                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Trash2 className="h-4 w-4 mr-2" /> Cancelar Venta</>}
                </Button>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}