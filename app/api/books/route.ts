import { type NextRequest, NextResponse } from "next/server"

// Temporary in-memory books array
const books: Array<{
  id: number
  isbn: string
  titulo: string
  autor: string
  precio: number
  stock: number
  created_at: string
  updated_at: string
}> = []

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
