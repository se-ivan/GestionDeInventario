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
  },
  {
    id: 2,
    isbn: "9780525563983",
    titulo: "El amor en los tiempos del cólera",
    autor: "Gabriel García Márquez",
    precio: 22.5,
    stock: 8,
  },
  {
    id: 3,
    isbn: "9780307474728",
    titulo: "La casa de los espíritus",
    autor: "Isabel Allende",
    precio: 24.99,
    stock: 12,
  },
  { id: 4, isbn: "9780525432817", titulo: "Rayuela", autor: "Julio Cortázar", precio: 28.75, stock: 6 },
  { id: 5, isbn: "9780307389732", titulo: "Pedro Páramo", autor: "Juan Rulfo", precio: 18.99, stock: 20 },
  {
    id: 6,
    isbn: "9780525564447",
    titulo: "Como agua para chocolate",
    autor: "Laura Esquivel",
    precio: 21.5,
    stock: 10,
  },
  {
    id: 7,
    isbn: "9780307475466",
    titulo: "La sombra del viento",
    autor: "Carlos Ruiz Zafón",
    precio: 26.99,
    stock: 14,
  },
  { id: 8, isbn: "9780525432824", titulo: "Ficciones", autor: "Jorge Luis Borges", precio: 23.99, stock: 9 },
  { id: 9, isbn: "9780307389749", titulo: "El túnel", autor: "Ernesto Sabato", precio: 19.99, stock: 11 },
  { id: 10, isbn: "9780525563990", titulo: "Mafalda", autor: "Quino", precio: 16.99, stock: 25 },
  {
    id: 11,
    isbn: "9780307474735",
    titulo: "El laberinto de la soledad",
    autor: "Octavio Paz",
    precio: 20.99,
    stock: 3,
  },
  { id: 12, isbn: "9780525432831", titulo: "Hopscotch", autor: "Julio Cortázar", precio: 27.5, stock: 2 },
]

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
