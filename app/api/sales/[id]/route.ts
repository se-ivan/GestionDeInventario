import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Definimos el tipo para los params como Promesa (Requisito de Next.js 15+)
interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET: Obtener detalle completo de una venta
export async function GET(request: Request, { params }: RouteParams) {
  try {
    // ✅ CORRECCIÓN: Esperamos a que params se resuelva
    const { id } = await params;
    const saleId = Number(id);

    if (isNaN(saleId)) {
        return NextResponse.json({ message: 'ID inválido' }, { status: 400 });
    }

    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        user: { select: { nombre: true } },
        sucursal: { select: { nombre: true } },
        details: {
          include: {
            book: { select: { titulo: true, isbn: true } }, 
            dulce: { select: { nombre: true, codigoBarras: true } }
          }
        }
      }
    });

    if (!sale) return NextResponse.json({ message: 'Venta no encontrada' }, { status: 404 });

    return NextResponse.json(sale);
  } catch (error) {
    console.error("Error GET sale:", error);
    return NextResponse.json({ message: 'Error al obtener venta' }, { status: 500 });
  }
}

// DELETE: Cancelar venta y RESTAURAR INVENTARIO (Libros y Dulces)
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    // ✅ CORRECCIÓN: Esperamos a que params se resuelva
    const { id } = await params;
    const saleId = Number(id);

    if (isNaN(saleId)) {
        return NextResponse.json({ message: 'ID inválido' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      
      // 1. Obtener la venta
      const sale = await tx.sale.findUnique({
        where: { id: saleId },
        include: { details: true }
      });

      if (!sale) throw new Error("Venta no encontrada");

      // 2. Restaurar Stock
      for (const detail of sale.details) {
        const cantidadARestaurar = detail.cantidad_vendida;

        if (detail.bookId) {
          // Restaurar Libro
          await tx.inventario.update({
            where: {
              bookId_sucursalId: {
                bookId: detail.bookId,
                sucursalId: sale.sucursalId
              }
            },
            data: { stock: { increment: cantidadARestaurar } }
          });
        } else if (detail.dulceId) {
          // Restaurar Dulce
          await tx.inventarioDulce.update({
            where: {
              dulceId_sucursalId: {
                dulceId: detail.dulceId,
                sucursalId: sale.sucursalId
              }
            },
            data: { stock: { increment: cantidadARestaurar } }
          });
        }
      }

      // 3. Eliminar la venta 
      await tx.sale.delete({
        where: { id: saleId }
      });
    });

    return NextResponse.json({ message: 'Venta cancelada e inventario restaurado' });

  } catch (error: any) {
    console.error("Error cancelando venta:", error);
    return NextResponse.json({ message: error.message || 'Error al eliminar' }, { status: 500 });
  }
}