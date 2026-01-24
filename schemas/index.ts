import * as z from "zod";

export const LoginSchema = z.object({
  email: z.string().email({
    message: "Email es requerido",
  }),
  password: z.string().min(1, {
    message: "Contraseña es requerida",
  }),
});

export const RegisterSchema = z.object({
  email: z.string().email({
    message: "Email es requerido",
  }),
  password: z.string().min(6, {
    message: "Mínimo 6 caracteres",
  }),
  nombre: z.string().min(1, {
    message: "Nombre es requerido",
  }),
});
