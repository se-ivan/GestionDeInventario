import { NextResponse } from 'next/server';
import  prisma  from '@/lib/prisma';

// Helper to validate ID
async function getId(params: Promise<{ id: string }>) {
  const { id } = await params;
  return parseInt(id);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = await getId(params);
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const search = await prisma.busquedas_pendientes.findUnique({
      where: { id },
    });

    if (!search) {
      return NextResponse.json(
        { error: 'Búsqueda no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(search);
  } catch (error) {
    console.error('Error fetching pending search:', error);
    return NextResponse.json(
      { error: 'Error fetching pending search' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = await getId(params);
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await request.json();

    const search = await prisma.busquedas_pendientes.update({
      where: { id },
      data: {
        titulo: body.titulo,
        autor: body.autor,
        isbn: body.isbn,
        editorial: body.editorial,
        genero: body.genero,
        descripcion: body.descripcion,
        precio_estimado: body.precio_estimado ? parseFloat(body.precio_estimado) : undefined,
        cliente_nombre: body.cliente_nombre,
        cliente_telefono: body.cliente_telefono,
        cliente_email: body.cliente_email,
        cliente_notas: body.cliente_notas,
        estado: body.estado,
        prioridad: body.prioridad,
        fecha_limite: body.fecha_limite ? new Date(body.fecha_limite) : undefined,
        notas_internas: body.notas_internas,
        precio_encontrado: body.precio_encontrado ? parseFloat(body.precio_encontrado) : null,
        proveedor_encontrado: body.proveedor_encontrado,
        fecha_actualizacion: new Date(),
      },
    });

    return NextResponse.json(search);
  } catch (error) {
    console.error('Error updating pending search:', error);
    return NextResponse.json(
      { error: 'Error updating pending search' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = await getId(params);
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    await prisma.busquedas_pendientes.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting pending search:', error);
    return NextResponse.json(
      { error: 'Error deleting pending search' },
      { status: 500 }
    );
  }
}
