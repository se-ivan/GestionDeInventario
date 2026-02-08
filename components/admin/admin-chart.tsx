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
    <Card className="col-span-1 border-0 shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base font-bold">{title}</CardTitle>
          <CardDescription>
             {range === '7d' ? 'Últimos 7 días' : range === '30d' ? 'Últimos 30 días' : 'Últimos 90 días'}
          </CardDescription>
        </div>
        <div className="flex gap-2">
           {type === 'expenses' && (
               <Select value={category} onValueChange={(val) => { setCategory(val); handleFilterChange(range, val); }}>
                    <SelectTrigger className="w-[120px] h-8 text-xs bg-card">
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
                <SelectTrigger className="w-[110px] h-8 text-xs bg-card">
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
      <CardContent className="pl-2 pt-4">
        <div className={`h-[200px] w-full transition-opacity duration-200 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis 
                dataKey="date" 
                stroke="#9CA3AF" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false}
                minTickGap={30}
              />
              <YAxis
                stroke="#9CA3AF"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                formatter={(value: number) => [`$${value}`, type === 'sales' ? 'Ventas' : 'Gastos']}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={color} 
                strokeWidth={3} 
                dot={false}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
