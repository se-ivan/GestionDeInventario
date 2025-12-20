import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendWhatsAppReceipt } from '@/lib/whatsapp';
import { PaymentMethod } from '@prisma/client';

// 1. Modificamos la interfaz para aceptar el TIPO de producto
interface CartItemPayload {
  id: number;          // Ahora es genérico, puede ser bookId o dulceId
  type: 'BOOK' | 'DULCE'; // 👈 NUEVO: Indispensable para saber dónde buscar
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

    if (!items || items.length === 0) return NextResponse.json({ message: 'Carrito vacío' }, { status: 400 });
    if (!sucursalId) return NextResponse.json({ message: 'Falta sucursal ID' }, { status: 400 });

    const saleResult = await prisma.$transaction(async (tx) => {
      let saleSubtotal = 0;
      let saleImpuestos = 0;
      let saleTotal = 0;
      let saleDescuentoTotal = 0; 
      const detailData = [];

      // A) Procesar cada item
      for (const item of items) {
        
        // Validaciones básicas
        if (!item.id || !item.type) {
            throw new Error(`Item inválido en el carrito (Falta ID o Type)`);
        }

        const cantidad = item.quantity;
        const sucursalIdNum = Number(sucursalId);
        const itemIdNum = Number(item.id);

        // Variables para normalizar datos (ya sea Libro o Dulce)
        let precioVentaOriginal = 0;
        let tasaIva = 0;
        let tituloProducto = "";
        
        // --- LÓGICA DE BIFURCACIÓN (LIBRO vs DULCE) ---
        
        if (item.type === 'BOOK') {
            // 1. Buscar en Inventario de Libros
            const invRecord = await tx.inventario.findUnique({
                where: { bookId_sucursalId: { bookId: itemIdNum, sucursalId: sucursalIdNum } },
                include: { book: true }
            });

            if (!invRecord) throw new Error(`El libro (ID: ${itemIdNum}) no existe en esta sucursal.`);
            if (invRecord.stock < cantidad) throw new Error(`Stock insuficiente para libro: ${invRecord.book.titulo}`);

            // Extraer datos
            precioVentaOriginal = Number(invRecord.book.precioVenta);
            tasaIva = Number(invRecord.book.tasaIva) || 0;
            tituloProducto = invRecord.book.titulo;

            // Restar Stock
            await tx.inventario.update({
                where: { bookId_sucursalId: { bookId: itemIdNum, sucursalId: sucursalIdNum } },
                data: { stock: { decrement: cantidad } }
            });

        } else if (item.type === 'DULCE') {
            // 2. Buscar en Inventario de Dulces
            const invRecord = await tx.inventarioDulce.findUnique({
                where: { dulceId_sucursalId: { dulceId: itemIdNum, sucursalId: sucursalIdNum } },
                include: { dulce: true } // Relación definida en tu schema
            });

            if (!invRecord) throw new Error(`El dulce (ID: ${itemIdNum}) no existe en esta sucursal.`);
            if (invRecord.stock < cantidad) throw new Error(`Stock insuficiente para dulce: ${invRecord.dulce.nombre}`);

            // Extraer datos
            precioVentaOriginal = Number(invRecord.dulce.precioVenta);
            tasaIva = Number(invRecord.dulce.tasaIva) || 0;
            tituloProducto = invRecord.dulce.nombre;

            // Restar Stock
            await tx.inventarioDulce.update({
                where: { dulceId_sucursalId: { dulceId: itemIdNum, sucursalId: sucursalIdNum } },
                data: { stock: { decrement: cantidad } }
            });
        } else {
            throw new Error(`Tipo de producto no soportado: ${item.type}`);
        }

        // --- CÁLCULOS FINANCIEROS (Comunes para ambos) ---
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

        // Preparamos el detalle (Prisma sabe cuál llenar basado en nulls)
        detailData.push({
          bookId: item.type === 'BOOK' ? itemIdNum : null,   // Si es libro, llenamos este
          dulceId: item.type === 'DULCE' ? itemIdNum : null, // Si es dulce, llenamos este
          cantidad_vendida: cantidad, 
          precioUnitario: precioBaseUnitario,
          impuestoAplicado: impuestoLinea,
          subtotal: subtotalLinea,
          descuentoAplicado: descuentoTotalLinea
        });
      }

      // B) Crear Venta Maestra
      const newSale = await tx.sale.create({
        data: {
          sucursalId: Number(sucursalId),
          userId: userId || 1, 
          fecha: new Date(),
          metodoPago: paymentMethod, 
          subtotal: saleSubtotal,
          impuestos: saleImpuestos,
          descuentoTotal: saleDescuentoTotal,
          montoTotal: saleTotal,
          details: {
            create: detailData // Insertamos todos los detalles preparados
          }
        },
        include: {
          details: { 
            include: { 
                book: true,  // Traemos libro si existe
                dulce: true  // Traemos dulce si existe
            } 
          },
          sucursal: true
        }
      });

      return newSale; 
    });

    // 3. Notificación WhatsApp (Actualizada para Dulces)
    try {
        const userIdToFind = userId || 1;
        const vendedor = await prisma.user.findUnique({ where: { id: userIdToFind }, select: { nombre: true } });
        
        // Mapeo inteligente para el recibo
        const itemsReceipt = saleResult.details.map((d) => {
            // Determinamos el nombre dependiendo de qué relación exista
            const nombreProducto = d.book?.titulo || d.dulce?.nombre || "Producto desconocido";
            
            return {
                titulo: nombreProducto,
                quantity: d.cantidad_vendida,
                precio: (Number(d.subtotal) + Number(d.impuestoAplicado)) / d.cantidad_vendida
            };
        });

        await sendWhatsAppReceipt({
            saleId: saleResult.id,
            userName: vendedor?.nombre || "Cajero",
            sucursalName: saleResult.sucursal.nombre,
            items: itemsReceipt,
            totalAmount: Number(saleResult.montoTotal),
            paymentMethod: paymentMethod,
        });

    } catch (waError) {
        console.error("Error en WhatsApp (no crítico):", waError);
    }

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