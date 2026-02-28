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
    <div className="space-y-6">
      <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-800">
            <Filter className="h-5 w-5 text-blue-600" />
            Filtros financieros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Fecha de inicio</label>
              <Input 
                type="date" 
                value={startDate} 
                onChange={(event) => setStartDate(event.target.value)} 
                className="bg-white border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Fecha de fin</label>
              <Input 
                type="date" 
                value={endDate} 
                onChange={(event) => setEndDate(event.target.value)} 
                className="bg-white border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
              />
            </div>
            <div className="space-y-2 lg:col-span-2">
              <label className="text-sm font-medium text-slate-700">Tipo de operación</label>
              <div className="flex flex-wrap gap-4 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                {OPERATION_OPTIONS.map((option) => (
                  <label key={option.value} className="flex items-center gap-2 text-sm cursor-pointer text-slate-700 hover:text-slate-900 transition-colors">
                    <Checkbox
                      checked={operationTypes.includes(option.value)}
                      onCheckedChange={() =>
                        setOperationTypes((prev) => toggleValue(prev, option.value, ["VENTAS", "GASTOS"]))
                      }
                      className="border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Categorías de venta</label>
              <div className="flex flex-wrap gap-4 rounded-lg border border-slate-200 bg-slate-50/50 p-3 min-h-[52px]">
                {SALE_CATEGORY_OPTIONS.map((option) => (
                  <label key={option.value} className={`flex items-center gap-2 text-sm cursor-pointer transition-colors ${!operationTypes.includes("VENTAS") ? "opacity-50 cursor-not-allowed" : "text-slate-700 hover:text-slate-900"}`}>
                    <Checkbox
                      checked={saleCategories.includes(option.value)}
                      disabled={!operationTypes.includes("VENTAS")}
                      onCheckedChange={() =>
                        setSaleCategories((prev) =>
                          toggleValue(prev, option.value, ["LIBROS", "DULCERIA", "CONSIGNACION"])
                        )
                      }
                      className="border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Categorías de gasto</label>
              <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-slate-50/50 p-2 min-h-[52px]">
                {data.availableExpenseCategories.map((category) => {
                  const checked = expenseCategories.includes(category)
                  return (
                    <Button
                      key={category}
                      size="sm"
                      variant={checked ? "secondary" : "ghost"}
                      className={checked ? "bg-white text-blue-700 shadow-sm border border-slate-200" : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900"}
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
                <Button size="sm" variant="ghost" onClick={() => setExpenseCategories([])} className="text-slate-600 hover:bg-slate-200/50 hover:text-slate-900">
                  Todas
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardHeader className="pb-2 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-sm font-medium text-slate-600">Total de ventas</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-slate-900">{formatCurrency(data.summary.totalVentas)}</div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardHeader className="pb-2 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-sm font-medium text-slate-600">Total de gastos</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-slate-900">{formatCurrency(data.summary.totalGastos)}</div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardHeader className="pb-2 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-sm font-medium text-slate-600">Ganancia bruta</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-slate-900">{formatCurrency(data.summary.gananciaBruta)}</div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardHeader className="pb-2 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-sm font-medium text-slate-600">Margen promedio</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
             <div className="text-3xl font-bold text-slate-900">{data.summary.margenPromedio.toFixed(2)}%</div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardHeader className="pb-2 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-sm font-medium text-slate-600">Producto más vendido</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
             <div className="text-lg font-medium text-slate-900 truncate" title={data.summary.productoMasVendido}>
              {data.summary.productoMasVendido || "N/A"}
             </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardHeader className="pb-2 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-sm font-medium text-slate-600">Categoría más rentable</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
             <div className="text-lg font-medium text-slate-900 truncate">{data.summary.categoriaMasRentable || "N/A"}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
            <CardTitle className="text-lg font-semibold text-slate-800">Evolución de ventas</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px] w-full min-w-0 p-6">
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
                  stroke="#2563eb" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: "#2563eb", strokeWidth: 0 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
            <CardTitle className="text-lg font-semibold text-slate-800">Comparación por categoría</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px] w-full min-w-0 p-6">
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
                  fill="#2563eb" 
                  radius={[4, 4, 0, 0]} 
                  maxBarSize={60}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
            <CardTitle className="text-lg font-semibold text-slate-800">Distribución de ingresos</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px] w-full min-w-0 p-6">
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

        <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-800">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              KPI de margen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            <div className="text-3xl font-bold text-slate-800">{data.charts.marginKpi.toFixed(2)}%</div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all"
                style={{ width: `${marginKpi}%` }}
              />
            </div>
            <Badge variant="outline" className="bg-slate-50 border-slate-200 text-slate-600 font-medium">Utilidad sobre ventas considerando costo unitario</Badge>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-lg font-semibold text-slate-800">Detalle de operaciones</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={handleExportCsv} disabled={isPending} className="bg-white hover:bg-slate-50 border-slate-200 text-slate-700">
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
              className="w-24 bg-white border-slate-200 focus-visible:ring-blue-500"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/80 border-b border-slate-200">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-12 px-4">
                    <Button variant="ghost" size="sm" onClick={() => handleSort("fecha")} className="hover:bg-slate-200/50 hover:text-slate-900 font-semibold text-slate-700 -ml-3 h-8">
                      Fecha <SortIcon field="fecha" />
                    </Button>
                  </TableHead>
                  <TableHead className="h-12 px-4">
                    <Button variant="ghost" size="sm" onClick={() => handleSort("producto")} className="hover:bg-slate-200/50 hover:text-slate-900 font-semibold text-slate-700 -ml-3 h-8">
                      Producto <SortIcon field="producto" />
                    </Button>
                  </TableHead>
                  <TableHead className="h-12 px-4">
                    <Button variant="ghost" size="sm" onClick={() => handleSort("categoria")} className="hover:bg-slate-200/50 hover:text-slate-900 font-semibold text-slate-700 -ml-3 h-8">
                      Categoría <SortIcon field="categoria" />
                    </Button>
                  </TableHead>
                  <TableHead className="h-12 px-4 text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleSort("cantidad")} className="hover:bg-slate-200/50 hover:text-slate-900 font-semibold text-slate-700 -mr-3 h-8 justify-end w-full">
                      Cantidad <SortIcon field="cantidad" />
                    </Button>
                  </TableHead>
                  <TableHead className="h-12 px-4 text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleSort("precioUnitario")} className="hover:bg-slate-200/50 hover:text-slate-900 font-semibold text-slate-700 -mr-3 h-8 justify-end w-full">
                      Precio unitario <SortIcon field="precioUnitario" />
                    </Button>
                  </TableHead>
                  <TableHead className="h-12 px-4 text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleSort("costoUnitario")} className="hover:bg-slate-200/50 hover:text-slate-900 font-semibold text-slate-700 -mr-3 h-8 justify-end w-full">
                      Costo unitario <SortIcon field="costoUnitario" />
                    </Button>
                  </TableHead>
                  <TableHead className="h-12 px-4 text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleSort("totalVenta")} className="hover:bg-slate-200/50 hover:text-slate-900 font-semibold text-slate-700 -mr-3 h-8 justify-end w-full">
                      Total venta <SortIcon field="totalVenta" />
                    </Button>
                  </TableHead>
                  <TableHead className="h-12 px-4 text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleSort("margen")} className="hover:bg-slate-200/50 hover:text-slate-900 font-semibold text-slate-700 -mr-3 h-8 justify-end w-full">
                      Margen <SortIcon field="margen" />
                    </Button>
                  </TableHead>
                  <TableHead className="h-12 px-4">
                    <Button variant="ghost" size="sm" onClick={() => handleSort("tipoOperacion")} className="hover:bg-slate-200/50 hover:text-slate-900 font-semibold text-slate-700 -ml-3 h-8">
                      Tipo operación <SortIcon field="tipoOperacion" />
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-32 text-center text-slate-500">
                      No hay registros para los filtros seleccionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.rows.map((row) => (
                    <TableRow key={row.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                      <TableCell className="px-4 py-3 font-medium text-slate-700">{formatDateCell(row.fecha)}</TableCell>
                      <TableCell className="px-4 py-3 max-w-[220px] truncate text-slate-600" title={row.producto}>{row.producto}</TableCell>
                      <TableCell className="px-4 py-3 text-slate-600">
                        <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-200 font-normal">
                          {row.categoria}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right text-slate-600">{row.cantidad}</TableCell>
                      <TableCell className="px-4 py-3 text-right text-slate-600">{formatCurrency(row.precioUnitario)}</TableCell>
                      <TableCell className="px-4 py-3 text-right text-slate-600">{formatCurrency(row.costoUnitario)}</TableCell>
                      <TableCell className="px-4 py-3 text-right font-medium text-slate-700">{formatCurrency(row.totalVenta)}</TableCell>
                      <TableCell className="px-4 py-3 text-right font-medium text-slate-700">{formatCurrency(row.margen)}</TableCell>
                      <TableCell className="px-4 py-3">
                        <Badge variant={row.tipoOperacion === "VENTA" ? "default" : "secondary"} className={row.tipoOperacion === "VENTA" ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200" : "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200"}>
                          {row.tipoOperacion}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 text-sm md:flex-row md:items-center md:justify-between p-4 bg-slate-50/50 border-t border-slate-100">
            <div className="text-slate-500 font-medium">
              Mostrando {(page - 1) * data.pageSize + 1} - {Math.min(page * data.pageSize, data.totalRows)} de {data.totalRows}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1 || isPending} onClick={() => loadData(page - 1, sortField, sortOrder)} className="bg-white hover:bg-slate-50 border-slate-200 text-slate-600">
                Anterior
              </Button>
              <span className="text-slate-600 font-medium px-2">
                Página {page} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || isPending}
                onClick={() => loadData(page + 1, sortField, sortOrder)}
                className="bg-white hover:bg-slate-50 border-slate-200 text-slate-600"
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
