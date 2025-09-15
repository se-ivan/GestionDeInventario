// app/api/sales/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
// --> 1. Importa la función para enviar mensajes de WhatsApp
import { sendWhatsAppReceipt } from '@/lib/whatsapp'; 

// Interfaz actualizada para coincidir con tu frontend
interface CartItemPayload {
  book_id: number;
  quantity: number;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // --> 2. Extrae 'paymentMethod' del cuerpo de la petición
    //    Asegúrate de que tu frontend lo esté enviando.
    const { items, sucursalId, paymentMethod } = body as { 
      items: CartItemPayload[]; 
      sucursalId: number;
      paymentMethod: string; // Nuevo campo
    };

    // --> 3. Añade validación para el nuevo campo
    if (!items || items.length === 0 || !sucursalId || !paymentMethod) {
      return NextResponse.json(
        { message: 'Faltan campos requeridos: productos, sucursal y método de pago son obligatorios.' },
        { status: 400 }
      );
    }

    // =======================================================================
    //  INICIO DE LA TRANSACCIÓN DE VENTA (Tu código original sin cambios)
    // =======================================================================
    const saleResult = await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const inventarioItem = await tx.inventario.findUnique({
          where: { bookId_sucursalId: { bookId: item.book_id, sucursalId: sucursalId } },
        });

        if (!inventarioItem || inventarioItem.stock < item.quantity) {
          const book = await tx.book.findUnique({ where: { id: item.book_id } });
          const bookTitle = book ? book.titulo : `Libro con ID ${item.book_id}`;
          throw new Error(`Stock insuficiente para: "${bookTitle}".`);
        }
      }

      const bookIds = items.map(item => item.book_id);
      const booksInDb = await tx.book.findMany({
        where: { id: { in: bookIds } },
      });

      const priceMap = new Map(booksInDb.map(book => [book.id, book.precio]));

      let montoTotal = 0;
      for (const item of items) {
        const price = priceMap.get(item.book_id);
        if (!price) throw new Error(`El libro con ID ${item.book_id} no fue encontrado.`);
        montoTotal += Number(price) * item.quantity;
      }
      
      const newSale = await tx.sale.create({
        data: { montoTotal: montoTotal },
      });

      for (const item of items) {
        const precioUnitario = priceMap.get(item.book_id)!;
        
        await tx.saleDetail.create({
          data: {
            saleId: newSale.id,
            bookId: item.book_id,
            cantidadVendida: item.quantity,
            precioUnitario: precioUnitario,
            subtotal: Number(precioUnitario) * item.quantity,
          },
        });

        await tx.inventario.update({
          where: { bookId_sucursalId: { bookId: item.book_id, sucursalId: sucursalId } },
          data: { stock: { decrement: item.quantity } },
        });

        await tx.book.update({
          where: { id: item.book_id },
          data: { stock: { decrement: item.quantity } },
        });
      }
      return newSale;
    });
    // =======================================================================
    //  FIN DE LA TRANSACCIÓN DE VENTA
    // =======================================================================


    // --> 4. INICIA EL PROCESO DE NOTIFICACIÓN (si la venta fue exitosa)
    // Lo envolvemos en su propio try/catch para que un error aquí no cancele la respuesta exitosa.
    try {
      // Obtenemos los datos necesarios para la plantilla de WhatsApp
      const [sucursal, books] = await Promise.all([
        prisma.sucursal.findUnique({ where: { id: sucursalId } }),
        prisma.book.findMany({ where: { id: { in: items.map(i => i.book_id) } } })
      ]);

      if (sucursal && books.length > 0) {
        const itemsWithDetails = items.map(item => {
          const details = books.find(b => b.id === item.book_id);
          return {
            titulo: details?.titulo || 'N/A',
            quantity: item.quantity,
            precio: details?.precio || 0,
          };
        });

        // Llamamos a la función que envía el mensaje
        sendWhatsAppReceipt({
          saleId: saleResult.id,
          userName: "Vendedor POS", // Idealmente, obtienes esto de la sesión del usuario
          sucursalName: sucursal.nombre,
          items: itemsWithDetails,
          totalAmount: saleResult.montoTotal,
          paymentMethod: paymentMethod,
        });
      }
    } catch (notificationError) {
      console.error("La venta se guardó, pero falló el envío de la notificación por WhatsApp:", notificationError);
    }
    
    // La respuesta al frontend no cambia, siempre es de éxito si la venta se guardó.
    return NextResponse.json({ message: "Venta realizada con éxito", sale: saleResult }, { status: 201 });

  } catch (error) {
    console.error("Error al procesar la venta:", error);
    if (error instanceof Error) {
        return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}