"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mail, Newspaper, Star } from "lucide-react";

const sections = [
  { href: "/cms/noticias", label: "Noticias", icon: Newspaper },
  { href: "/cms/libros-del-mes", label: "Libros del mes", icon: Star },
  { href: "/cms/correos", label: "Correos", icon: Mail },
];

export function CmsSectionsTabs() {
  const pathname = usePathname();

  return (
    <div className="mb-8 flex flex-wrap gap-2 p-1 bg-slate-100/80 rounded-lg border border-slate-200/60 w-fit shadow-sm">
      {sections.map((section) => {
        const isActive = pathname === section.href || pathname.startsWith(`${section.href}/`);
        return (
          <Link
            key={section.href}
            href={section.href}
            className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all duration-200 ${
              isActive
                ? "bg-white text-blue-700 shadow-sm ring-1 ring-slate-200/50"
                : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900"
            }`}
          >
            <section.icon className={`h-4 w-4 ${isActive ? "text-blue-600" : "text-slate-500"}`} />
            {section.label}
          </Link>
        );
      })}
    </div>
  );
}
