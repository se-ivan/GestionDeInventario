"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import {
  getFinancialReportData,
  type FinancialReportFilters,
  type FinancialReportResult,
  type FinancialReportRow,
  type FinancialOperationType,
  type FinancialSaleCategory,
  type FinancialSortField,
} from "@/actions/admin"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency } from "@/lib/utils"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { ArrowDown, ArrowUp, Download, Filter, TrendingUp } from "lucide-react"

interface FinancialReportsProps {
  initialData: FinancialReportResult
  initialFilters: FinancialReportFilters
}

type SortField = FinancialSortField
type SortOrder = NonNullable<FinancialReportFilters["sortOrder"]>

const SALE_CATEGORY_OPTIONS = [
  { value: "LIBROS", label: "Libros" },
  { value: "DULCERIA", label: "Dulcería" },
  { value: "CONSIGNACION", label: "Consignación" },
] as const

const OPERATION_OPTIONS = [
  { value: "VENTAS", label: "Ventas" },
  { value: "GASTOS", label: "Gastos" },
] as const

const PIE_COLORS = [
  "var(--primary)",
  "var(--secondary)",
  "var(--accent)",
  "var(--muted-foreground)",
]

const formatDateForInput = (value: Date) => {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, "0")
  const day = String(value.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const formatDateCell = (value: string) =>
  new Date(value).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })

