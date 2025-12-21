import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma'; // Asegúrate que esta ruta a tu instancia de prisma sea correcta

// --- GET: Buscar libros (Solo activos) ---
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    // Filtro base: Solo traer los que NO tienen fecha de borrado
    const whereClause: any = {
      deletedAt: null, 
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
      take: 50, // Limite para no saturar si no hay búsqueda
    });

    return NextResponse.json(books);
  } catch (error) {
    console.error("Error al obtener libros:", error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}

// --- POST: Crear Libro O Agregar Stock si ya existe ---
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bookData, inventoryData } = body;

    // 1. Validaciones básicas
    if (!bookData || !inventoryData) {
        return NextResponse.json({ message: 'Datos incompletos' }, { status: 400 });
    }
    
    // Normalizar ISBN
    const isbn = bookData.isbn && bookData.isbn.trim() !== "" ? bookData.isbn.trim() : null;

    // 2. VERIFICAR EXISTENCIA GLOBAL (Buscamos por ISBN si existe)
    let existingBook = null;
    
    if (isbn) {
        existingBook = await prisma.book.findUnique({
            where: { isbn: isbn },
            include: { inventario: true }
        });
    }

    // --- ESCENARIO A: EL LIBRO YA EXISTE (Activo o Borrado) ---
    if (existingBook) {
        // Si estaba eliminado (Soft Delete), lo reactivamos quitando el deletedAt
        // Si estaba activo, simplemente actualizamos datos por si cambiaron (opcional)
        
        const updatedBook = await prisma.book.update({
            where: { id: existingBook.id },
            data: {
                deletedAt: null, // ¡Resurrección!
                // Actualizamos datos básicos por si corrigieron algo
                titulo: bookData.titulo,
                autor: bookData.autor,
                editorial: bookData.editorial,
                precioVenta: bookData.precioVenta,
                
                // LÓGICA DE INVENTARIO (UPSERT)
                // Buscamos si ya existe registro en ESTA sucursal para sumar o crear
                inventario: {
                    upsert: {
                        where: {
                            // Prisma crea este ID compuesto automáticamente en la relación N:M
                            bookId_sucursalId: {
                                bookId: existingBook.id,
                                sucursalId: Number(inventoryData.sucursalId)
                            }
                        },
                        update: {
                            // Si ya existe en esta sucursal, SUMAMOS al stock actual
                            // Nota: Prisma permite operaciones atómicas como 'increment', pero
                            // aquí calculamos manual para tener control o reescribimos el valor.
                            // Para seguridad simple, reemplazamos o incrementamos:
                            stock: { increment: Number(inventoryData.stock) },
                            ubicacion: inventoryData.ubicacion,
                            minStock: Number(inventoryData.minStock)
                        },
                        create: {
                            // Si no existe en esta sucursal, lo creamos
                            sucursalId: Number(inventoryData.sucursalId),
                            stock: Number(inventoryData.stock),
                            minStock: Number(inventoryData.minStock) || 5,
                            ubicacion: inventoryData.ubicacion
                        }
                    }
                }
            },
            include: { inventario: true }
        });

        return NextResponse.json({
            message: 'El libro ya existía. Se ha actualizado el inventario correctamente.',
            book: updatedBook,
            type: 'UPDATE' // Para que el front sepa que no fue creación nueva
        }, { status: 200 });
    }

    // --- ESCENARIO B: EL LIBRO ES NUEVO ---
    const newBook = await prisma.book.create({
      data: {
        titulo: bookData.titulo,
        autor: bookData.autor,
        isbn: isbn,
        editorial: bookData.editorial,
        coleccion: bookData.coleccion,
        anioPublicacion: bookData.anioPublicacion,
        genero: bookData.genero,
        precioVenta: bookData.precioVenta,
        precioCompra: bookData.precioCompra,
        tasaIva: bookData.tasaIva,
        inventario: {
          create: {
            sucursalId: Number(inventoryData.sucursalId),
            stock: Number(inventoryData.stock),
            minStock: Number(inventoryData.minStock) || 5,
            ubicacion: inventoryData.ubicacion
          },
        },
      },
      include: { inventario: { include: { sucursal: true } } }
    });

    return NextResponse.json(newBook, { status: 201 });

  } catch (error: any) {
    console.error("Error en POST book:", error);
    // Manejo de error de duplicado por si acaso falló la lógica anterior
    if (error.code === 'P2002') {
        return NextResponse.json({ message: 'Conflicto de integridad: El ISBN ya existe.' }, { status: 409 });
    }
    return NextResponse.json({ message: 'Error interno al procesar el libro' }, { status: 500 });
  }
}

// --- DELETE: Soft Delete ---
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ message: 'ID requerido' }, { status: 400 });

        await prisma.book.update({
            where: { id: Number(id) },
            data: { deletedAt: new Date() } // Marcamos como borrado
        });

        return NextResponse.json({ message: 'Libro eliminado correctamente' });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Error al eliminar' }, { status: 500 });
    }
}