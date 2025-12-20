import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// 1. CAMBIO: Definimos params como una Promesa
export async function PUT(
  request: Request, 
  { params }: { params: Promise<{ id: string }> } 
) {
  try {
    const body = await request.json();

    // 2. CAMBIO: Esperamos a que params se resuelva antes de usarlo
    const { id } = await params; 

    // 3. CAMBIO: Usamos la variable 'id' que acabamos de obtener
    const bookId = Number(id);

    if (isNaN(bookId)) {
      return NextResponse.json({ error: "El ID del libro no es válido" }, { status: 400 });
    }

    const updatedBook = await prisma.book.update({
      where: {
        id: bookId,
      },
      data: {
        titulo: body.titulo,
        autor: body.autor,
        precioVenta: body.precio, 
        isbn: body.isbn,
        editorial: body.editorial,
        coleccion: body.coleccion,
        anioPublicacion: body.anioPublicacion,
        genero: body.genero,
      },
    });

    return NextResponse.json(updatedBook);

  } catch (error: any) {
    console.error('Error al actualizar el libro:', error);

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'El libro a actualizar no fue encontrado.' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Error en el servidor al actualizar el libro' },
      { status: 500 }
    );
  }
}