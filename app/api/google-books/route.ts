import { NextResponse } from "next/server";

const normalizeQuery = (value: string) => value.trim().replace(/\s+/g, " ");

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const isbn = searchParams.get("isbn")?.trim();
    const q = searchParams.get("q")?.trim();

    if (!isbn && !q) {
      return NextResponse.json({ message: "Debes enviar isbn o q" }, { status: 400 });
    }

    const key = process.env.GOOGLE_BOOKS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY;
    const rawQuery = isbn ? `isbn:${isbn}` : normalizeQuery(q || "");
    const url = new URL("https://www.googleapis.com/books/v1/volumes");
    url.searchParams.set("q", rawQuery);
    url.searchParams.set("maxResults", "10");
    if (key) {
      url.searchParams.set("key", key);
    }

    const response = await fetch(url.toString(), { method: "GET", cache: "no-store" });
    if (!response.ok) {
      return NextResponse.json({ message: "No se pudo consultar Google Books" }, { status: 502 });
    }

    const payload = (await response.json()) as {
      items?: Array<{
        id: string;
        volumeInfo?: {
          title?: string;
          authors?: string[];
          description?: string;
          categories?: string[];
          averageRating?: number;
          ratingsCount?: number;
          imageLinks?: { thumbnail?: string; smallThumbnail?: string };
          industryIdentifiers?: Array<{ type?: string; identifier?: string }>;
        };
      }>;
    };

    const items = (payload.items || []).map((item) => {
      const info = item.volumeInfo || {};
      const industryIdentifiers = info.industryIdentifiers || [];
      const isbn13 = industryIdentifiers.find((entry) => entry.type === "ISBN_13")?.identifier;
      const isbn10 = industryIdentifiers.find((entry) => entry.type === "ISBN_10")?.identifier;

      return {
        googleVolumeId: item.id,
        titulo: info.title || "",
        autor: info.authors?.join(", ") || "",
        descripcion: info.description || "",
        categoriaSugerida: info.categories?.[0] || "RECOMENDACION",
        calificacion: typeof info.averageRating === "number" ? info.averageRating : null,
        resenas: typeof info.ratingsCount === "number" ? info.ratingsCount : null,
        portadaUrl: info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || "",
        isbn: isbn13 || isbn10 || "",
      };
    });

    return NextResponse.json({ data: items });
  } catch (error) {
    console.error("Error consultando Google Books:", error);
    return NextResponse.json({ message: "Error interno consultando Google Books" }, { status: 500 });
  }
}
