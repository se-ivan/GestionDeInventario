'use server'

import { auth } from "@/auth";
import db from "@/lib/prisma";

type EmailTemplatePayload = {
  nombre: string;
  subject?: string;
  html: string;
  design?: unknown;
};

const canManageEmails = (session: { user?: { role?: string } } | null) => {
  const role = session?.user?.role;
  return role === "ADMIN" || role === "VENDEDOR";
};

const isMissingEmailTemplatesTableError = (error: unknown) => {
  if (!error || typeof error !== "object") return false;
  const prismaError = error as { code?: string; meta?: { table?: string } };
  const tableName = prismaError.meta?.table || "";
  return prismaError.code === "P2021" && tableName.includes("email_templates");
};

const getEmailTemplateDelegate = () => {
  const delegate = (db as any).emailTemplate;
  if (!delegate) {
    return null;
  }
  return delegate;
};

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

export async function getEmailTemplates() {
  try {
    const session = await auth();
    if (!canManageEmails(session)) {
      return { success: false, error: "No autorizado" };
    }

    const emailTemplateDelegate = getEmailTemplateDelegate();
    if (!emailTemplateDelegate) {
      return {
        success: false,
        error: "Prisma Client no incluye EmailTemplate todavía. Ejecuta: pnpm prisma generate",
      };
    }

    const templates = await emailTemplateDelegate.findMany({
      where: { activo: true },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        nombre: true,
        subject: true,
        html: true,
        design: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return { success: true, data: templates };
  } catch (error) {
    console.error("Error obteniendo plantillas de correo:", error);
    if (isMissingEmailTemplatesTableError(error)) {
      return {
        success: false,
        error: "Falta la tabla email_templates. Ejecuta: pnpm db:execute:emailtemplates",
      };
    }
    return { success: false, error: "No se pudieron cargar las plantillas" };
  }
}

export async function saveEmailTemplate(payload: EmailTemplatePayload) {
  try {
        const emailTemplateDelegate = getEmailTemplateDelegate();
        if (!emailTemplateDelegate) {
          return {
            success: false,
            error: "Prisma Client no incluye EmailTemplate todavía. Ejecuta: pnpm prisma generate",
          };
        }

    const session = await auth();
    if (!canManageEmails(session)) {
      return { success: false, error: "No autorizado" };
    }

    if (!payload.nombre?.trim()) {
      return { success: false, error: "El nombre de la plantilla es obligatorio" };
    }

    if (!payload.html?.trim()) {
      return { success: false, error: "No hay HTML para guardar" };
    }

    const createdById = session?.user?.id ? Number.parseInt(session.user.id, 10) : null;

    const template = await emailTemplateDelegate.create({
      data: {
        nombre: payload.nombre.trim(),
        subject: payload.subject?.trim() || null,
        html: payload.html,
        design: payload.design as object | null,
        createdById: Number.isNaN(createdById as number) ? null : createdById,
      },
      select: {
        id: true,
        nombre: true,
        subject: true,
        html: true,
        design: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return { success: true, data: template };
  } catch (error) {
    console.error("Error guardando plantilla de correo:", error);
    if (isMissingEmailTemplatesTableError(error)) {
      return {
        success: false,
        error: "Falta la tabla email_templates. Ejecuta: pnpm db:execute:emailtemplates",
      };
    }
    return { success: false, error: "No se pudo guardar la plantilla" };
  }
}
