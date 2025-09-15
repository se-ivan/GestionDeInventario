export const maxDuration = 300

interface ReceiptData {
  saleId: number
  userName: string
  sucursalName: string
  items: { titulo: string; quantity: number; precio: number | any }[]
  totalAmount: number | any
  paymentMethod: string
}

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 25000)

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        return response
      }

      if (response.status === 429) {
        const retryAfter = response.headers.get("retry-after")
        const waitTime = retryAfter ? Number.parseInt(retryAfter) * 1000 : 2000 * attempt
        console.log(`[v0] Rate limited, waiting ${waitTime}ms before retry ${attempt}`)
        await new Promise((resolve) => setTimeout(resolve, waitTime))
        continue
      }

      if (response.status >= 500) {
        throw new Error(`Server error: ${response.status}`)
      }

      // For client errors (4xx), don't retry
      const errorData = await response.json()
      throw new Error(`WhatsApp API error: ${JSON.stringify(errorData)}`)
    } catch (error) {
      console.log(`[v0] Attempt ${attempt} failed:`, error instanceof Error ? error.message : error)

      if (attempt === maxRetries) {
        throw error
      }

      const baseDelay = 1000 * Math.pow(2, attempt - 1)
      const jitter = Math.random() * 1000
      const delay = baseDelay + jitter

      console.log(`[v0] Retrying in ${delay}ms...`)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw new Error("Max retries exceeded")
}

export async function sendWhatsAppReceipt(data: ReceiptData) {
  const ownerPhoneNumber = process.env.OWNER_WHATSAPP_NUMBER
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID

  console.log("[v0] Starting WhatsApp receipt send process")
  console.log("[v0] Sale ID:", data.saleId)

  if (!ownerPhoneNumber) {
    console.error("[v0] OWNER_WHATSAPP_NUMBER environment variable is not configured")
    throw new Error("Owner phone number not configured")
  }
  if (!accessToken || !phoneNumberId) {
    console.error("[v0] WhatsApp API credentials are missing")
    throw new Error("WhatsApp API credentials missing")
  }

  const apiUrl = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`

  // la lógica para formatear la fecha, hora, libros, etc.
  const now = new Date()
  const timeZone = "America/Mexico_City" 
  const fecha = now.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone,
  })

  const hora = now.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone,
  })
  const detalleLibros = data.items
    .map((item) => `- ${item.quantity}x ${item.titulo} ($${(Number(item.precio) * item.quantity).toFixed(2)})`)
    .join("\n")
  const totalFormateado = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(
    data.totalAmount,
  )

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
              text: data.saleId.toString(),
            },
          ],
        },
        {
          type: "body",
          parameters: [
            { type: "text", text: fecha },
            { type: "text", text: hora },
            { type: "text", text: data.userName },
            { type: "text", text: detalleLibros },
            { type: "text", text: totalFormateado },
            { type: "text", text: data.paymentMethod },
            { type: "text", text: data.sucursalName },
          ],
        },
      ],
    },
  }

  try {
    console.log("[v0] Sending WhatsApp message with retry logic")

    const response = await fetchWithRetry(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    const responseData = await response.json()
    console.log("[v0] WhatsApp API response:", responseData)
    console.log(`[v0] Sale notification sent successfully to owner for sale ID: ${data.saleId}`)

    return responseData
  } catch (error) {
    console.error("[v0] Failed to send WhatsApp notification:", error)

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new Error("WhatsApp request timed out after 25 seconds")
      }
      if (error.message.includes("ETIMEDOUT")) {
        throw new Error("Network timeout - please check your connection")
      }
      if (error.message.includes("Rate limited")) {
        throw new Error("WhatsApp API rate limit exceeded - try again later")
      }
    }

    throw error
  }
}
