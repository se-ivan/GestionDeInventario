import { type NextRequest, NextResponse } from "next/server"

// Mock databases - In production, replace with actual database connections
const books = [
  {
    id: 1,
    isbn: "9780143127741",
    titulo: "Cien años de soledad",
    autor: "Gabriel García Márquez",
    precio: 25.99,
    stock: 15,
  },
  {
    id: 2,
    isbn: "9780525563983",
    titulo: "El amor en los tiempos del cólera",
    autor: "Gabriel García Márquez",
    precio: 22.5,
    stock: 8,
  },
  {
    id: 3,
    isbn: "9780307474728",
    titulo: "La casa de los espíritus",
    autor: "Isabel Allende",
    precio: 24.99,
    stock: 12,
  },
  { id: 4, isbn: "9780525432817", titulo: "Rayuela", autor: "Julio Cortázar", precio: 28.75, stock: 6 },
  { id: 5, isbn: "9780307389732", titulo: "Pedro Páramo", autor: "Juan Rulfo", precio: 18.99, stock: 20 },
  {
    id: 6,
    isbn: "9780525564447",
    titulo: "Como agua para chocolate",
    autor: "Laura Esquivel",
    precio: 21.5,
    stock: 10,
  },
  {
    id: 7,
    isbn: "9780307475466",
    titulo: "La sombra del viento",
    autor: "Carlos Ruiz Zafón",
    precio: 26.99,
    stock: 14,
  },
  { id: 8, isbn: "9780525432824", titulo: "Ficciones", autor: "Jorge Luis Borges", precio: 23.99, stock: 9 },
  { id: 9, isbn: "9780307389749", titulo: "El túnel", autor: "Ernesto Sabato", precio: 19.99, stock: 11 },
  { id: 10, isbn: "9780525563990", titulo: "Mafalda", autor: "Quino", precio: 16.99, stock: 25 },
]

const sales: Array<{
  id: number
  fecha: string
  monto_total: number
  items_count: number
}> = []

const saleDetails: Array<{
  id: number
  sale_id: number
  book_id: number
  cantidad_vendida: number
  precio_unitario: number
  subtotal: number
}> = []

// Simulate WhatsApp notification
async function sendWhatsAppNotification(saleData: any) {
  try {
    // In production, integrate with WhatsApp Business API
    console.log("📱 WhatsApp Notification:", {
      message: `Nueva venta procesada: $${saleData.monto_total.toFixed(2)}`,
      items: saleData.items_count,
      timestamp: saleData.fecha,
    })

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 500))
    return { success: true }
  } catch (error) {
    console.error("Error sending WhatsApp notification:", error)
    return { success: false, error }
  }
}

// POST /api/sales - Process new sale
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { items } = body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Items are required" }, { status: 400 })
    }

    // Validate stock availability
    for (const item of items) {
      const book = books.find((b) => b.id === item.book_id)
      if (!book) {
        return NextResponse.json({ error: `Book with ID ${item.book_id} not found` }, { status: 404 })
      }
      if (book.stock < item.quantity) {
        return NextResponse.json(
          {
            error: `Insufficient stock for "${book.titulo}". Available: ${book.stock}, Requested: ${item.quantity}`,
          },
          { status: 400 },
        )
      }
    }

    // Calculate total amount
    let totalAmount = 0
    const saleItems = []

    for (const item of items) {
      const book = books.find((b) => b.id === item.book_id)!
      const subtotal = item.unit_price * item.quantity
      totalAmount += subtotal

      saleItems.push({
        book_id: item.book_id,
        book_title: book.titulo,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal,
      })
    }

    // Create sale record
    const newSale = {
      id: Math.max(...sales.map((s) => s.id), 0) + 1,
      fecha: new Date().toISOString(),
      monto_total: totalAmount,
      items_count: items.reduce((sum: number, item: any) => sum + item.quantity, 0),
    }

    sales.push(newSale)

    // Create sale details and update stock
    for (const item of items) {
      const saleDetail = {
        id: Math.max(...saleDetails.map((sd) => sd.id), 0) + 1,
        sale_id: newSale.id,
        book_id: item.book_id,
        cantidad_vendida: item.quantity,
        precio_unitario: item.unit_price,
        subtotal: item.unit_price * item.quantity,
      }

      saleDetails.push(saleDetail)

      // Update book stock
      const bookIndex = books.findIndex((b) => b.id === item.book_id)
      if (bookIndex !== -1) {
        books[bookIndex].stock -= item.quantity
      }
    }

    // Send WhatsApp notification
    await sendWhatsAppNotification(newSale)

    return NextResponse.json(
      {
        sale: newSale,
        items: saleItems,
        message: "Sale processed successfully",
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Error processing sale:", error)
    return NextResponse.json({ error: "Failed to process sale" }, { status: 500 })
  }
}
