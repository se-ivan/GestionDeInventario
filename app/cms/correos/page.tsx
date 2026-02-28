import { auth } from "@/auth";
import { CmsSectionsTabs } from "@/components/admin/cms-sections-tabs";
import { EmailCampaignManager } from "@/components/admin/email-campaign-manager";
import { redirect } from "next/navigation";

export default async function CmsCorreosPage() {
  const session = await auth();
  const role = session?.user?.role;
  const canAccessEmails = role === "ADMIN" || role === "VENDEDOR";

  if (!canAccessEmails) {
    redirect("/");
  }

  return (
    <div className="flex-1 p-8 pt-6 bg-slate-50/30 min-h-screen">
      <CmsSectionsTabs />
      <EmailCampaignManager />
    </div>
  );
}
