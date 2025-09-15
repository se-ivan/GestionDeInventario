import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const sucursalId = searchParams.get('sucursalId');

  if (!query) {
    return NextResponse.json({ message: 'El término de búsqueda es requerido' }, { status: 400 });
  }
  if (!sucursalId) {
    return NextResponse.json({ message: 'El ID de la sucursal es requerido' }, { status: 400 });
  }

  try {
    // Buscamos en la tabla de Inventario, filtrando por sucursal
    // e incluyendo los datos del libro relacionado que coincidan con la búsqueda.
    const results = await prisma.inventario.findMany({
      where: {
        // Filtro principal: solo de la sucursal seleccionada
        sucursalId: Number(sucursalId),
        // Y el stock debe ser mayor a 0 para que sea vendible
        stock: {
          gt: 0,
        },
        // Filtro anidado: busca dentro del modelo 'book' relacionado
        book: {
          OR: [
            {
              titulo: {
                contains: query,
                mode: 'insensitive', // No distingue mayúsculas/minúsculas
              },
            },
            {
              autor: {
                contains: query,
                mode: 'insensitive',
              },
            },
            {
              isbn: {
                equals: query,
              },
            },
          ],
        },
      },
      // Incluimos toda la información del libro en la respuesta
      include: {
        book: true,
      },
      take: 20, // Limita el número de resultados para mejorar el rendimiento
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error en la búsqueda del POS:", error);
    return NextResponse.json({ message: 'Error al buscar productos' }, { status: 500 });
  }
}