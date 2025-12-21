import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic'; // Importante para que no cachee datos viejos

export async function GET() {
  try {
    // 1. OBTENER DATOS (Solo activos)
    // Traemos todas las sucursales
    const sucursales = await prisma.sucursal.findMany({
      orderBy: { id: 'asc' }
    });

    // Traemos Libros con su inventario
    const books = await prisma.book.findMany({
      where: { deletedAt: null },
      include: { inventario: true },
      orderBy: { titulo: 'asc' } 
    });

    // Traemos Dulces con su inventario
    const dulces = await prisma.dulce.findMany({
      where: { deletedAt: null },
      include: { inventario: true },
      orderBy: { nombre: 'asc' }
    });

    // 2. PREPARAR EL WORKBOOK
    const workbook = XLSX.utils.book_new();

    // --- FUNCIÓN HELPER PARA GENERAR MATRIZ DE DATOS ---
    // Esta función crea las "Tablas separadas" visualmente en una sola hoja
    const buildSheetData = (items: any[], type: 'book' | 'dulce') => {
      const rows: any[] = [];

      sucursales.forEach(sucursal => {
        // A. Encabezado de la Sucursal (Estilo visual)
        rows.push([`SUCURSAL: ${sucursal.nombre.toUpperCase()}`]);
        
        // B. Encabezados de la Tabla
        if (type === 'book') {
          rows.push(['ISBN', 'Título', 'Autor', 'Editorial', 'Ubicación', 'Stock', 'Mínimo', 'Costo', 'Precio Venta']);
        } else {
          rows.push(['Código', 'Nombre', 'Marca', 'Sabor', 'Ubicación', 'Stock', 'Mínimo', 'Costo', 'Precio Venta']);
        }

        // C. Filtrar items que tienen inventario en esta sucursal O mostrar todos con stock 0
        // Opción: Mostramos TODOS los productos para que se vea el hueco si falta stock
        let totalStockSucursal = 0;
        let valorInventarioSucursal = 0;

        items.forEach(item => {
          // Buscamos el registro de inventario para esta sucursal específica
          const inv = item.inventario.find((i: any) => i.sucursalId === sucursal.id);
          
          // Datos comunes
          const stock = inv ? inv.stock : 0;
          const minStock = inv ? inv.minStock : 0;
          const ubicacion = inv ? inv.ubicacion : 'N/A';
          const costo = Number(item.precioCompra || 0);
          const precio = Number(item.precioVenta || 0);

          totalStockSucursal += stock;
          valorInventarioSucursal += (stock * costo);

          if (type === 'book') {
            rows.push([
              item.isbn || 'S/N',
              item.titulo,
              item.autor,
              item.editorial || '',
              ubicacion,
              stock,
              minStock,
              costo,
              precio
            ]);
          } else {
            rows.push([
              item.codigoBarras || 'S/N',
              item.nombre,
              item.marca || '',
              item.sabor || '',
              ubicacion,
              stock,
              minStock,
              costo,
              precio
            ]);
          }
        });

        // D. Pie de tabla de la sucursal (Resumen)
        rows.push(['', '', '', '', 'TOTALES SUCURSAL:', totalStockSucursal, '', `$${valorInventarioSucursal.toFixed(2)}`, '']);
        
        // E. Espaciadores para la siguiente tabla
        rows.push([]); 
        rows.push([]); 
      });

      return rows;
    };

    // 3. GENERAR HOJA DE LIBROS
    const bookData = buildSheetData(books, 'book');
    const wsBooks = XLSX.utils.aoa_to_sheet(bookData);
    
    // Ajustar anchos de columna (Opcional pero recomendado)
    wsBooks['!cols'] = [
      { wch: 15 }, // ISBN
      { wch: 35 }, // Título
      { wch: 20 }, // Autor
      { wch: 15 }, // Editorial
      { wch: 15 }, // Ubicación
      { wch: 8 },  // Stock
      { wch: 8 },  // Min
      { wch: 10 }, // Costo
      { wch: 10 }  // Precio
    ];
    XLSX.utils.book_append_sheet(workbook, wsBooks, "Libros Completo");

    // 4. GENERAR HOJA DE DULCERÍA
    const dulceData = buildSheetData(dulces, 'dulce');
    const wsDulces = XLSX.utils.aoa_to_sheet(dulceData);
    
    wsDulces['!cols'] = [
      { wch: 15 }, // Código
      { wch: 30 }, // Nombre
      { wch: 15 }, // Marca
      { wch: 15 }, // Sabor
      { wch: 15 }, // Ubicación
      { wch: 8 },  // Stock
      { wch: 8 },  // Min
      { wch: 10 }, // Costo
      { wch: 10 }  // Precio
    ];
    XLSX.utils.book_append_sheet(workbook, wsDulces, "Dulceria Completo");

    // 5. GENERAR BUFFER Y DESCARGAR
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    const now = new Date();
    const fileName = `Inventario_Global_${now.getDate()}-${now.getMonth()+1}-${now.getFullYear()}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });

  } catch (error) {
    console.error('Error exportando inventario:', error);
    return NextResponse.json({ message: 'Error interno al exportar' }, { status: 500 });
  }
}