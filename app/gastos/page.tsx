"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table"
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from "@/components/ui/dialog"
import { 
  Loader2, Store, DollarSign, TrendingUp, ArrowUpRight, Plus, Pencil, Trash2, Calendar
} from "lucide-react"

interface Expense {
  id: number
  concepto: string
  monto: string
  categoria: string
  fecha: string
  sucursal?: { nombre: string }
  user?: { nombre: string }
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, count: 0 })
  
  // Date Filter
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0])

  // Edit/Create Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentExpense, setCurrentExpense] = useState<any>(null)
  const [isSubmiting, setIsSubmiting] = useState(false)

  // Confirmation/Alert Modals
  const [deleteDialog, setDeleteDialog] = useState<{isOpen: boolean, id: number | null}>({ isOpen: false, id: null });
  const [alertDialog, setAlertDialog] = useState<{isOpen: boolean, title: string, message: string}>({ isOpen: false, title: '', message: '' });

  const fetchExpenses = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/expenses?date=${dateFilter}`)
      if (res.ok) {
        const data = await res.json()
        setExpenses(data)
        
        // Calculate stats
        const total = data.reduce((acc: number, curr: any) => acc + Number(curr.monto), 0)
        setStats({ total, count: data.length })
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchExpenses()
  }, [dateFilter])

  const handleDeleteClick = (id: number) => {
    setDeleteDialog({ isOpen: true, id });
  }

  const confirmDelete = async () => {
    if (!deleteDialog.id) return;
    try {
        const res = await fetch(`/api/expenses/${deleteDialog.id}`, { method: 'DELETE' });
        if(res.ok) {
            fetchExpenses();
            setDeleteDialog({ isOpen: false, id: null });
        } else {
            setAlertDialog({ isOpen: true, title: "Error", message: "Error al eliminar el registro" });
        }
    } catch(e) { 
        setAlertDialog({ isOpen: true, title: "Error", message: "Error de conexión al eliminar" });
    }
  }

  const handleEdit = (expense: Expense) => {
    setCurrentExpense({
        id: expense.id,
        concepto: expense.concepto,
        monto: expense.monto,
        categoria: expense.categoria
    });
    setIsModalOpen(true);
  }

  const handleNewExpense = () => {
    setCurrentExpense({
        id: null,
        concepto: "",
        monto: "",
        categoria: "VARIOS"
    });
    setIsModalOpen(true);
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmiting(true);
    try {
        const isEditing = !!currentExpense.id;
        const url = isEditing ? `/api/expenses/${currentExpense.id}` : '/api/expenses';
        const method = isEditing ? 'PATCH' : 'POST';

        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                concepto: currentExpense.concepto,
                monto: currentExpense.monto,
                categoria: currentExpense.categoria,
                // userId and sucursalId are handled by backend defaults for now, or could be added here
            })
        });

        if(res.ok) {
            setIsModalOpen(false);
            fetchExpenses();
        } else {
            setAlertDialog({ isOpen: true, title: "Error", message: "No se pudieron guardar los cambios" });
        }
    } catch(e) {
        setAlertDialog({ isOpen: true, title: "Error", message: "Error de conexión al guardar" });
    } finally {
        setIsSubmiting(false);
    }
  }

  const formatCurrency = (val: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val)
  const formatDate = (date: string) => new Date(date).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit' })

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 font-sans space-y-8">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Gestión de Gastos</h1>
            <p className="text-slate-500">Registro histórico de egresos y control de caja.</p>
        </div>
        <div className="flex items-center gap-2">
            <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                    type="date" 
                    value={dateFilter} 
                    onChange={e => setDateFilter(e.target.value)}
                    className="pl-10 bg-white"
                />
            </div>
            <Button onClick={fetchExpenses} variant="outline" className="gap-2 bg-white hover:bg-slate-50">
                <TrendingUp className="w-4 h-4" /> Actualizar
            </Button>
            <Button onClick={handleNewExpense} className="gap-2 bg-primary text-white hover:bg-primary/90">
                <Plus className="w-4 h-4" /> Nuevo Gasto
            </Button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 border-none shadow-sm bg-white rounded-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-red-600">
                <ArrowUpRight className="w-24 h-24" />
            </div>
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Gastado ({dateFilter})</p>
                <h3 className="text-3xl font-bold text-slate-800 mt-2">{formatCurrency(stats.total)}</h3>
            </div>
        </Card>
        <Card className="p-6 border-none shadow-sm bg-white rounded-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-slate-600">
                <Store className="w-24 h-24" />
            </div>
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Registros</p>
                <h3 className="text-3xl font-bold text-slate-800 mt-2">{stats.count}</h3>
            </div>
        </Card>
      </div>

      {/* TABLE */}
      <Card className="shadow-sm border-none rounded-xl overflow-hidden bg-white">
        <div className="p-6 border-b border-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-lg text-slate-800">Detalle de Movimientos</h3>
        </div>
        <div className="overflow-x-auto">
            <Table>
            <TableHeader>
                <TableRow className="border-b border-slate-100 hover:bg-transparent">
                    <TableHead className="font-bold text-slate-400">Hora</TableHead>
                    <TableHead className="font-bold text-slate-400">Concepto</TableHead>
                    <TableHead className="font-bold text-slate-400">Categoría</TableHead>
                    <TableHead className="font-bold text-slate-400">Sucursal</TableHead>
                    <TableHead className="font-bold text-slate-400">Usuario</TableHead>
                    <TableHead className="text-right font-bold text-slate-400">Monto</TableHead>
                    <TableHead className="text-right"></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {loading ? (
                    <TableRow className="border-0"><TableCell colSpan={7} className="h-32 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2" /> Cargando...</TableCell></TableRow>
                ) : expenses.length === 0 ? (
                    <TableRow className="border-0"><TableCell colSpan={7} className="h-32 text-center text-slate-400">No se encontraron registros para esta fecha.</TableCell></TableRow>
                ) : (
                    expenses.map((expense) => (
                    <TableRow key={expense.id} className="border-0 hover:bg-slate-50/80 transition-colors">
                        <TableCell className="text-slate-500 font-mono text-xs">
                             {new Date(expense.fecha).toLocaleTimeString('es-MX', {hour: '2-digit', minute:'2-digit'})}
                        </TableCell>
                        <TableCell className="font-medium text-slate-700">{expense.concepto}</TableCell>
                        <TableCell>
                             <Badge variant="outline" className="text-slate-500 border-slate-200 uppercase text-[10px]">{expense.categoria}</Badge>
                        </TableCell>
                         <TableCell>
                            <div className="flex items-center gap-2 text-slate-600 text-sm">
                                <Store className="h-3.5 w-3.5 text-slate-300" /> {expense.sucursal?.nombre || 'General'}
                            </div>
                        </TableCell>
                        <TableCell>
                             <span className="text-xs text-slate-500">{expense.user?.nombre}</span>
                        </TableCell>
                        <TableCell className="text-right font-bold text-red-600">
                            {formatCurrency(Number(expense.monto))}
                        </TableCell>
                        <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(expense)} className="h-8 w-8 text-slate-400 hover:text-blue-600">
                                <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(expense.id)} className="h-8 w-8 text-slate-400 hover:text-red-600">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </TableCell>
                    </TableRow>
                    ))
                )}
            </TableBody>
            </Table>
        </div>
      </Card>

      {/* EDIT MODAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{currentExpense?.id ? "Editar Gasto" : "Registrar Nuevo Gasto"}</DialogTitle>
                <DialogDescription>
                    {currentExpense?.id ? "Modificar detalles del registro seleccionado." : "Ingresa la información del nuevo gasto a registrar."}
                </DialogDescription>
            </DialogHeader>
            {currentExpense && (
                <form onSubmit={handleSave} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Concepto</Label>
                        <Input 
                            value={currentExpense.concepto} 
                            onChange={e => setCurrentExpense({...currentExpense, concepto: e.target.value})}
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Monto</Label>
                            <Input 
                                type="number" 
                                step="0.01" 
                                value={currentExpense.monto} 
                                onChange={e => setCurrentExpense({...currentExpense, monto: e.target.value})}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Categoría</Label>
                            <select 
                                className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-slate-950"
                                value={currentExpense.categoria}
                                onChange={e => setCurrentExpense({...currentExpense, categoria: e.target.value})}
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
                        <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                        <Button type="submit" disabled={isSubmiting}>
                            {isSubmiting ? <Loader2 className="animate-spin mr-2" /> : null}
                            Guardar Cambios
                        </Button>
                    </DialogFooter>
                </form>
            )}
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION MODAL */}
      <Dialog open={deleteDialog.isOpen} onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Confirmar Eliminación</DialogTitle>
                <DialogDescription>
                    ¿Estás seguro de que deseas eliminar este registro de gasto? Esta acción no se puede deshacer.
                </DialogDescription>
            </DialogHeader>
            <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteDialog({ isOpen: false, id: null })}>Cancelar</Button>
                <Button variant="destructive" onClick={confirmDelete}>Eliminar</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ALERT MODAL */}
      <Dialog open={alertDialog.isOpen} onOpenChange={(open) => setAlertDialog(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{alertDialog.title}</DialogTitle>
                <DialogDescription>
                    {alertDialog.message}
                </DialogDescription>
            </DialogHeader>
            <DialogFooter>
                <Button onClick={() => setAlertDialog(prev => ({ ...prev, isOpen: false }))}>Entendido</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
