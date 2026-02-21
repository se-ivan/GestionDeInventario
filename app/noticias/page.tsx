import Link from "next/link";
import { getPublishedNoticias } from "@/actions/noticias";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NoticiasPage() {
  const result = await getPublishedNoticias();
  const noticias = result.success ? result.data || [] : [];

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Noticias y Artículos</h1>
        <p className="text-sm text-muted-foreground">Publicaciones recientes del sistema.</p>
      </div>

      {noticias.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">No hay artículos publicados por ahora.</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {noticias.map((noticia) => (
            <Card key={noticia.id}>
              {noticia.imageUrl ? (
                <img src={noticia.imageUrl} alt={noticia.title} className="h-44 w-full rounded-t-xl object-cover" />
              ) : null}
              <CardHeader>
                <CardTitle className="line-clamp-2 text-xl">{noticia.title}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {new Date(noticia.publishedAt || noticia.createdAt).toLocaleDateString()} · {noticia.author?.nombre}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {noticia.excerpt ? <p className="line-clamp-3 text-sm text-muted-foreground">{noticia.excerpt}</p> : null}
                {noticia.slug ? (
                  <Link href={`/noticias/${noticia.slug}`} className="text-sm font-medium text-primary hover:underline">
                    Leer artículo
                  </Link>
                ) : (
                  <span className="text-sm text-muted-foreground">Artículo sin slug</span>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
