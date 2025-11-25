// lib/whatsapp.ts

export async function sendWhatsAppReceipt({
  saleId,
  userName,
  sucursalName,
  items,
  totalAmount,
  paymentMethod,
}: {
  saleId: number;
  userName: string;
  sucursalName: string;
  items: { titulo: string; quantity: number; precio: number }[];
  totalAmount: number;
  paymentMethod: string;
}) {
  console.log("📨 [WhatsApp] Iniciando proceso de envío...");

  // 1. Verificación de Credenciales
  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  // NOTA: Asegúrate de tener un número destinatario definido o pasarlo como argumento
  // Para pruebas, usaremos una variable de entorno, o puedes poner tu número directo aquí.
  const recipientPhone = process.env.WHATSAPP_RECIPIENT_PHONE || "521XXXXXXXXXX"; 

  if (!token || !phoneId) {
    console.warn("⚠️ [WhatsApp] Faltan variables de entorno (TOKEN o PHONE_ID). No se envió el mensaje.");
    return;
  }

  // 2. Construcción del Mensaje (Resumen del ticket)
  // Formateamos los items para que se vean bonitos en una lista de texto
  const itemsList = items
    .map((item) => `• ${item.quantity}x ${item.titulo.substring(0, 20)}.. ($${item.precio.toFixed(2)})`)
    .join("\n");

  const messageBody = `
🧾 *Ticket de Venta #${saleId}*
👤 Vendedor: ${userName}
📍 Sucursal: ${sucursalName}
📅 Fecha: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}

*Productos:*
${itemsList}

--------------------------------
💰 *TOTAL: $${totalAmount.toFixed(2)}*
💳 Pago: ${paymentMethod}
--------------------------------
  `.trim();

  // 3. Envío a la API de Meta (WhatsApp Cloud API)
  try {
    const response = await fetch(
      `https://graph.facebook.com/v17.0/${phoneId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: recipientPhone, // El número que recibe la notificación (Admin o Cliente)
          type: "text",
          text: { body: messageBody },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ [WhatsApp] Error de API de Meta:", JSON.stringify(data, null, 2));
      throw new Error(data.error?.message || "Error desconocido de WhatsApp API");
    }

    console.log("✅ [WhatsApp] Mensaje enviado correctamente. ID:", data.messages?.[0]?.id);
  } catch (error) {
    console.error("❌ [WhatsApp] Falló la petición fetch:", error);
    // Relanzamos el error para que route.ts lo capture y lo registre también
    throw error;
  }
}