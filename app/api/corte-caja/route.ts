import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { sendCashCutReport } from '@/lib/whatsapp';

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

  // Calculate realtime totals
  const [salesAgg, expensesAgg] = await Promise.all([
    prisma.sale.aggregate({
      _sum: { montoTotal: true },
      where: {
        userId: activeCut.userId,
        sucursalId: activeCut.sucursalId,
        createdAt: { gte: activeCut.fechaApertura }
      }
    }),
    prisma.expense.aggregate({
      _sum: { monto: true },
      where: {
        userId: activeCut.userId,
        sucursalId: activeCut.sucursalId,
        createdAt: { gte: activeCut.fechaApertura }
      }
    })
  ]);

  const salesTotal = Number(salesAgg._sum.montoTotal || 0);
  const expensesTotal = Number(expensesAgg._sum.monto || 0);

  return NextResponse.json({
    active: true,
    data: {
      ...activeCut,
      ventasSistema: salesTotal,
      gastosSistema: expensesTotal,
      totalEsperado: Number(activeCut.montoInicial) + salesTotal - expensesTotal
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

  // Recalculate finals one last time
  const [salesAgg, expensesAgg] = await Promise.all([
    prisma.sale.aggregate({
      _sum: { montoTotal: true },
      where: {
        userId: cut.userId,
        sucursalId: cut.sucursalId,
        createdAt: { gte: cut.fechaApertura }
      }
    }),
    prisma.expense.aggregate({
      _sum: { monto: true },
      where: {
        userId: cut.userId,
        sucursalId: cut.sucursalId,
        createdAt: { gte: cut.fechaApertura }
      }
    })
  ]);

  const salesTotal = Number(salesAgg._sum.montoTotal || 0);
  const expensesTotal = Number(expensesAgg._sum.monto || 0);
  const expected = Number(cut.montoInicial) + salesTotal - expensesTotal;
  const real = Number(montoFinal);
  const diff = real - expected;

  const now = new Date();

  const updated = await prisma.corteCaja.update({
    where: { id: cut.id },
    data: {
      fechaCierre: now,
      ventasSistema: salesTotal,
      gastosSistema: expensesTotal,
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
    ventas: salesTotal,
    gastos: expensesTotal,
    totalCalculado: expected,
    totalReal: real,
    diferencia: diff,
  });
  */
  return NextResponse.json(updated);
}
