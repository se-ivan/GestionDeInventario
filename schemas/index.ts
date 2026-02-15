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

export const PasswordChangeSchema = z.object({
  currentPassword: z.string().min(1, {
    message: "Contraseña actual es requerida",
  }),
  newPassword: z.string().min(6, {
    message: "La nueva contraseña debe tener al menos 6 caracteres",
  }),
  confirmPassword: z.string().min(1, {
    message: "Confirmar contraseña es requerida",
  }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

export const ClientSchema = z.object({
  nombre: z.string().min(1, { message: "El nombre es requerido" }),
  email: z.string().email("Email inválido").optional().or(z.literal('')),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
  matricula: z.string().optional(),
  semestre: z.string().optional(),
  grupo: z.string().optional(),
  turno: z.string().optional(),
  tipo: z.string().default("GENERAL"),
});

