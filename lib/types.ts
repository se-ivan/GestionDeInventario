// Representa un Libro tal como está en la base de datos.
import { Book as PrismaBook, Sucursal as PrismaSucursal, Inventario as PrismaInventario } from '@prisma/client';

export interface Book {
  id: number;
  isbn: string | null;
  titulo: string;
  autor: string;
  precio: number;
  // --- CAMPOS AÑADIDOS ---
  editorial: string | null;
  coleccion: string | null;
  anioPublicacion: number | null;
  genero: string | null;
}

// Representa una Sucursal.
export interface Sucursal {
  id: number;
  nombre: string;
  direccion?: string | null;
}

// Representa una entrada en la tabla de inventario.
export interface InventarioEntry {
  bookId: number;
  sucursalId: number;
  stock: number;
  book: Book;
  sucursal: Sucursal;
}

// Representa los datos que el formulario de libros maneja.
export interface BookFormData {
  isbn?: string;
  titulo: string;
  autor: string;
  precio: number;
  // --- CAMPOS AÑADIDOS ---
  editorial?: string;
  coleccion?: string;
  anioPublicacion?: number;
  genero?: string;
  // Campos para la creación del inventario inicial
  stock: number;
  sucursalId: number;
}

export interface InventarioEntry extends PrismaInventario {
  book: Book; // Asegura que la data del libro está incluida
}