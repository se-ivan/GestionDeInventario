"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import type { SellerPerformanceResult } from "@/actions/admin"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

interface SellerPerformanceProps {
  data: SellerPerformanceResult
}

export function SellerPerformance({ data }: SellerPerformanceProps) {
  const hasData = data.sellers.length > 0

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
            <CardTitle className="text-sm font-medium text-slate-600">Ingresos por vendedores</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-slate-900">{formatCurrency(data.summary.totalIngresos)}</div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
            <CardTitle className="text-sm font-medium text-slate-600">Gastos asignados</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-slate-900">{formatCurrency(data.summary.totalGastos)}</div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
            <CardTitle className="text-sm font-medium text-slate-600">Utilidad neta</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-slate-900">{formatCurrency(data.summary.utilidadNeta)}</div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
            <CardTitle className="text-sm font-medium text-slate-600">Top en # ventas</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="text-xl font-semibold text-slate-800 truncate">{data.summary.vendedorTopVentas}</div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
            <CardTitle className="text-sm font-medium text-slate-600">Top en ingresos</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="text-xl font-semibold text-slate-800 truncate">{data.summary.vendedorTopIngresos}</div>
          </CardContent>
        </Card>
      </div>

      {!hasData ? (
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="py-16 text-center text-slate-500">
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="rounded-full bg-slate-100 p-3">
                <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <p className="text-base font-medium">No hay datos de vendedores para el periodo seleccionado.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
                <CardTitle className="text-lg font-semibold text-slate-800">Ventas realizadas por vendedor</CardTitle>
              </CardHeader>
              <CardContent className="h-[320px] w-full min-w-0 p-6">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.charts.ventasPorVendedor} margin={{ top: 10, right: 20, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="vendedor" tickLine={false} axisLine={false} stroke="#64748b" fontSize={12} />
                    <YAxis tickLine={false} axisLine={false} stroke="#64748b" fontSize={12} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "white", borderRadius: "8px", border: "1px solid #e2e8f0", boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="ventas"
                      name="Ventas"
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
                <CardTitle className="text-lg font-semibold text-slate-800">Ingresos vs gastos por vendedor</CardTitle>
              </CardHeader>
              <CardContent className="h-[320px] w-full min-w-0 p-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.charts.ingresosYGastosPorVendedor}
                    margin={{ top: 10, right: 20, left: 0, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="vendedor" tickLine={false} axisLine={false} stroke="#64748b" fontSize={12} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      stroke="#64748b"
                      fontSize={12}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip
                      cursor={{ fill: "#f1f5f9" }}
                      contentStyle={{ backgroundColor: "white", borderRadius: "8px", border: "1px solid #e2e8f0", boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="ingresos" name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    <Bar dataKey="gastos" name="Gastos" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
                <CardTitle className="text-lg font-semibold text-slate-800">Utilidad neta por vendedor</CardTitle>
              </CardHeader>
              <CardContent className="h-[320px] w-full min-w-0 p-6">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.charts.utilidadNetaPorVendedor} margin={{ top: 10, right: 20, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="vendedor" tickLine={false} axisLine={false} stroke="#64748b" fontSize={12} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      stroke="#64748b"
                      fontSize={12}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: "white", borderRadius: "8px", border: "1px solid #e2e8f0", boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Line
                      type="monotone"
                      dataKey="utilidadNeta"
                      name="Utilidad neta"
                      stroke="#0ea5e9"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "#0ea5e9", strokeWidth: 0 }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
                <CardTitle className="text-lg font-semibold text-slate-800">Ranking de vendedores</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {data.sellers.map((seller, index) => (
                  <div key={seller.userId} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 p-4 hover:bg-slate-50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <Badge variant="outline" className="border-slate-200 bg-white text-slate-700 font-semibold shadow-sm">
                          #{index + 1}
                        </Badge>
                        <p className="truncate font-semibold text-slate-800 text-base">{seller.vendedor}</p>
                      </div>
                      <p className="text-sm text-slate-500 ml-12">Ventas: <span className="font-medium text-slate-700">{seller.ventasRealizadas}</span> · Unidades: <span className="font-medium text-slate-700">{seller.unidadesVendidas}</span></p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-lg font-bold text-emerald-600">{formatCurrency(seller.ingresosGenerados)}</p>
                      <p className="text-sm text-slate-500">Gastos: <span className="font-medium text-rose-600">{formatCurrency(seller.gastosGenerados)}</span></p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
