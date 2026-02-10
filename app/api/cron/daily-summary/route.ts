import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// --- CONFIGURACIÓN ---
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// --- UTILIDADES ---
function pad2(n: number) { return String(n).padStart(2, '0'); }

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

// NUEVA FUNCIÓN: Obtiene el rango exacto de inicio y fin del día actual en México, pero en UTC
function getMexicoDayRangeUTC() {
  const now = new Date();
  
  // 1. Obtenemos qué día es hoy en México (String)
  // Esto evita confusiones si el servidor ya cambió de día pero en México aún no.
  const mexicoDateString = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Mexico_City",
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now); // Retorna algo como "01/13/2026"

  // 2. Construimos las fechas de inicio y fin usando ese string
  // Forzamos el uso de la zona horaria de México para crear el objeto Date correcto
  const startOfDay = new Date(`${mexicoDateString} 00:00:00`); 
  const endOfDay = new Date(`${mexicoDateString} 23:59:59.999`);
  
  // Hack para asegurar que el offset se aplique correctamente si el servidor no tiene la locale
  // Sin embargo, una forma más robusta sin librerías externas en Vercel es calcular el offset manual
  // O usar el string ISO con offset. Vamos a usar un método seguro:
  
  // Método Seguro: Obtener componentes y reconstruir
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Mexico_City",
    year: 'numeric', month: 'numeric', day: 'numeric'
  }).formatToParts(now);
  
  const y = parts.find(p => p.type === 'year')?.value;
  const m = parts.find(p => p.type === 'month')?.value;
  const d = parts.find(p => p.type === 'day')?.value;

  // Creamos strings ISO con el offset de México (Standard Time es -06:00)
  // NOTA: Si hay cambio de horario, esto debería ajustarse, pero México eliminó gran parte del horario de verano.
  // Para máxima precisión se recomienda una librería como date-fns-tz, pero esto funcionará para el caso estándar:
  
  // Una estrategia infalible sin librerías:
  // Crear fecha en UTC y restarle el offset inverso para encontrar el punto en el tiempo
  // Pero para simplificarte la vida, usaremos el string ISO que Prisma entiende perfecto:
  
  const startISO = `${y}-${m?.padStart(2,'0')}-${d?.padStart(2,'0')}T00:00:00`;
  const endISO = `${y}-${m?.padStart(2,'0')}-${d?.padStart(2,'0')}T23:59:59`;

  // Convertimos esos strings (que representan hora México) a objetos Date UTC reales
  // Asumimos Offset -06:00 (Central Standard Time México)
  const startUtc = new Date(`${startISO}-06:00`);
  const endUtc = new Date(`${endISO}-06:00`);

  return { startUtc, endUtc, dateDisplay: `${d}/${m}/${y}` };
}

