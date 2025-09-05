// app/api/books/[id]/route.ts

import { type NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma"; 

// PUT /api/books/[id] - Actualizar libro
export async function PUT(
  request: NextRequest,

  context: { params: { id: string } }
) {
  try {
    // 3. CORRECCIÓN: Se accede al id a través del contexto
    const bookId = Number.parseInt(context.params.id);

    if (isNaN(bookId)) {
      return NextResponse.json({ error: "El ID del libro no es válido" }, { status: 400 });
    }

    const body = await request.json();

    // 4. CORRECCIÓN: El objeto 'data' ya no contiene 'id' ni 'updated_at'
    const updatedBook = await prisma.book.update({
      where: { id: bookId },
      // Solo pasamos el 'body' que contiene los campos a actualizar
      data: body, 
    });

    return NextResponse.json(updatedBook);
  } catch (error) {
    console.error("Error al actualizar el libro:", error);
    // El error de Prisma sobre el 'id' desconocido se estaba mostrando aquí
    return NextResponse.json({ error: "No se pudo actualizar el libro" }, { status: 500 });
  }
}

// DELETE /api/books/[id] - Borrar libro
export async function DELETE(
  request: NextRequest,
  // CORRECCIÓN: Firma correcta también para DELETE
  context: { params: { id: string } }
) {
  try {
    const bookId = Number.parseInt(context.params.id);
    
    if (isNaN(bookId)) {
      return NextResponse.json({ error: "El ID del libro no es válido" }, { status: 400 });
    }

    await prisma.book.delete({ where: { id: bookId } });
    
    return NextResponse.json({ message: "Libro borrado exitosamente" });
  } catch (error) {
    console.error("Error al borrar el libro:", error);
    return NextResponse.json({ error: "No se pudo borrar el libro" }, { status: 500 });
  }
}