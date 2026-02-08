import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { consignacionId, fromSucursalId, toSucursalId, quantity } = body;

    const cant = Number(quantity);
    const originId = Number(fromSucursalId);
    const destId = Number(toSucursalId);
    const prodId = Number(consignacionId);

    if (!prodId || !originId || !destId || !cant || cant <= 0) {
      return NextResponse.json({ message: 'Datos incompletos o inválidos' }, { status: 400 });
    }

    if (originId === destId) {
      return NextResponse.json({ message: 'La sucursal de origen y destino no pueden ser la misma' }, { status: 400 });
    }

    // Usar transacción para asegurar la integridad
    const result = await prisma.$transaction(async (tx) => {
      // 1. Verificar stock en origen
      const sourceInv = await tx.inventarioConsignacion.findUnique({
        where: {
          consignacionId_sucursalId: {
            consignacionId: prodId,
            sucursalId: originId
          }
        }
      });

      if (!sourceInv || sourceInv.stock < cant) {
        throw new Error(`Stock insuficiente en la sucursal de origen. Disponible: ${sourceInv?.stock || 0}`);
      }

      // 2. Restar de origen
      await tx.inventarioConsignacion.update({
        where: {
          consignacionId_sucursalId: {
            consignacionId: prodId,
            sucursalId: originId
          }
        },
        data: {
          stock: { decrement: cant }
        }
      });

      // 3. Sumar/Crear en destino
      // Upsert es ideal aquí: crea si no existe, actualiza si existe
      await tx.inventarioConsignacion.upsert({
        where: {
          consignacionId_sucursalId: {
            consignacionId: prodId,
            sucursalId: destId
          }
        },
        create: {
          consignacionId: prodId,
          sucursalId: destId,
          stock: cant
        },
        update: {
          stock: { increment: cant }
        }
      });

      return { success: true };
    });

    return NextResponse.json(result);

  } catch (error: any) {
    console.error("Error en transferencia:", error);
    return NextResponse.json({ message: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
