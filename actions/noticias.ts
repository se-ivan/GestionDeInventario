"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";

type NoticiaInput = {
  title: string;
  slug?: string;
  excerpt?: string;
  content: string;
  imageUrl?: string;
  published: boolean;
};

const normalizeSlug = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const buildUniqueSlug = async (title: string, customSlug?: string, ignoreId?: number) => {
  const baseSlug = normalizeSlug(customSlug?.trim() || title);
  let candidate = baseSlug || `articulo-${Date.now()}`;
  let counter = 1;

  while (true) {
    const existing = await prisma.noticia.findFirst({
      where: {
        slug: candidate,
        ...(ignoreId ? { id: { not: ignoreId } } : {}),
      },
      select: { id: true },
    });

    if (!existing) return candidate;

    candidate = `${baseSlug || "articulo"}-${counter}`;
    counter += 1;
  }
};

const canManageCms = (session: { user?: { role?: string; permissions?: string[] } } | null) => {
  if (!session?.user) return false;
  if (session.user.role === "ADMIN") return true;
  return (session.user.permissions || []).includes("CMS");
};

export async function getNoticias() {
  try {
    const session = await auth();
    if (!canManageCms(session)) {
      return { success: false, error: "No autorizado" };
    }

    const noticias = await prisma.noticia.findMany({
      orderBy: { createdAt: "desc" },
      include: { author: { select: { nombre: true } } },
    });
    return { success: true, data: noticias };
  } catch (error) {
    console.error("Error fetching noticias:", error);
    return { success: false, error: "Error al obtener las noticias" };
  }
}

export async function getNoticia(id: number) {
  try {
    const session = await auth();
    if (!canManageCms(session)) {
      return { success: false, error: "No autorizado" };
    }

    const noticia = await prisma.noticia.findUnique({
      where: { id },
      include: { author: { select: { nombre: true } } },
    });
    if (!noticia) return { success: false, error: "Noticia no encontrada" };
    return { success: true, data: noticia };
  } catch (error) {
    console.error("Error fetching noticia:", error);
    return { success: false, error: "Error al obtener la noticia" };
  }
}

export async function createNoticia(data: NoticiaInput) {
  try {
    const session = await auth();
    if (!session?.user?.id || !canManageCms(session)) {
      return { success: false, error: "No autorizado" };
    }

    const slug = await buildUniqueSlug(data.title, data.slug);
    const now = new Date();

    const noticia = await prisma.noticia.create({
      data: {
        title: data.title,
        slug,
        excerpt: data.excerpt,
        content: data.content,
        imageUrl: data.imageUrl || null,
        published: data.published,
        status: data.published ? "PUBLICADO" : "BORRADOR",
        publishedAt: data.published ? now : null,
        authorId: parseInt(session.user.id),
      },
    });

    revalidatePath("/admin");
    revalidatePath("/cms/noticias");
    revalidatePath("/cms/noticias/new");
    revalidatePath("/noticias");
    return { success: true, data: noticia };
  } catch (error) {
    console.error("Error creating noticia:", error);
    return { success: false, error: "Error al crear la noticia" };
  }
}

export async function updateNoticia(id: number, data: NoticiaInput) {
  try {
    const session = await auth();
    if (!session?.user?.id || !canManageCms(session)) {
      return { success: false, error: "No autorizado" };
    }

    const existing = await prisma.noticia.findUnique({
      where: { id },
      select: { id: true, publishedAt: true },
    });

    if (!existing) {
      return { success: false, error: "Noticia no encontrada" };
    }

    const slug = await buildUniqueSlug(data.title, data.slug, id);
    const shouldPublishNow = data.published && !existing.publishedAt;

    const noticia = await prisma.noticia.update({
      where: { id },
      data: {
        title: data.title,
        slug,
        excerpt: data.excerpt,
        content: data.content,
        imageUrl: data.imageUrl || null,
        published: data.published,
        status: data.published ? "PUBLICADO" : "BORRADOR",
        publishedAt: data.published ? (shouldPublishNow ? new Date() : existing.publishedAt) : null,
      },
    });

    revalidatePath("/admin");
    revalidatePath("/cms/noticias");
    revalidatePath(`/cms/noticias/${id}/edit`);
    revalidatePath("/noticias");
    revalidatePath(`/noticias/${noticia.slug}`);
    return { success: true, data: noticia };
  } catch (error) {
    console.error("Error updating noticia:", error);
    return { success: false, error: "Error al actualizar la noticia" };
  }
}

export async function deleteNoticia(id: number) {
  try {
    const session = await auth();
    if (!session?.user?.id || !canManageCms(session)) {
      return { success: false, error: "No autorizado" };
    }

    await prisma.noticia.delete({
      where: { id },
    });

    revalidatePath("/admin");
    revalidatePath("/cms/noticias");
    revalidatePath("/noticias");
    return { success: true };
  } catch (error) {
    console.error("Error deleting noticia:", error);
    return { success: false, error: "Error al eliminar la noticia" };
  }
}

export async function getPublishedNoticias() {
  try {
    const noticias = await prisma.noticia.findMany({
      where: { published: true, status: "PUBLICADO" },
      orderBy: { publishedAt: "desc" },
      include: { author: { select: { nombre: true } } },
    });

    return { success: true, data: noticias };
  } catch (error) {
    console.error("Error fetching published noticias:", error);
    return { success: false, error: "Error al obtener las noticias publicadas" };
  }
}

export async function getPublishedNoticiaBySlug(slug: string) {
  try {
    const noticia = await prisma.noticia.findFirst({
      where: { slug, published: true, status: "PUBLICADO" },
      include: { author: { select: { nombre: true } } },
    });

    if (!noticia) return { success: false, error: "Artículo no encontrado" };
    return { success: true, data: noticia };
  } catch (error) {
    console.error("Error fetching published noticia:", error);
    return { success: false, error: "Error al obtener el artículo" };
  }
}
