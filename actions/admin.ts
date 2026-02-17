"use server"

import prisma from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { startOfDay, endOfDay, subDays, format, eachDayOfInterval } from "date-fns";
import { es } from "date-fns/locale";

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

export const changeUserPassword = async (userId: number, newPassword: string) => {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword }
    });
    
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

export type FinancialOperationType = "VENTAS" | "GASTOS";
export type FinancialSaleCategory = "LIBROS" | "DULCERIA" | "CONSIGNACION";
export type FinancialSortField =
    | "fecha"
    | "producto"
    | "categoria"
    | "cantidad"
    | "precioUnitario"
    | "costoUnitario"
    | "totalVenta"
    | "margen"
    | "tipoOperacion";

export interface FinancialReportFilters {
    startDate?: string;
    endDate?: string;
    operationTypes?: FinancialOperationType[];
    saleCategories?: FinancialSaleCategory[];
    expenseCategories?: string[];
    page?: number;
    pageSize?: number;
    sortField?: FinancialSortField;
    sortOrder?: "asc" | "desc";
}

export interface FinancialReportRow {
    id: string;
    fecha: string;
    producto: string;
    categoria: string;
    cantidad: number;
    precioUnitario: number;
    costoUnitario: number;
    totalVenta: number;
    margen: number;
    tipoOperacion: "VENTA" | "GASTO";
}

interface FinancialChartPoint {
    label: string;
    value: number;
}

interface FinancialLinePoint {
    date: string;
    ventas: number;
}

export interface FinancialReportResult {
    rows: FinancialReportRow[];
    totalRows: number;
    page: number;
    pageSize: number;
    summary: {
        totalVentas: number;
        totalGastos: number;
        gananciaBruta: number;
        margenPromedio: number;
        productoMasVendido: string;
        categoriaMasRentable: string;
    };
    charts: {
        lineSalesOverTime: FinancialLinePoint[];
        barByCategory: FinancialChartPoint[];
        pieIncomeDistribution: FinancialChartPoint[];
        marginKpi: number;
    };
    availableExpenseCategories: string[];
}

export interface SellerPerformanceItem {
    userId: number;
    vendedor: string;
    ventasRealizadas: number;
    unidadesVendidas: number;
    ingresosGenerados: number;
    gastosGenerados: number;
    utilidadNeta: number;
}

export interface SellerPerformanceResult {
    range: {
        startDate: string;
        endDate: string;
    };
    summary: {
        totalIngresos: number;
        totalGastos: number;
        utilidadNeta: number;
        vendedorTopVentas: string;
        vendedorTopIngresos: string;
    };
    sellers: SellerPerformanceItem[];
    charts: {
        ventasPorVendedor: Array<{ vendedor: string; ventas: number }>;
        ingresosYGastosPorVendedor: Array<{ vendedor: string; ingresos: number; gastos: number }>;
        utilidadNetaPorVendedor: Array<{ vendedor: string; utilidadNeta: number }>;
    };
}

const DEFAULT_OPERATION_TYPES: FinancialOperationType[] = ["VENTAS", "GASTOS"];
const DEFAULT_SALE_CATEGORIES: FinancialSaleCategory[] = ["LIBROS", "DULCERIA", "CONSIGNACION"];
const DEFAULT_EXPENSE_CATEGORIES = ["OPERATIVOS", "PROVEEDORES", "OTROS"];

const decimalToNumber = (value: unknown): number => {
    if (value == null) return 0;
    if (typeof value === "number") return value;
    if (typeof value === "string") return Number(value) || 0;
    if (typeof value === "object" && value && "toNumber" in value && typeof (value as any).toNumber === "function") {
        return (value as any).toNumber();
    }
    return Number(value) || 0;
};

const getDateRange = (startDate?: string, endDate?: string) => {
    const endBase = endDate ? new Date(`${endDate}T23:59:59.999`) : new Date();
    const startBase = startDate ? new Date(`${startDate}T00:00:00.000`) : subDays(endBase, 29);

    return {
        start: startOfDay(startBase),
        end: endOfDay(endBase),
    };
};

