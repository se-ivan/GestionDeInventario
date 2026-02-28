"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, CreditCard } from "lucide-react"

export function AdminStats({ stats }: { stats: { dailySales: any, dailyExpenses: any } }) {
    // stats values might be Decimal objects from Prisma, so handle serialization if needed or use them if serialized
    // Typically server components pass simple JSON. Prisma Decimal might need conversion to number/string.
    
    // safe conversion
    const formatMoney = (amount: any) => {
        const val = Number(amount) || 0;
        return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-slate-100 bg-slate-50/50">
                    <CardTitle className="text-sm font-medium text-slate-600">Ventas Hoy</CardTitle>
                    <div className="rounded-full bg-emerald-100 p-2">
                        <DollarSign className="h-4 w-4 text-emerald-600" />
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="text-3xl font-bold text-slate-900">{formatMoney(stats.dailySales)}</div>
                </CardContent>
            </Card>
             <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-slate-100 bg-slate-50/50">
                    <CardTitle className="text-sm font-medium text-slate-600">Gastos Hoy</CardTitle>
                    <div className="rounded-full bg-rose-100 p-2">
                        <CreditCard className="h-4 w-4 text-rose-600" />
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="text-3xl font-bold text-slate-900">{formatMoney(stats.dailyExpenses)}</div>
                </CardContent>
            </Card>
             {/* Agrega mas stats si quieres */}
        </div>
    )
}
