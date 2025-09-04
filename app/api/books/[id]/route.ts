import { type NextRequest, NextResponse } from "next/server"

// Mock database - In production, replace with actual database connection
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
