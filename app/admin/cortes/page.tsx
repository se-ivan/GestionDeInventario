"use client"

import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { FileDown, Calendar, Search, Loader2 } from "lucide-react"
import { Sucursal } from "@/lib/types"

interface CorteHistory {
  id: number;
  sucursal: { nombre: string };
  user: { nombre: string; email: string };
  fechaApertura: string;
  fechaCierre: string | null;
  montoInicial: string; // Decimal comes as string often
  ventasSistema: string;
  gastosSistema: string;
  montoFinal: string | null;
  diferencia: string | null;
}

export default function CortesHistoryPage() {
  const [data, setData] = useState<CorteHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState<string>(new Date().toISOString().split('T')[0])
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [selectedSucursal, setSelectedSucursal] = useState<string>("")
  
  const [pagination, setPagination] = useState({ page: 1, limit: 20, totalPages: 1 })

  useEffect(() => {
    fetchSucursales()
  }, [])

  useEffect(() => {
    fetchHistory()
  }, [dateFilter, selectedSucursal, pagination.page])

  const fetchSucursales = async () => {
    try {
      const res = await fetch('/api/sucursales');
      if (res.ok) setSucursales(await res.json());
    } catch(e) { console.error(e) }
  }

  const fetchHistory = async () => {
    setLoading(true)
    try {
        const params = new URLSearchParams({
            page: pagination.page.toString(),
            limit: pagination.limit.toString()
        })
        if (dateFilter) params.append('date', dateFilter)
        if (selectedSucursal) params.append('sucursalId', selectedSucursal)

        const res = await fetch(`/api/corte-caja/history?${params}`)
        if (res.ok) {
            const body = await res.json()
            setData(body.data)
            setPagination(prev => ({ ...prev, totalPages: body.meta.totalPages }))
        }
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleDownload = (id: number) => {
      window.open(`/api/corte-caja/export?id=${id}`, '_blank')
  }

  const fmtMoney = (val: string | number | null) => {
      if (val === null || val === undefined) return "$0.00"
      return `$${Number(val).toFixed(2)}`
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
       <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Historial de Cortes de Caja</h1>
            <p className="text-sm text-slate-500">Consulta y descarga los reportes de turnos anteriores.</p>
          </div>
          <div className="flex gap-2 items-center">
             <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-slate-400">Fecha</span>
                <Input 
                   type="date" 
                   value={dateFilter} 
                   onChange={e => setDateFilter(e.target.value)} 
                   className="w-40 h-9"
                />
             </div>
             <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-slate-400">Sucursal</span>
                <select
                    value={selectedSucursal}
                    onChange={e => setSelectedSucursal(e.target.value)}
                    className="h-9 w-40 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                    <option value="">Todas</option>
                    {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
             </div>
             <Button variant="outline" size="icon" onClick={() => fetchHistory()} className="mt-4">
                 <Search className="h-4 w-4" />
             </Button>
          </div>
       </div>

       <Card>
         <CardContent className="p-0">
           <Table>
             <TableHeader>
               <TableRow>
                 <TableHead>Fecha / Hora</TableHead>
                 <TableHead>Sucursal</TableHead>
                 <TableHead>Usuario</TableHead>
                 <TableHead className="text-right">Inicial</TableHead>
                 <TableHead className="text-right text-green-600">Ventas (+)</TableHead>
                 <TableHead className="text-right text-red-600">Gastos (-)</TableHead>
                 <TableHead className="text-right font-bold">Total Final</TableHead>
                 <TableHead className="text-right">Diferencia</TableHead>
                 <TableHead className="text-center">Reporte</TableHead>
               </TableRow>
             </TableHeader>
             <TableBody>
               {loading ? (
                   <TableRow>
                       <TableCell colSpan={9} className="h-24 text-center">
                           <Loader2 className="animate-spin h-6 w-6 mx-auto text-slate-400"/>
                       </TableCell>
                   </TableRow>
               ) : data.length === 0 ? (
                   <TableRow>
                       <TableCell colSpan={9} className="h-24 text-center text-slate-500">
                           No se encontraron cortes en la fecha seleccionada.
                       </TableCell>
                   </TableRow>
               ) : (
                   data.map((corte) => (
                       <TableRow key={corte.id}>
                           <TableCell className="text-xs">
                               <div className="font-semibold text-slate-700">
                                   {new Date(corte.fechaApertura).toLocaleDateString()}
                               </div>
                               <div className="text-slate-400">
                                   {new Date(corte.fechaApertura).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} 
                                   {' - '} 
                                   {corte.fechaCierre ? new Date(corte.fechaCierre).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'En curso'}
                               </div>
                           </TableCell>
                           <TableCell>{corte.sucursal.nombre}</TableCell>
                           <TableCell>
                               <div className="text-sm font-medium">{corte.user.nombre}</div>
                               <div className="text-xs text-slate-400 truncate max-w-[150px]">{corte.user.email}</div>
                           </TableCell>
                           <TableCell className="text-right font-mono">{fmtMoney(corte.montoInicial)}</TableCell>
                           <TableCell className="text-right font-mono text-green-600 font-medium">{fmtMoney(corte.ventasSistema)}</TableCell>
                           <TableCell className="text-right font-mono text-red-600">{fmtMoney(corte.gastosSistema)}</TableCell>
                           <TableCell className="text-right font-mono font-bold text-slate-800">
                               {fmtMoney(Number(corte.montoFinal))}
                               <span className="block text-[10px] text-slate-400 font-normal">
                                   Esp: {fmtMoney(Number(corte.montoInicial) + Number(corte.ventasSistema) - Number(corte.gastosSistema))}
                               </span>
                           </TableCell>
                           <TableCell className={`text-right font-mono font-bold ${Number(corte.diferencia) === 0 ? 'text-slate-300' : Number(corte.diferencia) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                               {Number(corte.diferencia) > 0 ? '+' : ''}{fmtMoney(corte.diferencia)}
                           </TableCell>
                           <TableCell className="text-center">
                               {corte.fechaCierre && (
                                   <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => handleDownload(corte.id)}
                                      className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                   >
                                       <FileDown className="h-4 w-4 mr-2" />
                                       Excel
                                   </Button>
                               )}
                           </TableCell>
                       </TableRow>
                   ))
               )}
             </TableBody>
           </Table>
         </CardContent>
       </Card>
    </div>
  )
}
