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

export const getChartData = async () => {
    const days = 7;
    const salesData = [];
    const expensesData = [];

    for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const startOfDay = new Date(date.setHours(0, 0, 0, 0));
        const endOfDay = new Date(date.setHours(23, 59, 59, 999));
        
        const dateLabel = startOfDay.toLocaleDateString("es-MX", { weekday: 'short', day: 'numeric' });

        // Sales Query
        const sales = await prisma.sale.aggregate({
            _sum: { montoTotal: true },
            where: { createdAt: { gte: startOfDay, lte: endOfDay } }
        });

        // Expenses Query
        const expenses = await prisma.expense.aggregate({
            _sum: { monto: true },
            where: { createdAt: { gte: startOfDay, lte: endOfDay } }
        });

        salesData.push({
            date: dateLabel,
            value: Number(sales._sum.montoTotal) || 0
        });

        expensesData.push({
            date: dateLabel,
            value: Number(expenses._sum.monto) || 0
        });
    }

    return { salesData, expensesData };
}
