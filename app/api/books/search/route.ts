import { type NextRequest, NextResponse } from "next/server"
import { useState } from "react"
import prisma from "@/lib/prisma"

const fetchBooks = async () => {
  try {
    const response = await fetch("/api/books")
    if (response.ok) {
      const booksData = await response.json()
      prisma.book.createMany({ data: booksData })
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
    const filteredBooks = await prisma.book.findMany({
      where: {
        OR: [
          { titulo: { contains: searchTerm, mode: 'insensitive' } }, 
          { autor: { contains: searchTerm, mode: 'insensitive' } },  
          { isbn: { contains: searchTerm, mode: 'insensitive' } },  
        ],
      },
    });
    console.log(searchTerm)
    console.log(filteredBooks)
    return NextResponse.json(filteredBooks)
  } catch (error) {
    console.error("Error searching books:", error)
    return NextResponse.json({ error: "Failed to search books" }, { status: 500 })
  }
}
