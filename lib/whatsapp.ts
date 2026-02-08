export const maxDuration = 300;

interface ReceiptData {
  saleId: number;
  userName: string;
  sucursalName: string;
  items: { titulo: string; quantity: number; precio: number | any }[];
  totalAmount: number | any;
  paymentMethod: string;
}

// --- FUNCIÓN DE LIMPIEZA (CRÍTICA PARA EVITAR ERROR 132018) ---
// Elimina enters, tabs y reduce espacios múltiples a uno solo.
function sanitizeText(text: string): string {
  if (!text) return "";
  return text
    .toString()
    .replace(/(\r\n|\n|\r)/gm, " ") // Reemplaza saltos de línea por espacio
    .replace(/\t/g, " ")            // Reemplaza tabs por espacio
    .replace(/\s+/g, " ")           // Reemplaza múltiples espacios por uno solo
    .trim();                        // Quita espacios al inicio y final
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return response;
      }

      if (response.status === 429) {
        const retryAfter = response.headers.get("retry-after");
        const waitTime = retryAfter
          ? Number.parseInt(retryAfter) * 1000
          : 2000 * attempt;
        console.log(
          `[WhatsApp] Rate limited, esperando ${waitTime}ms antes del reintento ${attempt}`
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }

      if (response.status >= 500) {
        throw new Error(`Server error: ${response.status}`);
      }

      const errorData = await response.json();
      throw new Error(`WhatsApp API error: ${JSON.stringify(errorData)}`);
    } catch (error) {
      console.log(
        `[WhatsApp] Intento ${attempt} fallido:`,
        error instanceof Error ? error.message : error
      );

      if (attempt === maxRetries) {
        throw error;
      }

      const baseDelay = 1000 * Math.pow(2, attempt - 1);
      const jitter = Math.random() * 1000;
      const delay = baseDelay + jitter;

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error("Max retries exceeded");
}

export async function sendWhatsAppReceipt(data: ReceiptData) {
  const ownerPhoneNumber = process.env.OWNER_WHATSAPP_NUMBER;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  console.log("📨 [WhatsApp] Iniciando proceso de envío...");
  console.log("[WhatsApp] Sale ID:", data.saleId);

  if (!ownerPhoneNumber || !accessToken || !phoneNumberId) {
    console.error("❌ [WhatsApp] Faltan credenciales o número de teléfono");
    throw new Error("WhatsApp API credentials missing");
  }

  const apiUrl = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;

  // 1. Fechas
  const now = new Date();
  const timeZone = "America/Mexico_City";
  const fecha = now.toLocaleDateString("es-MX", {
    day: "2-digit", month: "long", year: "numeric", timeZone,
  });
  const hora = now.toLocaleTimeString("es-MX", {
    hour: "2-digit", minute: "2-digit", hour12: true, timeZone,
  });

  // 2. Limpieza de datos (SANITIZACIÓN)
  const cleanUserName = sanitizeText(data.userName);
  const cleanSucursal = sanitizeText(data.sucursalName);
  const cleanPayment = sanitizeText(data.paymentMethod);

  // 3. Construcción del detalle de libros con limpieza individual
  let detalleLibros = "";
  
  // Mapeamos y limpiamos cada título individualmente antes de unir
  const itemsFormatted = data.items.map((item) => {
    const tituloLimpio = sanitizeText(item.titulo); 
    // Aseguramos que el título no sea extremadamente largo para no romper la plantilla
    const tituloCorto = tituloLimpio.length > 30 ? tituloLimpio.substring(0, 27) + "..." : tituloLimpio;
    
    return `${item.quantity}x ${tituloCorto} ($${(Number(item.precio) * item.quantity).toFixed(2)})`;
  });

  if (itemsFormatted.length <= 3) {
    detalleLibros = itemsFormatted.join(" | ");
  } else {
    const firstTwoItems = itemsFormatted.slice(0, 2).join(" | ");
    
    const remainingCount = data.items.length - 2;
    const remainingTotal = data.items
      .slice(2)
      .reduce((sum, item) => sum + Number(item.precio) * item.quantity, 0);

    detalleLibros = `${firstTwoItems} | +${remainingCount} libros más ($${remainingTotal.toFixed(2)})`;
  }

  const totalFormateado = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(data.totalAmount);

  const payload = {
    messaging_product: "whatsapp",
    to: ownerPhoneNumber,
    type: "template",
    template: {
      name: "ticket_ventas",
      language: { code: "es_MX" },
      components: [
        {
          type: "header",
          parameters: [
            { type: "text", text: sanitizeText(data.saleId.toString()) },
          ],
        },
        {
          type: "body",
          parameters: [
            { type: "text", text: fecha },             // {{1}}
            { type: "text", text: hora },              // {{2}}
            { type: "text", text: cleanUserName },     // {{3}}
            { type: "text", text: detalleLibros },     // {{4}} - Aquí estaba el error
            { type: "text", text: totalFormateado },   // {{5}}
            { type: "text", text: cleanPayment },      // {{6}}
            { type: "text", text: cleanSucursal },     // {{7}}
          ],
        },
      ],
    },
  };

  try {
    const response = await fetchWithRetry(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();
    console.log(`✅ [WhatsApp] Enviado ID: ${data.saleId}`);
    return responseData;
  } catch (error) {
    console.error("❌ [WhatsApp] Error fatal:", error);
    throw error;
  }
}

interface CashCutData {
  sucursalName: string;
  userName: string;
  fechaApertura: Date;
  fechaCierre: Date;
  montoInicial: number;
  ventas: number;
  gastos: number;
  totalCalculado: number;
  totalReal: number;
  diferencia: number;
}

export async function sendCashCutReport(data: CashCutData) {
  const ownerPhoneNumber = process.env.OWNER_WHATSAPP_NUMBER;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!ownerPhoneNumber || !accessToken || !phoneNumberId) {
     console.error("❌ [WhatsApp] Credenciales faltantes para reporte de corte");
     return;
  }

  const apiUrl = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
  
  const timeZone = "America/Mexico_City";
  const fecha = data.fechaCierre.toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric", timeZone });
  const hora = data.fechaCierre.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone });
  
  const fmt = (n: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);

  const payload = {
    messaging_product: "whatsapp",
    to: ownerPhoneNumber,
    type: "template",
    template: {
      name: "reporte_corte_de_caja",
      language: { code: "es_MX" },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: fecha + " " + hora }, // {{1}} Fecha/Hora
            { type: "text", text: data.sucursalName },  // {{2}} Sucursal
            { type: "text", text: data.userName },      // {{3}} Usuario
            { type: "text", text: fmt(data.montoInicial) }, // {{4}} Inicial
            { type: "text", text: fmt(data.ventas) },   // {{5}} Ventas
            { type: "text", text: fmt(data.gastos) },   // {{6}} Gastos
            { type: "text", text: fmt(data.totalCalculado) }, // {{7}} Esperado
            { type: "text", text: fmt(data.totalReal) }, // {{8}} Real
            { type: "text", text: fmt(data.diferencia) }, // {{9}} Diferencia
          ]
        }
      ]
    }
  };

  try {
      await fetchWithRetry(apiUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      console.log("✅ [WhatsApp] Reporte de corte enviado.");
  } catch (e) {
      console.error("❌ [WhatsApp] Error enviando reporte corte:", e);
  }
}