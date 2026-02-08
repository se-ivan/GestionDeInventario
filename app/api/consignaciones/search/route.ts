import { type NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')
    const sucursalId = searchParams.get('sucursalId')

    if (!query) {
      return NextResponse.json([]);
    }

    const where: any = {
      deletedAt: null,
      nombre: { contains: query, mode: 'insensitive' }
    };
    
    if (sucursalId) {
        where.inventario = {
            some: {
                sucursalId: parseInt(sucursalId),
                stock: { gt: 0 } // Only show if in stock?
            }
        }
    }

    const items = await prisma.consignacion.findMany({
      where,
      include: {
        inventario: true
      },
      take: 10
    })

    return NextResponse.json(items)
  } catch (error) {
    console.error("Error search consignacion:", error)
    return NextResponse.json({ message: 'Error interno' }, { status: 500 })
  }
}
