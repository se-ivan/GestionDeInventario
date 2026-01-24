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
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Ventas Hoy</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatMoney(stats.dailySales)}</div>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Gastos Hoy</CardTitle>
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatMoney(stats.dailyExpenses)}</div>
                </CardContent>
            </Card>
             {/* Agrega mas stats si quieres */}
        </div>
    )
}
