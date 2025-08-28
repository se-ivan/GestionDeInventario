import { NextResponse } from "next/server"

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
