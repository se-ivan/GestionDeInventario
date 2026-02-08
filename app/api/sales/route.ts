import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendWhatsAppReceipt } from '@/lib/whatsapp';
import { PaymentMethod } from '@prisma/client';
import { auth } from '@/auth';

// --- GET: Listado de Ventas y Estadísticas ---
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get('limit')) || 20;
    const page = Number(searchParams.get('page')) || 1;
    
    // Obtenemos ventas ordenadas por fecha reciente con paginación
    const [sales, total] = await Promise.all([
        prisma.sale.findMany({
            take: limit,
            skip: (page - 1) * limit,
            orderBy: { fecha: 'desc' },
            include: {
                user: { select: { nombre: true } },
                sucursal: { select: { nombre: true } },
                details: {
                    select: { cantidad_vendida: true }
                }
            }
        }),
        prisma.sale.count()
    ]);

    // Calcular estadísticas (De la página actual - o idealmente cambiar a agregación global)
    // Nota: Para mejorar rendimiento, calculamos stats solo de lo visible O usar aggregate en query separada
    const totalRevenue = sales.reduce((acc, sale) => acc + Number(sale.montoTotal), 0);
    const totalTransactions = sales.length; // Transacciones en esta página
    const avgTicket = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    // Formatear datos para la tabla
    const formattedSales = sales.map(sale => ({
      id: sale.id,
      fecha: sale.fecha,
      vendedor: sale.user?.nombre || "Desconocido",
      sucursal: sale.sucursal?.nombre || "General",
      metodoPago: sale.metodoPago,
      total: Number(sale.montoTotal),
      itemsCount: sale.details.reduce((acc, curr) => acc + curr.cantidad_vendida, 0),
      estado: sale.estado
    }));

    return NextResponse.json({
      stats: {
        totalRevenue,
        totalTransactions,
        avgTicket
      },
      sales: formattedSales,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error("Error fetching sales:", error);
    return NextResponse.json({ message: 'Error al obtener ventas' }, { status: 500 });
  }
}

// --- POST: Crear Venta Mixta (Libros + Dulces) ---
interface CartItemPayload {
  id: number;      
  type: 'BOOK' | 'DULCE' | 'CONSIGNACION'; 
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
    const session = await auth();
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
        
        if (!item.id || !item.type) {
            throw new Error(`Item inválido en el carrito (Falta ID o Type)`);
        }

        const cantidad = item.quantity;
        const sucursalIdNum = Number(sucursalId);
        const itemIdNum = Number(item.id);

        let precioVentaOriginal = 0;
        let tasaIva = 0;
        let tituloProducto = "";
        
        // --- LÓGICA DE BIFURCACIÓN (LIBRO vs DULCE) ---
        if (item.type === 'BOOK') {
            const invRecord = await tx.inventario.findUnique({
                where: { bookId_sucursalId: { bookId: itemIdNum, sucursalId: sucursalIdNum } },
                include: { book: true }
            });

            if (!invRecord) throw new Error(`El libro (ID: ${itemIdNum}) no existe en esta sucursal.`);
            if (invRecord.stock < cantidad) throw new Error(`Stock insuficiente para libro: ${invRecord.book.titulo}`);

            precioVentaOriginal = Number(invRecord.book.precioVenta);
            tasaIva = Number(invRecord.book.tasaIva) || 0;
            tituloProducto = invRecord.book.titulo;

            await tx.inventario.update({
                where: { bookId_sucursalId: { bookId: itemIdNum, sucursalId: sucursalIdNum } },
                data: { stock: { decrement: cantidad } }
            });

        } else if (item.type === 'DULCE') {
            const invRecord = await tx.inventarioDulce.findUnique({
                where: { dulceId_sucursalId: { dulceId: itemIdNum, sucursalId: sucursalIdNum } },
                include: { dulce: true }
            });

            if (!invRecord) throw new Error(`El dulce (ID: ${itemIdNum}) no existe en esta sucursal.`);
            if (invRecord.stock < cantidad) throw new Error(`Stock insuficiente para dulce: ${invRecord.dulce.nombre}`);

            precioVentaOriginal = Number(invRecord.dulce.precioVenta);
            tasaIva = Number(invRecord.dulce.tasaIva) || 0;
            tituloProducto = invRecord.dulce.nombre;

            await tx.inventarioDulce.update({
                where: { dulceId_sucursalId: { dulceId: itemIdNum, sucursalId: sucursalIdNum } },
                data: { stock: { decrement: cantidad } }
            });
        } else if (item.type === 'CONSIGNACION') {
            const invRecord = await tx.inventarioConsignacion.findUnique({
                where: { consignacionId_sucursalId: { consignacionId: itemIdNum, sucursalId: sucursalIdNum } },
                include: { consignacion: true }
            });

            if (!invRecord) throw new Error(`El producto de consignación (ID: ${itemIdNum}) no existe en esta sucursal.`);
            if (invRecord.stock < cantidad) throw new Error(`Stock insuficiente: ${invRecord.consignacion.nombre}`);

            // USAR GANANCIA COMO PRECIO DE REGISTRO
            precioVentaOriginal = Number(invRecord.consignacion.gananciaLibreria);
            tasaIva = 0; 
            tituloProducto = invRecord.consignacion.nombre;

            await tx.inventarioConsignacion.update({
                where: { consignacionId_sucursalId: { consignacionId: itemIdNum, sucursalId: sucursalIdNum } },
                data: { stock: { decrement: cantidad } }
            });
        }

        // Cálculos Financieros
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
          bookId: item.type === 'BOOK' ? itemIdNum : null,   
          dulceId: item.type === 'DULCE' ? itemIdNum : null, 
          consignacionId: item.type === 'CONSIGNACION' ? itemIdNum : null,
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
          userId: session?.user?.id ? parseInt(session.user.id) : (userId || 1), 
          fecha: new Date(),
          metodoPago: paymentMethod, 
          subtotal: saleSubtotal,
          impuestos: saleImpuestos,
          descuentoTotal: saleDescuentoTotal,
          montoTotal: saleTotal,
          details: {
            create: detailData 
          }
        },
        include: {
          details: { 
            include: { book: true, dulce: true, consignacion: true } 
          },
          sucursal: true
        }
      });

      return newSale; 
    });

    // 3. Notificación WhatsApp
    try {
        const userIdToFind = session?.user?.id ? parseInt(session.user.id) : (userId || 1);
        const vendedor = await prisma.user.findUnique({ where: { id: userIdToFind }, select: { nombre: true } });
        
        const itemsReceipt = saleResult.details.map((d) => {
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