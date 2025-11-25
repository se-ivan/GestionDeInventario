import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendWhatsAppReceipt } from '@/lib/whatsapp';
import { PaymentMethod } from '@prisma/client';

// Definimos los tipos de entrada
interface CartItemPayload {
  bookId: number; 
  quantity: number;
}

interface SaleRequestBody {
  items: CartItemPayload[];
  sucursalId: number;
  paymentMethod: PaymentMethod; 
  userId?: number; 
  discountPercent?: number; 
}

export async function POST(request: Request) {
  try {
    const body: SaleRequestBody = await request.json();
    const { items, sucursalId, paymentMethod, userId, discountPercent = 0 } = body;

    // 1. Validaciones
    if (!items || items.length === 0) {
      return NextResponse.json({ message: 'El carrito está vacío.' }, { status: 400 });
    }
    if (!sucursalId) {
      return NextResponse.json({ message: 'Falta la sucursal ID.' }, { status: 400 });
    }

    // 2. Transacción de Base de Datos
    // Prisma ejecuta todo esto como una unidad. Si algo falla, se deshacen todos los cambios.
    const saleResult = await prisma.$transaction(async (tx) => {
      
      let saleSubtotal = 0;
      let saleImpuestos = 0;
      let saleTotal = 0;
      let saleDescuentoTotal = 0; 
      const detailData = [];

      // A) Procesar cada item
      for (const item of items) {
        const inventoryRecord = await tx.inventario.findUnique({
          where: {
            bookId_sucursalId: { bookId: item.bookId, sucursalId: sucursalId }
          },
          include: { book: true }
        });

        if (!inventoryRecord || inventoryRecord.stock < item.quantity) {
          throw new Error(`Stock insuficiente o producto no encontrado (ID: ${item.bookId})`);
        }

        // Cálculos
        const cantidad = item.quantity;
        const precioVentaOriginal = Number(inventoryRecord.book.precioVenta);
        const tasaIva = Number(inventoryRecord.book.tasaIva) || 0; 
        
        const descuentoUnitario = precioVentaOriginal * (discountPercent / 100);
        const precioFinalConDescuento = precioVentaOriginal - descuentoUnitario;
        
        const precioBaseUnitario = precioFinalConDescuento / (1 + (tasaIva / 100));
        const impuestoUnitario = precioFinalConDescuento - precioBaseUnitario;

        const subtotalLinea = precioBaseUnitario * cantidad;
        const impuestoLinea = impuestoUnitario * cantidad;
        const totalLinea = precioFinalConDescuento * cantidad;
        const descuentoTotalLinea = descuentoUnitario * cantidad;

        saleSubtotal += subtotalLinea;
        saleImpuestos += impuestoLinea;
        saleTotal += totalLinea;
        saleDescuentoTotal += descuentoTotalLinea;

        detailData.push({
          bookId: item.bookId,
          cantidad: cantidad, 
          precioUnitario: precioBaseUnitario,
          impuestoAplicado: impuestoLinea,
          subtotal: subtotalLinea,
          descuentoAplicado: descuentoTotalLinea
        });

        // Actualizar Stock
        await tx.inventario.update({
          where: { bookId_sucursalId: { bookId: item.bookId, sucursalId: sucursalId } },
          data: { stock: { decrement: cantidad } }
        });
      }

      // B) Crear Venta
      const newSale = await tx.sale.create({
        data: {
          sucursalId: sucursalId,
          userId: userId || 1, 
          fecha: new Date(),
          metodoPago: paymentMethod, 
          estado: "COMPLETADA",
          subtotal: saleSubtotal,
          impuestos: saleImpuestos,
          descuentoTotal: saleDescuentoTotal,
          montoTotal: saleTotal,
          details: {
            create: detailData.map(d => ({
              bookId: d.bookId,
              cantidad_vendida: d.cantidad, 
              precioUnitario: d.precioUnitario,
              subtotal: d.subtotal,
              descuentoAplicado: d.descuentoAplicado,
              impuestoAplicado: d.impuestoAplicado
            }))
          }
        },
        include: {
          details: { include: { book: true } },
          sucursal: true
        }
      });

      // --- RESPUESTA A TU DUDA ---
      // Este 'return' NO termina la función POST.
      // Solo termina la transacción y le entrega el valor 'newSale' a la variable 'const saleResult'.
      return newSale; 
    });

    // 3. Notificación WhatsApp (Se ejecuta DESPUÉS de que la transacción fue exitosa)
    try {
        const vendedor = await prisma.user.findUnique({
            where: { id: userId || 1 }, 
            select: { nombre: true }
        });
        const nombreVendedor = vendedor?.nombre || "Cajero";

        // Preparamos los datos limpios para el recibo
        const itemsReceipt = saleResult.details.map((d) => ({
            titulo: d.book.titulo,
            quantity: d.cantidad_vendida,
            // Reconstruimos el precio visual (con impuestos) para el cliente
            precio: (Number(d.subtotal) + Number(d.impuestoAplicado)) / d.cantidad_vendida
        }));

        await sendWhatsAppReceipt({
            saleId: saleResult.id,
            userName: nombreVendedor,
            sucursalName: saleResult.sucursal.nombre, // Usamos el dato que devolvió la transacción
            items: itemsReceipt,
            totalAmount: Number(saleResult.montoTotal),
            paymentMethod: paymentMethod, // ✅ Aquí pasamos el método que recibimos al inicio
        });

        console.log(`✅ WhatsApp enviado para venta #${saleResult.id}`);

    } catch (waError) {
        // Si falla WhatsApp, solo lo registramos en consola, pero NO fallamos la venta
        // porque el dinero ya se cobró y la venta ya se guardó en la DB.
        console.error("⚠️ Error enviando WhatsApp:", waError);
    }

    // 4. Respuesta Final al Cliente
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