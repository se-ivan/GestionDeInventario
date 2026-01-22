import { NextResponse } from 'next/server';
import  prisma  from '@/lib/prisma';

export async function GET() {
  try {
    const searches = await prisma.busquedas_pendientes.findMany({
      orderBy: {
        fecha_solicitud: 'desc',
      },
    });
    return NextResponse.json(searches);
  } catch (error) {
    console.error('Error fetching pending searches:', error);
    return NextResponse.json(
      { error: 'Error fetching pending searches' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.titulo || !body.cliente_nombre || !body.cliente_telefono) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios' },
        { status: 400 }
      );
    }

    const search = await prisma.busquedas_pendientes.create({
      data: {
        titulo: body.titulo,
        autor: body.autor,
        isbn: body.isbn,
        editorial: body.editorial,
        genero: body.genero,
        descripcion: body.descripcion,
        precio_estimado: body.precio_estimado ? parseFloat(body.precio_estimado) : null,
        cliente_nombre: body.cliente_nombre,
        cliente_telefono: body.cliente_telefono,
        cliente_email: body.cliente_email,
        cliente_notas: body.cliente_notas,
        estado: body.estado || 'pendiente',
        prioridad: body.prioridad || 'media',
        fecha_limite: body.fecha_limite ? new Date(body.fecha_limite) : null,
        fecha_solicitud: new Date(),
        fecha_actualizacion: new Date(),
      },
    });
    
    return NextResponse.json(search, { status: 201 });
  } catch (error) {
    console.error('Error creating pending search:', error);
    return NextResponse.json(
      { error: 'Error creating pending search' },
      { status: 500 }
    );
  }
}
