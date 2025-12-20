import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET: Obtener libros ACTIVOS con su inventario
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    const whereClause: any = {
      deletedAt: null, // 👈 FILTRO CLAVE: Solo traer los no borrados
    };

    if (query) {
      whereClause.OR = [
        { titulo: { contains: query, mode: 'insensitive' } },
        { autor: { contains: query, mode: 'insensitive' } },
        { isbn: { contains: query } },
      ];
    }

    const books = await prisma.book.findMany({
      where: whereClause,
      include: {
        inventario: {
          include: { sucursal: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(books);
  } catch (error) {
    console.error("Error al obtener los libros:", error);
    return NextResponse.json({ message: 'Error al obtener los libros' }, { status: 500 });
  }
}

// POST: Crear nuevo libro O Reactivar uno eliminado
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bookData, inventoryData } = body;

    if (!bookData || !inventoryData) {
        return NextResponse.json({ message: 'Datos incompletos' }, { status: 400 });
    }

    const finalIsbn = bookData.isbn && bookData.isbn.trim() !== "" ? bookData.isbn.trim() : null;

    // --- LÓGICA DE REACTIVACIÓN ---
    if (finalIsbn) {
      // 1. Buscamos si existe algun libro con ese ISBN (borrado o no)
      const existingBook = await prisma.book.findUnique({
        where: { isbn: finalIsbn }
      });

      if (existingBook) {
        // A. Si existe y NO tiene fecha de borrado, es un duplicado real.
        if (!existingBook.deletedAt) {
          return NextResponse.json({ message: 'Ya existe un libro activo con este ISBN.' }, { status: 409 });
        }

        // B. Si existe pero TIENE fecha de borrado, lo REACTIVAMOS.
        const reactivatedBook = await prisma.book.update({
          where: { id: existingBook.id },
          data: {
            deletedAt: null, // 👈 ¡Resurrección!
            titulo: bookData.titulo,
            autor: bookData.autor,
            editorial: bookData.editorial,
            coleccion: bookData.coleccion,
            anioPublicacion: bookData.anioPublicacion,
            genero: bookData.genero,
            precioVenta: bookData.precioVenta,
            precioCompra: bookData.precioCompra,
            tasaIva: bookData.tasaIva,
            // Actualizamos o creamos el inventario para la sucursal actual
            inventario: {
              upsert: {
                where: {
                  bookId_sucursalId: {
                    bookId: existingBook.id,
                    sucursalId: inventoryData.sucursalId
                  }
                },
                update: {
                  stock: inventoryData.stock,
                  minStock: inventoryData.minStock,
                  ubicacion: inventoryData.ubicacion
                },
                create: {
                  sucursalId: inventoryData.sucursalId,
                  stock: inventoryData.stock,
                  minStock: inventoryData.minStock,
                  ubicacion: inventoryData.ubicacion
                }
              }
            }
          },
          include: { inventario: true }
        });
        
        return NextResponse.json(reactivatedBook);
      }
    }

    // --- CREACIÓN NORMAL (Si no existía) ---
    const newBook = await prisma.book.create({
      data: {
        titulo: bookData.titulo,
        autor: bookData.autor,
        isbn: finalIsbn,
        editorial: bookData.editorial,
        coleccion: bookData.coleccion,
        anioPublicacion: bookData.anioPublicacion,
        genero: bookData.genero,
        precioVenta: bookData.precioVenta,
        precioCompra: bookData.precioCompra,
        tasaIva: bookData.tasaIva,
        inventario: {
          create: {
            sucursalId: inventoryData.sucursalId,
            stock: inventoryData.stock,
            minStock: inventoryData.minStock,
            ubicacion: inventoryData.ubicacion
          },
        },
      },
      include: { inventario: { include: { sucursal: true } } }
    });

    return NextResponse.json(newBook);
  } catch (error: any) {
    console.error("Error al crear el libro:", error);
    // Errores genéricos...
    return NextResponse.json({ message: 'Error interno al procesar el libro' }, { status: 500 });
  }
}

// DELETE (Faltaba en tu código de libros, agregamos el Soft Delete)
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ message: 'ID requerido' }, { status: 400 });

        await prisma.book.update({
            where: { id: Number(id) },
            data: { deletedAt: new Date() } // 👈 Soft Delete
        });

        return NextResponse.json({ message: 'Libro eliminado correctamente' });
    } catch (error) {
        return NextResponse.json({ message: 'Error al eliminar' }, { status: 500 });
    }
}