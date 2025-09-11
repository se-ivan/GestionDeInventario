import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET: Obtiene toda la lista de inventario con datos del libro y la sucursal
export async function GET() {
  try {
    const inventario = await prisma.inventario.findMany({
      include: {
        book: true,
        sucursal: true,
      },
      orderBy: {
        book: {
          titulo: 'asc'
        }
      }
    });
    // Filtra las entradas donde el libro o la sucursal ya no existen
    const validInventario = inventario.filter(entry => entry.book && entry.sucursal);
    return NextResponse.json(validInventario);
  } catch (error) {
    console.error("Error al obtener el inventario:", error);
    return NextResponse.json({ message: 'Error al obtener el inventario' }, { status: 500 });
  }
}

// PUT: Actualiza el stock de una entrada de inventario específica
export async function PUT(request: Request) {
  try {
    const { bookId, sucursalId, stock } = await request.json();

    if (stock < 0) {
      return NextResponse.json({ message: 'El stock no puede ser negativo' }, { status: 400 });
    }

    const updatedEntry = await prisma.inventario.update({
      where: {
        bookId_sucursalId: {
          bookId: Number(bookId),
          sucursalId: Number(sucursalId),
        },
      },
      data: {
        stock: Number(stock),
      },
    });

    return NextResponse.json(updatedEntry);
  } catch (error) {
    console.error("Error al actualizar el stock:", error);
    return NextResponse.json({ message: 'Error al actualizar el stock' }, { status: 500 });
  }
}

// DELETE: Elimina una entrada de inventario
export async function DELETE(request: Request) {
  try {
    const { bookId, sucursalId } = await request.json();
    await prisma.inventario.delete({
      where: {
        bookId_sucursalId: {
          bookId: Number(bookId),
          sucursalId: Number(sucursalId),
        },
      },
    });
    return NextResponse.json({ message: 'Registro de inventario eliminado' }, { status: 200 });
  } catch (error) {
    console.error("Error al eliminar el registro:", error);
    return NextResponse.json({ message: 'Error al eliminar el registro' }, { status: 500 });
  }
}