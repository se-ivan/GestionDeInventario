export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = typeof reader.result === "string" ? reader.result : "";
      if (!value) {
        reject(new Error("No se pudo procesar la imagen"));
        return;
      }
      resolve(value);
    };
    reader.onerror = () => reject(new Error("Error al leer la imagen"));
    reader.readAsDataURL(file);
  });
}

export async function uploadImageFromClient(file: File): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (cloudName && uploadPreset) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);
    formData.append("folder", "cms-noticias");

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Falló la subida de imagen a Cloudinary");
    }

    const payload = (await response.json()) as { secure_url?: string };
    if (!payload.secure_url) {
      throw new Error("Cloudinary no devolvió URL de imagen");
    }

    return payload.secure_url;
  }

  if (cloudName) {
    const signatureResponse = await fetch("/api/cloudinary/signature", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder: "cms-noticias" }),
    });

    if (!signatureResponse.ok) {
      throw new Error("No se pudo obtener la firma de Cloudinary");
    }

    const signaturePayload = (await signatureResponse.json()) as {
      cloudName: string;
      apiKey: string;
      timestamp: number;
      folder: string;
      signature: string;
    };

    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", signaturePayload.apiKey);
    formData.append("timestamp", String(signaturePayload.timestamp));
    formData.append("folder", signaturePayload.folder);
    formData.append("signature", signaturePayload.signature);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${signaturePayload.cloudName}/image/upload`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Falló la subida de imagen firmada a Cloudinary");
    }

    const payload = (await response.json()) as { secure_url?: string };
    if (!payload.secure_url) {
      throw new Error("Cloudinary no devolvió URL de imagen");
    }

    return payload.secure_url;
  }

  return fileToDataUrl(file);
}
