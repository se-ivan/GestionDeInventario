import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';


export async function GET() {
  try {
    const sucursales = await prisma.sucursal.findMany();
    return NextResponse.json(sucursales);
  } catch (error) {
    console.error("Error al obtener las sucursales:", error);
    return NextResponse.json({ message: 'Error al obtener las sucursales' }, { status: 500 });
  }
}


// Función para manejar peticiones POST (Crear una nueva sucursal)
export async function POST(request: Request) {
  try {
    // Desestructura los datos para tomar solo lo que necesitas
    const { nombre, direccion } = await request.json();

    // Valida que el nombre no esté vacío 
    if (!nombre) {
      return NextResponse.json({ message: 'El nombre es requerido' }, { status: 400 });
    }

    const newSucursal = await prisma.sucursal.create({
      data: {
        nombre: nombre,
        direccion: direccion,

      }
    });

    return NextResponse.json(newSucursal, { status: 201 }); // 201 significa "Creado"
  } catch (error) {
    console.error("Error al crear la sucursal:", error);
    return NextResponse.json({ message: 'Error al crear la sucursal' }, { status: 500 });
  }
}   
