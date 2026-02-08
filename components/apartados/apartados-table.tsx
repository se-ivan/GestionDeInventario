"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
    Dialog, 
    DialogContent, 
    DialogDescription, 
    DialogFooter, 
    DialogHeader, 
    DialogTitle 
} from "@/components/ui/dialog"
import { 
  Ban, 
  DollarSign, 
  CheckCircle, 
  Eye, 
  User, 
  Package, 
  Smartphone,
  Calendar,
  AlertTriangle,
  Loader2
} from "lucide-react"
import { addPayment, cancelApartado, completeApartado } from "@/actions/apartados"
import { formatCurrency } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { Label } from "../ui/label"

interface Apartado {
    id: number
    clienteNombre: string
    clienteTelefono: string | null
    estado: string // 'ACTIVO' | 'COMPLETADO' | 'CANCELADO' | 'VENCIDO'
    montoTotal: any
    montoPagado: any
    saldoPendiente: any
    fechaVencimiento: Date
    fechaCreacion?: Date
    items: any[]
}

interface ApartadosTableProps {
    data: Apartado[]
}

export function ApartadosTable({ data }: ApartadosTableProps) {
    const router = useRouter()
    const [selectedApartado, setSelectedApartado] = useState<Apartado | null>(null)
    const [isPaymentOpen, setIsPaymentOpen] = useState(false)
    const [isDetailsOpen, setIsDetailsOpen] = useState(false)
    const [isCancelOpen, setIsCancelOpen] = useState(false)
    const [isCompleteOpen, setIsCompleteOpen] = useState(false)
    
    const [paymentAmount, setPaymentAmount] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    const handleAddPayment = async () => {
        if (!selectedApartado || !paymentAmount) return
        
        setIsLoading(true)
        const result = await addPayment(selectedApartado.id, Number(paymentAmount))
        setIsLoading(false)
        
        if (result.success) {
            setIsPaymentOpen(false)
            setPaymentAmount("")
            router.refresh()
        } else {
            alert("Error al abonar: " + result.error)
        }
    }

    const triggerCancel = (apartado: Apartado) => {
        setSelectedApartado(apartado)
        setIsCancelOpen(true)
    }

    const confirmCancel = async () => {
        if (!selectedApartado) return
        
        setIsLoading(true)
        const result = await cancelApartado(selectedApartado.id)
        setIsLoading(false)
        
        if (result.success) {
            setIsCancelOpen(false)
            router.refresh()
        } else {
            alert("Error al cancelar: " + result.error)
        }
    }

    const triggerComplete = (apartado: Apartado) => {
        setSelectedApartado(apartado)
        setIsCompleteOpen(true)
    }

    const confirmComplete = async () => {
        if (!selectedApartado) return
        
        setIsLoading(true)
        const result = await completeApartado(selectedApartado.id)
        setIsLoading(false)
        
        if (result.success) {
            setIsCompleteOpen(false)
            router.refresh()
        } else {
            alert("Error al completar: " + result.error)
        }
    }

    const openPayment = (apartado: Apartado) => {
        setSelectedApartado(apartado)
        setPaymentAmount("")
        setIsPaymentOpen(true)
    }

    const openDetails = (apartado: Apartado) => {
        setSelectedApartado(apartado)
        setIsDetailsOpen(true)
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'ACTIVO':
                return <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100">Activo</Badge>
            case 'COMPLETADO':
                return <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">Completado</Badge>
            case 'CANCELADO':
                return <Badge variant="outline" className="text-muted-foreground">Cancelado</Badge>
            case 'VENCIDO':
                return <Badge variant="destructive">Vencido</Badge>
            default:
                return <Badge>{status}</Badge>
        }
    }
    
    // Check for expired active apartados
    const isExpired = (date: Date) => {
        return new Date(date) < new Date() && new Date(date).setHours(0,0,0,0) !== new Date().setHours(0,0,0,0)
    }

    return (
        <>
            <div className="rounded-md shadow-sm bg-white overflow-scroll">
                <Table className="border-separate">
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead className="w-[80px]">ID</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead className="text-center">Items</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-right">Pagado</TableHead>
                            <TableHead className="text-right">Pendiente</TableHead>
                            <TableHead className="text-center">Vencimiento</TableHead>
                            <TableHead className="text-center">Estado</TableHead>
                            <TableHead className="w-[150px] text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.length > 0 ? (
                            data.map((apartado) => {
                                const expired = apartado.estado === 'ACTIVO' && isExpired(apartado.fechaVencimiento)
                                
                                return (
                                <TableRow key={apartado.id} className="hover:bg-slate-50/50">
                                    <TableCell className="font-medium text-slate-500">#{apartado.id}</TableCell>
                                    <TableCell>
                                        <div className="font-medium text-slate-900">{apartado.clienteNombre}</div>
                                        {apartado.clienteTelefono && (
                                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                                <Smartphone className="h-3 w-3" /> {apartado.clienteTelefono}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="outline" className="font-normal text-slate-600">
                                            {apartado.items.length}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                        {formatCurrency(Number(apartado.montoTotal))}
                                    </TableCell>
                                    <TableCell className="text-right text-green-600">
                                        {formatCurrency(Number(apartado.montoPagado))}
                                    </TableCell>
                                    <TableCell className="text-right font-bold">
                                        <span className={Number(apartado.saldoPendiente) > 0 ? "text-red-600" : "text-green-600"}>
                                            {formatCurrency(Number(apartado.saldoPendiente))}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <div className={cn("text-sm flex justify-center items-center", expired ? "text-red-600 font-medium" : "text-slate-600")}>
                                            {new Date(apartado.fechaVencimiento).toLocaleDateString()}
                                            {expired && <AlertTriangle className="h-3 w-3 inline ml-1" />}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex justify-center">
                                            {getStatusBadge(apartado.estado)}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex justify-end gap-1">
                                            <Button 
                                                size="icon" 
                                                variant="ghost" 
                                                onClick={() => openDetails(apartado)}
                                                title="Ver Detalles"
                                            >
                                                <Eye className="h-4 w-4 text-slate-500" />
                                            </Button>

                                            {apartado.estado === 'ACTIVO' && (
                                                <>
                                                    <Button 
                                                        size="icon" 
                                                        variant="ghost" 
                                                        onClick={() => openPayment(apartado)}
                                                        title="Abonar"
                                                    >
                                                        <DollarSign className="h-4 w-4 text-blue-600" />
                                                    </Button>

                                                    {Number(apartado.saldoPendiente) <= 0 && (
                                                        <Button 
                                                            size="icon" 
                                                            variant="ghost" 
                                                            onClick={() => triggerComplete(apartado)}
                                                            title="Completar / Entregar"
                                                        >
                                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                                        </Button>
                                                    )}

                                                    <Button 
                                                        size="icon" 
                                                        variant="ghost" 
                                                        onClick={() => triggerCancel(apartado)}
                                                        title="Cancelar Apartado"
                                                    >
                                                        <Ban className="h-4 w-4 text-red-500" />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )})
                        ) : (
                            <TableRow>
                                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                                    No se encontraron apartados.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Modal de Abono */}
            <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Registrar Abono</DialogTitle>
                        <DialogDescription>
                            Ingrese el monto a abonar para el apartado #{selectedApartado?.id} de {selectedApartado?.clienteNombre}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <span className="text-sm font-medium col-span-4">
                                Saldo Pendiente: <span className="text-red-600 font-bold">{selectedApartado && formatCurrency(Number(selectedApartado.saldoPendiente))}</span>
                            </span>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="amount" className="text-right">
                                Monto
                            </Label>
                            <Input
                                id="amount"
                                type="number"
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(e.target.value)}
                                className="col-span-3 bg-slate-900 text-white border-slate-700 placeholder:text-slate-400"
                                placeholder="0.00"
                                autoFocus
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPaymentOpen(false)} disabled={isLoading}>Cancelar</Button>
                        <Button onClick={handleAddPayment} disabled={isLoading || !paymentAmount}>
                            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Procesando...</> : "Registrar Pago"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de Detalles */}
            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <div className="flex justify-between items-center pr-8">
                             <DialogTitle className="text-xl">Detalles del Apartado #{selectedApartado?.id}</DialogTitle>
                             {selectedApartado && getStatusBadge(selectedApartado.estado)}
                        </div>
                        <DialogDescription>
                            Creado el: {selectedApartado?.fechaCreacion ? new Date(selectedApartado.fechaCreacion).toLocaleDateString() : 'N/A'}
                        </DialogDescription>
                    </DialogHeader>
                    
                    {selectedApartado && (
                        <div className="space-y-6 pt-2">
                             {/* Cliente */}
                             <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                                <div>
                                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Cliente</span>
                                    <div className="flex items-center gap-2 mt-1">
                                        <User className="h-4 w-4 text-slate-500" />
                                        <span className="font-medium">{selectedApartado.clienteNombre}</span>
                                    </div>
                                </div>
                                <div>
                                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Teléfono</span>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Smartphone className="h-4 w-4 text-slate-500" />
                                        <span>{selectedApartado.clienteTelefono || 'N/A'}</span>
                                    </div>
                                </div>
                                <div className="col-span-2 pt-2 mt-2">
                                     <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Vencimiento</span>
                                     <div className="flex items-center gap-2 mt-1 text-red-700">
                                        <Calendar className="h-4 w-4" />
                                        <span className="font-medium">{new Date(selectedApartado.fechaVencimiento).toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                    </div>
                                </div>
                             </div>

                             {/* Items */}
                             <div>
                                <h4 className="font-medium mb-3 flex items-center gap-2">
                                    <Package className="h-4 w-4 text-slate-500" />
                                    Productos Apartados
                                </h4>
                                <div className="rounded-md overflow-hidden">
                                    <Table>
                                        <TableHeader className="bg-slate-50">
                                            <TableRow>
                                                <TableHead>Producto</TableHead>
                                                <TableHead className="text-right">Precio</TableHead>
                                                <TableHead className="text-center">Cant.</TableHead>
                                                <TableHead className="text-right">Subtotal</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {selectedApartado.items.map((item: any, i: number) => (
                                                <TableRow key={i}>
                                                    <TableCell className="py-2">
                                                        <div className="text-sm font-medium">
                                                            {item.book?.titulo || item.dulce?.nombre || 'Item desconocido'}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {item.book ? 'Libro' : 'Dulce'}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right py-2">{formatCurrency(Number(item.precioUnitario))}</TableCell>
                                                    <TableCell className="text-center py-2">{item.cantidad}</TableCell>
                                                    <TableCell className="text-right py-2">{formatCurrency(Number(item.precioUnitario) * item.cantidad)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                             </div>

                             {/* Financials */}
                             <div className="bg-slate-900 text-slate-100 p-4 rounded-lg space-y-2">
                                <div className="flex justify-between text-sm opacity-80">
                                    <span>Total Apartado</span>
                                    <span>{formatCurrency(Number(selectedApartado.montoTotal))}</span>
                                </div>
                                <div className="flex justify-between text-sm opacity-80">
                                    <span>Total Pagado</span>
                                    <span className="text-green-400">{formatCurrency(Number(selectedApartado.montoPagado))}</span>
                                </div>
                                <div className=" pt-2 flex justify-between text-lg font-bold">
                                    <span>Restante a Pagar</span>
                                    <span className={Number(selectedApartado.saldoPendiente) > 0 ? "text-red-400" : "text-green-400"}>
                                        {formatCurrency(Number(selectedApartado.saldoPendiente))}
                                    </span>
                                </div>
                             </div>
                        </div>
                    )}
                    
                    <DialogFooter className="gap-2 sm:gap-0 mt-2">
                         {selectedApartado?.estado === 'ACTIVO' && (
                             <>
                                <Button variant="destructive" onClick={() => { setIsDetailsOpen(false); triggerCancel(selectedApartado); }}>
                                    Cancelar Apartado
                                </Button>
                                <Button onClick={() => { setIsDetailsOpen(false); openPayment(selectedApartado); }}>
                                    Registrar Abono
                                </Button>
                             </>
                         )}
                         <Button variant="secondary" onClick={() => setIsDetailsOpen(false)}>Cerrar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de Confirmación de Cancelación */}
            <Dialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                             <AlertTriangle className="h-5 w-5" /> Cancelar Apartado
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p>¿Estás seguro de que deseas cancelar este apartado?</p>
                        <p className="text-sm text-muted-foreground mt-2">
                            Esto retornará todos los items al inventario y marcará el apartado como cancelado.
                            Esta acción no se puede deshacer.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCancelOpen(false)} disabled={isLoading}>Cerrar</Button>
                        <Button variant="destructive" onClick={confirmCancel} disabled={isLoading}>
                            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cancelando...</> : 'Confirmar Cancelación'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de Confirmación de Completado */}
            <Dialog open={isCompleteOpen} onOpenChange={setIsCompleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-green-600">
                             <CheckCircle className="h-5 w-5" /> Completar Apartado
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p>¿Confirmar la entrega completa del apartado?</p>
                        <p className="text-sm text-muted-foreground mt-2">
                            Asegúrate de haber entregado todos los productos al cliente.
                            El estado pasará a COMPLETADO.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCompleteOpen(false)} disabled={isLoading}>Cancelar</Button>
                        <Button className="bg-green-600 hover:bg-green-700" onClick={confirmComplete} disabled={isLoading}>
                            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando...</> : 'Confirmar Entrega'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