const toCsv = (rows: FinancialReportRow[]) => {
  const headers = [
    "Fecha",
    "Producto",
    "Categoría",
    "Cantidad",
    "Precio Unitario",
    "Costo Unitario",
    "Total de Venta",
    "Margen",
    "Tipo de Operación",
  ]

  const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`

  const dataLines = rows.map((row) =>
    [
      formatDateCell(row.fecha),
      row.producto,
      row.categoria,
      row.cantidad,
      row.precioUnitario.toFixed(2),
      row.costoUnitario.toFixed(2),
      row.totalVenta.toFixed(2),
      row.margen.toFixed(2),
      row.tipoOperacion,
    ]
      .map(escape)
      .join(",")
  )

  return [headers.map(escape).join(","), ...dataLines].join("\n")
}

export function FinancialReports({ initialData, initialFilters }: FinancialReportsProps) {
  const now = new Date()
  const monthAgo = new Date(now)
  monthAgo.setDate(now.getDate() - 29)

  const [startDate, setStartDate] = useState(initialFilters.startDate || formatDateForInput(monthAgo))
  const [endDate, setEndDate] = useState(initialFilters.endDate || formatDateForInput(now))
  const [operationTypes, setOperationTypes] = useState<FinancialOperationType[]>(
    initialFilters.operationTypes?.length ? initialFilters.operationTypes : ["VENTAS", "GASTOS"]
  )
  const [saleCategories, setSaleCategories] = useState<FinancialSaleCategory[]>(
    initialFilters.saleCategories?.length ? initialFilters.saleCategories : ["LIBROS", "DULCERIA", "CONSIGNACION"]
  )
  const [expenseCategories, setExpenseCategories] = useState<string[]>(initialFilters.expenseCategories || [])
  const [sortField, setSortField] = useState<SortField>(initialFilters.sortField || "fecha")
  const [sortOrder, setSortOrder] = useState<SortOrder>(initialFilters.sortOrder || "desc")
  const [page, setPage] = useState(initialData.page)
  const [pageSize, setPageSize] = useState(initialData.pageSize)
  const [data, setData] = useState<FinancialReportResult>(initialData)
  const [isPending, startTransition] = useTransition()

  const totalPages = Math.max(1, Math.ceil(data.totalRows / data.pageSize))

  const baseFilters = useMemo<FinancialReportFilters>(
    () => ({
      startDate,
      endDate,
      operationTypes,
      saleCategories,
      expenseCategories,
    }),
    [startDate, endDate, operationTypes, saleCategories, expenseCategories]
  )

  const loadData = (nextPage: number, nextSortField: SortField, nextSortOrder: SortOrder, nextPageSize = pageSize) => {
    startTransition(async () => {
      const result = await getFinancialReportData({
        ...baseFilters,
        page: nextPage,
        pageSize: nextPageSize,
        sortField: nextSortField,
        sortOrder: nextSortOrder,
      })

      setData(result)
      setPage(nextPage)
      setPageSize(nextPageSize)
      setSortField(nextSortField)
      setSortOrder(nextSortOrder)
    })
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadData(1, sortField, sortOrder)
    }, 250)

    return () => clearTimeout(timeout)
  }, [baseFilters])

  const toggleValue = <T extends string>(current: T[], value: T, fallback: T[]) => {
    if (current.includes(value)) {
      const next = current.filter((item) => item !== value)
      return next.length === 0 ? fallback : next
    }
    return [...current, value]
  }

  const handleSort = (field: SortField) => {
    const nextOrder: SortOrder = sortField === field && sortOrder === "asc" ? "desc" : "asc"
    loadData(1, field, nextOrder)
  }

  const handleExportCsv = () => {
    startTransition(async () => {
      const exportData = await getFinancialReportData({
        ...baseFilters,
        sortField,
        sortOrder,
        page: 1,
        pageSize: 5000,
      })

      const csv = toCsv(exportData.rows)
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `reporte_financiero_${startDate}_${endDate}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    })
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortOrder === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
  }

  const marginKpi = Math.max(0, Math.min(100, data.charts.marginKpi))

  return (
    <div className="space-y-4">
      <Card className="border-none shadow-md bg-white/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-700">
            <Filter className="h-4 w-4" />
            Filtros financieros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">Fecha de inicio</label>
              <Input 
                type="date" 
                value={startDate} 
                onChange={(event) => setStartDate(event.target.value)} 
                className="bg-white/50 border-slate-200"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">Fecha de fin</label>
              <Input 
                type="date" 
                value={endDate} 
                onChange={(event) => setEndDate(event.target.value)} 
                className="bg-white/50 border-slate-200"
              />
            </div>
            <div className="space-y-2 lg:col-span-2">
              <label className="text-sm font-medium text-slate-600">Tipo de operación</label>
              <div className="flex flex-wrap gap-3 rounded-md bg-muted/40 p-3">
                {OPERATION_OPTIONS.map((option) => (
                  <label key={option.value} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={operationTypes.includes(option.value)}
                      onCheckedChange={() =>
                        setOperationTypes((prev) => toggleValue(prev, option.value, ["VENTAS", "GASTOS"]))
                      }
                      className="border-slate-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">Categorías de venta</label>
              <div className="flex flex-wrap gap-3 rounded-md bg-muted/40 p-3">
                {SALE_CATEGORY_OPTIONS.map((option) => (
                  <label key={option.value} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={saleCategories.includes(option.value)}
                      disabled={!operationTypes.includes("VENTAS")}
                      onCheckedChange={() =>
                        setSaleCategories((prev) =>
                          toggleValue(prev, option.value, ["LIBROS", "DULCERIA", "CONSIGNACION"])
                        )
                      }
                      className="border-slate-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">Categorías de gasto</label>
              <div className="flex flex-wrap gap-2 rounded-md bg-muted/40 p-3">
                {data.availableExpenseCategories.map((category) => {
                  const checked = expenseCategories.includes(category)
                  return (
                    <Button
                      key={category}
                      size="sm"
                      variant={checked ? "secondary" : "ghost"}
                      className={checked ? "bg-white text-primary shadow-sm" : "hover:bg-white/50"}
                      disabled={!operationTypes.includes("GASTOS")}
                      onClick={() => {
                        setExpenseCategories((prev) => {
                          if (prev.includes(category)) {
                            return prev.filter((item) => item !== category)
                          }
                          return [...prev, category]
                        })
                      }}
                    >
                      {category}
                    </Button>
                  )
                })}
                <Button size="sm" variant="ghost" onClick={() => setExpenseCategories([])} className="hover:bg-white/50">
                  Todas
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card className="border-none shadow-md bg-white/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total de ventas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{formatCurrency(data.summary.totalVentas)}</div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md bg-white/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total de gastos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{formatCurrency(data.summary.totalGastos)}</div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md bg-white/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Ganancia bruta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{formatCurrency(data.summary.gananciaBruta)}</div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md bg-white/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Margen promedio</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold text-slate-800">{data.summary.margenPromedio.toFixed(2)}%</div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md bg-white/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Producto más vendido</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="text-sm font-medium text-slate-800 truncate" title={data.summary.productoMasVendido}>
              {data.summary.productoMasVendido || "N/A"}
             </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md bg-white/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Categoría más rentable</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="text-sm font-medium text-slate-800 truncate">{data.summary.categoriaMasRentable || "N/A"}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-none shadow-md bg-white/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-700">Evolución de ventas</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.charts.lineSalesOverTime} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="date" 
                  stroke="#64748b" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(value) => `$${value}`} 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    borderRadius: '8px', 
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
                  }}
                  formatter={(value: number) => [formatCurrency(value), 'Ventas']} 
                />
                <Line 
                  type="monotone" 
                  dataKey="ventas" 
                  stroke="var(--primary)" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: "var(--primary)", strokeWidth: 0 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-700">Comparación por categoría</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.charts.barByCategory} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="label" 
                  stroke="#64748b" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(value) => `$${value}`} 
                />
                <Tooltip 
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    borderRadius: '8px', 
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
                  }}
                  formatter={(value: number) => [formatCurrency(value), 'Valor neto']} 
                />
                <Bar 
                  dataKey="value" 
                  name="Valor neto" 
                  fill="var(--primary)" 
                  radius={[4, 4, 0, 0]} 
                  maxBarSize={60}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-700">Distribución de ingresos</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.charts.pieIncomeDistribution}
                  dataKey="value"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                >
                  {data.charts.pieIncomeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    borderRadius: '8px', 
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
                  }}
                  formatter={(value: number) => [formatCurrency(value), 'Ingresos']} 
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-700">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              KPI de margen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-3xl font-bold text-slate-800">{data.charts.marginKpi.toFixed(2)}%</div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all"
                style={{ width: `${marginKpi}%` }}
              />
            </div>
            <Badge variant="outline" className="bg-white border-slate-200 text-slate-600">Utilidad sobre ventas considerando costo unitario</Badge>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-md bg-white/50 backdrop-blur-sm">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-base font-semibold text-slate-700">Detalle de operaciones</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={handleExportCsv} disabled={isPending} className="bg-white hover:bg-slate-50 border-slate-200">
              <Download className="mr-2 h-4 w-4" /> Exportar CSV
            </Button>
            <Input
              type="number"
              min={5}
              max={100}
              value={pageSize}
              onChange={(event) => {
                const value = Number(event.target.value) || 15
                loadData(1, sortField, sortOrder, Math.max(5, Math.min(100, value)))
              }}
              className="w-24 bg-white border-slate-200"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-slate-200 bg-white shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="border-slate-200 hover:bg-slate-50">
                  <TableHead>
                    <Button variant="ghost" size="sm" onClick={() => handleSort("fecha")} className="hover:bg-slate-200/50 hover:text-slate-900 font-semibold text-slate-600">
                      Fecha <SortIcon field="fecha" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" onClick={() => handleSort("producto")} className="hover:bg-slate-200/50 hover:text-slate-900 font-semibold text-slate-600">
                      Producto <SortIcon field="producto" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" onClick={() => handleSort("categoria")} className="hover:bg-slate-200/50 hover:text-slate-900 font-semibold text-slate-600">
                      Categoría <SortIcon field="categoria" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleSort("cantidad")} className="hover:bg-slate-200/50 hover:text-slate-900 font-semibold text-slate-600">
                      Cantidad <SortIcon field="cantidad" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleSort("precioUnitario")} className="hover:bg-slate-200/50 hover:text-slate-900 font-semibold text-slate-600">
                      Precio unitario <SortIcon field="precioUnitario" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleSort("costoUnitario")} className="hover:bg-slate-200/50 hover:text-slate-900 font-semibold text-slate-600">
                      Costo unitario <SortIcon field="costoUnitario" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleSort("totalVenta")} className="hover:bg-slate-200/50 hover:text-slate-900 font-semibold text-slate-600">
                      Total venta <SortIcon field="totalVenta" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleSort("margen")} className="hover:bg-slate-200/50 hover:text-slate-900 font-semibold text-slate-600">
                      Margen <SortIcon field="margen" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" onClick={() => handleSort("tipoOperacion")} className="hover:bg-slate-200/50 hover:text-slate-900 font-semibold text-slate-600">
                      Tipo operación <SortIcon field="tipoOperacion" />
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                      No hay registros para los filtros seleccionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.rows.map((row) => (
                    <TableRow key={row.id} className="border-slate-100 hover:bg-slate-50/50">
                      <TableCell className="font-medium text-slate-700">{formatDateCell(row.fecha)}</TableCell>
                      <TableCell className="max-w-[220px] truncate text-slate-600" title={row.producto}>{row.producto}</TableCell>
                      <TableCell className="text-slate-600">{row.categoria}</TableCell>
                      <TableCell className="text-right text-slate-600">{row.cantidad}</TableCell>
                      <TableCell className="text-right text-slate-600">{formatCurrency(row.precioUnitario)}</TableCell>
                      <TableCell className="text-right text-slate-600">{formatCurrency(row.costoUnitario)}</TableCell>
                      <TableCell className="text-right font-medium text-slate-700">{formatCurrency(row.totalVenta)}</TableCell>
                      <TableCell className="text-right font-medium text-slate-700">{formatCurrency(row.margen)}</TableCell>
                      <TableCell>
                        <Badge variant={row.tipoOperacion === "VENTA" ? "default" : "secondary"} className={row.tipoOperacion === "VENTA" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-slate-500 hover:bg-slate-600"}>
                          {row.tipoOperacion}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 text-sm md:flex-row md:items-center md:justify-between px-1">
            <div className="text-slate-500 font-medium">
              Mostrando {(page - 1) * data.pageSize + 1} - {Math.min(page * data.pageSize, data.totalRows)} de {data.totalRows}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1 || isPending} onClick={() => loadData(page - 1, sortField, sortOrder)} className="bg-white hover:bg-slate-50">
                Anterior
              </Button>
              <span className="text-slate-600 font-medium">
                Página {page} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || isPending}
                onClick={() => loadData(page + 1, sortField, sortOrder)}
                className="bg-white hover:bg-slate-50"
              >
                Siguiente
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
