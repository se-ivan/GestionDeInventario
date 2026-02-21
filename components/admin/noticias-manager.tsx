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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Gestión de Artículos</h2>
        <Link href="/cms/noticias/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Artículo
          </Button>
        </Link>
      </div>

      <Card className="border-slate-100 shadow-none bg-white/80">
        <CardHeader>
          <CardTitle>Artículos publicados y borradores</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Cargando artículos...</div>
          ) : noticias.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">No hay artículos creados.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Autor</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Palabras</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {noticias.map((noticia) => (
                  <TableRow key={noticia.id}>
                    <TableCell className="font-medium">{noticia.title}</TableCell>
                    <TableCell className="text-muted-foreground">/{noticia.slug || `articulo-${noticia.id}`}</TableCell>
                    <TableCell>{noticia.author?.nombre}</TableCell>
                    <TableCell>
                      <Badge variant={noticia.published ? "default" : "secondary"}>
                        {noticia.published ? "Publicado" : "Borrador"}
                      </Badge>
                    </TableCell>
                    <TableCell>{Math.max(1, getPlainText(noticia.content).split(" ").filter(Boolean).length)}</TableCell>
                    <TableCell>{new Date(noticia.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/cms/noticias/${noticia.id}/edit`}>
                        <Button variant="ghost" size="icon">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(noticia.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
