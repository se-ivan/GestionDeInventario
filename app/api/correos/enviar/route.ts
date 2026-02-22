import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { convertEditorHtmlToEmailHtml, replaceTemplateVariables } from "@/lib/emailHtml";

type Recipient = {
  id: number;
  nombre: string;
  email: string;
  telefono?: string | null;
  tipo?: string | null;
};

type CampaignPayload = {
  subject: string;
  html: string;
  recipients: Recipient[];
};

function sanitizeRecipient(recipient: Recipient) {
  return {
    id: recipient.id,
    nombre: recipient.nombre || "Cliente",
    email: recipient.email,
    telefono: recipient.telefono || "",
    tipo: recipient.tipo || "",
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const role = session?.user?.role;
    const canSendEmails = role === "ADMIN" || role === "VENDEDOR";

    if (!canSendEmails) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 403 });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return NextResponse.json({ success: false, error: "Falta RESEND_API_KEY en variables de entorno" }, { status: 500 });
    }

    const body = (await request.json()) as CampaignPayload;
    const subject = body?.subject?.trim();
    const html = body?.html?.trim();
    const recipients = Array.isArray(body?.recipients) ? body.recipients : [];

    if (!subject) {
      return NextResponse.json({ success: false, error: "El asunto es obligatorio" }, { status: 400 });
    }

    if (!html) {
      return NextResponse.json({ success: false, error: "El contenido del correo es obligatorio" }, { status: 400 });
    }

    if (recipients.length === 0) {
      return NextResponse.json({ success: false, error: "Selecciona al menos un destinatario" }, { status: 400 });
    }

    const sender = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
    const successful: Array<{ email: string; id?: string }> = [];
    const failed: Array<{ email: string; error: string }> = [];

    for (const recipientInput of recipients) {
      const recipient = sanitizeRecipient(recipientInput);
      if (!recipient.email) {
        failed.push({ email: "(sin email)", error: "Email inválido" });
        continue;
      }

      const variables = {
        nombre_cliente: recipient.nombre,
        email_cliente: recipient.email,
        telefono_cliente: recipient.telefono,
        tipo_cliente: recipient.tipo,
      };

      const personalizedSubject = replaceTemplateVariables(subject, variables);
      const personalizedHtml = convertEditorHtmlToEmailHtml(replaceTemplateVariables(html, variables));

      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: sender,
          to: [recipient.email],
          subject: personalizedSubject,
          html: personalizedHtml,
        }),
      });

      const responseData = await resendResponse.json().catch(() => ({}));

      if (!resendResponse.ok) {
        failed.push({
          email: recipient.email,
          error: responseData?.message || "Error de Resend",
        });
        continue;
      }

      successful.push({ email: recipient.email, id: responseData?.id });
    }

    const sentCount = successful.length;
    const failedCount = failed.length;
    const total = recipients.length;
    const success = failedCount === 0;

    const message = success
      ? `Se enviaron ${sentCount} de ${total} correos correctamente.`
      : sentCount > 0
        ? `Envío parcial: ${sentCount} enviados y ${failedCount} fallidos de ${total}.`
        : `No se pudo enviar la campaña: ${failedCount} correos fallidos.`;

    return NextResponse.json({
      success,
      message,
      sentCount,
      failedCount,
      failed,
    });
  } catch (error) {
    console.error("Error enviando campaña de correos:", error);
    return NextResponse.json({ success: false, error: "No se pudo enviar la campaña" }, { status: 500 });
  }
}
