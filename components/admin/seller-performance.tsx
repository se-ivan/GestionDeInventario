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
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card className="border-none shadow-md bg-white/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Ingresos por vendedores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{formatCurrency(data.summary.totalIngresos)}</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Gastos asignados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{formatCurrency(data.summary.totalGastos)}</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Utilidad neta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{formatCurrency(data.summary.utilidadNeta)}</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Top en # ventas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-base font-semibold text-slate-800 truncate">{data.summary.vendedorTopVentas}</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Top en ingresos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-base font-semibold text-slate-800 truncate">{data.summary.vendedorTopIngresos}</div>
          </CardContent>
        </Card>
      </div>

      {!hasData ? (
        <Card className="border-none shadow-md bg-white/50 backdrop-blur-sm">
          <CardContent className="py-12 text-center text-sm text-slate-500">
            No hay datos de vendedores para el periodo seleccionado.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-none shadow-md bg-white/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-slate-700">Ventas realizadas por vendedor</CardTitle>
              </CardHeader>
              <CardContent className="h-[320px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.charts.ventasPorVendedor} margin={{ top: 10, right: 20, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="vendedor" tickLine={false} axisLine={false} stroke="#64748b" fontSize={12} />
                    <YAxis tickLine={false} axisLine={false} stroke="#64748b" fontSize={12} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "white", borderRadius: "8px", border: "1px solid #e2e8f0" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="ventas"
                      name="Ventas"
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
                <CardTitle className="text-base font-semibold text-slate-700">Ingresos vs gastos por vendedor</CardTitle>
              </CardHeader>
              <CardContent className="h-[320px] w-full min-w-0">
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
                      contentStyle={{ backgroundColor: "white", borderRadius: "8px", border: "1px solid #e2e8f0" }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Legend iconType="circle" />
                    <Bar dataKey="ingresos" name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="gastos" name="Gastos" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-none shadow-md bg-white/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-slate-700">Utilidad neta por vendedor</CardTitle>
              </CardHeader>
              <CardContent className="h-[320px] w-full min-w-0">
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
                      contentStyle={{ backgroundColor: "white", borderRadius: "8px", border: "1px solid #e2e8f0" }}
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

            <Card className="border-none shadow-md bg-white/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-slate-700">Ranking de vendedores</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.sellers.map((seller, index) => (
                  <div key={seller.userId} className="flex items-center justify-between rounded-md bg-white/70 px-3 py-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="border-slate-200 bg-white text-slate-600">
                          #{index + 1}
                        </Badge>
                        <p className="truncate font-medium text-slate-800">{seller.vendedor}</p>
                      </div>
                      <p className="text-xs text-slate-500">Ventas: {seller.ventasRealizadas} · Unidades: {seller.unidadesVendidas}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-800">{formatCurrency(seller.ingresosGenerados)}</p>
                      <p className="text-xs text-slate-500">Gastos: {formatCurrency(seller.gastosGenerados)}</p>
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
