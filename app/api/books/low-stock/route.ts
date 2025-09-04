import { NextResponse } from "next/server"

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

// GET /api/books/low-stock - Get books with low stock (≤5)
export async function GET() {
  try {
    const lowStockBooks = books.filter((book) => book.stock <= 5)
    return NextResponse.json(lowStockBooks)
  } catch (error) {
    console.error("Error fetching low stock books:", error)
    return NextResponse.json({ error: "Failed to fetch low stock books" }, { status: 500 })
  }
}
