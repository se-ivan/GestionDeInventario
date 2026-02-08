"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Search, Trash2, Plus, AlertCircle, CheckCircle, User, Calendar, Calculator, Package, Save, ArrowLeft, ShoppingCart } from "lucide-react"
import { createApartado } from "@/actions/apartados"
import { formatCurrency, cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { 
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface ItemType {
    id: number
    type: 'BOOK' | 'DULCE'
    titulo?: string
    nombre?: string
    isbn?: string
    codigoBarras?: string
    precio: number
    cantidad: number
}

export function CreateApartadoForm() {
    const router = useRouter()
    
    // Branch info
    const [sucursales, setSucursales] = useState<any[]>([])
    const [selectedSucursalId, setSelectedSucursalId] = useState<string>("")
    const [fetchingSucursales, setFetchingSucursales] = useState(true)

    // Client info
    const [clientName, setClientName] = useState("")
    const [clientPhone, setClientPhone] = useState("")
    const [initialPayment, setInitialPayment] = useState("")
    const [expirationDate, setExpirationDate] = useState("")
    
    // Items
    const [items, setItems] = useState<ItemType[]>([])
    
    // Search
    const [searchQuery, setSearchQuery] = useState("")
    const [searchType, setSearchType] = useState<'ALL' | 'BOOKS' | 'DULCES'>('ALL')
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [searching, setSearching] = useState(false)
    
    // UI State
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const [loading, setLoading] = useState(false)

    // Fetch branches on mount
    useEffect(() => {
        const fetchSucursales = async () => {
            try {
                const res = await fetch('/api/sucursales')
                if (res.ok) {
                    const data = await res.json()
                    setSucursales(data)
                    // If only one branch exists, select it automatically
                    if (data.length === 1) {
                        setSelectedSucursalId(data[0].id.toString())
                    }
                }
            } catch (e) {
                console.error("Error fetching branches:", e)
            } finally {
                setFetchingSucursales(false)
            }
        }
        fetchSucursales()
    }, [])

    const handleSearch = async () => {
        if (!searchQuery.trim()) return
        
        setSearching(true)
        setSearchResults([]) // Clear previous
        
        try {
            const results: any[] = []
            
            if (searchType === 'ALL' || searchType === 'BOOKS') {
                const url = `/api/books/search?q=${encodeURIComponent(searchQuery)}${selectedSucursalId ? `&sucursalId=${selectedSucursalId}` : ''}`
                const res = await fetch(url)
                if (res.ok) {
                    const books = await res.json()
                    results.push(...books.map((b: any) => ({ ...b, itemType: 'BOOK' })))
                }
            }
            
            if (searchType === 'ALL' || searchType === 'DULCES') {
                const url = `/api/dulces/search?q=${encodeURIComponent(searchQuery)}${selectedSucursalId ? `&sucursalId=${selectedSucursalId}` : ''}`
                const res = await fetch(url)
                if (res.ok) {
                    const dulces = await res.json()
                    results.push(...dulces.map((d: any) => ({ ...d, itemType: 'DULCE' })))
                }
            }
            
            setSearchResults(results)
        } catch (e) {
            console.error(e)
            setError("Error al buscar productos")
        } finally {
            setSearching(false)
        }
    }

    const addItem = (item: any) => {
        const itemType = item.itemType || 'BOOK'
        const existingIndex = items.findIndex(
            i => i.id === item.id && i.type === itemType
        )
        
        if (existingIndex >= 0) {
            const newItems = [...items]
            newItems[existingIndex].cantidad += 1
            setItems(newItems)
        } else {
            setItems([...items, { 
                id: item.id, 
                type: itemType,
                titulo: item.titulo,
                nombre: item.nombre,
                isbn: item.isbn,
                codigoBarras: item.codigo_barras,
                precio: Number(item.precioVenta || item.precio), 
                cantidad: 1 
            }])
        }
    }

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index))
    }

    const updateQuantity = (index: number, quantity: number) => {
        if (quantity < 1) return
        const newItems = [...items]
        newItems[index].cantidad = quantity
        setItems(newItems)
    }

    const calculateTotal = () => {
        return items.reduce((acc, item) => acc + (item.cantidad * item.precio), 0) || 0
    }

    const isMinDateValid = () => {
        if (!expirationDate) return false
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const selected = new Date(expirationDate)
        return selected >= today
    }

    const handleSubmit = async () => {
        setError("")
        setSuccess("")
        
        // Validations
        if (!selectedSucursalId) {
            setError("Debe seleccionar una sucursal antes de continuar")
            return
        }

        if (!clientName.trim()) {
            setError("El nombre del cliente es requerido")
            return
        }
        
        if (items.length === 0) {
            setError("Debe agregar al menos un producto")
            return
        }
        
        if (!expirationDate) {
            setError("La fecha de vencimiento es requerida")
            return
        }

        if (!isMinDateValid()) {
            setError("La fecha de vencimiento debe ser posterior a hoy")
            return
        }

        const total = calculateTotal()
        const initialPaymentNum = Number(initialPayment) || 0
        
        if (initialPaymentNum < 0) {
             setError("El adelanto no puede ser negativo")
             return
        }

        if (initialPaymentNum > total) {
            setError("El adelanto no puede ser mayor al total")
            return
        }

        setLoading(true)
        
        try {
            const data = {
                clienteNombre: clientName.trim(),
                clienteTelefono: clientPhone.trim() || undefined,
                fechaVencimiento: new Date(expirationDate),
                items: items.map(i => ({
                    id: i.id,
                    type: i.type,
                    cantidad: i.cantidad,
                    precioUnitario: i.precio
                })),
                montoPagado: initialPaymentNum,
                sucursalId: parseInt(selectedSucursalId)
            }
            
            const res = await createApartado(data)
            if (res.success) {
                setSuccess("Apartado creado exitosamente")
                setTimeout(() => {
                    router.push('/apartados')
                }, 1000)
            } else {
                setError(res.error || "Error desconocido")
            }
        } catch (err) {
            console.error(err)
            setError("Error inesperado al crear el apartado")
        } finally {
            setLoading(false)
        }
    }

    const total = calculateTotal()
    const remaining = total - (Number(initialPayment) || 0)

    return (
        <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-10">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Nuevo Apartado</h1>
                    <p className="text-muted-foreground mt-1">
                        Complete la información para crear un nuevo apartado.
                    </p>
                </div>
                <Button variant="outline" onClick={() => router.back()} className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Cancelar
                </Button>
            </div>

            {/* Alerts */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3 text-red-900 animate-in fade-in slide-in-from-top-2">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <h3 className="font-medium">Error</h3>
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                </div>
            )}

            {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3 text-green-900 animate-in fade-in slide-in-from-top-2">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <h3 className="font-medium">Apartado Creado</h3>
                        <p className="text-sm text-green-700">{success}</p>
                    </div>
                </div>
            )}

            {/* Sucursal Selection (New Step) */}
            <Card className="border-none shadow-md bg-blue-50/50">
                <CardHeader className="pb-3 text-center sm:text-left">
                    <CardTitle className="text-lg flex items-center gap-2 justify-center sm:justify-start">
                        <Package className="h-5 w-5 text-blue-600" />
                        Paso 1: Seleccionar Sucursal
                    </CardTitle>
                    <CardDescription>
                        Seleccione la sucursal donde se reservarán los productos. El inventario se descontará de esta ubicación.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row items-center gap-4 justify-center sm:justify-start">
                    <Select 
                        value={selectedSucursalId} 
                        onValueChange={setSelectedSucursalId}
                        disabled={loading || items.length > 0}
                    >
                        <SelectTrigger className="w-full sm:w-[300px] bg-white border-blue-200">
                            <SelectValue placeholder="Seleccione una sucursal..." />
                        </SelectTrigger>
                        <SelectContent>
                            {sucursales.map((sucursal) => (
                                <SelectItem key={sucursal.id} value={sucursal.id.toString()}>
                                    {sucursal.nombre}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {items.length > 0 && (
                        <p className="text-xs text-orange-600 font-medium">
                            * No puede cambiar la sucursal con productos en la lista.
                        </p>
                    )}
                    {!selectedSucursalId && !fetchingSucursales && (
                         <Badge variant="outline" className="text-blue-600 border-blue-200 bg-white">
                            Requerido para comenzar
                         </Badge>
                    )}
                </CardContent>
            </Card>

            <div className={cn("grid grid-cols-1 lg:grid-cols-3 gap-6", !selectedSucursalId && "opacity-50 pointer-events-none")}>
                
                {/* Left Column: Product Search & List (2/3) */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Search Card */}
                    <Card className="overflow-hidden border-none shadow-md">
                        <CardHeader className="bg-slate-50/50 pb-4">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Search className="h-5 w-5 text-muted-foreground" />
                                Buscar Productos
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="relative flex-1">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input 
                                        placeholder="Buscar por título, autor o código..." 
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                        className="pl-9"
                                    />
                                </div>
                                <select
                                    value={searchType}
                                    onChange={e => setSearchType(e.target.value as any)}
                                    className="h-10 w-full sm:w-[140px] px-3 py-2 border rounded-md text-sm bg-background"
                                >
                                    <option value="ALL">Todos</option>
                                    <option value="BOOKS">Libros</option>
                                    <option value="DULCES">Dulces</option>
                                </select>
                                <Button onClick={handleSearch} disabled={searching || !searchQuery.trim()}>
                                    {searching ? "Buscando..." : "Buscar"}
                                </Button>
                            </div>

                            {/* Search Results */}
                            {searchResults.length > 0 && (
                                <div className="border rounded-md max-h-[240px] overflow-y-auto bg-white">
                                    {searchResults.map((product) => (
                                        <div 
                                            key={`${product.itemType}-${product.id}`} 
                                            className="flex justify-between items-center p-3 hover:bg-slate-50 border-b last:border-0 transition-colors"
                                        >
                                            <div className="flex-1 pr-4">
                                                <div className="font-medium text-sm">
                                                    {product.titulo || product.nombre}
                                                </div>
                                                <div className="text-xs text-muted-foreground flex gap-2 mt-0.5">
                                                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal">
                                                        {product.itemType === 'BOOK' ? 'LIBRO' : 'DULCE'}
                                                    </Badge>
                                                    <span>{formatCurrency(product.precioVenta || product.precio)}</span>
                                                    {(product.isbn || product.codigo_barras) && (
                                                        <span className="hidden sm:inline opacity-70">
                                                            ID: {product.isbn || product.codigo_barras}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <Button 
                                                size="sm" 
                                                variant="secondary"
                                                onClick={() => addItem(product)}
                                                className="h-8 w-8 p-0 rounded-full"
                                            >
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Selected Items Card */}
                    <Card className="min-h-[400px] border-none shadow-md flex flex-col">
                        <CardHeader className="bg-slate-50/50 pb-4">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <ShoppingCart className="h-5 w-5 text-muted-foreground" />
                                    Productos Seleccionados
                                </CardTitle>
                                <Badge variant="secondary" className="px-2">{items.length}</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 flex-1">
                            {items.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50/30">
                                            <TableHead className="pl-6">Producto</TableHead>
                                            <TableHead className="text-right w-28">Precio</TableHead>
                                            <TableHead className="text-center w-24">Cant.</TableHead>
                                            <TableHead className="text-right w-28 pr-6">Subtotal</TableHead>
                                            <TableHead className="w-12"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {items.map((item, index) => (
                                            <TableRow key={index}>
                                                <TableCell className="pl-6">
                                                    <div className="font-medium text-sm">
                                                        {item.titulo || item.nombre}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {item.type === 'BOOK' ? 'Libro' : 'Dulce'}
                                                        {(item.isbn || item.codigoBarras) && ` • ${item.isbn || item.codigoBarras}`}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right text-muted-foreground">
                                                    {formatCurrency(item.precio)}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center justify-center">
                                                        <Input 
                                                            type="number" 
                                                            min="1"
                                                            className="w-16 text-center h-8" 
                                                            value={item.cantidad} 
                                                            onChange={(e) => updateQuantity(index, Number(e.target.value))}
                                                        />
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right font-medium pr-6">
                                                    {formatCurrency(item.precio * item.cantidad)}
                                                </TableCell>
                                                <TableCell>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50"
                                                        onClick={() => removeItem(index)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full py-20 text-muted-foreground opacity-60">
                                    <Package className="h-12 w-12 mb-3 stroke-1" />
                                    <p>No hay productos en la lista</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Customer & Summary (1/3) */}
                <div className="space-y-6">
                    <Card className="border-none shadow-md">
                        <CardHeader className="bg-slate-50/50 pb-4">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <User className="h-5 w-5 text-muted-foreground" />
                                Datos del Cliente
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="clientName">Nombre Completo <span className="text-red-500">*</span></Label>
                                <Input 
                                    id="clientName"
                                    value={clientName} 
                                    onChange={e => setClientName(e.target.value)} 
                                    placeholder="Nombre del cliente..."
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="clientPhone">Teléfono / Celular</Label>
                                <Input 
                                    id="clientPhone"
                                    value={clientPhone} 
                                    onChange={e => setClientPhone(e.target.value)} 
                                    placeholder="55 0000 0000"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="expirationDate">Fecha Vencimiento <span className="text-red-500">*</span></Label>
                                <div className="relative">
                                    <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input 
                                        id="expirationDate"
                                        type="date" 
                                        value={expirationDate} 
                                        onChange={e => setExpirationDate(e.target.value)}
                                        min={new Date().toISOString().split('T')[0]}
                                        className="pl-9"
                                    />
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                    El cliente debe liquidar antes de esta fecha.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-md bg-slate-900 text-slate-100">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg flex items-center gap-2 text-slate-100">
                                <Calculator className="h-5 w-5 opacity-70" />
                                Resumen de Pago
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="opacity-70">Total Productos</span>
                                    <span>{items.length} pzas</span>
                                </div>
                                <div className="flex justify-between text-lg font-medium">
                                    <span>Total a Pagar</span>
                                    <span>{formatCurrency(total)}</span>
                                </div>
                            </div>
                            
                            <Separator className="bg-slate-700" />

                            <div className="space-y-2">
                                <Label htmlFor="initialPayment" className="text-slate-300">Abono Inicial (Opcional)</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-slate-500">$</span>
                                    <Input 
                                        id="initialPayment"
                                        type="number" 
                                        value={initialPayment} 
                                        onChange={e => setInitialPayment(e.target.value)}
                                        placeholder="0.00"
                                        className="pl-7 bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-500"
                                    />
                                </div>
                            </div>
                            
                            <div className="p-3 bg-slate-800 rounded-lg space-y-1">
                                <div className="flex justify-between text-xs text-slate-400">
                                    <span>Saldo Restante</span>
                                    <span>{((remaining / total) * 100).toFixed(0)}%</span>
                                </div>
                                <div className="flex justify-between text-xl font-bold text-white">
                                    <span>Pendiente</span>
                                    <span className={remaining > 0 ? "text-red-400" : "text-green-400"}>
                                        {formatCurrency(remaining)}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button 
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-11"
                                onClick={handleSubmit}
                                disabled={loading || items.length === 0}
                            >
                                {loading && <div className="mr-2 h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                {loading ? "Procesando..." : "Confirmar Apartado"}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    )
}
