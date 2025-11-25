import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
// import { sendWhatsAppReceipt } from '@/lib/whatsapp'; // Descomentar cuando configures WhatsApp

// Definimos el tipo de dato que esperamos recibir
interface CartItemPayload {
  bookId: number; 
  quantity: number;
}

interface SaleRequestBody {
  items: CartItemPayload[];
  sucursalId: number;
  paymentMethod: 'EFECTIVO' | 'TARJETA_DEBITO' | 'TARJETA_CREDITO' | 'TRANSFERENCIA';
  userId?: number; 
}

export async function POST(request: Request) {
  try {
    const body: SaleRequestBody = await request.json();
    const { items, sucursalId, paymentMethod, userId } = body;

    // 1. Validaciones básicas
    if (!items || items.length === 0) {
      return NextResponse.json({ message: 'El carrito está vacío.' }, { status: 400 });
    }
    if (!sucursalId) {
      return NextResponse.json({ message: 'Falta la sucursal ID.' }, { status: 400 });
    }

    // 2. Transacción de Base de Datos (Todo o nada)
    const saleResult = await prisma.$transaction(async (tx) => {
      
      // A) Verificar Stock e Información de Libros
      let saleSubtotal = 0;
      let saleImpuestos = 0;
      let saleTotal = 0;
      const detailData = [];

      for (const item of items) {
        // Buscar libro y su inventario en la sucursal específica
        const inventoryRecord = await tx.inventario.findUnique({
          where: {
            bookId_sucursalId: {
              bookId: item.bookId,
              sucursalId: sucursalId
            }
          },
          include: { book: true }
        });

        // Validar existencia y stock
        if (!inventoryRecord) {
          throw new Error(`El libro con ID ${item.bookId} no existe en esta sucursal.`);
        }
        if (inventoryRecord.stock < item.quantity) {
          throw new Error(`Stock insuficiente para "${inventoryRecord.book.titulo}". Disponible: ${inventoryRecord.stock}`);
        }

        // B) Cálculos Financieros (Vital para el SAT)
        const precioFinalUnitario = Number(inventoryRecord.book.precioVenta);
        const tasaIva = Number(inventoryRecord.book.tasaIva) || 0; 
        const cantidad = item.quantity;

        // Desglose inverso
        const precioBaseUnitario = precioFinalUnitario / (1 + (tasaIva / 100));
        const impuestoUnitario = precioFinalUnitario - precioBaseUnitario;

        // Totales por línea
        const subtotalLinea = precioBaseUnitario * cantidad;
        const impuestoLinea = impuestoUnitario * cantidad;
        const totalLinea = precioFinalUnitario * cantidad;

        saleSubtotal += subtotalLinea;
        saleImpuestos += impuestoLinea;
        saleTotal += totalLinea;

        detailData.push({
          bookId: item.bookId,
          cantidad: cantidad, 
          precioUnitario: precioBaseUnitario, 
          impuestoAplicado: impuestoLinea,
          subtotal: subtotalLinea, 
        });

        // C) Actualizar Inventario
        await tx.inventario.update({
          where: {
            bookId_sucursalId: { bookId: item.bookId, sucursalId: sucursalId }
          },
          data: {
            stock: { decrement: cantidad }
          }
        });
      }

      // D) Crear la Venta (Cabecera)
      const newSale = await tx.sale.create({
        data: {
          sucursalId: sucursalId,
          userId: userId || 1, 
          fecha: new Date(),
          metodoPago: paymentMethod,
          estado: "COMPLETADA",
          
          subtotal: saleSubtotal,
          impuestos: saleImpuestos,
          descuentoTotal: 0, 
          montoTotal: saleTotal,
          
          // Detalles
          details: {
            create: detailData.map(d => {
              // NOTA: Usamos los nombres exactos que tu schema.prisma espera actualmente.
              return {
                bookId: d.bookId,
                cantidad_vendida: d.cantidad, 
                precioUnitario: d.precioUnitario,
                subtotal: d.subtotal,
                descuentoAplicado: 0, // <-- CORREGIDO: Usamos descuentoAplicado en lugar de descuento
                impuestoAplicado: d.impuestoAplicado // Aseguramos que este campo también se pase explícitamente
              };
            })
          }
        },
        include: {
          details: {
            include: { book: true }
          },
          sucursal: true
        }
      });

      return newSale;
    });

    return NextResponse.json({ 
      message: "Venta registrada correctamente", 
      saleId: saleResult.id,
      total: saleResult.montoTotal 
    }, { status: 201 });

  } catch (error: any) {
    console.error("Error procesando venta:", error);
    return NextResponse.json({ 
      message: error.message || 'Error interno del servidor' 
    }, { status: 500 });
  }
}