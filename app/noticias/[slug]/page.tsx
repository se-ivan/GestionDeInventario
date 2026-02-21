import { notFound } from "next/navigation";
import { getPublishedNoticiaBySlug } from "@/actions/noticias";
import { CldImage } from "next-cloudinary";
import { getCloudinaryPublicIdFromUrl } from "@/lib/cloudinary";

interface NoticiaDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default async function NoticiaDetailPage({ params }: NoticiaDetailPageProps) {
  const { slug } = await params;
  const result = await getPublishedNoticiaBySlug(slug);

  if (!result.success || !result.data) {
    notFound();
  }

  const noticia = result.data;
  const cloudinaryPublicId = getCloudinaryPublicIdFromUrl(noticia.imageUrl);

  return (
    <article className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <header className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight">{noticia.title}</h1>
        <p className="text-sm text-muted-foreground">
          {new Date(noticia.publishedAt || noticia.createdAt).toLocaleDateString()} · {noticia.author?.nombre}
        </p>
        {noticia.excerpt ? <p className="text-base text-muted-foreground">{noticia.excerpt}</p> : null}
      </header>

      {noticia.imageUrl ? (
        cloudinaryPublicId ? (
          <CldImage
            src={cloudinaryPublicId}
            alt={noticia.title}
            width={1200}
            height={675}
            crop={{ type: "auto", source: true }}
            className="max-h-[420px] w-full rounded-xl object-cover"
          />
        ) : (
          <img src={noticia.imageUrl} alt={noticia.title} className="max-h-[420px] w-full rounded-xl object-cover" />
        )
      ) : null}

      <div className="prose prose-slate dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: noticia.content }} />
    </article>
  );
}
