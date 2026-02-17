import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { sendCashCutReport } from '@/lib/whatsapp';

const CASH_WITHDRAWAL_CATEGORY = 'RETIRO_EFECTIVO';
const CARD_METHODS = new Set(['TARJETA', 'TARJETA_DEBITO', 'TARJETA_CREDITO']);
const OTHER_NON_CASH_METHODS = new Set(['TRANSFERENCIA', 'VALES']);

const calculateCashCutMetrics = async (
  userId: number,
  sucursalId: number,
  fechaApertura: Date,
  fechaCierre?: Date | null
) => {
  const endDate = fechaCierre ?? new Date();

  const [salesByMethod, operationalExpensesAgg, withdrawalsAgg] = await Promise.all([
    prisma.sale.groupBy({
      by: ['metodoPago'],
      _sum: { montoTotal: true },
      where: {
        userId,
        sucursalId,
        fecha: { gte: fechaApertura, lte: endDate },
        estado: 'COMPLETADA',
      },
    }),
    prisma.expense.aggregate({
      _sum: { monto: true },
      where: {
        userId,
        sucursalId,
        fecha: { gte: fechaApertura, lte: endDate },
        categoria: { not: CASH_WITHDRAWAL_CATEGORY },
      },
    }),
    prisma.expense.aggregate({
      _sum: { monto: true },
      where: {
        userId,
        sucursalId,
        fecha: { gte: fechaApertura, lte: endDate },
        categoria: CASH_WITHDRAWAL_CATEGORY,
      },
    }),
  ]);

  let ventasEfectivo = 0;
  let ventasTarjeta = 0;
  let ventasOtros = 0;

  for (const row of salesByMethod) {
    const amount = Number(row._sum.montoTotal || 0);
    const method = String(row.metodoPago);

    if (method === 'EFECTIVO') {
      ventasEfectivo += amount;
    } else if (CARD_METHODS.has(method)) {
      ventasTarjeta += amount;
    } else if (OTHER_NON_CASH_METHODS.has(method)) {
      ventasOtros += amount;
    } else {
      ventasOtros += amount;
    }
  }

  const gastosOperativos = Number(operationalExpensesAgg._sum.monto || 0);
  const retirosEfectivo = Number(withdrawalsAgg._sum.monto || 0);
  const ventasTotales = ventasEfectivo + ventasTarjeta + ventasOtros;

  return {
    ventasTotales,
    ventasEfectivo,
    ventasTarjeta,
    ventasOtros,
    gastosOperativos,
    retirosEfectivo,
  };
};

// GET: Check active session for current user
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const activeCut = await prisma.corteCaja.findFirst({
    where: {
      userId: parseInt(session.user.id),
      fechaCierre: null
    },
    include: { user: true, sucursal: true }
  });

  if (!activeCut) {
    return NextResponse.json({ active: false });
  }

  const metrics = await calculateCashCutMetrics(
    activeCut.userId,
    activeCut.sucursalId,
    activeCut.fechaApertura,
    activeCut.fechaCierre
  );

  const totalEsperadoCaja =
    Number(activeCut.montoInicial) +
    metrics.ventasEfectivo -
    metrics.gastosOperativos -
    metrics.retirosEfectivo;

  return NextResponse.json({
    active: true,
    data: {
      ...activeCut,
      ventasSistema: metrics.ventasTotales,
      ventasEfectivo: metrics.ventasEfectivo,
      ventasTarjeta: metrics.ventasTarjeta,
      ventasOtros: metrics.ventasOtros,
      gastosSistema: metrics.gastosOperativos,
      retirosSistema: metrics.retirosEfectivo,
      totalEsperadoCaja,
      totalEsperado: totalEsperadoCaja,
    }
  });
}

// POST: Open Cash Register
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { montoInicial, sucursalId } = body;

  // Check if already open
  const existing = await prisma.corteCaja.findFirst({
    where: { userId: parseInt(session.user.id), fechaCierre: null }
  });

  if (existing) {
    return NextResponse.json({ message: 'Ya tienes una caja abierta' }, { status: 400 });
  }

  const newCut = await prisma.corteCaja.create({
    data: {
      userId: parseInt(session.user.id),
      sucursalId: Number(sucursalId),
      montoInicial: Number(montoInicial) || 0,
      ventasSistema: 0,
    }
  });

  return NextResponse.json(newCut);
}

// PUT: Close Cash Register
export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { id, montoFinal } = body; // montoFinal is the REAL cash counted by user

  const cut = await prisma.corteCaja.findUnique({
    where: { id: Number(id) },
    include: { user: true, sucursal: true }
  });

  if (!cut || cut.fechaCierre) {
    return NextResponse.json({ message: 'Corte no válido o ya cerrado' }, { status: 400 });
  }

  const metrics = await calculateCashCutMetrics(cut.userId, cut.sucursalId, cut.fechaApertura, null);

  const expected =
    Number(cut.montoInicial) +
    metrics.ventasEfectivo -
    metrics.gastosOperativos -
    metrics.retirosEfectivo;

  const real = Number(montoFinal);
  const diff = real - expected;

  const now = new Date();

  const updated = await prisma.corteCaja.update({
    where: { id: cut.id },
    data: {
      fechaCierre: now,
      ventasSistema: metrics.ventasTotales,
      gastosSistema: metrics.gastosOperativos + metrics.retirosEfectivo,
      montoFinal: real,
      diferencia: diff
    }
  });

  // Send Whatsapp
  /*
  await sendCashCutReport({
    sucursalName: cut.sucursal?.nombre || 'N/A',
    userName: cut.user.nombre,
    fechaApertura: cut.fechaApertura,
    fechaCierre: now,
    montoInicial: Number(cut.montoInicial),
    ventas: metrics.ventasTotales,
    gastos: metrics.gastosOperativos + metrics.retirosEfectivo,
    totalCalculado: expected,
    totalReal: real,
    diferencia: diff,
  });
  */
  return NextResponse.json(updated);
}
