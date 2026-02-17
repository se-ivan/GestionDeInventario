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
    <Tabs defaultValue="finanzas" className="space-y-4">
      <TabsList variant="line" className="w-full justify-start rounded-none border-b border-slate-200/80 bg-transparent p-0">
        <TabsTrigger value="finanzas" className="rounded-none px-4 py-2 text-slate-600 data-[state=active]:border-b-2  data-[state=active]:text-blue-600">
          Reportes financieros
        </TabsTrigger>
        <TabsTrigger value="vendedores" className="rounded-none px-4 py-2 text-slate-600 data-[state=active]:border-b-2  data-[state=active]:text-blue-600">
          Rendimiento vendedores
        </TabsTrigger>
        <TabsTrigger value="usuarios" className="rounded-none px-4 py-2 text-slate-600 data-[state=active]:border-b-2 data-[state=active]:text-blue-600">
          Gestión de usuarios
        </TabsTrigger>
      </TabsList>

      <TabsContent value="finanzas" className="space-y-3">
        <div>
          <h3 className="text-xl font-semibold tracking-tight">Reportes financieros</h3>
          <p className="text-sm text-muted-foreground">Análisis general de ventas, gastos y operaciones.</p>
        </div>
        <FinancialReports initialData={initialFinancialData} initialFilters={initialFilters} />
      </TabsContent>

      <TabsContent value="vendedores" className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
          <h3 className="text-xl font-semibold tracking-tight">Rendimiento de vendedores</h3>
          <p className="text-sm text-muted-foreground">Clasificación por ventas, ingresos, gastos y utilidad neta.</p>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-slate-100/80 p-1">
            <Button
              size="sm"
              variant={sellerRange === "7d" ? "default" : "ghost"}
              onClick={() => setSellerRange("7d")}
              className={sellerRange === "7d" ? "bg-white text-slate-800 shadow-sm hover:bg-white" : "text-slate-600 hover:bg-white/70"}
            >
              7 días
            </Button>
            <Button
              size="sm"
              variant={sellerRange === "30d" ? "default" : "ghost"}
              onClick={() => setSellerRange("30d")}
              className={sellerRange === "30d" ? "bg-white text-slate-800 shadow-sm hover:bg-white" : "text-slate-600 hover:bg-white/70"}
            >
              30 días
            </Button>
            <Button
              size="sm"
              variant={sellerRange === "90d" ? "default" : "ghost"}
              onClick={() => setSellerRange("90d")}
              className={sellerRange === "90d" ? "bg-white text-slate-800 shadow-sm hover:bg-white" : "text-slate-600 hover:bg-white/70"}
            >
              90 días
            </Button>
          </div>
        </div>
        <SellerPerformance data={selectedSellerData} />
      </TabsContent>

      <TabsContent value="usuarios" className="space-y-3">
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
