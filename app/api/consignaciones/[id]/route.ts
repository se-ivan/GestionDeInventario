import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET: Single
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const item = await prisma.consignacion.findUnique({
      where: { id: Number(id) },
      include: { inventario: true }
    });
    
    if (!item) return NextResponse.json({ message: 'No encontrado' }, { status: 404 });
    
    return NextResponse.json(item);
  } catch (error) {
    return NextResponse.json({ message: 'Error interno' }, { status: 500 });
  }
}

// PUT: Update
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = await request.json();
    const { nombre, precioVenta, gananciaLibreria, proveedor } = body;

    const updated = await prisma.consignacion.update({
      where: { id: Number(id) },
      data: {
        nombre,
        precioVenta: Number(precioVenta),
        gananciaLibreria: Number(gananciaLibreria),
        proveedor
      }
    });
    
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ message: 'Error actualizando' }, { status: 500 });
  }
}

// DELETE: Soft delete
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    await prisma.consignacion.update({
      where: { id: Number(id) },
      data: { deletedAt: new Date() }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ message: 'Error eliminando' }, { status: 500 });
  }
}
