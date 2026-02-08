'use server'

import prisma from "@/lib/prisma"
import { ApartadoStatus } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"

// --- GET APARTADOS ---
export async function getApartados(filters: { status?: ApartadoStatus; search?: string; limit?: number; offset?: number }) {
  const { status, search, limit = 20, offset = 0 } = filters

  const where: any = {}
  
  if (status) {
    where.estado = status
  }
  
  if (search) {
    where.OR = [
      { clienteNombre: { contains: search, mode: 'insensitive' } },
      { clienteTelefono: { contains: search, mode: 'insensitive' } },
    ]
  }

  const rawApartados = await prisma.apartado.findMany({
    where,
    take: limit,
    skip: offset,
    orderBy: { fechaCreacion: 'desc' },
    include: {
      user: { select: { nombre: true } },
      items: {
        include: {
          book: true,
          dulce: true
        }
      }
    }
  })

  const apartados = rawApartados.map(apartado => ({
    ...apartado,
    montoTotal: Number(apartado.montoTotal),
    montoPagado: Number(apartado.montoPagado),
    saldoPendiente: Number(apartado.saldoPendiente),
    items: apartado.items.map(item => ({
      ...item,
      precioUnitario: Number(item.precioUnitario),
      subtotal: Number(item.subtotal),
      book: item.book ? {
        ...item.book,
        precioVenta: Number(item.book.precioVenta),
        precioCompra: Number(item.book.precioCompra),
        tasaIva: Number(item.book.tasaIva)
      } : null,
      dulce: item.dulce ? {
        ...item.dulce,
        precioVenta: Number(item.dulce.precioVenta),
        precioCompra: Number(item.dulce.precioCompra),
        tasaIva: Number(item.dulce.tasaIva)
      } : null
    }))
  }))

  // Calculate total count for pagination
  const totalCount = await prisma.apartado.count({ where })

  return { apartados, totalCount }
}

// --- CREATE APARTADO ---
interface CreateApartadoInput {
  clienteNombre: string
  clienteTelefono?: string
  fechaVencimiento: Date
  items: {
    type: 'BOOK' | 'DULCE'
    id: number
    cantidad: number
    precioUnitario: number
  }[]
  montoPagado: number
  sucursalId: number
}

