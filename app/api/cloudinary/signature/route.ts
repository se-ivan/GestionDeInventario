import { NextResponse } from "next/server";
import crypto from "node:crypto";

export async function POST(request: Request) {
  try {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json({ error: "Cloudinary no está configurado" }, { status: 500 });
    }

    const payload = (await request.json().catch(() => ({}))) as { folder?: string };
    const folder = payload.folder || "cms-noticias";
    const timestamp = Math.floor(Date.now() / 1000);

    const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
    const signature = crypto.createHash("sha1").update(`${paramsToSign}${apiSecret}`).digest("hex");

    return NextResponse.json({
      cloudName,
      apiKey,
      timestamp,
      folder,
      signature,
    });
  } catch (error) {
    console.error("Error generating Cloudinary signature:", error);
    return NextResponse.json({ error: "No se pudo generar la firma" }, { status: 500 });
  }
}
