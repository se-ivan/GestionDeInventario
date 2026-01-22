import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    // Validar si existe
    const expense = await prisma.expense.findUnique({
        where: { id }
    });

    if (!expense) {
        return NextResponse.json({ message: "Gasto no encontrado" }, { status: 404 });
    }

    // Aquí podríamos implementar Soft Delete si se requiere en el futuro
    // Por ahora, eliminamos físicamente
    await prisma.expense.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Eliminado correctamente" });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const body = await request.json();
    const { concepto, monto, categoria } = body;

    const updated = await prisma.expense.update({
        where: { id },
        data: {
            concepto,
            monto: Number(monto),
            categoria
        }
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
