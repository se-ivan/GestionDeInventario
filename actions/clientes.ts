'use server'

import db from "@/lib/prisma";
import { ClientSchema } from "@/schemas";
import * as z from "zod";
import { revalidatePath } from "next/cache";

function normalizeClienteData(values: z.infer<typeof ClientSchema>) {
  const isStudent = values.tipo === "ESTUDIANTE";

  return {
    ...values,
    email: values.email || null,
    telefono: values.telefono || null,
    direccion: values.direccion || null,
    matricula: isStudent ? values.matricula?.trim() || null : null,
    semestre: isStudent ? values.semestre?.trim() || null : null,
    grupo: isStudent ? values.grupo?.trim() || null : null,
    turno: isStudent ? values.turno?.trim() || null : null,
  };
}

export async function getClientes() {
  try {
    const clientes = await db.cliente.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { visitas: true }
        }
      }
    });
    return { success: true, data: clientes };
  } catch (error) {
    console.error("Error fetching clients:", error);
    return { success: false, error: "Error al obtener clientes" };
  }
}

export async function createCliente(values: z.infer<typeof ClientSchema>) {
  const validatedFields = ClientSchema.safeParse(values);

  if (!validatedFields.success) {
    return { error: "Campos inválidos" };
  }

  // Generate a unique barcode/SKU
  // Format: CLI-TIMESTAMP-RANDOM or similar. 
  // Let's make it numeric 12 digits for standard barcode look if possible, or alphanumeric code 128.
  // User example has mixed.
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 9000) + 1000;
  const codigoBarras = `C${timestamp}${random}`; // C + 10 digits

  try {
    const normalized = normalizeClienteData(validatedFields.data);
    await db.cliente.create({
      data: {
        ...normalized,
        codigoBarras,
        sku: codigoBarras, 
      }
    });
    
    revalidatePath("/clientes");
    return { success: "Cliente creado exitosamente!" };
  } catch (error) {
    console.error(error);
    return { error: "Error al crear cliente" };
  }
}

export async function registrarVisita(codigoBarras: string) {
  if (!codigoBarras) return { error: "Código vacío" };

  try {
    const cliente = await db.cliente.findUnique({
      where: { codigoBarras }
    });

    if (!cliente) {
      return { error: "Cliente no encontrado" };
    }

    await db.visita.create({
      data: {
        clienteId: cliente.id,
      }
    });

    revalidatePath("/clientes");
    return { success: `Visita registrada para ${cliente.nombre}`, cliente };
  } catch (error) {
    console.error(error);
    return { error: "Error al registrar visita" };
  }
}

export async function deleteCliente(id: number) {
  try {
    await db.cliente.delete({ where: { id } });
    revalidatePath("/clientes");
    return { success: "Cliente eliminado" };
  } catch (error) {
    return { error: "Error al eliminar" };
  }
}

export async function updateCliente(id: number, values: z.infer<typeof ClientSchema>) {
    const validatedFields = ClientSchema.safeParse(values);
  
    if (!validatedFields.success) {
      return { error: "Campos inválidos" };
    }
  
    try {
        const normalized = normalizeClienteData(validatedFields.data);
      await db.cliente.update({
        where: { id },
        data: {
            ...normalized,
        }
      });
      
      revalidatePath("/clientes");
      return { success: "Cliente actualizado exitosamente!" };
    } catch (error) {
      console.error(error);
      return { error: "Error al actualizar cliente" };
    }
  }
