import { auth } from "@/auth";
import { getNoticia } from "@/actions/noticias";
import { NoticiaEditorForm } from "@/components/admin/noticia-editor-form";
import { notFound, redirect } from "next/navigation";

interface CmsNoticiasEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function CmsNoticiasEditPage({ params }: CmsNoticiasEditPageProps) {
  const session = await auth();
  const permissions = session?.user?.permissions || [];
  const canManageCms = session?.user?.role === "ADMIN" || permissions.includes("CMS");

  if (!canManageCms) {
    redirect("/");
  }

  const { id } = await params;
  const noticiaId = Number(id);

  if (!Number.isInteger(noticiaId) || noticiaId <= 0) {
    notFound();
  }

  const result = await getNoticia(noticiaId);

  if (!result.success || !result.data) {
    notFound();
  }

  return (
    <NoticiaEditorForm
      mode="edit"
      initialNoticia={{
        id: result.data.id,
        title: result.data.title,
        slug: result.data.slug,
        excerpt: result.data.excerpt,
        content: result.data.content,
        imageUrl: result.data.imageUrl,
        published: result.data.published,
      }}
    />
  );
}
