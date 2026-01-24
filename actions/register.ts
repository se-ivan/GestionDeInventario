"use server"

import * as z from "zod";
import { RegisterSchema } from "@/schemas";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export const register = async (values: z.infer<typeof RegisterSchema>) => {
  const session = await auth();

  if (session?.user?.role !== "ADMIN") {
    return { error: "No tienes permisos para realizar esta acción" };
  }

  const validatedFields = RegisterSchema.safeParse(values);

  if (!validatedFields.success) {
    return { error: "Campos inválidos" };
  }

  const { email, password, nombre } = validatedFields.data;
  const hashedPassword = await bcrypt.hash(password, 10);

  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (existingUser) {
    return { error: "Email ya en uso" };
  }

  await prisma.user.create({
    data: {
      nombre,
      email,
      password: hashedPassword,
      rol: "VENDEDOR" // Default role
    },
  });

  return { success: "Usuario creado con éxito" };
};