// --- ENVÍO WHATSAPP VENTAS ---
async function enviarResumenWhatsApp(
  mensajeSucursales: string,
  fecha: string,
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
              { type: 'text', text: new Date().toLocaleTimeString('es-MX', { timeZone: 'America/Mexico_City', hour: '2-digit', minute:'2-digit' }) }
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

// --- ENVÍO WHATSAPP GASTOS (NUEVO) ---
async function enviarGastosWhatsApp(
  fecha: string,
  detallesGastos: string,
  totalGastos: string,
  numeros: string[]
) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const templateName = 'notificacion_gastos'; 

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
              { type: 'text', text: fecha },           // {1} Fecha
              { type: 'text', text: detallesGastos },  // {2} Gastos (ej. Suc A: Cloro 10)
              { type: 'text', text: totalGastos }      // {3} Total
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
    // USAMOS LA NUEVA LÓGICA DE TIEMPO
    const { startUtc, endUtc, dateDisplay } = getMexicoDayRangeUTC();

    console.log(`Consultando ventas entre (UTC): ${startUtc.toISOString()} y ${endUtc.toISOString()}`);

    // Consultamos Ventas y Gastos en paralelo
    const [ventas, gastos] = await Promise.all([
        prisma.sale.findMany({
            where: {
                fecha: { gte: startUtc, lte: endUtc },
                estado: 'COMPLETADA'
            },
            include: { sucursal: true }
        }),
        prisma.expense.findMany({
            where: {
                fecha: { gte: startUtc, lte: endUtc }
            },
            include: { sucursal: true }
        })
    ]);

    const destinatarios = ['5214431866632', '5214434911529']; // Números de WhatsApp a notificar

    if (ventas.length === 0 && gastos.length === 0) {
      // Ajuste aquí para pasar la fecha correcta
      await enviarResumenWhatsApp("Sin movimientos hoy", dateDisplay, destinatarios);
      return NextResponse.json({ message: 'Sin movimientos, reporte enviado.' });
    }

    // --- PROCESAMIENTO DE VENTAS ---
    // Usamos la lógica original del daily-summary para generar el mensaje de libros
    if (ventas.length > 0) {
        const desglose: Record<string, { metodos: Record<string, number>, totalSucursal: number }> = {};
        let granTotalVentas = 0;

        for (const venta of ventas) {
            const suc = venta.sucursal?.nombre || 'General';
            const metodo = String(venta.metodoPago || 'OTRO').replace(/_/g, ' ');
            const monto = toNumber(venta.montoTotal);

            if (!desglose[suc]) {
                desglose[suc] = { metodos: {}, totalSucursal: 0 };
            }

            desglose[suc].metodos[metodo] = (desglose[suc].metodos[metodo] || 0) + monto;
            desglose[suc].totalSucursal += monto;
            granTotalVentas += monto;
        }

        let partesMensaje: string[] = [];

        for (const [nombreSuc, data] of Object.entries(desglose)) {
            const detallesMetodos = Object.entries(data.metodos)
                .map(([m, total]) => `${m}: ${formatCurrency(total)}`)
                .join(", ");
            
            partesMensaje.push(`${nombreSuc} [${detallesMetodos} | Subtotal: ${formatCurrency(data.totalSucursal)}]`);
        }

        let mensajeTexto = partesMensaje.join("  /  ");
        mensajeTexto += `  ||  💰 TOTAL GENERAL: ${formatCurrency(granTotalVentas)}`;

        await enviarResumenWhatsApp(
            mensajeTexto, 
            dateDisplay,
            destinatarios
        );
    } else {
        // Si hay gastos pero no ventas, enviamos aviso de "Sin ventas" para cumplir con el reporte
        await enviarResumenWhatsApp("Sin ventas hoy", dateDisplay, destinatarios);
    }

    // --- PROCESAMIENTO DE GASTOS (NUEVA PLANTILLA) ---
    if (gastos.length > 0) {
        const gastosPorSucursal: Record<string, { descripciones: string[], total: number }> = {};
        let granTotalGastos = 0;

        for (const gasto of gastos) {
            const suc = gasto.sucursal?.nombre || 'General';
            const monto = toNumber(gasto.monto);
            granTotalGastos += monto;

            if (!gastosPorSucursal[suc]) {
                gastosPorSucursal[suc] = { descripciones: [], total: 0 };
            }
            
            // Ejemplo formato item: "Cloro ($45)"
            gastosPorSucursal[suc].descripciones.push(`${gasto.concepto} (${formatCurrency(monto)})`);
            gastosPorSucursal[suc].total += monto;
        }

        // Construir string de detalles sin saltos de línea (usando separadores visuales)
        let detallesGastosArr: string[] = [];
        
        for (const [suc, data] of Object.entries(gastosPorSucursal)) {
            // Ejemplo: "Sucursal Centro: Cloro ($45), Escobas ($100)"
            const items = data.descripciones.join(", ");
            detallesGastosArr.push(`${suc}: ${items}`);
        }

        // Unir todo con un separador claro
        const textoDetalles = detallesGastosArr.join(" || "); 
        const totalTexto = formatCurrency(granTotalGastos);
        
        await enviarGastosWhatsApp(
            dateDisplay, 
            textoDetalles, 
            totalTexto,
            destinatarios
        );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Reportes enviados (Ventas y Gastos gestionados por separado)',
      debugRange: { start: startUtc, end: endUtc },
      data: { ventasCount: ventas.length, gastosCount: gastos.length }
    });

  } catch (error) {
    console.error('Error en daily-summary:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}