export const getFinancialReportData = async (
    filters: FinancialReportFilters = {}
): Promise<FinancialReportResult> => {
    const {
        startDate,
        endDate,
        operationTypes = DEFAULT_OPERATION_TYPES,
        saleCategories = DEFAULT_SALE_CATEGORIES,
        expenseCategories = [],
        page = 1,
        pageSize = 15,
        sortField = "fecha",
        sortOrder = "desc",
    } = filters;

    const safePage = Math.max(1, page);
    const safePageSize = Math.max(5, Math.min(100, pageSize));
    const sortDirection = sortOrder === "asc" ? 1 : -1;

    const { start, end } = getDateRange(startDate, endDate);

    const includeSales = operationTypes.includes("VENTAS");
    const includeExpenses = operationTypes.includes("GASTOS");

    const saleCategoryConditions: Array<Record<string, unknown>> = [];
    if (saleCategories.includes("LIBROS")) saleCategoryConditions.push({ bookId: { not: null } });
    if (saleCategories.includes("DULCERIA")) saleCategoryConditions.push({ dulceId: { not: null } });
    if (saleCategories.includes("CONSIGNACION")) saleCategoryConditions.push({ consignacionId: { not: null } });

    const [saleDetails, expenses, expenseCategoryRows] = await Promise.all([
        includeSales && saleCategoryConditions.length > 0
            ? prisma.saleDetail.findMany({
                    where: {
                        sale: {
                            fecha: { gte: start, lte: end },
                            estado: "COMPLETADA",
                        },
                        OR: saleCategoryConditions,
                    },
                    select: {
                        id: true,
                        cantidad_vendida: true,
                        precioUnitario: true,
                        subtotal: true,
                        sale: { select: { fecha: true } },
                        book: { select: { titulo: true, precioCompra: true } },
                        dulce: { select: { nombre: true, precioCompra: true } },
                        consignacion: { select: { nombre: true, precioVenta: true, gananciaLibreria: true } },
                    },
                })
            : Promise.resolve([]),
        includeExpenses
            ? prisma.expense.findMany({
                    where: {
                        fecha: { gte: start, lte: end },
                        ...(expenseCategories.length > 0 ? { categoria: { in: expenseCategories } } : {}),
                    },
                    select: {
                        id: true,
                        fecha: true,
                        monto: true,
                        categoria: true,
                        concepto: true,
                    },
                })
            : Promise.resolve([]),
        prisma.expense.findMany({
            where: {
                fecha: { gte: start, lte: end },
            },
            select: {
                categoria: true,
            },
            distinct: ["categoria"],
        }),
    ]);

    const rows: FinancialReportRow[] = [];

    for (const detail of saleDetails) {
        const quantity = detail.cantidad_vendida;
        const unitPrice = decimalToNumber(detail.precioUnitario);
        const saleTotal = decimalToNumber(detail.subtotal);

        let product = "Producto";
        let category = "LIBROS";
        let unitCost = 0;

        if (detail.book) {
            product = detail.book.titulo;
            category = "LIBROS";
            unitCost = decimalToNumber(detail.book.precioCompra);
        } else if (detail.dulce) {
            product = detail.dulce.nombre;
            category = "DULCERIA";
            unitCost = decimalToNumber(detail.dulce.precioCompra);
        } else if (detail.consignacion) {
            product = detail.consignacion.nombre;
            category = "CONSIGNACION";
            const consignacionVenta = decimalToNumber(detail.consignacion.precioVenta);
            const gananciaLibreria = decimalToNumber(detail.consignacion.gananciaLibreria);
            unitCost = Math.max(0, consignacionVenta - gananciaLibreria);
        }

        const margin = saleTotal - unitCost * quantity;

        rows.push({
            id: `sale-${detail.id}`,
            fecha: detail.sale.fecha.toISOString(),
            producto: product,
            categoria: category,
            cantidad: quantity,
            precioUnitario: unitPrice,
            costoUnitario: unitCost,
            totalVenta: saleTotal,
            margen: margin,
            tipoOperacion: "VENTA",
        });
    }

    for (const expense of expenses) {
        const amount = decimalToNumber(expense.monto);
        rows.push({
            id: `expense-${expense.id}`,
            fecha: expense.fecha.toISOString(),
            producto: expense.concepto,
            categoria: expense.categoria,
            cantidad: 1,
            precioUnitario: amount,
            costoUnitario: amount,
            totalVenta: amount,
            margen: 0,
            tipoOperacion: "GASTO",
        });
    }

    const sortedRows = [...rows].sort((a, b) => {
        const aValue = a[sortField];
        const bValue = b[sortField];

        if (sortField === "fecha") {
            return (new Date(String(aValue)).getTime() - new Date(String(bValue)).getTime()) * sortDirection;
        }

        if (typeof aValue === "number" && typeof bValue === "number") {
            return (aValue - bValue) * sortDirection;
        }

        return String(aValue).localeCompare(String(bValue), "es", { sensitivity: "base" }) * sortDirection;
    });

    const totalRows = sortedRows.length;
    const startIndex = (safePage - 1) * safePageSize;
    const paginatedRows = sortedRows.slice(startIndex, startIndex + safePageSize);

    const salesRows = rows.filter((row) => row.tipoOperacion === "VENTA");
    const expenseRows = rows.filter((row) => row.tipoOperacion === "GASTO");

    const totalVentas = salesRows.reduce((acc, row) => acc + row.totalVenta, 0);
    const totalGastos = expenseRows.reduce((acc, row) => acc + row.totalVenta, 0);
    const gananciaBruta = salesRows.reduce((acc, row) => acc + row.margen, 0);
    const margenPromedio = totalVentas > 0 ? (gananciaBruta / totalVentas) * 100 : 0;

    const quantityByProduct = new Map<string, number>();
    for (const row of salesRows) {
        const previous = quantityByProduct.get(row.producto) || 0;
        quantityByProduct.set(row.producto, previous + row.cantidad);
    }

    let productoMasVendido = "N/A";
    let maxProductQuantity = 0;
    quantityByProduct.forEach((quantity, product) => {
        if (quantity > maxProductQuantity) {
            maxProductQuantity = quantity;
            productoMasVendido = product;
        }
    });

    const marginByCategory = new Map<string, number>();
    for (const row of salesRows) {
        const previous = marginByCategory.get(row.categoria) || 0;
        marginByCategory.set(row.categoria, previous + row.margen);
    }

    let categoriaMasRentable = "N/A";
    let maxCategoryMargin = Number.NEGATIVE_INFINITY;
    marginByCategory.forEach((margin, category) => {
        if (margin > maxCategoryMargin) {
            maxCategoryMargin = margin;
            categoriaMasRentable = category;
        }
    });

    const lineMap = new Map<string, number>();
    const interval = eachDayOfInterval({ start, end });
    interval.forEach((date) => {
        lineMap.set(format(date, "yyyy-MM-dd"), 0);
    });
    salesRows.forEach((row) => {
        const dateKey = format(new Date(row.fecha), "yyyy-MM-dd");
        lineMap.set(dateKey, (lineMap.get(dateKey) || 0) + row.totalVenta);
    });

    const lineSalesOverTime = Array.from(lineMap.entries()).map(([dateKey, value]) => ({
        date: format(new Date(`${dateKey}T00:00:00`), "d MMM", { locale: es }),
        ventas: value,
    }));

    const barByCategoryMap = new Map<string, number>();
    rows.forEach((row) => {
        const signedValue = row.tipoOperacion === "GASTO" ? -row.totalVenta : row.totalVenta;
        barByCategoryMap.set(row.categoria, (barByCategoryMap.get(row.categoria) || 0) + signedValue);
    });
    const barByCategory = Array.from(barByCategoryMap.entries()).map(([label, value]) => ({ label, value }));

    const incomeByCategory = new Map<string, number>();
    salesRows.forEach((row) => {
        incomeByCategory.set(row.categoria, (incomeByCategory.get(row.categoria) || 0) + row.totalVenta);
    });
    const pieIncomeDistribution = Array.from(incomeByCategory.entries()).map(([label, value]) => ({ label, value }));

    const dynamicExpenseCategories = expenseCategoryRows
        .map((item) => item.categoria)
        .filter((value): value is string => Boolean(value));
    const availableExpenseCategories = Array.from(
        new Set([...DEFAULT_EXPENSE_CATEGORIES, ...dynamicExpenseCategories])
    );

    return {
        rows: paginatedRows,
        totalRows,
        page: safePage,
        pageSize: safePageSize,
        summary: {
            totalVentas,
            totalGastos,
            gananciaBruta,
            margenPromedio,
            productoMasVendido,
            categoriaMasRentable,
        },
        charts: {
            lineSalesOverTime,
            barByCategory,
            pieIncomeDistribution,
            marginKpi: margenPromedio,
        },
        availableExpenseCategories,
    };
};

