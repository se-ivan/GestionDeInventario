"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getNoticias, deleteNoticia } from "@/actions/noticias";
import { toast } from "sonner";
import { Pencil, Trash2, Plus } from "lucide-react";

type Noticia = {
  id: number;
  title: string;
  slug: string | null;
  excerpt: string | null;
  content: string;
  imageUrl: string | null;
  published: boolean;
  status: "BORRADOR" | "PUBLICADO";
  createdAt: Date;
  publishedAt: Date | null;
  author?: { nombre: string };
};

const getPlainText = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

export function NoticiasManager() {
  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadNoticias();
  }, []);

  const loadNoticias = async () => {
    setIsLoading(true);
    const result = await getNoticias();
    if (result.success) {
      setNoticias(result.data || []);
    } else {
      toast.error(result.error);
    }
    setIsLoading(false);
  };

  const handleDelete = async (id: number) => {
    if (confirm("¿Estás seguro de eliminar esta noticia?")) {
      const result = await deleteNoticia(id);
      if (result.success) {
        toast.success("Noticia eliminada");
        loadNoticias();
      } else {
        toast.error(result.error);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Gestión de Artículos</h2>
          <p className="text-sm text-slate-500 mt-1">Crea, edita y publica noticias para tus clientes.</p>
        </div>
        <Link href="/cms/noticias/new">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Artículo
          </Button>
        </Link>
      </div>

      <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
          <CardTitle className="text-lg font-semibold text-slate-800">Artículos publicados y borradores</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-12 text-slate-500 flex flex-col items-center gap-2">
              <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-600"></div>
              Cargando artículos...
            </div>
          ) : noticias.length === 0 ? (
            <div className="text-center py-12 text-slate-500">No hay artículos creados.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="font-semibold text-slate-600">Título</TableHead>
                    <TableHead className="font-semibold text-slate-600">Slug</TableHead>
                    <TableHead className="font-semibold text-slate-600">Autor</TableHead>
                    <TableHead className="font-semibold text-slate-600">Estado</TableHead>
                    <TableHead className="font-semibold text-slate-600">Palabras</TableHead>
                    <TableHead className="font-semibold text-slate-600">Fecha</TableHead>
                    <TableHead className="text-right font-semibold text-slate-600">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {noticias.map((noticia) => (
                    <TableRow key={noticia.id} className="border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <TableCell className="font-medium text-slate-900">{noticia.title}</TableCell>
                      <TableCell className="text-slate-500 text-sm">/{noticia.slug || `articulo-${noticia.id}`}</TableCell>
                      <TableCell className="text-slate-700">{noticia.author?.nombre}</TableCell>
                      <TableCell>
                        <Badge variant={noticia.published ? "default" : "secondary"} className={noticia.published ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200" : "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200"}>
                          {noticia.published ? "Publicado" : "Borrador"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-600">{Math.max(1, getPlainText(noticia.content).split(" ").filter(Boolean).length)}</TableCell>
                      <TableCell className="text-slate-600">{new Date(noticia.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/cms/noticias/${noticia.id}/edit`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(noticia.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
