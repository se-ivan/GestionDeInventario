interface ReceiptData {
  saleId: number;
  userName: string; 
  sucursalName: string;
  items: { titulo: string; quantity: number; precio: number | any }[];
  totalAmount: number | any;
  paymentMethod: string;
}

export async function sendWhatsAppReceipt(data: ReceiptData) {
  // Obtenemos el número del dueño desde las variables de entorno
  const ownerPhoneNumber = process.env.OWNER_WHATSAPP_NUMBER;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!ownerPhoneNumber) {
    console.error("El número del dueño (OWNER_WHATSAPP_NUMBER) no está configurado.");
    return;
  }
  if (!accessToken || !phoneNumberId) {
    console.error("Faltan las credenciales de la API de WhatsApp.");
    return;
  }
  
  const apiUrl = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
  
  // la lógica para formatear la fecha, hora, libros, etc.
  const now = new Date();
  const fecha = now.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
  const hora = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
  const detalleLibros = data.items.map(item => `- ${item.quantity}x ${item.titulo} ($${(Number(item.precio) * item.quantity).toFixed(2)})`).join('\n');
  const totalFormateado = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(data.totalAmount);


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
                        {
                            type: "text",
                            // El ID de la venta es el parámetro {{1}} del encabezado
                            text: data.saleId.toString() 
                        }
                    ]
                },

                // 2. El objeto para el 'body' del mensaje
                {
                    type: "body",
                    parameters: [
                        { type: "text", text: fecha },             // {{1}} del cuerpo 
                        { type: "text", text: hora },              // {{2}} del cuerpo
                        { type: "text", text: data.userName },     // {{3}} del cuerpo
                        { type: "text", text: detalleLibros },     // {{4}} del cuerpo
                        { type: "text", text: totalFormateado },   // {{5}} del cuerpo
                        { type: "text", text: data.paymentMethod },// {{6}} del cuerpo
                        { type: "text", text: data.sucursalName }, // {{7}} del cuerpo
                    ]
                }
            ]
        }
    };


  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error de la API de WhatsApp: ${JSON.stringify(errorData)}`);
    }

    console.log(`Notificación de venta enviada exitosamente al dueño.`);
  } catch (error) {
    console.error("No se pudo enviar la notificación de WhatsApp al dueño:", error);
  }
}