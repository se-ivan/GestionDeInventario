// File: app/api/cron/daily-summary/route.ts
// Descripción: Reporte de CIERRE DE CAJA diario con desglose por método de pago.
// Formato lineal para compatibilidad con plantillas de WhatsApp.

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// --- CONFIGURACIÓN ---
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// --- UTILIDADES ---
function pad2(n: number) { return String(n).padStart(2, '0'); }

function getMexicoDate() {
  const now = new Date();
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
  numeros: string[]
) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const templateName = 'cierre_de_caja';

  if (!token || !phoneId) throw new Error("Faltan credenciales de WhatsApp");

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
    const nowMexico = getMexicoDate();
    const startOfDay = new Date(nowMexico); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(nowMexico); endOfDay.setHours(23, 59, 59, 999);

    const ventas = await prisma.sale.findMany({
      where: {
        fecha: { gte: startOfDay, lte: endOfDay },
        estado: 'COMPLETADA'
      },
      include: { sucursal: true }
    });

    const destinatarios = ['5214431866632', '5214434911529'];

    if (ventas.length === 0) {
      await enviarResumenWhatsApp("Sin ventas hoy", formatDate(nowMexico), formatTime(nowMexico), destinatarios);
      return NextResponse.json({ message: 'Sin ventas, reporte enviado.' });
    }

    // 1. Estructura de datos: Sucursal -> Métodos -> Monto
    const desglose: Record<string, { metodos: Record<string, number>, totalSucursal: number }> = {};
    let granTotal = 0;

    for (const venta of ventas) {
      const suc = venta.sucursal?.nombre || 'General';
      const metodo = String(venta.metodoPago || 'OTRO').replace(/_/g, ' ');
      const monto = toNumber(venta.montoTotal);

      if (!desglose[suc]) {
        desglose[suc] = { metodos: {}, totalSucursal: 0 };
      }

      desglose[suc].metodos[metodo] = (desglose[suc].metodos[metodo] || 0) + monto;
      desglose[suc].totalSucursal += monto;
      granTotal += monto;
    }

    // 2. Construcción del mensaje lineal
    // Formato: Sucursal [METODO: $X, METODO: $Y (Total: $Z)]
    let partesMensaje: string[] = [];

    for (const [nombreSuc, data] of Object.entries(desglose)) {
      const detallesMetodos = Object.entries(data.metodos)
        .map(([m, total]) => `${m}: ${formatCurrency(total)}`)
        .join(", ");
      
      partesMensaje.push(`${nombreSuc} [${detallesMetodos} | Subtotal: ${formatCurrency(data.totalSucursal)}]`);
    }

    let mensajeTexto = partesMensaje.join("  /  ");
    mensajeTexto += `  ||  💰 TOTAL GENERAL: ${formatCurrency(granTotal)}`;

    // 3. Envío
    await enviarResumenWhatsApp(
        mensajeTexto, 
        formatDate(nowMexico), 
        formatTime(nowMexico),
        destinatarios
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Cierre con desglose enviado',
      data: desglose
    });

  } catch (error) {
    console.error('Error en daily-summary:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}