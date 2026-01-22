import { NextResponse } from 'next/server';
import  prisma  from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { amount, concept, category, userId, sucursalId } = body;

    // Validación básica
    if (!amount || Number(amount) <= 0) {
      return NextResponse.json(
        { error: 'El monto debe ser mayor a 0' },
        { status: 400 }
      );
    }
    if (!concept) {
      return NextResponse.json(
        { error: 'El concepto es obligatorio' },
        { status: 400 }
      );
    }

    // Usar valores por defecto si no vienen (asumiendo usuario 1 por ahora si no hay auth context)
    const finalUserId = userId ? parseInt(userId) : 1; 
    const finalSucursalId = sucursalId ? parseInt(sucursalId) : 1;

    // Crear Gasto y Notificación en una transacción
    const [expense, notification] = await prisma.$transaction([
      prisma.expense.create({
        data: {
          monto: parseFloat(amount),
          concepto: concept,
          categoria: category || 'VARIOS',
          userId: finalUserId,
          sucursalId: finalSucursalId,
          fecha: new Date(),
        },
      }),
      prisma.notification.create({
        data: {
          type: 'GASTO',
          message: `Nuevo gasto registrado: $${amount} - ${concept} (${category})`,
        },
      }),
    ]);
    
    return NextResponse.json({ expense, notification }, { status: 201 });
  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json(
      { error: 'Error al registrar el gasto' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
     const { searchParams } = new URL(request.url);
     const date = searchParams.get('date');
     
     // Filtro opcional por fecha (útil para el reporte diario)
     const whereClause: any = {};
     if (date) {
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);
        whereClause.fecha = {
           gte: start,
           lte: end
        };
     }

     const expenses = await prisma.expense.findMany({
        where: whereClause,
        orderBy: { fecha: 'desc' },
        include: { user: { select: { nombre: true } } }
     });

     return NextResponse.json(expenses);
  } catch(error) {
     console.error('Error fetching expenses:', error);
     return NextResponse.json(
        { error: 'Error al obtener gastos' },
        { status: 500 }
     );
  }
}
