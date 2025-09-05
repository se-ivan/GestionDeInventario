import { PrismaClient } from '@prisma/client';

PrismaClient

// Declara una variable global para almacenar el cliente de Prisma.
declare global {
  var prisma: PrismaClient | undefined;
}

// Si ya existe una instancia de Prisma, la reutiliza. Si no, crea una nueva.
const client = globalThis.prisma || new PrismaClient();

// En desarrollo, asigna el cliente a la variable global para que no se cree en cada recarga de código.
if (process.env.NODE_ENV !== 'production') globalThis.prisma = client;

export default client;