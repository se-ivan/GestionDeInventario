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

// === FUNCIÓN POST MODIFICADA ===
// Ahora maneja la creación del libro y su inventario inicial en una transacción.
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const {
      titulo,
      autor,
      isbn,
      precio,
      editorial,
      coleccion,
      anioPublicacion,
      genero,
      stock, // Este es el stock inicial
      sucursalId, // Esperamos el ID de la sucursal desde el formulario
    } = data;

    // Validación de datos básicos
    if (!titulo || !autor || !precio || !stock || !sucursalId) {
      return NextResponse.json(
        { message: 'Faltan campos requeridos: título, autor, precio, stock y sucursal son obligatorios.' },
        { status: 400 }
      );
    }
    
    // Usamos una transacción para asegurar que ambas operaciones (crear libro y crear inventario)
    // se completen exitosamente. Si una falla, la otra se revierte.
    const nuevoLibroConInventario = await prisma.$transaction(async (tx) => {
      // 1. Crear el libro.
      // El campo 'stock' en el modelo Book ahora puede funcionar como un conteo total,
      // que se inicializa con el primer lote de inventario.
      const newBook = await tx.book.create({
        data: {
          titulo,
          autor,
          isbn,
          precio,
          editorial,
          coleccion,
          anioPublicacion,
          genero,
          stock, // Stock total inicial
        },
      });

      // 2. Crear la entrada de inventario para ese libro en la sucursal especificada.
      await tx.inventario.create({
        data: {
          bookId: newBook.id,
          sucursalId: sucursalId,
          stock: stock,
        },
      });

      return newBook;
    });

    return NextResponse.json(nuevoLibroConInventario, { status: 201 });
  } catch (error) {
    console.error("Error al crear el libro y su inventario:", error);
    // Devuelve un mensaje de error más específico si es posible
    if (error instanceof Error && error.message.includes('sucursal')) {
         return NextResponse.json({ message: 'La sucursal especificada no existe.' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Error al crear el libro' }, { status: 500 });
  }
}
