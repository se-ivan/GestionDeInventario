"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
    DialogDescription, DialogFooter
} from "@/components/ui/dialog"
import { 
  Users, Plus, Loader2, ScanBarcode, 
  Trash2, Edit
} from "lucide-react"
import { getClientes, createCliente, updateCliente, deleteCliente, registrarVisita } from "@/actions/clientes"
import { PrintAllBarcodes } from "@/components/clientes/print-barcodes"

export default function ClientsPage() {
    const [clients, setClients] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isOpen, setIsOpen] = useState(false)
    const [isEdit, setIsEdit] = useState(false)
    const [currentId, setCurrentId] = useState<number | null>(null)
    const [scanCode, setScanCode] = useState("")
    const [visitFeedback, setVisitFeedback] = useState("")
    
    // Form state
    const [formData, setFormData] = useState({
        nombre: "",
        email: "",
        telefono: "",
        matricula: "",
        semestre: "",
        grupo: "",
        turno: "",
        tipo: "GENERAL"
    })

    const fetchClients = async () => {
        setLoading(true)
        const res = await getClientes()
        if (res.success) {
            setClients(res.data || [])
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchClients()
    }, [])

    const handleSave = async () => {
        if (!formData.nombre) {
            alert("Nombre es requerido");
            return;
        }

        let res;
        const payload = {
            ...formData,
            email: formData.email || undefined, // send undefined if empty to match optional schema
        }
        
        if (isEdit && currentId) {
             res = await updateCliente(currentId, payload)
        } else {
             res = await createCliente(payload)
        }

        if (res.error) {
            alert(res.error)
        } else {
            setIsOpen(false)
            fetchClients()
            resetForm()
        }
    }

    const handleDelete = async (id: number) => {
        if (confirm("¿Estás seguro de eliminar este cliente?")) {
            await deleteCliente(id)
            fetchClients()
        }
    }

    const handleScan = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!scanCode) return;
        const res = await registrarVisita(scanCode)
        if (res.success) {
            setVisitFeedback(`✅ ${res.success}`)
            setScanCode("")
            fetchClients() // update visit counts
        } else {
            setVisitFeedback(`❌ ${res.error}`)
        }
        setTimeout(() => setVisitFeedback(""), 3000)
    }

    const resetForm = () => {
        setFormData({
            nombre: "",
            email: "",
            telefono: "",
            matricula: "",
            semestre: "",
            grupo: "",
            turno: "",
            tipo: "GENERAL"
        })
        setIsEdit(false)
        setCurrentId(null)
    }

    const openEdit = (client: any) => {
        setFormData({
            nombre: client.nombre,
            email: client.email || "",
            telefono: client.telefono || "",
            matricula: client.matricula || "",
            semestre: client.semestre || "",
            grupo: client.grupo || "",
            turno: client.turno || "",
            tipo: client.tipo || "GENERAL"
        })
        setCurrentId(client.id)
        setIsEdit(true)
        setIsOpen(true)
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                   <h1 className="text-3xl font-bold tracking-tight">Gestión de Clientes</h1>
                   <p className="text-muted-foreground">Registra clientes y controla sus visitas.</p>
                </div>
                <div className="flex gap-2">
                     <PrintAllBarcodes clients={clients} />
                     <Button onClick={() => { resetForm(); setIsOpen(true); }}>
                        <Plus className="mr-2 h-4 w-4" /> Nuevo Cliente
                     </Button>
                </div>
            </div>

            {/* Visit Scanner */}
            <Card className="bg-slate-50 border-slate-200 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <ScanBarcode className="h-5 w-5" /> Registro Rápido de Visitas
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleScan} className="flex gap-4 items-center">
                        <div className="flex-1">
                             <Input 
                                placeholder="Escanear código de barras aquí... (Presiona Enter)" 
                                value={scanCode}
                                onChange={(e) => setScanCode(e.target.value)}
                                autoFocus
                                className="bg-white"
                             />
                        </div>
                        <Button type="submit">Registrar</Button>
                    </form>
                    {visitFeedback && <p className="mt-2 font-medium animate-pulse text-blue-600">{visitFeedback}</p>}
                </CardContent>
            </Card>

            {/* Client Grid */}
             {loading ? (
                <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {clients.map(client => (
                        <Card key={client.id} className="relative group overflow-hidden hover:shadow-md transition-shadow">
                            <CardContent className="p-4 pt-6">
                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openEdit(client)}>
                                        <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500" onClick={() => handleDelete(client.id)}>
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                                
                                <div className="text-center mb-4">
                                     <div className="mx-auto w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-2">
                                        <Users className="h-6 w-6" />
                                     </div>
                                     <h3 className="font-bold truncate" title={client.nombre}>{client.nombre}</h3>
                                     <p className="text-xs text-muted-foreground">{client.tipo}</p>
                                </div>
                                
                                <div className="space-y-1 text-sm bg-slate-50 p-2 rounded border border-slate-100">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">ID:</span>
                                        <span className="font-mono text-xs">{client.codigoBarras}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Visitas:</span>
                                        <span className="font-bold">{client._count?.visitas || 0}</span>
                                    </div>
                                    {client.matricula && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Matrícula:</span>
                                            <span>{client.matricula}</span>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {clients.length === 0 && (
                        <div className="col-span-full text-center py-12 text-muted-foreground">
                            No hay clientes registrados.
                        </div>
                    )}
                </div>
            )}

            {/* Modal Form */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{isEdit ? "Editar Cliente" : "Nuevo Cliente"}</DialogTitle>
                         <DialogDescription>
                            Ingresa los datos del cliente o estudiante.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
                        <div className="grid gap-2">
                            <Label htmlFor="nombre">Nombre Completo <span className="text-red-500">*</span></Label>
                            <Input id="nombre" value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                             <div className="grid gap-2">
                                <Label htmlFor="tipo">Tipo</Label>
                                <select 
                                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={formData.tipo} 
                                    onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                                >
                                    <option value="GENERAL">General</option>
                                    <option value="ESTUDIANTE">Estudiante</option>
                                    <option value="VIP">VIP</option>
                                </select>
                             </div>
                             <div className="grid gap-2">
                                <Label htmlFor="matricula">Matrícula (Op.)</Label>
                                <Input id="matricula" value={formData.matricula} onChange={(e) => setFormData({...formData, matricula: e.target.value})} />
                             </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                             <div className="grid gap-2">
                                <Label htmlFor="semestre">Semestre</Label>
                                <Input id="semestre" value={formData.semestre} onChange={(e) => setFormData({...formData, semestre: e.target.value})} />
                             </div>
                             <div className="grid gap-2">
                                <Label htmlFor="grupo">Grupo</Label>
                                <Input id="grupo" value={formData.grupo} onChange={(e) => setFormData({...formData, grupo: e.target.value})} />
                             </div>
                             <div className="grid gap-2">
                                <Label htmlFor="turno">Turno</Label>
                                <Input id="turno" placeholder="M/V" value={formData.turno} onChange={(e) => setFormData({...formData, turno: e.target.value})} />
                             </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="email">Email (Opcional)</Label>
                            <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                        </div>
                         <div className="grid gap-2">
                            <Label htmlFor="telefono">Teléfono (Opcional)</Label>
                            <Input id="telefono" value={formData.telefono} onChange={(e) => setFormData({...formData, telefono: e.target.value})} />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSave}>Guardar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
