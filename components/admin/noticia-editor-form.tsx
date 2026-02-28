"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createNoticia, updateNoticia } from "@/actions/noticias";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { uploadImageFromClient } from "@/lib/media-upload";
import { getCloudinaryPublicIdFromUrl } from "@/lib/cloudinary";
import { ArrowLeft, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { CldImage } from "next-cloudinary";

type NoticiaForm = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  imageUrl: string;
  published: boolean;
};

type InitialNoticia = {
  id: number;
  title: string;
  slug: string | null;
  excerpt: string | null;
  content: string;
  imageUrl: string | null;
  published: boolean;
};

interface NoticiaEditorFormProps {
  mode: "create" | "edit";
  initialNoticia?: InitialNoticia;
}

const normalizeSlug = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

export function NoticiaEditorForm({ mode, initialNoticia }: NoticiaEditorFormProps) {
  const router = useRouter();
  const isEdit = mode === "edit";
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  const [formData, setFormData] = useState<NoticiaForm>({
    title: initialNoticia?.title || "",
    slug: initialNoticia?.slug || "",
    excerpt: initialNoticia?.excerpt || "",
    content: initialNoticia?.content || "",
    imageUrl: initialNoticia?.imageUrl || "",
    published: initialNoticia?.published || false,
  });

  const wordCount = useMemo(() => {
    const plain = formData.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return Math.max(1, plain.split(" ").filter(Boolean).length);
  }, [formData.content]);

  const cloudinaryCoverId = useMemo(() => getCloudinaryPublicIdFromUrl(formData.imageUrl), [formData.imageUrl]);

  const uploadCoverImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecciona un archivo de imagen válido");
      return;
    }

    try {
      setIsUploadingCover(true);
      const url = await uploadImageFromClient(file);
      setFormData((prev) => ({ ...prev, imageUrl: url }));
      toast.success("Imagen cargada correctamente");
    } catch (error) {
      console.error(error);
      toast.error("No se pudo subir la imagen");
    } finally {
      setIsUploadingCover(false);
      event.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.content) {
      toast.error("El título y el contenido son obligatorios");
      return;
    }

    if (!formData.slug) {
      toast.error("El slug del artículo es obligatorio");
      return;
    }

    try {
      setIsSaving(true);
      const result = isEdit && initialNoticia
        ? await updateNoticia(initialNoticia.id, formData)
        : await createNoticia(formData);

      if (!result.success) {
        toast.error(result.error || "No se pudo guardar el artículo");
        return;
      }

      toast.success(isEdit ? "Artículo actualizado" : "Artículo creado");
      router.push("/cms/noticias");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Error inesperado al guardar");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 bg-slate-50/50 min-h-screen">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">{isEdit ? "Editar artículo" : "Nuevo artículo"}</h2>
          <p className="text-sm text-slate-500">Editor de contenido en pantalla completa para CMS.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/cms/noticias">
            <Button type="button" variant="outline" className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
          </Link>
          <Button type="submit" form="noticia-editor-form" disabled={isSaving} className="bg-blue-600 text-white hover:bg-blue-700 shadow-sm">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isEdit ? "Guardar cambios" : "Crear artículo"}
          </Button>
        </div>
      </div>

      <form id="noticia-editor-form" onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="title" className="text-slate-700 font-medium">Título</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => {
                const nextTitle = e.target.value;
                setFormData((prev) => ({
                  ...prev,
                  title: nextTitle,
                  slug: slugTouched ? prev.slug : normalizeSlug(nextTitle),
                }));
              }}
              placeholder="Título del artículo"
              className="border-slate-200 focus-visible:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug" className="text-slate-700 font-medium">Slug</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => {
                setSlugTouched(true);
                setFormData((prev) => ({ ...prev, slug: normalizeSlug(e.target.value) }));
              }}
              placeholder="mi-articulo"
              className="border-slate-200 focus-visible:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="excerpt" className="text-slate-700 font-medium">Extracto</Label>
            <Input
              id="excerpt"
              maxLength={280}
              value={formData.excerpt}
              onChange={(e) => setFormData((prev) => ({ ...prev, excerpt: e.target.value }))}
              placeholder="Resumen breve del artículo"
              className="border-slate-200 focus-visible:ring-blue-500"
            />
            <p className="text-xs text-slate-500">{formData.excerpt.length}/280</p>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="imageUrl" className="text-slate-700 font-medium">Imagen de portada</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                id="imageUrl"
                value={formData.imageUrl}
                onChange={(e) => setFormData((prev) => ({ ...prev, imageUrl: e.target.value }))}
                placeholder="https://..."
                className="min-w-[240px] flex-1 border-slate-200 focus-visible:ring-blue-500"
              />
              <Button type="button" variant="outline" onClick={() => coverInputRef.current?.click()} disabled={isUploadingCover} className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50">
                {isUploadingCover ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Subir
              </Button>
              <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={uploadCoverImage} />
            </div>
            <p className="text-xs text-slate-500">
              Recomendado en serverless: configurar Cloudinary con `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` y `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <Switch
            id="published"
            checked={formData.published}
            onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, published: checked }))}
          />
          <Label htmlFor="published" className="text-slate-700 font-medium cursor-pointer">Publicar artículo</Label>
          <span className="text-xs text-slate-500 ml-auto">{wordCount} palabras</span>
        </div>

        <Tabs defaultValue="editor" className="space-y-4">
          <TabsList className="bg-slate-200/50 p-1 rounded-lg">
            <TabsTrigger value="editor" className="rounded-md data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">Editor</TabsTrigger>
            <TabsTrigger value="preview" className="rounded-md data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">Vista previa</TabsTrigger>
          </TabsList>

          <TabsContent value="editor" className="space-y-2">
            <Label className="text-slate-700 font-medium">Contenido</Label>
            <RichTextEditor content={formData.content} onChange={(content) => setFormData((prev) => ({ ...prev, content }))} />
          </TabsContent>

          <TabsContent value="preview" className="space-y-3">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              {formData.imageUrl ? (
                cloudinaryCoverId ? (
                  <CldImage
                    src={cloudinaryCoverId}
                    alt={formData.title || "Portada"}
                    width={1200}
                    height={675}
                    crop={{ type: "auto", source: true }}
                    className="mb-6 h-64 w-full rounded-lg object-cover shadow-sm"
                  />
                ) : (
                  <img src={formData.imageUrl} alt={formData.title || "Portada"} className="mb-6 h-64 w-full rounded-lg object-cover shadow-sm" />
                )
              ) : null}
              <h3 className="text-3xl font-bold tracking-tight text-slate-900">{formData.title || "Título del artículo"}</h3>
              {formData.excerpt ? <p className="mt-3 text-lg text-slate-600">{formData.excerpt}</p> : null}
              <div className="prose prose-slate mt-6 max-w-none" dangerouslySetInnerHTML={{ __html: formData.content || "<p className='text-slate-500 italic'>Sin contenido</p>" }} />
            </div>
          </TabsContent>
        </Tabs>
      </form>
    </div>
  );
}
