// File: app/api/cron/daily-summary/route.ts
// Descripción: Reporte de CIERRE DE CAJA diario (Texto simple para WhatsApp)
// CORRECCIÓN: Usa formato lineal para evitar errores de saltos de línea en la plantilla.

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// --- CONFIGURACIÓN ---
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// --- UTILIDADES ---
function pad2(n: number) { return String(n).padStart(2, '0'); }

function getMexicoDate() {
  const now = new Date();
  // Forzamos la zona horaria a México para el cálculo del día
  return new Date(now.toLocaleString("en-US", { timeZone: "America/Mexico_City" }));
}

function formatDate(d: Date) { 
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`; 
}

function formatTime(d: Date) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
}

function toNumber(value: any): number {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  try {
    // @ts-ignore
    if (typeof value.toNumber === 'function') return value.toNumber();
    // @ts-ignore
    if (typeof value.toString === 'function') return Number(value.toString()) || 0;
  } catch {}
  return 0;
}

// --- ENVÍO WHATSAPP ---
async function enviarResumenWhatsApp(
  mensajeSucursales: string,
  fecha: string,
  hora: string,
  numeros: string[] // Ahora recibe un arreglo
) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const templateName = 'cierre_de_caja';

  if (!token || !phoneId) throw new Error("Faltan credenciales de WhatsApp");

  // Promesas para enviar a todos los números en paralelo
  const envios = numeros.map(async (numero) => {
    const payload = {
      messaging_product: 'whatsapp',
      to: numero,
      type: 'template',
      template: {
        name: templateName,
        language: { code: 'es_MX' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: mensajeSucursales }, 
              { type: 'text', text: fecha },
              { type: 'text', text: hora }
            ]
          }
        ]
      }
    };

    const res = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    return res.ok ? res.json() : Promise.reject(await res.json());
  });

  return Promise.all(envios);
}
// --- HANDLER PRINCIPAL ---
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const forceMode = searchParams.get('force') === 'true';

  const authHeader = request.headers.get('authorization');
  if (!forceMode && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    // 1. Calcular rango de "Hoy" (Hora México)
    const nowMexico = getMexicoDate();
    const startOfDay = new Date(nowMexico); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(nowMexico); endOfDay.setHours(23, 59, 59, 999);

    // 2. Obtener ventas
    const ventas = await prisma.sale.findMany({
      where: {
        fecha: { gte: startOfDay, lte: endOfDay },
        estado: 'COMPLETADA'
      },
      include: { sucursal: true }
    });

    if (ventas.length === 0) {
      const destinatarios = ['5214431866632', '5214431866632']; 
      await enviarResumenWhatsApp("Sin ventas hoy", formatDate(nowMexico), formatTime(nowMexico), destinatarios);
      return NextResponse.json({ message: 'Sin ventas, reporte vacío enviado.' });
    }

    // 3. Calcular totales
    const totalesPorSucursal: Record<string, number> = {};
    let granTotal = 0;

    for (const venta of ventas) {
      const nombreSucursal = venta.sucursal?.nombre || 'General';
      const monto = toNumber(venta.montoTotal);

      if (!totalesPorSucursal[nombreSucursal]) totalesPorSucursal[nombreSucursal] = 0;
      totalesPorSucursal[nombreSucursal] += monto;
      granTotal += monto;
    }

    // 4. Formatear texto LINEAL (sin saltos de línea)
    // Usamos " | " como separador visual
    let partesMensaje: string[] = [];
    
    for (const [sucursal, total] of Object.entries(totalesPorSucursal)) {
      // Ej: "Centro: $1,200.00"
      partesMensaje.push(`${sucursal}: ${formatCurrency(total)}`);
    }
    
    // Unimos todo con separadores
    let mensajeTexto = partesMensaje.join("  |  ");
    
    // Agregamos el total al final con un separador especial
    mensajeTexto += `  ||  💰 TOTAL: ${formatCurrency(granTotal)}`;

    // Resultado final será algo como: 
    // "Centro: $500.00 | Norte: $200.00 || 💰 TOTAL: $700.00"

    // 5. Enviar
   const destinatarios = ['5214431866632', '5214431866632']; 

    await enviarResumenWhatsApp(
        mensajeTexto, 
        formatDate(nowMexico), 
        formatTime(nowMexico),
        destinatarios
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Cierre de caja enviado (formato lineal)',
      data: totalesPorSucursal
    });

  } catch (error) {
    console.error('Error en daily-summary:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}