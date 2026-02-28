import { auth } from "@/auth";
import { CmsSectionsTabs } from "@/components/admin/cms-sections-tabs";
import { LibrosDelMesManager } from "@/components/admin/libros-del-mes-manager";
import { redirect } from "next/navigation";

export default async function CmsLibrosDelMesPage() {
  const session = await auth();
  const permissions = session?.user?.permissions || [];
  const canManage =
    session?.user?.role === "ADMIN" ||
    permissions.includes("CMS") ||
    permissions.includes("BOOK_OF_MONTH");

  if (!canManage) {
    redirect("/");
  }

  return (
    <div className="flex-1 p-8 pt-6 bg-slate-50/30 min-h-screen">
      <CmsSectionsTabs />
      <LibrosDelMesManager />
    </div>
  );
}
