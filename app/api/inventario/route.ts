import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET: Obtiene la lista de inventario PAGINADA Y FILTRADA
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 20;
    const query = searchParams.get('q') || "";
    // const sucursalId = searchParams.get('sucursalId'); // Future improvement

    const skip = (page - 1) * limit;

    // Construir filtro dinámico
    const whereClause: any = {
      AND: [
        {
          book: {
            OR: [
              { titulo: { contains: query, mode: 'insensitive' } },
              { autor: { contains: query, mode: 'insensitive' } },
              { isbn: { contains: query, mode: 'insensitive' } }
            ]
          }
        }
      ]
    };

    // Agregar validación de existencia (sustituye el filtro posterior que tenías)
    // En Prisma, relations a veces requieren verificar que no sean null, pero si la DB es consistente no hace falta.
    // Dejaremos que prisma maneje 'where book' logic.

    // 1. Contar total de registros coincidentes
    const total = await prisma.inventario.count({
      where: whereClause
    });

    // 2. Obtener datos paginados
    const inventario = await prisma.inventario.findMany({
      where: whereClause,
      include: {
        book: true,
        sucursal: true,
      },
      orderBy: {
        book: {
          titulo: 'asc'
        }
      },
      skip: skip,
      take: limit
    });

    return NextResponse.json({
      data: inventario,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
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