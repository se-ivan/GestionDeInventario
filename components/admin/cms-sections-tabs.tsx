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
    <div className="mb-4 flex flex-wrap gap-2">
      {sections.map((section) => {
        const isActive = pathname === section.href || pathname.startsWith(`${section.href}/`);
        return (
          <Link
            key={section.href}
            href={section.href}
            className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition ${
              isActive
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground hover:bg-muted"
            }`}
          >
            <section.icon className="h-4 w-4" />
            {section.label}
          </Link>
        );
      })}
    </div>
  );
}
