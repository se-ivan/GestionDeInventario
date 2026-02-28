"use client"

import { useMemo, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FinancialReports } from "@/components/admin/financial-reports"
import { SellerPerformance } from "@/components/admin/seller-performance"
import { UserManagement } from "@/components/admin/user-management"
import type { FinancialReportFilters, FinancialReportResult, SellerPerformanceResult } from "@/actions/admin"
import { UserRole } from "@prisma/client"
import { Button } from "@/components/ui/button"

interface User {
  id: number
  nombre: string
  email: string
  rol: UserRole
  permissions: string[]
  activo: boolean
}

interface AdminSectionsTabsProps {
  initialFinancialData: FinancialReportResult
  initialFilters: FinancialReportFilters
  sellerPerformanceByRange: {
    "7d": SellerPerformanceResult
    "30d": SellerPerformanceResult
    "90d": SellerPerformanceResult
  }
  users: User[]
}

export function AdminSectionsTabs({
  initialFinancialData,
  initialFilters,
  sellerPerformanceByRange,
  users,
}: AdminSectionsTabsProps) {
  const [sellerRange, setSellerRange] = useState<"7d" | "30d" | "90d">("30d")

  const selectedSellerData = useMemo(() => sellerPerformanceByRange[sellerRange], [sellerPerformanceByRange, sellerRange])

  return (
    <Tabs defaultValue="finanzas" className="space-y-6">
      <TabsList className="w-full justify-start rounded-none border-b border-slate-200/80 bg-transparent p-0 h-auto">
        <TabsTrigger value="finanzas" className="rounded-none px-6 py-3 text-sm font-medium text-slate-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none transition-colors hover:text-slate-900">
          Reportes financieros
        </TabsTrigger>
        <TabsTrigger value="vendedores" className="rounded-none px-6 py-3 text-sm font-medium text-slate-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none transition-colors hover:text-slate-900">
          Rendimiento vendedores
        </TabsTrigger>
        <TabsTrigger value="usuarios" className="rounded-none px-6 py-3 text-sm font-medium text-slate-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none transition-colors hover:text-slate-900">
          Gestión de usuarios
        </TabsTrigger>
      </TabsList>

      <TabsContent value="finanzas" className="space-y-6 mt-6">
        <div className="flex flex-col gap-1">
          <h3 className="text-2xl font-semibold tracking-tight text-slate-900">Reportes financieros</h3>
          <p className="text-sm text-slate-500">Análisis general de ventas, gastos y operaciones.</p>
        </div>
        <FinancialReports initialData={initialFinancialData} initialFilters={initialFilters} />
      </TabsContent>

      <TabsContent value="vendedores" className="space-y-6 mt-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1">
            <h3 className="text-2xl font-semibold tracking-tight text-slate-900">Rendimiento de vendedores</h3>
            <p className="text-sm text-slate-500">Clasificación por ventas, ingresos, gastos y utilidad neta.</p>
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-slate-100/80 p-1 border border-slate-200/60">
            <Button
              size="sm"
              variant={sellerRange === "7d" ? "default" : "ghost"}
              onClick={() => setSellerRange("7d")}
              className={sellerRange === "7d" ? "bg-white text-slate-800 shadow-sm hover:bg-white" : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900"}
            >
              7 días
            </Button>
            <Button
              size="sm"
              variant={sellerRange === "30d" ? "default" : "ghost"}
              onClick={() => setSellerRange("30d")}
              className={sellerRange === "30d" ? "bg-white text-slate-800 shadow-sm hover:bg-white" : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900"}
            >
              30 días
            </Button>
            <Button
              size="sm"
              variant={sellerRange === "90d" ? "default" : "ghost"}
              onClick={() => setSellerRange("90d")}
              className={sellerRange === "90d" ? "bg-white text-slate-800 shadow-sm hover:bg-white" : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900"}
            >
              90 días
            </Button>
          </div>
        </div>
        <SellerPerformance data={selectedSellerData} />
      </TabsContent>

      <TabsContent value="usuarios" className="space-y-6 mt-6">
        <div>
          <h3 className="text-xl font-semibold tracking-tight">Gestión de usuarios</h3>
          <p className="text-sm text-muted-foreground">Administración de roles, permisos y acceso del sistema.</p>
        </div>
        <div className="grid gap-4 grid-cols-1">
          <UserManagement initialUsers={users} />
        </div>
      </TabsContent>
    </Tabs>
  )
}
