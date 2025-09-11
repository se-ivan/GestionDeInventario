// app/api/books/[id]/route.ts

import { type NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma"; 

// PUT /api/sucursal/[id] - Actualizar Sucursal
export async function PUT(
  request: NextRequest,

  context: { params: { id: string } }
) {
  try {
    // 3. CORRECCIÓN: Se accede al id a través del contexto
    const sucursalId = Number.parseInt(context.params.id);

    if (isNaN(sucursalId)) {
      return NextResponse.json({ error: "El ID de la sucursal no es válido" }, { status: 400 });
    }

    const body = await request.json();

    const updatedSucursal = await prisma.sucursal.update({
      where: { id: sucursalId },
      // Solo pasamos el 'body' que contiene los campos a actualizar
      data: body, 
    });

    return NextResponse.json(updatedSucursal);
  } catch (error) {
    console.error("Error al actualizar la sucursal:", error);
    // El error de Prisma sobre el 'id' desconocido se estaba mostrando aquí
    return NextResponse.json({ error: "No se pudo actualizar la sucursal" }, { status: 500 });
  }
}

// DELETE /api/sucursal/[id] - Borrar sucursal
export async function DELETE(
  request: NextRequest,
  // CORRECCIÓN: Firma correcta también para DELETE
  context: { params: { id: string } }
) {
  try {
    const sucursalId = Number.parseInt(context.params.id);
    
    if (isNaN(sucursalId)) {
      return NextResponse.json({ error: "El ID de la sucursal no es válido" }, { status: 400 });
    }

    await prisma.sucursal.delete({ where: { id: sucursalId } });

    return NextResponse.json({ message: "Sucursal borrada exitosamente" });
  } catch (error) {
    console.error("Error al borrar la sucursal:", error);
    return NextResponse.json({ error: "No se pudo borrar la sucursal" }, { status: 500 });
  }
}