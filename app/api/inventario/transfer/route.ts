import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// POST: Maneja la transferencia de stock entre sucursales
export async function POST(request: Request) {
  try {
    const {
      bookId,
      sourceSucursalId,
      destSucursalId,
      quantity,
    } = await request.json();

    const amount = Number(quantity);
    if (amount <= 0) {
      return NextResponse.json({ message: "La cantidad a transferir debe ser positiva." }, { status: 400 });
    }
    if (sourceSucursalId === destSucursalId) {
      return NextResponse.json({ message: "La sucursal de origen y destino no pueden ser la misma." }, { status: 400 });
    }

    // Usamos una transacción para asegurar que ambas operaciones (restar y sumar)
    // se completen con éxito, o ninguna lo haga.
    const result = await prisma.$transaction(async (tx) => {
      // 1. Encontrar y restar stock de la sucursal de origen
      const sourceInventory = await tx.inventario.findUnique({
        where: {
          bookId_sucursalId: {
            bookId: bookId,
            // CORRECCIÓN: El campo aquí debe llamarse 'sucursalId' para coincidir con el schema.
            // El valor viene de la variable 'sourceSucursalId' que recibimos en la petición.
            sucursalId: sourceSucursalId 
          }
        },
      });

      if (!sourceInventory || sourceInventory.stock < amount) {
        throw new Error("Stock insuficiente en la sucursal de origen.");
      }

      await tx.inventario.update({
        where: {
          bookId_sucursalId: {
            bookId: bookId,
            // CORRECCIÓN: Aplicamos el mismo cambio aquí.
            sucursalId: sourceSucursalId
          }
        },
        data: { stock: { decrement: amount } },
      });

      // 2. Encontrar y sumar stock en la sucursal de destino
      // upsert = update or insert. Si no existe, lo crea. Si existe, lo actualiza.
      await tx.inventario.upsert({
        where: {
          bookId_sucursalId: {
            bookId: bookId,
            // CORRECCIÓN: Y finalmente aquí, usando el valor de 'destSucursalId'.
            sucursalId: destSucursalId
          }
        },
        update: { stock: { increment: amount } },
        create: { bookId: bookId, sucursalId: destSucursalId, stock: amount },
      });

      return { success: true };
    });

    return NextResponse.json(result);

  } catch (error: any) {
    console.error("Error en la transferencia de stock:", error);
    // Devuelve el mensaje de error específico de la transacción (ej. "Stock insuficiente...")
    return NextResponse.json({ message: error.message || "Error en el servidor" }, { status: 500 });
  }
}
