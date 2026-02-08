import { auth } from "@/auth";
import { getUsers, getAdminStats, getChartData } from "@/actions/admin";
import { UserManagement } from "@/components/admin/user-management";
import { AdminStats } from "@/components/admin/admin-stats";
import { AdminChart } from "@/components/admin/admin-chart";
import { redirect } from "next/navigation";

export default async function AdminPage() {
    const session = await auth();

    if (session?.user?.role !== "ADMIN") {
        redirect("/");
    }

    const users = await getUsers();
    const stats = await getAdminStats();
    const { salesData, expensesData } = await getChartData();

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Panel de Administrador</h2>
            </div>
            
            <AdminStats stats={stats} />
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <div className="col-span-4">
                     <AdminChart title="Ventas Generales" data={salesData} color="#16a34a" type="sales" />
                </div>
                <div className="col-span-3">
                     <AdminChart title="Control de Gastos" data={expensesData} color="#ef4444" type="expenses" />
                </div>
            </div>

            <div className="grid gap-4 grid-cols-1">
                <UserManagement initialUsers={users} />
            </div>
        </div>
    );
}
