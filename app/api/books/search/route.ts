import { type NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

// ✅ CORRECTO: Función asíncrona estándar de Next.js API
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')

    if (!query) {
      return NextResponse.json({ message: 'Falta el término de búsqueda' }, { status: 400 })
    }

    // Lógica de búsqueda
    const books = await prisma.book.findMany({
      where: {
        deletedAt: null, // Solo activos
        OR: [
          { isbn: { contains: query } },
          { titulo: { contains: query, mode: 'insensitive' } },
          { autor: { contains: query, mode: 'insensitive' } },  
        ]
      },
      include: {
        inventario: true
      },
      take: 10 // Limitar resultados para no saturar
    })

    return NextResponse.json(books)
    
  } catch (error) {
    console.error("Error en búsqueda:", error)
    return NextResponse.json({ message: 'Error interno' }, { status: 500 })
  }
}