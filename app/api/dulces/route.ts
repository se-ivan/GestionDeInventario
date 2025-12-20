import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET: Obtener lista de dulces
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    const whereClause = query
      ? {
          OR: [
            { nombre: { contains: query, mode: 'insensitive' as const } },
            { marca: { contains: query, mode: 'insensitive' as const } },
            { codigoBarras: { contains: query } },
          ],
        }
      : {};

    const dulces = await prisma.dulce.findMany({
      where: whereClause,
      include: {
        inventario: {
          include: {
            sucursal: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return NextResponse.json(dulces);
  } catch (error) {
    console.error("Error al obtener dulces:", error);
    return NextResponse.json({ message: 'Error al obtener los dulces' }, { status: 500 });
  }
}

// POST: Crear nuevo dulce
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    if (!body.nombre || !body.precioVenta || !body.sucursalId) {
        return NextResponse.json({ message: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const newDulce = await prisma.dulce.create({
      data: {
        nombre: body.nombre,
        codigoBarras: body.codigoBarras || null,
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
    if (error.code === 'P2002') return NextResponse.json({ message: 'El código de barras ya existe.' }, { status: 409 });
    return NextResponse.json({ message: 'Error interno al crear el producto' }, { status: 500 });
  }
}

// PUT: Actualizar un dulce existente (con soporte para inventario)
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, sucursalId, stock, ...data } = body;

    if (!id) return NextResponse.json({ message: 'ID requerido para actualizar' }, { status: 400 });

    // 1. Actualizar datos básicos del dulce
    const updatedDulce = await prisma.dulce.update({
      where: { id: Number(id) },
      data: {
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

    // 2. ✅ Actualizar Inventario si se proporcionan datos de stock
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
    console.error("Error al actualizar dulce:", error);
    return NextResponse.json({ message: 'Error al actualizar' }, { status: 500 });
  }
}

// DELETE: Eliminar un dulce
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ message: 'ID requerido' }, { status: 400 });

    await prisma.dulce.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ message: 'Producto eliminado correctamente' });
  } catch (error) {
    console.error("Error al eliminar dulce:", error);
    return NextResponse.json({ message: 'Error al eliminar' }, { status: 500 });
  }
}