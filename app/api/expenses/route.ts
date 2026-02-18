import { NextResponse } from 'next/server';
import  prisma  from '@/lib/prisma';
import { auth } from '@/auth';

export async function POST(request: Request) {
  try {
    const session = await auth();
    const body = await request.json();
    const { monto, concepto, categoria, userId, sucursalId } = body;

    // Validación básica
    if (!monto || Number(monto) <= 0) {
      return NextResponse.json(
        { error: 'El monto debe ser mayor a 0' },
        { status: 400 }
      );
    }
    if (!concepto) {
      return NextResponse.json(
        { error: 'El concepto es obligatorio' },
        { status: 400 }
      );
    }

    // Usar valores por defecto si no vienen (asumiendo usuario 1 por ahora si no hay auth context)
    const finalUserId = session?.user?.id ? parseInt(session.user.id) : (userId ? parseInt(userId) : 1);
    const finalSucursalId = sucursalId ? parseInt(sucursalId) : 1;

    // Crear Gasto y Notificación en una transacción
    const [expense, notification] = await prisma.$transaction([
      prisma.expense.create({
        data: {
          monto: parseFloat(monto),
          concepto: concepto,
          categoria: categoria || 'VARIOS',
          userId: finalUserId,
          sucursalId: finalSucursalId,
          fecha: new Date(),
        },
      }),
      prisma.notification.create({
        data: {
          type: 'GASTO',
          message: `Nuevo gasto registrado: ${concepto} - $${monto}`,
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
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
     
     // Filtro opcional por fecha (útil para el reporte diario)
     const whereClause: any = {};
    const toUtcMexicoStart = (value: string) => {
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return null;
      parsed.setUTCHours(6, 0, 0, 0);
      return parsed;
    };

    const toUtcMexicoEndExclusive = (value: string) => {
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return null;
      parsed.setDate(parsed.getDate() + 1);
      parsed.setUTCHours(6, 0, 0, 0);
      return parsed;
    };

    const effectiveStartDate = startDate || date;
    const effectiveEndDate = endDate || date || startDate;

    if (effectiveStartDate && effectiveEndDate) {
      let startValue = effectiveStartDate;
      let endValue = effectiveEndDate;

      if (startValue > endValue) {
       const temp = startValue;
       startValue = endValue;
       endValue = temp;
      }

      const start = toUtcMexicoStart(startValue);
      const end = toUtcMexicoEndExclusive(endValue);

      if (start && end) {
       whereClause.fecha = {
         gte: start,
         lt: end 
       };
      }
     }

     const expenses = await prisma.expense.findMany({
        where: whereClause,
        orderBy: { fecha: 'desc' },
        include: { 
            user: { select: { nombre: true } },
            sucursal: { select: { nombre: true } }
        }
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
