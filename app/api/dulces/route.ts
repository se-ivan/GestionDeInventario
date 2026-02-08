import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET: Obtener dulces ACTIVOS con Paginación
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const whereClause: any = {
      deletedAt: null, // 👈 FILTRO CLAVE
    };

    if (query) {
      whereClause.OR = [
        { nombre: { contains: query, mode: 'insensitive' } },
        { marca: { contains: query, mode: 'insensitive' } },
        { codigoBarras: { contains: query } },
      ];
    }

    const [dulces, total] = await Promise.all([
      prisma.dulce.findMany({
        where: whereClause,
        include: {
          inventario: {
            include: { sucursal: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.dulce.count({ where: whereClause })
    ]);

    return NextResponse.json({
      data: dulces,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error al obtener dulces:", error);
    return NextResponse.json({ message: 'Error al obtener los dulces' }, { status: 500 });
  }
}

// POST: Crear O Reactivar Dulce
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    if (!body.nombre || !body.precioVenta || !body.sucursalId) {
        return NextResponse.json({ message: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const codigoBarras = body.codigoBarras || null;

    // --- LÓGICA DE REACTIVACIÓN ---
    if (codigoBarras) {
        // 1. Buscar coincidencia global
        const existingDulce = await prisma.dulce.findUnique({
            where: { codigoBarras: codigoBarras }
        });

        if (existingDulce) {
            // A. Duplicado real (Activo)
            if (!existingDulce.deletedAt) {
                return NextResponse.json({ message: 'El código de barras ya existe en un producto activo.' }, { status: 409 });
            }

            // B. Reactivar (Estaba borrado)
            const reactivatedDulce = await prisma.dulce.update({
                where: { id: existingDulce.id },
                data: {
                    deletedAt: null, // 👈 Reactivar
                    nombre: body.nombre,
                    marca: body.marca,
                    lineaProducto: body.lineaProducto,
                    peso: body.peso,
                    sabor: body.sabor,
                    precioVenta: body.precioVenta,
                    precioCompra: body.precioCompra || 0,
                    tasaIva: body.tasaIva || 0,
                    // Actualizar inventario de la sucursal
                    inventario: {
                        upsert: {
                            where: {
                                dulceId_sucursalId: {
                                    dulceId: existingDulce.id,
                                    sucursalId: Number(body.sucursalId)
                                }
                            },
                            update: {
                                stock: Number(body.stock),
                                minStock: Number(body.minStock) || 10,
                                ubicacion: body.ubicacion
                            },
                            create: {
                                sucursalId: Number(body.sucursalId),
                                stock: Number(body.stock),
                                minStock: Number(body.minStock) || 10,
                                ubicacion: body.ubicacion
                            }
                        }
                    }
                }
            });
            return NextResponse.json(reactivatedDulce, { status: 201 }); // 201 Created/Recovered
        }
    }

    // --- CREACIÓN NORMAL ---
    const newDulce = await prisma.dulce.create({
      data: {
        nombre: body.nombre,
        codigoBarras: codigoBarras,
        marca: body.marca,
        lineaProducto: body.lineaProducto,
        peso: body.peso,
        sabor: body.sabor,
        precioVenta: body.precioVenta,
        precioCompra: body.precioCompra || 0,
        tasaIva: body.tasaIva || 0,
        inventario: {
          create: {
            sucursalId: Number(body.sucursalId),
            stock: Number(body.stock),
            minStock: Number(body.minStock) || 10,
            ubicacion: body.ubicacion
          },
        },
      },
    });

    return NextResponse.json(newDulce, { status: 201 });
  } catch (error: any) {
    console.error("Error al crear dulce:", error);
    // Por si acaso fallara algo más
    if (error.code === 'P2002') return NextResponse.json({ message: 'El código de barras ya existe.' }, { status: 409 });
    return NextResponse.json({ message: 'Error interno al crear el producto' }, { status: 500 });
  }
}

// PUT: Actualizar (Igual que antes, solo aseguramos que el update no toque el deletedAt)
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, sucursalId, stock, ...data } = body;

    if (!id) return NextResponse.json({ message: 'ID requerido' }, { status: 400 });

    const updatedDulce = await prisma.dulce.update({
      where: { id: Number(id) },
      data: {
        // ... (resto de campos igual) ...
        nombre: data.nombre,
        codigoBarras: data.codigoBarras || null,
        marca: data.marca,
        lineaProducto: data.lineaProducto,
        peso: data.peso,
        sabor: data.sabor,
        precioVenta: data.precioVenta,
        precioCompra: data.precioCompra,
        tasaIva: data.tasaIva,
      },
    });

    if (sucursalId !== undefined && stock !== undefined) {
      await prisma.inventarioDulce.upsert({
        where: {
          dulceId_sucursalId: {
            dulceId: Number(id),
            sucursalId: Number(sucursalId)
          }
        },
        update: {
          stock: Number(stock),
          ubicacion: data.ubicacion,
          minStock: Number(data.minStock) || 10
        },
        create: {
          dulceId: Number(id),
          sucursalId: Number(sucursalId),
          stock: Number(stock),
          minStock: Number(data.minStock) || 10,
          ubicacion: data.ubicacion
        }
      });
    }

    return NextResponse.json(updatedDulce);
  } catch (error) {
    return NextResponse.json({ message: 'Error al actualizar' }, { status: 500 });
  }
}

// DELETE: Eliminación Lógica (Soft Delete)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ message: 'ID requerido' }, { status: 400 });

    // CAMBIO IMPORTANTE: UPDATE EN VEZ DE DELETE
    await prisma.dulce.update({
      where: { id: Number(id) },
      data: { 
          deletedAt: new Date() // Marcamos la fecha de eliminación
      } 
    });

    return NextResponse.json({ message: 'Producto eliminado correctamente' });
  } catch (error) {
    console.error("Error al eliminar dulce:", error);
    return NextResponse.json({ message: 'Error al eliminar' }, { status: 500 });
  }
}