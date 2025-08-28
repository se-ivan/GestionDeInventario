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

// PUT /api/books/[id] - Update book
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const bookId = Number.parseInt(params.id)
    const body = await request.json()

    const bookIndex = books.findIndex((book) => book.id === bookId)
    if (bookIndex === -1) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 })
    }

    // Update book
    const updatedBook = {
      ...books[bookIndex],
      ...body,
      id: bookId, // Ensure ID doesn't change
      updated_at: new Date().toISOString(),
    }

    books[bookIndex] = updatedBook
    return NextResponse.json(updatedBook)
  } catch (error) {
    console.error("Error updating book:", error)
    return NextResponse.json({ error: "Failed to update book" }, { status: 500 })
  }
}

// DELETE /api/books/[id] - Delete book
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const bookId = Number.parseInt(params.id)

    const bookIndex = books.findIndex((book) => book.id === bookId)
    if (bookIndex === -1) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 })
    }

    books.splice(bookIndex, 1)
    return NextResponse.json({ message: "Book deleted successfully" })
  } catch (error) {
    console.error("Error deleting book:", error)
    return NextResponse.json({ error: "Failed to delete book" }, { status: 500 })
  }
}
