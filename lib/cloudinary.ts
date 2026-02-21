export function getCloudinaryPublicIdFromUrl(url?: string | null): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("res.cloudinary.com")) return null;

    const marker = "/upload/";
    const idx = parsed.pathname.indexOf(marker);
    if (idx < 0) return null;

    let remainder = parsed.pathname.slice(idx + marker.length);

    const versionMatch = remainder.match(/^v\d+\//);
    if (versionMatch) {
      remainder = remainder.slice(versionMatch[0].length);
    }

    const withoutExtension = remainder.replace(/\.[a-zA-Z0-9]+$/, "");
    return withoutExtension || null;
  } catch {
    return null;
  }
}
