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
    const searchResults = await prisma.inventario.findMany({
      where: {
        // Busca solo en la sucursal especificada
        sucursalId: Number(sucursalId),
        // Y que el libro relacionado coincida con la búsqueda
        book: {
          OR: [
            { titulo: { contains: query, mode: 'insensitive' } },
            { autor: { contains: query, mode: 'insensitive' } },
            { isbn: { contains: query, mode: 'insensitive' } },
          ],
        },
        // Opcional: solo mostrar resultados con stock > 0
        stock: {
          gt: 0,
        },
      },
      // Incluir los datos completos del libro en la respuesta
      include: {
        book: true,
      },
    });

    return NextResponse.json(searchResults);
  } catch (error) {
    console.error("Error en la búsqueda del POS:", error);
    return NextResponse.json({ message: 'Error al realizar la búsqueda' }, { status: 500 });
  }
}
