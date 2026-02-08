import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET: Listar consignaciones PAGINADO
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || "";
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 20;
    const skip = (page - 1) * limit;
    
    // Filtro básico por nombre
    const where: any = {
      deletedAt: null 
    };
    
    if (query) {
      where.nombre = { contains: query, mode: 'insensitive' };
    }

    // Ejecutar count y findMany en paralelo
    const [total, consignaciones] = await Promise.all([
        prisma.consignacion.count({ where }),
        prisma.consignacion.findMany({
            where,
            include: {
                inventario: {
                    include: { sucursal: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit
        })
    ]);

    return NextResponse.json({
        data: consignaciones,
        meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    });
  } catch (error) {
    console.error("Error fetching consignaciones:", error);
    return NextResponse.json({ message: 'Error interno' }, { status: 500 });
  }
}

// POST: Crear consignación
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      nombre, 
      precioVenta, 
      gananciaLibreria, 
      proveedor, 
      sucursalId, 
      stockInicial,
      isbn,
      autor,
      editorial,
      anioPublicacion,
      genero,
      coleccion 
    } = body;

    // Validación de seguridad para la regeneración del cliente
    if (!prisma.consignacion) {
       return NextResponse.json({ 
         message: 'Error de Configuración: El modelo Consignacion no existe en Prisma Client. Por favor detén el servidor y ejecuta "npx prisma generate".' 
       }, { status: 500 });
    }

    if (!nombre || !precioVenta) {
      return NextResponse.json({ message: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const newConsignacion = await prisma.consignacion.create({
      data: {
        nombre,
        precioVenta: Number(precioVenta),
        gananciaLibreria: Number(gananciaLibreria || 0),
        proveedor,
        // Nuevos campos
        isbn,
        autor,
        editorial,
        anioPublicacion: anioPublicacion ? Number(anioPublicacion) : null,
        genero,
        coleccion,
        
        inventario: (sucursalId && stockInicial) ? {
          create: {
            sucursalId: Number(sucursalId),
            stock: Number(stockInicial)
          }
        } : undefined
      }
    });

    return NextResponse.json(newConsignacion);
  } catch (error) {
    console.error("Error creating consignacion:", error);
    return NextResponse.json({ message: 'Error al crear consignación' }, { status: 500 });
  }
}
