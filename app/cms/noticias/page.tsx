import { auth } from "@/auth";
import { NoticiasManager } from "@/components/admin/noticias-manager";
import { CmsSectionsTabs } from "@/components/admin/cms-sections-tabs";
import { redirect } from "next/navigation";

export default async function CmsNoticiasPage() {
  const session = await auth();
  const permissions = session?.user?.permissions || [];
  const canManageCms = session?.user?.role === "ADMIN" || permissions.includes("CMS");

  if (!canManageCms) {
    redirect("/");
  }

  return (
    <div className="flex-1 p-8 pt-6">
      <CmsSectionsTabs />
      <NoticiasManager />
    </div>
  );
}