export async function createApartado(data: CreateApartadoInput) {
    const session = await auth();
    // Default to user 1 if not authenticated (or handle error)
    const userId = session?.user?.id ? parseInt(session.user.id) : 1;
    
    // Determine sucursalId: prioritize user-selected value, then fall back to session, then pick first available
    let sucursalId = data.sucursalId || session?.user?.sucursalId;

    if (!sucursalId) {
        const firstSucursal = await prisma.sucursal.findFirst();
        if (!firstSucursal) throw new Error("No hay sucursales registradas en el sistema.");
        sucursalId = firstSucursal.id;
    }
    
    // Calculate totals
    const montoTotal = data.items.reduce((acc, item) => acc + (item.cantidad * item.precioUnitario), 0)
    const saldoPendiente = montoTotal - data.montoPagado
    
    // Start Transaction
    try {
        const result = await prisma.$transaction(async (tx) => {
            // 1. Create Apartado
            const apartado = await tx.apartado.create({
                data: {
                    userId,
                    sucursalId,
                    clienteNombre: data.clienteNombre,
                    clienteTelefono: data.clienteTelefono,
                    fechaVencimiento: data.fechaVencimiento,
                    montoTotal,
                    montoPagado: data.montoPagado,
                    saldoPendiente,
                    estado: 'ACTIVO',
                    items: {
                        create: data.items.map(item => ({
                            bookId: item.type === 'BOOK' ? item.id : null,
                            dulceId: item.type === 'DULCE' ? item.id : null,
                            cantidad: item.cantidad,
                            precioUnitario: item.precioUnitario,
                            subtotal: item.cantidad * item.precioUnitario
                        }))
                    }
                }
            })

            // 2. Decrement Stock
            for (const item of data.items) {
                if (item.type === 'BOOK') {
                     const inv = await tx.inventario.findUnique({
                         where: { bookId_sucursalId: { bookId: item.id, sucursalId } }
                     })
                     if (!inv) {
                         throw new Error(`El producto (Libro ID ${item.id}) no está registrado en el inventario de esta sucursal.`)
                     }
                     if (inv.stock < item.cantidad) {
                         throw new Error(`Stock insuficiente para el libro (ID ${item.id}). Disponible: ${inv.stock}`)
                     }
                     
                     await tx.inventario.update({
                         where: { bookId_sucursalId: { bookId: item.id, sucursalId } },
                         data: { stock: { decrement: item.cantidad } }
                     })
                } else {
                     const inv = await tx.inventarioDulce.findUnique({
                         where: { dulceId_sucursalId: { dulceId: item.id, sucursalId } }
                     })
                     if (!inv) {
                         throw new Error(`El producto (Dulce ID ${item.id}) no está registrado en el inventario de esta sucursal.`)
                     }
                     if (inv.stock < item.cantidad) {
                         throw new Error(`Stock insuficiente para el dulce (ID ${item.id}). Disponible: ${inv.stock}`)
                     }

                     await tx.inventarioDulce.update({
                         where: { dulceId_sucursalId: { dulceId: item.id, sucursalId } },
                         data: { stock: { decrement: item.cantidad } }
                     })
                }
            }
            
            return apartado
        })

        revalidatePath('/apartados')
        return { 
            success: true, 
            apartado: {
                ...result,
                montoTotal: Number(result.montoTotal),
                montoPagado: Number(result.montoPagado),
                saldoPendiente: Number(result.saldoPendiente)
            }
        }

    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

// --- ADD PAYMENT ---
export async function addPayment(apartadoId: number, amount: number) {
    try {
        const apartado = await prisma.apartado.findUnique({ where: { id: apartadoId } })
        if (!apartado) throw new Error("Apartado no encontrado")
        
        const newPaid = Number(apartado.montoPagado) + amount
        const newBalance = Number(apartado.montoTotal) - newPaid
        
        if (newPaid > Number(apartado.montoTotal)) {
             throw new Error("El monto excede el total")
        }

        const updated = await prisma.apartado.update({
            where: { id: apartadoId },
            data: {
                montoPagado: newPaid,
                saldoPendiente: newBalance,
            }
        })
        
        revalidatePath('/apartados')
        return { 
            success: true, 
            apartado: {
                ...updated,
                montoTotal: Number(updated.montoTotal),
                montoPagado: Number(updated.montoPagado),
                saldoPendiente: Number(updated.saldoPendiente)
            }
        }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

// --- CANCEL APARTADO ---
export async function cancelApartado(apartadoId: number) {
     try {
        await prisma.$transaction(async (tx) => {
            const apartado = await tx.apartado.findUnique({ 
                where: { id: apartadoId },
                include: { items: true }
            })
            
            if (!apartado) throw new Error("Apartado no encontrado")
            if (apartado.estado === 'CANCELADO') throw new Error("Ya está cancelado")
            if (apartado.estado === 'COMPLETADO') throw new Error("Ya está completado, no se puede cancelar")

            // 1. Update Status
            await tx.apartado.update({
                where: { id: apartadoId },
                data: { estado: 'CANCELADO' }
            })

            // 2. Return Stock
            for (const item of apartado.items) {
                if (item.bookId) {
                    await tx.inventario.update({
                        where: { bookId_sucursalId: { bookId: item.bookId, sucursalId: apartado.sucursalId } },
                        data: { stock: { increment: item.cantidad } }
                    })
                } else if (item.dulceId) {
                     await tx.inventarioDulce.update({
                        where: { dulceId_sucursalId: { dulceId: item.dulceId, sucursalId: apartado.sucursalId } },
                        data: { stock: { increment: item.cantidad } }
                    })
                }
            }
        })
        
        revalidatePath('/apartados')
        return { success: true }
     } catch (error: any) {
         return { success: false, error: error.message }
     }
}

// --- COMPLETE APARTADO (PICKUP) ---
export async function completeApartado(apartadoId: number) {
    try {
        const apartado = await prisma.apartado.findUnique({ where: { id: apartadoId } })
        if (!apartado) throw new Error("Apartado no encontrado")
        
        if (Number(apartado.saldoPendiente) > 0) {
            throw new Error("Aún hay saldo pendiente. Liquide antes de entregar.")
        }

        await prisma.apartado.update({
            where: { id: apartadoId },
            data: { estado: 'COMPLETADO' }
        })

        revalidatePath('/apartados')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}
