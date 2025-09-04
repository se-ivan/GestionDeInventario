import { type NextRequest, NextResponse } from "next/server"
import { useState } from "react"

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


const fetchBooks = async () => {
    try {
      const response = await fetch("/api/books")
      if (response.ok) {
        const booksData = await response.json()
        books.push(...booksData)
      }
    } catch (error) {
      console.error("Error fetching books:", error)
    }  
  }

// GET /api/books/search?q=query - Search books
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get("q")

    if (!query) {
      return NextResponse.json({ error: "Search query is required" }, { status: 400 })
    }

    const searchTerm = query.toLowerCase()
    const filteredBooks = books.filter(
      (book) =>
        book.titulo.toLowerCase().includes(searchTerm) ||
        book.autor.toLowerCase().includes(searchTerm) ||
        book.isbn.includes(searchTerm),
    )

    return NextResponse.json(filteredBooks)
  } catch (error) {
    console.error("Error searching books:", error)
    return NextResponse.json({ error: "Failed to search books" }, { status: 500 })
  }
}
