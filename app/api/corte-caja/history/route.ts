import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET(request: Request) {
  try {
    const session = await auth();
    // Only Admin or Managers should see this, or users seeing their own history? 
    // Usually "Gestion" implies full view, so let's restrict or filter.
    if (!session?.user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date'); // YYYY-MM-DD
    const startDateStr = searchParams.get('startDate'); // YYYY-MM-DD
    const endDateStr = searchParams.get('endDate'); // YYYY-MM-DD
    const sucursalId = searchParams.get('sucursalId');
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 20;

    const whereClause: any = {
        fechaCierre: { not: null } // Only completed cuts? Or all? User said "movements... in a day", usually implies finished shifts.
    };

    const parseStart = (value: string) => {
        const parsed = new Date(`${value}T00:00:00.000`);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    };

    const parseEnd = (value: string) => {
        const parsed = new Date(`${value}T23:59:59.999`);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    };

    if (startDateStr || endDateStr) {
        const effectiveStart = startDateStr || endDateStr;
        const effectiveEnd = endDateStr || startDateStr;

        if (effectiveStart && effectiveEnd) {
            let start = parseStart(effectiveStart);
            let end = parseEnd(effectiveEnd);

            if (start && end) {
                if (start > end) {
                    const tmpStart = start;
                    start = parseStart(effectiveEnd)!;
                    end = parseEnd(effectiveStart)!;
                    if (!start || !end) {
                        start = tmpStart;
                    }
                }

                whereClause.fechaApertura = {
                    gte: start,
                    lte: end
                };
            }
        }
    } else if (dateStr) {
        const start = parseStart(dateStr);
        const end = parseEnd(dateStr);

        if (start && end) {
            whereClause.fechaApertura = {
                gte: start,
                lte: end
            };
        }
    }

    if (sucursalId) {
        whereClause.sucursalId = Number(sucursalId);
    }

    const [cuts, total] = await Promise.all([
        prisma.corteCaja.findMany({
            where: whereClause,
            include: {
                user: { select: { nombre: true, email: true } },
                sucursal: { select: { nombre: true } }
            },
            take: limit,
            skip: (page - 1) * limit,
            orderBy: { fechaApertura: 'desc' }
        }),
        prisma.corteCaja.count({ where: whereClause })
    ]);

    return NextResponse.json({
        data: cuts,
        meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    });

  } catch (error) {
    console.error("Error fetching corte history:", error);
    return NextResponse.json({ message: 'Internal Error' }, { status: 500 });
  }
}
