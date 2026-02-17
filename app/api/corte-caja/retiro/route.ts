import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';

const CASH_WITHDRAWAL_CATEGORY = 'RETIRO_EFECTIVO';
const CARD_METHODS = new Set(['TARJETA', 'TARJETA_DEBITO', 'TARJETA_CREDITO']);
const OTHER_NON_CASH_METHODS = new Set(['TRANSFERENCIA', 'VALES']);

async function getExpectedCashAvailable(userId: number, sucursalId: number, fechaApertura: Date, montoInicial: number) {
  const [salesByMethod, operationalExpensesAgg, withdrawalsAgg] = await Promise.all([
    prisma.sale.groupBy({
      by: ['metodoPago'],
      _sum: { montoTotal: true },
      where: {
        userId,
        sucursalId,
        fecha: { gte: fechaApertura, lte: new Date() },
        estado: 'COMPLETADA',
      },
    }),
    prisma.expense.aggregate({
      _sum: { monto: true },
      where: {
        userId,
        sucursalId,
        fecha: { gte: fechaApertura, lte: new Date() },
        categoria: { not: CASH_WITHDRAWAL_CATEGORY },
      },
    }),
    prisma.expense.aggregate({
      _sum: { monto: true },
      where: {
        userId,
        sucursalId,
        fecha: { gte: fechaApertura, lte: new Date() },
        categoria: CASH_WITHDRAWAL_CATEGORY,
      },
    }),
  ]);

  let ventasEfectivo = 0;
  for (const row of salesByMethod) {
    const method = String(row.metodoPago);
    if (method === 'EFECTIVO') {
      ventasEfectivo += Number(row._sum.montoTotal || 0);
    } else if (CARD_METHODS.has(method) || OTHER_NON_CASH_METHODS.has(method)) {
      continue;
    }
  }

  const gastosOperativos = Number(operationalExpensesAgg._sum.monto || 0);
  const retirosPrevios = Number(withdrawalsAgg._sum.monto || 0);

  return montoInicial + ventasEfectivo - gastosOperativos - retirosPrevios;
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id, 10);
    const body = await request.json();
    const amount = Number(body?.amount || 0);
    const reason = String(body?.reason || '').trim();

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ message: 'El monto del retiro debe ser mayor a 0.' }, { status: 400 });
    }

    if (!reason) {
      return NextResponse.json({ message: 'El motivo del retiro es obligatorio.' }, { status: 400 });
    }

    const activeCut = await prisma.corteCaja.findFirst({
      where: {
        userId,
        fechaCierre: null,
      },
      include: {
        sucursal: { select: { nombre: true } },
      },
    });

    if (!activeCut) {
      return NextResponse.json({ message: 'No tienes una caja abierta para realizar retiros.' }, { status: 400 });
    }

    const cashAvailable = await getExpectedCashAvailable(
      activeCut.userId,
      activeCut.sucursalId,
      activeCut.fechaApertura,
      Number(activeCut.montoInicial)
    );

    if (amount > cashAvailable) {
      return NextResponse.json(
        { message: `No hay efectivo suficiente en caja. Disponible: $${cashAvailable.toFixed(2)}` },
        { status: 400 }
      );
    }

    const withdrawalExpense = await prisma.expense.create({
      data: {
        monto: amount,
        concepto: `Retiro de efectivo: ${reason}`,
        categoria: CASH_WITHDRAWAL_CATEGORY,
        fecha: new Date(),
        userId: activeCut.userId,
        sucursalId: activeCut.sucursalId,
      },
    });

    return NextResponse.json({
      ok: true,
      message: 'Retiro registrado correctamente.',
      retiro: withdrawalExpense,
    });
  } catch (error) {
    console.error('Error registrando retiro de efectivo:', error);
    return NextResponse.json({ message: 'Error interno al registrar el retiro.' }, { status: 500 });
  }
}
