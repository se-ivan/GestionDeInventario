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
    const sucursalId = searchParams.get('sucursalId');
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 20;

    const whereClause: any = {
        fechaCierre: { not: null } // Only completed cuts? Or all? User said "movements... in a day", usually implies finished shifts.
    };

    if (dateStr) {
        // Filter by specific day (start of day to end of day)
        // Adjust for timezone if needed, but simple string comparison or range is safer.
        // Assuming dateStr is in user's local day, e.g. "2023-10-27"
        const start = new Date(`${dateStr}T00:00:00`);
        const end = new Date(`${dateStr}T23:59:59.999`);
        whereClause.fechaApertura = {
            gte: start,
            lte: end
        };
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
