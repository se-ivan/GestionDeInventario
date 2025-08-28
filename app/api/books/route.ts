import { type NextRequest, NextResponse } from "next/server"

// Mock database - In production, replace with actual database connection
const books = [
  {
    id: 1,
    isbn: "9780143127741",
    titulo: "Cien años de soledad",
    autor: "Gabriel García Márquez",
    precio: 25.99,
    stock: 15,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    isbn: "9780525563983",
    titulo: "El amor en los tiempos del cólera",
    autor: "Gabriel García Márquez",
    precio: 22.5,
    stock: 8,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 3,
    isbn: "9780307474728",
    titulo: "La casa de los espíritus",
    autor: "Isabel Allende",
    precio: 24.99,
    stock: 12,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 4,
    isbn: "9780525432817",
    titulo: "Rayuela",
    autor: "Julio Cortázar",
    precio: 28.75,
    stock: 6,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 5,
    isbn: "9780307389732",
    titulo: "Pedro Páramo",
    autor: "Juan Rulfo",
    precio: 18.99,
    stock: 20,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 6,
    isbn: "9780525564447",
    titulo: "Como agua para chocolate",
    autor: "Laura Esquivel",
    precio: 21.5,
    stock: 10,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 7,
    isbn: "9780307475466",
    titulo: "La sombra del viento",
    autor: "Carlos Ruiz Zafón",
    precio: 26.99,
    stock: 14,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 8,
    isbn: "9780525432824",
    titulo: "Ficciones",
    autor: "Jorge Luis Borges",
    precio: 23.99,
    stock: 9,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 9,
    isbn: "9780307389749",
    titulo: "El túnel",
    autor: "Ernesto Sabato",
    precio: 19.99,
    stock: 11,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 10,
    isbn: "9780525563990",
    titulo: "Mafalda",
    autor: "Quino",
    precio: 16.99,
    stock: 25,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 11,
    isbn: "9780307474735",
    titulo: "El laberinto de la soledad",
    autor: "Octavio Paz",
    precio: 20.99,
    stock: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 12,
    isbn: "9780525432831",
    titulo: "Hopscotch",
    autor: "Julio Cortázar",
    precio: 27.5,
    stock: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

// GET /api/books - Get all books
export async function GET() {
  try {
    return NextResponse.json(books)
  } catch (error) {
    console.error("Error fetching books:", error)
    return NextResponse.json({ error: "Failed to fetch books" }, { status: 500 })
  }
}

// POST /api/books - Create new book
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { isbn, titulo, autor, precio, stock } = body

    // Validate required fields
    if (!isbn || !titulo || !autor || precio === undefined || stock === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check if ISBN already exists
    const existingBook = books.find((book) => book.isbn === isbn)
    if (existingBook) {
      return NextResponse.json({ error: "Book with this ISBN already exists" }, { status: 409 })
    }

    // Create new book
    const newBook = {
      id: Math.max(...books.map((b) => b.id), 0) + 1,
      isbn,
      titulo,
      autor,
      precio: Number(precio),
      stock: Number(stock),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    books.push(newBook)
    return NextResponse.json(newBook, { status: 201 })
  } catch (error) {
    console.error("Error creating book:", error)
    return NextResponse.json({ error: "Failed to create book" }, { status: 500 })
  }
}