export const getSellerPerformanceData = async (
    filters: Pick<FinancialReportFilters, "startDate" | "endDate"> = {}
): Promise<SellerPerformanceResult> => {
    const { startDate, endDate } = filters;
    const { start, end } = getDateRange(startDate, endDate);

    const [sales, saleDetails, expenses] = await Promise.all([
        prisma.sale.findMany({
            where: {
                fecha: { gte: start, lte: end },
                estado: "COMPLETADA",
            },
            select: {
                id: true,
                userId: true,
                montoTotal: true,
                user: { select: { nombre: true } },
            },
        }),
        prisma.saleDetail.findMany({
            where: {
                sale: {
                    fecha: { gte: start, lte: end },
                    estado: "COMPLETADA",
                },
            },
            select: {
                sale: {
                    select: {
                        userId: true,
                    },
                },
                cantidad_vendida: true,
            },
        }),
        prisma.expense.findMany({
            where: {
                fecha: { gte: start, lte: end },
            },
            select: {
                userId: true,
                monto: true,
                user: { select: { nombre: true } },
            },
        }),
    ]);

    const sellersMap = new Map<number, SellerPerformanceItem>();

    for (const sale of sales) {
        const existing = sellersMap.get(sale.userId) ?? {
            userId: sale.userId,
            vendedor: sale.user.nombre,
            ventasRealizadas: 0,
            unidadesVendidas: 0,
            ingresosGenerados: 0,
            gastosGenerados: 0,
            utilidadNeta: 0,
        };

        existing.ventasRealizadas += 1;
        existing.ingresosGenerados += decimalToNumber(sale.montoTotal);
        sellersMap.set(sale.userId, existing);
    }

    for (const detail of saleDetails) {
        const seller = sellersMap.get(detail.sale.userId);
        if (!seller) continue;
        seller.unidadesVendidas += detail.cantidad_vendida;
    }

    for (const expense of expenses) {
        const existing = sellersMap.get(expense.userId) ?? {
            userId: expense.userId,
            vendedor: expense.user.nombre,
            ventasRealizadas: 0,
            unidadesVendidas: 0,
            ingresosGenerados: 0,
            gastosGenerados: 0,
            utilidadNeta: 0,
        };

        existing.gastosGenerados += decimalToNumber(expense.monto);
        sellersMap.set(expense.userId, existing);
    }

    const sellers = Array.from(sellersMap.values())
        .map((seller) => ({
            ...seller,
            utilidadNeta: seller.ingresosGenerados - seller.gastosGenerados,
        }))
        .sort((a, b) => b.ingresosGenerados - a.ingresosGenerados);

    const totalIngresos = sellers.reduce((acc, seller) => acc + seller.ingresosGenerados, 0);
    const totalGastos = sellers.reduce((acc, seller) => acc + seller.gastosGenerados, 0);
    const utilidadNeta = totalIngresos - totalGastos;

    const vendedorTopVentas =
        sellers.length > 0
            ? [...sellers].sort((a, b) => b.ventasRealizadas - a.ventasRealizadas)[0]?.vendedor ?? "N/A"
            : "N/A";

    const vendedorTopIngresos = sellers[0]?.vendedor ?? "N/A";

    return {
        range: {
            startDate: format(start, "yyyy-MM-dd"),
            endDate: format(end, "yyyy-MM-dd"),
        },
        summary: {
            totalIngresos,
            totalGastos,
            utilidadNeta,
            vendedorTopVentas,
            vendedorTopIngresos,
        },
        sellers,
        charts: {
            ventasPorVendedor: sellers.map((seller) => ({
                vendedor: seller.vendedor,
                ventas: seller.ventasRealizadas,
            })),
            ingresosYGastosPorVendedor: sellers.map((seller) => ({
                vendedor: seller.vendedor,
                ingresos: seller.ingresosGenerados,
                gastos: seller.gastosGenerados,
            })),
            utilidadNetaPorVendedor: sellers.map((seller) => ({
                vendedor: seller.vendedor,
                utilidadNeta: seller.utilidadNeta,
            })),
        },
    };
};
