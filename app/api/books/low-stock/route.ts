import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

// GET /api/books/low-stock - Get books with low stock (≤2)
export async function GET() {
  try {
    const lowStockBooks = await prisma.book.findMany({
      where: {
        inventario: {
          some: {
            stock: { lte: 0 }
          }
        }
      },
      include: {
        inventario: {
          select: {
            stock: true,
            sucursal: {
              select: {
                id: true,
                nombre: true
              }
            }
          }
        }
      }
    })

    // Transform the data to flatten stock information
    const transformedBooks = lowStockBooks.map(book => ({
      ...book,
      // Calculate total stock across all sucursales
      totalStock: book.inventario.reduce((total, inv) => total + inv.stock, 0),
      // Get minimum stock across sucursales
      minStock: Math.min(...book.inventario.map(inv => inv.stock)),
      // Keep inventory details for component
      stockDetails: book.inventario.map(inv => ({
        stock: inv.stock,
        sucursalId: inv.sucursal.id,
        sucursalNombre: inv.sucursal.nombre
      }))
    }))

    return NextResponse.json(transformedBooks)
  } catch (error) {
    console.error("Error fetching low stock books:", error)
    return NextResponse.json({ error: "Failed to fetch low stock books" }, { status: 500 })
  }
}
