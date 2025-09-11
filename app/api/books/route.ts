import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// La función GET no necesita cambios.
export async function GET() {
  try {
    const books = await prisma.book.findMany({
      // Opcional: Incluir el inventario para ver el stock por sucursal.
      include: {
        inventario: {
          include: {
            sucursal: true,
          },
        },
      },
    });
    return NextResponse.json(books);
  } catch (error) {
    console.error("Error al obtener los libros:", error);
    return NextResponse.json({ message: 'Error al obtener los libros' }, { status: 500 });
  }
}


export async function POST(request: Request) {
  try {
    const body = await request.json();

    const newBook = await prisma.book.create({
      data: {
        titulo: body.titulo,
        autor: body.autor,
        precio: body.precio,
        isbn: body.isbn,
        editorial: body.editorial,
        coleccion: body.coleccion,
        anioPublicacion: body.anioPublicacion,
        genero: body.genero,
        inventario: {
          create: {
            sucursalId: body.sucursalId,
            stock: body.stock,
          },
        },
      },
      include: {
        // Incluimos el inventario para devolver la entrada completa
        inventario: {
          include: {
            sucursal: true
          }
        }
      }
    });

    return NextResponse.json(newBook);
  } catch (error) {
    console.error("Error al crear el libro y su inventario:", error);
    // Devuelve un mensaje de error más específico si es posible
    if (error instanceof Error && error.message.includes('sucursal')) {
         return NextResponse.json({ message: 'La sucursal especificada no existe.' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Error al crear el libro' }, { status: 500 });
  }
}