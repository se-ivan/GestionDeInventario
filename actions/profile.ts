"use server"

import * as z from "zod";
import { PasswordChangeSchema } from "@/schemas";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const changePassword = async (values: z.infer<typeof PasswordChangeSchema>) => {
  const session = await auth();

  if (!session?.user?.email) {
    return { error: "No autorizado" };
  }

  const validatedFields = PasswordChangeSchema.safeParse(values);

  if (!validatedFields.success) {
    return { error: "Campos inválidos" };
  }

  const { currentPassword, newPassword } = validatedFields.data;

  const user = await prisma.user.findUnique({
    where: {
      email: session.user.email,
    },
  });

  if (!user || !user.password) {
    return { error: "Usuario no encontrado" };
  }

  const passwordsMatch = await bcrypt.compare(currentPassword, user.password);

  if (!passwordsMatch) {
    return { error: "Contraseña actual incorrecta" };
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      password: hashedPassword,
    },
  });

  return { success: "Contraseña actualizada con éxito" };
};
