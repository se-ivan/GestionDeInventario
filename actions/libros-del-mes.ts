"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

type LibroDelMesInput = {
  titulo: string;
  descripcion?: string;
  autor?: string;
  categoria: string;
  calificacion?: number | null;
  resenas?: number | null;
  portadaUrl?: string;
  isbn?: string;
  googleVolumeId?: string;
  activo: boolean;
  bookId?: number | null;
};

const canManageFeaturedBooks = (session: { user?: { role?: string; permissions?: string[] } } | null) => {
  if (!session?.user) return false;
  if (session.user.role === "ADMIN") return true;
  const permissions = session.user.permissions || [];
  return permissions.includes("CMS") || permissions.includes("BOOK_OF_MONTH");
};

const libroDelMesDelegate = (prisma as any).libroDelMes;

export async function getLibrosDelMes() {
  try {
    const session = await auth();
    if (!canManageFeaturedBooks(session)) {
      return { success: false, error: "No autorizado" };
    }

    const data = await libroDelMesDelegate.findMany({
      orderBy: [{ activo: "desc" }, { createdAt: "desc" }],
      include: {
        book: {
          select: {
            id: true,
            titulo: true,
            isbn: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    });

    return { success: true, data };
  } catch (error) {
    console.error("Error fetching libros del mes:", error);
    return { success: false, error: "No se pudieron obtener los libros del mes" };
  }
}

export async function createLibroDelMes(input: LibroDelMesInput) {
  try {
    const session = await auth();
    if (!session?.user?.id || !canManageFeaturedBooks(session)) {
      return { success: false, error: "No autorizado" };
    }

    if (!input.titulo?.trim()) {
      return { success: false, error: "El título es obligatorio" };
    }

    const created = await libroDelMesDelegate.create({
      data: {
        titulo: input.titulo.trim(),
        descripcion: input.descripcion?.trim() || null,
        autor: input.autor?.trim() || null,
        categoria: input.categoria?.trim() || "RECOMENDACION",
        calificacion: input.calificacion ?? null,
        resenas: input.resenas ?? null,
        portadaUrl: input.portadaUrl?.trim() || null,
        isbn: input.isbn?.trim() || null,
        googleVolumeId: input.googleVolumeId?.trim() || null,
        activo: input.activo,
        bookId: input.bookId || null,
        createdById: parseInt(session.user.id, 10),
      },
    });

    revalidatePath("/cms/libros-del-mes");
    return { success: true, data: created };
  } catch (error) {
    console.error("Error creating libro del mes:", error);
    return { success: false, error: "No se pudo crear el libro del mes" };
  }
}

export async function updateLibroDelMes(id: number, input: LibroDelMesInput) {
  try {
    const session = await auth();
    if (!canManageFeaturedBooks(session)) {
      return { success: false, error: "No autorizado" };
    }

    if (!input.titulo?.trim()) {
      return { success: false, error: "El título es obligatorio" };
    }

    const updated = await libroDelMesDelegate.update({
      where: { id },
      data: {
        titulo: input.titulo.trim(),
        descripcion: input.descripcion?.trim() || null,
        autor: input.autor?.trim() || null,
        categoria: input.categoria?.trim() || "RECOMENDACION",
        calificacion: input.calificacion ?? null,
        resenas: input.resenas ?? null,
        portadaUrl: input.portadaUrl?.trim() || null,
        isbn: input.isbn?.trim() || null,
        googleVolumeId: input.googleVolumeId?.trim() || null,
        activo: input.activo,
        bookId: input.bookId || null,
      },
    });

    revalidatePath("/cms/libros-del-mes");
    return { success: true, data: updated };
  } catch (error) {
    console.error("Error updating libro del mes:", error);
    return { success: false, error: "No se pudo actualizar el libro del mes" };
  }
}

export async function toggleLibroDelMesActivo(id: number, activo: boolean) {
  try {
    const session = await auth();
    if (!canManageFeaturedBooks(session)) {
      return { success: false, error: "No autorizado" };
    }

    await libroDelMesDelegate.update({
      where: { id },
      data: { activo },
    });

    revalidatePath("/cms/libros-del-mes");
    return { success: true };
  } catch (error) {
    console.error("Error toggling libro del mes:", error);
    return { success: false, error: "No se pudo cambiar el estado" };
  }
}

export async function deleteLibroDelMes(id: number) {
  try {
    const session = await auth();
    if (!canManageFeaturedBooks(session)) {
      return { success: false, error: "No autorizado" };
    }

    await libroDelMesDelegate.delete({ where: { id } });

    revalidatePath("/cms/libros-del-mes");
    return { success: true };
  } catch (error) {
    console.error("Error deleting libro del mes:", error);
    return { success: false, error: "No se pudo eliminar el registro" };
  }
}
