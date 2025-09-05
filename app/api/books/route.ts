import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';



// Función para manejar peticiones GET (Leer todos los libros)
export async function GET() {
  try {
    const books = await prisma.book.findMany();
    return NextResponse.json(books);
  } catch (error) {
    console.error("Error al obtener los libros:", error);
    return NextResponse.json({ message: 'Error al obtener los libros' }, { status: 500 });
  }
}

// Función para manejar peticiones POST (Crear un nuevo libro)
export  async function POST(request: Request) {
  try {
    const data = await request.json();
    // Aquí puedes agregar validaciones de los datos recibidos
    
    const newBook = await prisma.book.create({
      data: {
        titulo: data.titulo,
        autor: data.autor,
        isbn: data.isbn,
        precio: data.precio,
        stock: data.stock,
      }
    });

    return NextResponse.json(newBook, { status: 201 }); // 201 significa "Creado"
  } catch (error) {
    console.error("Error al crear el libro:", error);
    return NextResponse.json({ message: 'Error al crear el libro' }, { status: 500 });
  }
}