import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// La función recibe el objeto `request` y el contexto que contiene `params`.
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const bookId = Number(params.id);

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
        precio: body.precio,
        isbn: body.isbn,
        // AÑADIDO: Nuevos campos para la actualización
        editorial: body.editorial,
        coleccion: body.coleccion,
        anioPublicacion: body.anioPublicacion,
        genero: body.genero,
      },
    });

    return NextResponse.json(updatedBook);

  } catch (error: any) {
    console.error('Error al actualizar el libro:', error);

    // Error específico de Prisma cuando no se encuentra el registro a actualizar.
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'El libro a actualizar no fue encontrado.' },
        { status: 404 }
      );
    }

    // Error genérico para cualquier otro fallo.
    return NextResponse.json(
      { message: 'Error en el servidor al actualizar el libro' },
      { status: 500 }
    );
  }
}