import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET: Obtener libros con su inventario
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    const whereClause = query
      ? {
          OR: [
            { titulo: { contains: query, mode: 'insensitive' as const } },
            { autor: { contains: query, mode: 'insensitive' as const } },
            { isbn: { contains: query } },
          ],
        }
      : {};

    const books = await prisma.book.findMany({
      where: whereClause,
      include: {
        inventario: {
          include: {
            sucursal: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return NextResponse.json(books);
  } catch (error) {
    console.error("Error al obtener los libros:", error);
    return NextResponse.json({ message: 'Error al obtener los libros' }, { status: 500 });
  }
}

// POST: Crear nuevo libro con inventario inicial
export async function POST(request: Request) {
  try {
    // Recibimos la estructura anidada que envía el BookForm
    const body = await request.json();
    const { bookData, inventoryData } = body;

    // Validación básica
    if (!bookData || !inventoryData) {
        return NextResponse.json({ message: 'Datos incompletos' }, { status: 400 });
    }

    // Asegurar que isbn sea null si viene vacío (doble check de seguridad)
    const finalIsbn = bookData.isbn && bookData.isbn.trim() !== "" ? bookData.isbn.trim() : null;

    const newBook = await prisma.book.create({
      data: {
        // Datos del Libro (Mapeo exacto al schema)
        titulo: bookData.titulo,
        autor: bookData.autor,
        isbn: finalIsbn,
        editorial: bookData.editorial,
        coleccion: bookData.coleccion,
        anioPublicacion: bookData.anioPublicacion,
        genero: bookData.genero,
        
        // Campos financieros nuevos
        precioVenta: bookData.precioVenta,   // Nota: En el schema es 'precioVenta', en la DB es 'precio'
        precioCompra: bookData.precioCompra, // Nuevo
        tasaIva: bookData.tasaIva,           // Nuevo

        // Crear registro en Inventario al mismo tiempo (Transacción implícita)
        inventario: {
          create: {
            sucursalId: inventoryData.sucursalId,
            stock: inventoryData.stock,
            minStock: inventoryData.minStock, // Nuevo
            ubicacion: inventoryData.ubicacion // Nuevo
          },
        },
      },
      include: {
        inventario: {
          include: {
            sucursal: true
          }
        }
      }
    });

    return NextResponse.json(newBook);
  } catch (error: any) {
    console.error("Error al crear el libro:", error);
    if (error.code === 'P2003') {
        return NextResponse.json({ 
            message: 'La sucursal seleccionada no es válida o no existe.' 
        }, { status: 400 });
    }
    // Manejo de errores específicos de Prisma
    if (error.code === 'P2002') {
        return NextResponse.json({ message: 'Ya existe un libro con este ISBN.' }, { status: 409 });
    }
    
    if (error.message?.includes('sucursal')) {
         return NextResponse.json({ message: 'La sucursal especificada no existe.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Error interno al crear el libro' }, { status: 500 });
  }
}