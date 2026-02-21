import { auth } from "@/auth";
import { NoticiaEditorForm } from "@/components/admin/noticia-editor-form";
import { redirect } from "next/navigation";

export default async function CmsNoticiasNewPage() {
  const session = await auth();
  const permissions = session?.user?.permissions || [];
  const canManageCms = session?.user?.role === "ADMIN" || permissions.includes("CMS");

  if (!canManageCms) {
    redirect("/");
  }

  return <NoticiaEditorForm mode="create" />;
}
