"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { 
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table"
import { 
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger 
} from "@/components/ui/dialog"
import { 
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Search, Plus, Trash2, BookOpen, ArrowRightLeft, Edit, Loader2, AlertTriangle } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

export default function ConsignacionesPage() {
    const [items, setItems] = useState<any[]>([])
    const [sucursales, setSucursales] = useState<any[]>([])
    const [query, setQuery] = useState("")
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState(false)

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    
    // States for Modals
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isTransferOpen, setIsTransferOpen] = useState(false)
    const [isDeleteOpen, setIsDeleteOpen] = useState(false)
    const [itemToDelete, setItemToDelete] = useState<number | null>(null)

    const [isSearching, setIsSearching] = useState(false)
    const [editingItem, setEditingItem] = useState<any>(null) // NEW

    // Data for Transfer
    const [transferData, setTransferData] = useState({
        consignacionId: 0,
        nombreProducto: "",
        fromSucursalId: "",
        toSucursalId: "",
        quantity: "1",
        maxStock: 0
    })

    const [formData, setFormData] = useState({
        nombre: "",
        precioVenta: "",
        gananciaLibreria: "",
        proveedor: "",
        stockInicial: "1",
        sucursalId: "", // Empty valid
        
        // Datos extendidos
        isbn: "",
        autor: "",
        editorial: "",
        anioPublicacion: "",
        genero: "",
        coleccion: ""
    })
    
    // Fetch data
    const fetchItems = async (pageNum = 1, searchQuery = "") => {
        setLoading(true);
        try {
            const res = await fetch(`/api/consignaciones?q=${searchQuery}&page=${pageNum}&limit=20`)
            if(res.ok) {
                const { data, meta } = await res.json()
                setItems(data)
                setTotalPages(meta.totalPages)
                setTotalItems(meta.total)
            }
        } catch(e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const fetchSucursales = async () => {
        try {
            const res = await fetch('/api/sucursales')
            if (res.ok) {
                const data = await res.json()
                setSucursales(data)
                // Set default sucursal if available and not set
                if (data.length > 0 && !formData.sucursalId) {
                    setFormData(prev => ({...prev, sucursalId: data[0].id.toString()}))
                }
            }
        } catch(e) {
            console.error(e)
        }
    }

    const handleSearchISBN = async () => {
        if (!formData.isbn) return

        setIsSearching(true)
        
        try {
             // 1. Search Local Books First
            const localRes = await fetch(`/api/books?q=${encodeURIComponent(formData.isbn)}`)
            let foundLocal = false

            if (localRes.ok) {
                const localData = await localRes.json()
                 // Strict match
                const exactMatch = localData.find((b: any) => b.isbn === formData.isbn)
                
                if (exactMatch) {
                    setFormData(prev => ({
                        ...prev,
                        nombre: exactMatch.titulo, 
                        autor: exactMatch.autor || "",
                        editorial: exactMatch.editorial || "",
                        anioPublicacion: exactMatch.anioPublicacion ? String(exactMatch.anioPublicacion) : "",
                        genero: exactMatch.genero || "",
                        coleccion: exactMatch.coleccion || "",
                        precioVenta: exactMatch.precioVenta ? String(exactMatch.precioVenta) : prev.precioVenta
                    }))
                    foundLocal = true
                }
            }

            if (!foundLocal) {
                // 2. Google Books Fallback
                const apiKey = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY
                if (apiKey) {
                    const googleRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${formData.isbn}&key=${apiKey}`)
                    const data = await googleRes.json()

                    if (data.totalItems > 0) {
                        const info = data.items[0].volumeInfo
                        const year = info.publishedDate ? new Date(info.publishedDate).getFullYear() : ""

                        setFormData(prev => ({
                            ...prev,
                            nombre: info.title || prev.nombre,
                            autor: info.authors ? info.authors.join(', ') : prev.autor,
                            editorial: info.publisher || prev.editorial,
                            anioPublicacion: year.toString(),
                            genero: info.categories ? info.categories[0] : prev.genero,
                        }))
                    } else {
                        // Optional: alert("No encontrado en Google Books")
                    }
                }
            }
        } catch (e) {
            console.error(e)
        } finally {
            setIsSearching(false)
        }
    }

    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(1)
            fetchItems(1, query)
        }, 500)
        return () => clearTimeout(timer)
    }, [query])

    useEffect(() => {
        fetchItems(page, query)
    }, [page])

    useEffect(() => {
        fetchSucursales()
    }, [])

    const handleSubmit = async () => {
        // Validation ONLY for new records that require sucursal
        if (!editingItem && !formData.sucursalId) {
            alert("Por favor selecciona una sucursal")
            return
        }

        const url = editingItem ? `/api/consignaciones/${editingItem.id}` : '/api/consignaciones';
        const method = editingItem ? 'PUT' : 'POST';

        setActionLoading(true)
        try {
            const res = await fetch(url, {
                method,
                body: JSON.stringify(formData),
                headers: { 'Content-Type': 'application/json' }
            })
            if (res.ok) {
                setIsDialogOpen(false)
                setEditingItem(null) // Reset editing
                setFormData({
                    nombre: "",
                    precioVenta: "",
                    gananciaLibreria: "",
                    proveedor: "",
                    stockInicial: "1",
                    sucursalId: sucursales.length > 0 ? sucursales[0].id.toString() : "",
                    isbn: "",
                    autor: "",
                    editorial: "",
                    anioPublicacion: "",
                    genero: "",
                    coleccion: ""
                })
                fetchItems(page, query)
            } else {
                const errorData = await res.json();
                alert("Error al guardar: " + (errorData.message || "Error desconocido"));
            }
        } catch(e) {
            console.error(e)
            alert("Error de conexión al guardar")
        } finally {
            setActionLoading(false)
        }
    }

    const openEditModal = (item: any) => {
        setEditingItem(item);
        setFormData({
            nombre: item.nombre,
            precioVenta: item.precioVenta,
            gananciaLibreria: item.gananciaLibreria,
            proveedor: item.proveedor || "",
            stockInicial: "0", // Not used in edit
            sucursalId: "", // Not used in edit
            isbn: item.isbn || "",
            autor: item.autor || "",
            editorial: item.editorial || "",
            anioPublicacion: item.anioPublicacion ? String(item.anioPublicacion) : "",
            genero: item.genero || "",
            coleccion: item.coleccion || ""
        });
        setIsDialogOpen(true);
    }
    
    const openNewModal = () => {
        setEditingItem(null);
        setFormData({
            nombre: "",
            precioVenta: "",
            gananciaLibreria: "",
            proveedor: "",
            stockInicial: "1",
            sucursalId: sucursales.length > 0 ? sucursales[0].id.toString() : "",
            isbn: "",
            autor: "",
            editorial: "",
            anioPublicacion: "",
            genero: "",
            coleccion: ""
        });
        setIsDialogOpen(true);
    }

    const openTransferModal = (item: any) => {
        // Find first sucursal with stock
        const firstStock = item.inventario?.find((inv: any) => inv.stock > 0);
        
        setTransferData({
            consignacionId: item.id,
            nombreProducto: item.nombre,
            fromSucursalId: firstStock ? firstStock.sucursalId.toString() : "",
            toSucursalId: "",
            quantity: "1",
            maxStock: firstStock ? firstStock.stock : 0
        })
        setIsTransferOpen(true)
    }

    const handleTransfer = async () => {
         const qty = parseInt(transferData.quantity);
         if (isNaN(qty) || qty <= 0) {
             alert("Cantidad inválida");
             return;
         }
         if (qty > transferData.maxStock) {
             alert("La cantidad excede el stock disponible");
             return;
         }

         setActionLoading(true)
         try {
             const res = await fetch('/api/consignaciones/transfer', {
                 method: 'POST',
                 body: JSON.stringify(transferData),
                 headers: { 'Content-Type': 'application/json' }
             })
             
             if (res.ok) {
                 setIsTransferOpen(false)
                 fetchItems(page, query) // Refresh list
             } else {
                 const err = await res.json()
                 alert("Error: " + err.message)
             }
         } catch(e) {
             console.error(e)
             alert("Error de conexión")
         } finally {
             setActionLoading(false)
         }
    }

    const confirmDelete = (id: number) => {
        setItemToDelete(id)
        setIsDeleteOpen(true)
    }

    const handleDelete = async () => {
        if(!itemToDelete) return
        setActionLoading(true)
        try {
            await fetch(`/api/consignaciones/${itemToDelete}`, { method: 'DELETE' })
            fetchItems(page, query)
            setIsDeleteOpen(false)
            setItemToDelete(null)
        } catch(e) {
            console.error(e)
            alert("Error al eliminar")
        } finally {
            setActionLoading(false)
        }
    }

    return (
        <div className="p-8 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Venta de Consignación</h1>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2" onClick={openNewModal}>
                             <Plus className="h-4 w-4" /> Nuevo Producto
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{editingItem ? 'Editar Producto' : 'Agregar Producto en Consignación'}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="md:grid md:grid-cols-2 md:gap-4 space-y-4 md:space-y-0">
                                <div className="space-y-2 col-span-2">
                                    <Label>Nombre del Producto *</Label>
                                    <Input 
                                        value={formData.nombre}
                                        onChange={e => setFormData({...formData, nombre: e.target.value})}
                                        placeholder="Ej. Artesanía Local o Título del Libro..." 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Precio Venta (Público) *</Label>
                                    <Input 
                                        type="number"
                                        value={formData.precioVenta}
                                        onChange={e => {
                                            const precio = e.target.value
                                            setFormData({...formData, precioVenta: precio})
                                        }}
                                        placeholder="0.00" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-green-600 font-bold">Ganancia Librería *</Label>
                                    <Input 
                                        type="number"
                                        value={formData.gananciaLibreria}
                                        onChange={e => setFormData({...formData, gananciaLibreria: e.target.value})}
                                        placeholder="0.00" 
                                        className="border-green-200 bg-green-50"
                                    />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <Label>Proveedor / Consignatario</Label>
                                    <Input 
                                        value={formData.proveedor}
                                        onChange={e => setFormData({...formData, proveedor: e.target.value})}
                                        placeholder="Nombre de la persona..." 
                                    />
                                </div>

                                <div className="col-span-2 h-px bg-slate-200 my-2" />
                                <div className="col-span-2 text-sm font-semibold text-slate-500 flex items-center gap-2">
                                    <BookOpen className="h-4 w-4" /> Datos de Libro (Opcional)
                                </div>

                                <div className="space-y-2">
                                    <Label>ISBN</Label>
                                    <div className="flex gap-2">
                                        <Input 
                                            value={formData.isbn}
                                            onChange={e => setFormData({...formData, isbn: e.target.value})}
                                            placeholder="Escanea o escribe ISBN..." 
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault()
                                                    handleSearchISBN()
                                                }
                                            }}
                                        />
                                        <Button 
                                            type="button" 
                                            variant="outline" 
                                            size="icon"
                                            onClick={handleSearchISBN}
                                            disabled={isSearching || !formData.isbn}
                                        >
                                            {isSearching ? <Search className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">Presiona Enter o el icono para buscar datos.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label>Autor</Label>
                                    <Input 
                                        value={formData.autor}
                                        onChange={e => setFormData({...formData, autor: e.target.value})}
                                        placeholder="Autor..." 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Editorial</Label>
                                    <Input 
                                        value={formData.editorial}
                                        onChange={e => setFormData({...formData, editorial: e.target.value})}
                                        placeholder="Editorial..." 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Año de Publicación</Label>
                                    <Input 
                                        type="number"
                                        value={formData.anioPublicacion}
                                        onChange={e => setFormData({...formData, anioPublicacion: e.target.value})}
                                        placeholder="Ej. 2024" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Género</Label>
                                    <Input 
                                        value={formData.genero}
                                        onChange={e => setFormData({...formData, genero: e.target.value})}
                                        placeholder="Género..." 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Colección</Label>
                                    <Input 
                                        value={formData.coleccion}
                                        onChange={e => setFormData({...formData, coleccion: e.target.value})}
                                        placeholder="Colección..." 
                                    />
                                </div>

                                <div className="col-span-2 h-px bg-slate-200 my-2" />
                                
                                {!editingItem && (
                                    <>
                                        <div className="col-span-2 text-sm font-semibold text-slate-500">
                                            Inventario Inicial
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Sucursal de Ingreso *</Label>
                                            <Select 
                                                value={formData.sucursalId} 
                                                onValueChange={(val) => setFormData({...formData, sucursalId: val})}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seleccionar Sucursal" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {sucursales.map((suc: any) => (
                                                        <SelectItem key={suc.id} value={suc.id.toString()}>
                                                            {suc.nombre}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Stock Inicial *</Label>
                                            <Input 
                                                type="number"
                                                value={formData.stockInicial}
                                                onChange={e => setFormData({...formData, stockInicial: e.target.value})}
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleSubmit} disabled={actionLoading}>
                                {actionLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Guardando...</> : (editingItem ? 'Actualizar' : 'Guardar Consignación')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader className="pb-4">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Buscar consignación..." 
                            className="pl-9 w-[300px]" 
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <Table className="border-separate">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Proveedor</TableHead>
                                <TableHead className="text-right">Precio Venta</TableHead>
                                <TableHead className="text-right text-green-600">Ganancia</TableHead>
                                <TableHead className="text-center">Sucursales (Stock)</TableHead>
                                <TableHead className="w-[100px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-10">Cargando...</TableCell>
                                </TableRow>
                            ) : items.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                                        No hay productos registrados
                                    </TableCell>
                                </TableRow>
                            ) : (
                                items.map((item: any) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">
                                            <div>{item.nombre}</div>
                                            {item.autor && <div className="text-xs text-muted-foreground">Autor: {item.autor}</div>}
                                            {item.isbn && <div className="text-xs text-muted-foreground">ISBN: {item.isbn}</div>}
                                        </TableCell>
                                        <TableCell>{item.proveedor || "-"}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(Number(item.precioVenta))}</TableCell>
                                        <TableCell className="text-right font-semibold text-green-700">
                                            {formatCurrency(Number(item.gananciaLibreria))}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex flex-col gap-1 items-center">
                                                {item.inventario?.map((inv: any) => (
                                                    <div key={inv.sucursalId} className="text-xs bg-slate-100 px-2 py-0.5 rounded-full">
                                                        {inv.sucursal?.nombre || 'Sucursal ' + inv.sucursalId}: {inv.stock}
                                                    </div>
                                                ))}
                                                {(!item.inventario || item.inventario.length === 0) && <span className="text-muted-foreground">-</span>}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-1 justify-end">
                                                <Button size="icon" variant="ghost" onClick={() => openEditModal(item)}>
                                                    <Edit className="h-4 w-4 text-slate-500" />
                                                </Button>
                                                <Button size="icon" variant="ghost" title="Transferir Stock" onClick={() => openTransferModal(item)}>
                                                    <ArrowRightLeft className="h-4 w-4 text-blue-600" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => confirmDelete(item.id)}>
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
                <CardFooter className="flex items-center justify-between space-x-2 py-4">
                    <div className="flex-1 text-sm text-muted-foreground">
                        Total: {totalItems} items | Página {page} de {totalPages}
                    </div>
                    <div className="space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1 || loading}
                        >
                            Anterior
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages || loading}
                        >
                            Siguiente
                        </Button>
                    </div>
                </CardFooter>
            </Card>

            {/* Modal de Transferencia */}
            <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Transferir Stock de Consignación</DialogTitle>
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
                                    value={transferData.fromSucursalId} 
                                    onValueChange={(val) => {
                                        // Update max stock based on selection
                                        const item = items.find(i => i.id === transferData.consignacionId); // Warning: items dependency
                                        const inv = item?.inventario?.find((iv: any) => iv.sucursalId.toString() === val);
                                        
                                        setTransferData({
                                            ...transferData, 
                                            fromSucursalId: val,
                                            maxStock: inv ? inv.stock : 0
                                        })
                                    }}
                                 >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Origen" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {items.find(i => i.id === transferData.consignacionId)?.inventario?.map((inv: any) => (
                                            <SelectItem key={inv.sucursalId} value={inv.sucursalId.toString()} disabled={inv.stock <= 0}>
                                                {inv.sucursal?.nombre || inv.sucursalId} ({inv.stock})
                                            </SelectItem>
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
                        <Button variant="outline" onClick={() => setIsTransferOpen(false)} disabled={actionLoading}>Cancelar</Button>
                        <Button onClick={handleTransfer} disabled={actionLoading}>
                             {actionLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Transferir</> : 'Transferir'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                             <AlertTriangle className="h-5 w-5" /> Confirmar Eliminación
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p>¿Estás seguro de que deseas eliminar este producto de consignación?</p>
                        <p className="text-sm text-muted-foreground mt-2">Esta acción no se puede deshacer.</p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={actionLoading}>Cancelar</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={actionLoading}>
                            {actionLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Eliminando...</> : 'Eliminar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
