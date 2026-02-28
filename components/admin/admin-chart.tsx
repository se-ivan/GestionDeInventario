"use client"

import { useState } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getChartData } from "@/actions/admin"

interface ChartData {
  date: string
  value: number
}

interface AdminChartProps {
  title: string
  data: ChartData[]
  color?: string
  type: 'sales' | 'expenses'
}

export function AdminChart({ title, data: initialData, color = "#2563eb", type }: AdminChartProps) {
  const [data, setData] = useState<ChartData[]>(initialData)
  const [range, setRange] = useState("7d")
  const [category, setCategory] = useState("all")
  const [isLoading, setIsLoading] = useState(false)

  const handleFilterChange = async (newRange: string, newCategory: string) => {
    setIsLoading(true)
    try {
      const result = await getChartData(newRange, newCategory)
      if (type === 'sales') {
        setData(result.salesData)
      } else {
        setData(result.expensesData)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="col-span-1 border-slate-200 shadow-sm bg-white overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-slate-100 bg-slate-50/50">
        <div className="space-y-1">
          <CardTitle className="text-lg font-semibold text-slate-800">{title}</CardTitle>
          <CardDescription className="text-slate-500 font-medium">
             {range === '7d' ? 'Últimos 7 días' : range === '30d' ? 'Últimos 30 días' : 'Últimos 90 días'}
          </CardDescription>
        </div>
        <div className="flex gap-2">
           {type === 'expenses' && (
               <Select value={category} onValueChange={(val) => { setCategory(val); handleFilterChange(range, val); }}>
                    <SelectTrigger className="w-[120px] h-9 text-sm bg-white border-slate-200 text-slate-700 focus:ring-blue-500">
                        <SelectValue placeholder="Categoría" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="LIMPIEZA">Limpieza</SelectItem>
                        <SelectItem value="PAPELERIA">Papelería</SelectItem>
                        <SelectItem value="INSUMOS">Insumos</SelectItem>
                        <SelectItem value="OTROS">Otros</SelectItem>
                    </SelectContent>
               </Select>
           )}
           <Select value={range} onValueChange={(val) => { setRange(val); handleFilterChange(val, category); }}>
                <SelectTrigger className="w-[110px] h-9 text-sm bg-white border-slate-200 text-slate-700 focus:ring-blue-500">
                    <SelectValue placeholder="Rango" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="7d">7 días</SelectItem>
                    <SelectItem value="30d">30 días</SelectItem>
                    <SelectItem value="90d">3 meses</SelectItem>
                </SelectContent>
           </Select>
        </div>
      </CardHeader>
      <CardContent className="pl-2 pt-6 pb-6 pr-6">
        <div className={`h-[240px] w-full transition-opacity duration-200 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="date" 
                stroke="#64748b" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false}
                minTickGap={30}
              />
              <YAxis
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value: number) => [`$${value}`, type === 'sales' ? 'Ventas' : 'Gastos']}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={type === 'sales' ? '#2563eb' : '#f43f5e'} 
                strokeWidth={3} 
                dot={{ r: 4, fill: type === 'sales' ? '#2563eb' : '#f43f5e', strokeWidth: 0 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
