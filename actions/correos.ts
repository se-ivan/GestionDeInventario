'use server'

import db from "@/lib/prisma";

export async function getClientesParaCorreo() {
  try {
    const clientes = await db.cliente.findMany({
      where: {
        email: {
          not: null,
        },
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        telefono: true,
        tipo: true,
      },
      orderBy: {
        nombre: "asc",
      },
    });

    return {
      success: true,
      data: clientes.filter((cliente) => Boolean(cliente.email)),
    };
  } catch (error) {
    console.error("Error obteniendo clientes para correo:", error);
    return {
      success: false,
      error: "No se pudieron cargar los clientes",
    };
  }
}
