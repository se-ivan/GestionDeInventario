"use server"

import prisma from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";

export const getUsers = async () => {
    // Only allow admin? (Should invoke auth() here but for brevity assuming page protection)
    const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          nombre: true,
          email: true,
          rol: true,
          permisos: true,
          activo: true,
        }
    });

    // Map 'permisos' to 'permissions' for the frontend
    return users.map(user => ({
        ...user,
        permissions: user.permisos,
    }));
};

export const updateUser = async (userId: number, data: { rol?: UserRole, permissions?: string[], activo?: boolean }) => {
    // Construct update data, mapping permissions -> permisos
    const updateData: any = { ...data };
    if (data.permissions) {
        updateData.permisos = data.permissions;
        delete updateData.permissions;
    }

    await prisma.user.update({
        where: { id: userId },
        data: updateData
    });
    revalidatePath("/admin");
    return { success: true };
};

export const getAdminStats = async () => {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const sales = await prisma.sale.aggregate({
        _sum: { montoTotal: true },
        where: { createdAt: { gte: today } }
    });

    const expenses = await prisma.expense.aggregate({
        _sum: { monto: true },
        where: { createdAt: { gte: today } }
    });

    return {
        dailySales: Number(sales._sum.montoTotal) || 0,
        dailyExpenses: Number(expenses._sum.monto) || 0,
    }
}

import { startOfDay, endOfDay, subDays, format, eachDayOfInterval } from "date-fns";
import { es } from "date-fns/locale";

export const getChartData = async (range: string = '7d', category?: string) => {
    const daysMap: { [key: string]: number } = {
        '7d': 7,
        '30d': 30,
        '90d': 90
    };
    
    const days = daysMap[range] || 7;
    const endDate = new Date();
    const startDate = subDays(endDate, days - 1);
    
    const dateRange = {
        gte: startOfDay(startDate),
        lte: endOfDay(endDate)
    };

    // Fetch all records in one go
    const [sales, expenses] = await Promise.all([
        prisma.sale.findMany({
            where: { createdAt: dateRange },
            select: { createdAt: true, montoTotal: true }
        }),
        prisma.expense.findMany({
            where: { 
                createdAt: dateRange,
                ...(category && category !== 'all' ? { categoria: category } : {})
            },
            select: { createdAt: true, monto: true }
        })
    ]);

    // Group by day
    const salesMap = new Map<string, number>();
    const expensesMap = new Map<string, number>();

    // Initialize all days with 0
    const interval = eachDayOfInterval({ start: startDate, end: endDate });
    
    interval.forEach(date => {
        const key = format(date, "d MMM", { locale: es });
        salesMap.set(key, 0);
        expensesMap.set(key, 0);
    });

    sales.forEach(sale => {
        const key = format(sale.createdAt, "d MMM", { locale: es });
        const current = salesMap.get(key) || 0;
        salesMap.set(key, current + Number(sale.montoTotal));
    });

    expenses.forEach(expense => {
        const key = format(expense.createdAt, "d MMM", { locale: es });
        const current = expensesMap.get(key) || 0;
        expensesMap.set(key, current + Number(expense.monto));
    });

    const salesData = Array.from(salesMap.entries()).map(([date, value]) => ({ date, value }));
    const expensesData = Array.from(expensesMap.entries()).map(([date, value]) => ({ date, value }));

    return { salesData, expensesData };
}
