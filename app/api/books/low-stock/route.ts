import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

// GET /api/books/low-stock - Get books with low stock (≤5)
export async function GET() {
  try {
    const lowStockBooks = await prisma.book.findMany({
      where: {
        stock: { lte: 2}
      }
    })
    return NextResponse.json(lowStockBooks)
  } catch (error) {
    console.error("Error fetching low stock books:", error)
    return NextResponse.json({ error: "Failed to fetch low stock books" }, { status: 500 })
  }
}
