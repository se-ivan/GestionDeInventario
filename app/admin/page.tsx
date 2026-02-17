import { auth } from "@/auth";
import { getUsers, getFinancialReportData, getSellerPerformanceData } from "@/actions/admin";
import type { FinancialReportFilters } from "@/actions/admin";
import { AdminSectionsTabs } from "@/components/admin/admin-sections-tabs";
import { redirect } from "next/navigation";

const formatDateForFilter = (value: Date) => value.toISOString().slice(0, 10)

const getStartDateByDays = (days: number) => {
    const date = new Date()
    date.setDate(date.getDate() - (days - 1))
    return formatDateForFilter(date)
}

export default async function AdminPage() {
    const session = await auth();

    if (session?.user?.role !== "ADMIN") {
        redirect("/");
    }

    const users = await getUsers();

    const now = new Date();
    const monthAgo = new Date(now);
    monthAgo.setDate(now.getDate() - 29);

    const initialFilters: FinancialReportFilters = {
        startDate: monthAgo.toISOString().slice(0, 10),
        endDate: now.toISOString().slice(0, 10),
        operationTypes: ["VENTAS", "GASTOS"],
        saleCategories: ["LIBROS", "DULCERIA", "CONSIGNACION"],
        expenseCategories: [],
        page: 1,
        pageSize: 15,
        sortField: "fecha",
        sortOrder: "desc",
    };

    const initialFinancialData = await getFinancialReportData(initialFilters);
    const today = formatDateForFilter(now)
    const [sellerPerformance7d, sellerPerformance30d, sellerPerformance90d] = await Promise.all([
        getSellerPerformanceData({
            startDate: getStartDateByDays(7),
            endDate: today,
        }),
        getSellerPerformanceData({
            startDate: getStartDateByDays(30),
            endDate: today,
        }),
        getSellerPerformanceData({
            startDate: getStartDateByDays(90),
            endDate: today,
        }),
    ])

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Panel de Administrador</h2>
            </div>

            <AdminSectionsTabs
                initialFinancialData={initialFinancialData}
                initialFilters={initialFilters}
                sellerPerformanceByRange={{
                    "7d": sellerPerformance7d,
                    "30d": sellerPerformance30d,
                    "90d": sellerPerformance90d,
                }}
                users={users}
            />
        </div>
    );
}
