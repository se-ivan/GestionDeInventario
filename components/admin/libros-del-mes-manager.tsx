"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  createLibroDelMes,
  deleteLibroDelMes,
  getLibrosDelMes,
  toggleLibroDelMesActivo,
  updateLibroDelMes,
} from "@/actions/libros-del-mes";
import { uploadImageFromClient } from "@/lib/media-upload";
import { Loader2, Pencil, Plus, Search, Trash2, Upload } from "lucide-react";

type LibroLocal = {
  id: number;
  titulo: string;
  autor: string;
  isbn?: string | null;
};

type LibroDelMesItem = {
  id: number;
  titulo: string;
  descripcion: string | null;
  autor: string | null;
  categoria: string;
  calificacion: number | null;
  resenas: number | null;
  portadaUrl: string | null;
  isbn: string | null;
  googleVolumeId: string | null;
  activo: boolean;
  bookId: number | null;
  createdAt: Date;
};

type FormState = {
  titulo: string;
  descripcion: string;
  autor: string;
  categoria: string;
  calificacion: string;
  resenas: string;
  portadaUrl: string;
  isbn: string;
  googleVolumeId: string;
  activo: boolean;
  bookId: number | null;
};

const defaultForm: FormState = {
  titulo: "",
  descripcion: "",
  autor: "",
  categoria: "RECOMENDACION",
  calificacion: "",
  resenas: "",
  portadaUrl: "",
  isbn: "",
  googleVolumeId: "",
  activo: true,
  bookId: null,
};

export function LibrosDelMesManager() {
  const [items, setItems] = useState<LibroDelMesItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isSearchingInventory, setIsSearchingInventory] = useState(false);
  const [isSearchingGoogle, setIsSearchingGoogle] = useState(false);

  const [sourceType, setSourceType] = useState<"inventario" | "isbn">("inventario");
  const [inventoryQuery, setInventoryQuery] = useState("");
  const [inventoryResults, setInventoryResults] = useState<LibroLocal[]>([]);
  const [selectedInventoryBookId, setSelectedInventoryBookId] = useState<string>("");

  const [isbnSearch, setIsbnSearch] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm);

  const isEditing = editingId !== null;

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => Number(b.activo) - Number(a.activo) || +new Date(b.createdAt) - +new Date(a.createdAt)),
    [items],
  );

  useEffect(() => {
    void loadItems();
  }, []);

  const loadItems = async () => {
    setIsLoading(true);
    const result = await getLibrosDelMes();
    if (!result.success) {
      toast.error(result.error || "No se pudo cargar la lista");
      setIsLoading(false);
      return;
    }

    setItems((result.data || []) as LibroDelMesItem[]);
    setIsLoading(false);
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(defaultForm);
    setInventoryQuery("");
    setInventoryResults([]);
    setSelectedInventoryBookId("");
    setIsbnSearch("");
  };

  const searchInventoryBooks = async () => {
    if (!inventoryQuery.trim()) {
      toast.error("Escribe título, autor o ISBN para buscar en inventario");
      return;
    }

    try {
      setIsSearchingInventory(true);
      const response = await fetch(`/api/books/search?q=${encodeURIComponent(inventoryQuery.trim())}`);
      if (!response.ok) {
        toast.error("No se pudo consultar inventario");
        return;
      }

      const data = (await response.json()) as LibroLocal[];
      setInventoryResults(data || []);
      if (!data?.length) {
        toast.message("No se encontraron libros en inventario con esa búsqueda");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error al buscar en inventario");
    } finally {
      setIsSearchingInventory(false);
    }
  };

  const applyInventoryBook = () => {
    if (!selectedInventoryBookId) {
      toast.error("Selecciona un libro del inventario");
      return;
    }

    const selected = inventoryResults.find((book) => String(book.id) === selectedInventoryBookId);
    if (!selected) {
      toast.error("No se encontró el libro seleccionado");
      return;
    }

    setForm((prev) => ({
      ...prev,
      titulo: selected.titulo || prev.titulo,
      autor: selected.autor || prev.autor,
      isbn: selected.isbn || prev.isbn,
      bookId: selected.id,
    }));

    toast.success("Libro de inventario aplicado al formulario");
  };

  const searchGoogleByIsbn = async () => {
    if (!isbnSearch.trim()) {
      toast.error("Ingresa un ISBN");
      return;
    }

    try {
      setIsSearchingGoogle(true);
      const response = await fetch(`/api/google-books?isbn=${encodeURIComponent(isbnSearch.trim())}`);
      if (!response.ok) {
        toast.error("No se pudo consultar Google Books");
        return;
      }

      const payload = (await response.json()) as {
        data?: Array<{
          googleVolumeId: string;
          titulo: string;
          autor: string;
          descripcion: string;
          categoriaSugerida: string;
          calificacion: number | null;
          resenas: number | null;
          portadaUrl: string;
          isbn: string;
        }>;
      };

      const first = payload.data?.[0];
      if (!first) {
        toast.message("No se encontró información para ese ISBN");
        return;
      }

      setForm((prev) => ({
        ...prev,
        titulo: first.titulo || prev.titulo,
        autor: first.autor || prev.autor,
        descripcion: first.descripcion || prev.descripcion,
        categoria: first.categoriaSugerida || prev.categoria,
        calificacion: first.calificacion != null ? String(first.calificacion) : prev.calificacion,
        resenas: first.resenas != null ? String(first.resenas) : prev.resenas,
        portadaUrl: first.portadaUrl || prev.portadaUrl,
        isbn: first.isbn || isbnSearch.trim(),
        googleVolumeId: first.googleVolumeId || prev.googleVolumeId,
        bookId: prev.bookId,
      }));

      toast.success("Datos cargados desde Google Books");
    } catch (error) {
      console.error(error);
      toast.error("Error al consultar Google Books");
    } finally {
      setIsSearchingGoogle(false);
    }
  };

  const uploadCover = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecciona una imagen válida");
      return;
    }

    try {
      setIsUploadingCover(true);
      const url = await uploadImageFromClient(file);
      setForm((prev) => ({ ...prev, portadaUrl: url }));
      toast.success("Portada cargada correctamente");
    } catch (error) {
      console.error(error);
      toast.error("No se pudo cargar la portada");
    } finally {
      setIsUploadingCover(false);
      event.target.value = "";
    }
  };

  const startEdit = (item: LibroDelMesItem) => {
    setEditingId(item.id);
    setForm({
      titulo: item.titulo || "",
      descripcion: item.descripcion || "",
      autor: item.autor || "",
      categoria: item.categoria || "RECOMENDACION",
      calificacion: item.calificacion != null ? String(item.calificacion) : "",
      resenas: item.resenas != null ? String(item.resenas) : "",
      portadaUrl: item.portadaUrl || "",
      isbn: item.isbn || "",
      googleVolumeId: item.googleVolumeId || "",
      activo: item.activo,
      bookId: item.bookId || null,
    });
  };

  const saveForm = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.titulo.trim()) {
      toast.error("El título es obligatorio");
      return;
    }

    setIsSaving(true);

    const payload = {
      titulo: form.titulo,
      descripcion: form.descripcion,
      autor: form.autor,
      categoria: form.categoria,
      calificacion: form.calificacion ? Number(form.calificacion) : null,
      resenas: form.resenas ? Number(form.resenas) : null,
      portadaUrl: form.portadaUrl,
      isbn: form.isbn,
      googleVolumeId: form.googleVolumeId,
      activo: form.activo,
      bookId: form.bookId,
    };

    const result = isEditing
      ? await updateLibroDelMes(editingId, payload)
      : await createLibroDelMes(payload);

    if (!result.success) {
      toast.error(result.error || "No se pudo guardar");
      setIsSaving(false);
      return;
    }

    toast.success(isEditing ? "Libro del mes actualizado" : "Libro del mes creado");
    await loadItems();
    resetForm();
    setIsSaving(false);
  };

  const handleToggleActivo = async (id: number, activo: boolean) => {
    const result = await toggleLibroDelMesActivo(id, activo);
    if (!result.success) {
      toast.error(result.error || "No se pudo cambiar el estado");
      return;
    }

    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, activo } : item)));
    toast.success(activo ? "Libro activado" : "Libro desactivado");
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este libro del mes?")) return;

    const result = await deleteLibroDelMes(id);
    if (!result.success) {
      toast.error(result.error || "No se pudo eliminar");
      return;
    }

    toast.success("Registro eliminado");
    setItems((prev) => prev.filter((item) => item.id !== id));
    if (editingId === id) {
      resetForm();
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Libros del Mes</h2>
        <p className="text-sm text-slate-500">Gestiona las recomendaciones y novedades literarias.</p>
      </div>

      <Card className="border-slate-200 shadow-sm bg-white overflow-hidden rounded-xl">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
          <CardTitle className="text-lg font-semibold text-slate-800">{isEditing ? "Editar libro del mes" : "Registrar libro del mes"}</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form className="space-y-6" onSubmit={saveForm}>
            <div className="flex gap-2 p-1 bg-slate-100/80 rounded-lg border border-slate-200/60 w-fit">
              <Button type="button" variant={sourceType === "inventario" ? "default" : "ghost"} onClick={() => setSourceType("inventario")} className={sourceType === "inventario" ? "bg-white text-blue-700 shadow-sm ring-1 ring-slate-200/50" : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900"}>Desde inventario</Button>
              <Button type="button" variant={sourceType === "isbn" ? "default" : "ghost"} onClick={() => setSourceType("isbn")} className={sourceType === "isbn" ? "bg-white text-blue-700 shadow-sm ring-1 ring-slate-200/50" : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900"}>Desde ISBN (Google Books)</Button>
            </div>

            {sourceType === "inventario" ? (
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-5">
                <Label className="text-slate-700 font-medium">Buscar libro en inventario</Label>
                <div className="flex gap-2">
                  <Input
                    value={inventoryQuery}
                    onChange={(event) => setInventoryQuery(event.target.value)}
                    placeholder="Título, autor o ISBN"
                    className="bg-white border-slate-200 focus-visible:ring-blue-500"
                  />
                  <Button type="button" onClick={searchInventoryBooks} disabled={isSearchingInventory} className="bg-slate-800 hover:bg-slate-900 text-white shadow-sm">
                    {isSearchingInventory ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
                {inventoryResults.length > 0 ? (
                  <div className="flex gap-2 pt-2">
                    <select
                      className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={selectedInventoryBookId}
                      onChange={(event) => setSelectedInventoryBookId(event.target.value)}
                    >
                      <option value="">Selecciona un libro</option>
                      {inventoryResults.map((book) => (
                        <option key={book.id} value={book.id}>
                          {book.titulo} · {book.autor} {book.isbn ? `· ${book.isbn}` : ""}
                        </option>
                      ))}
                    </select>
                    <Button type="button" onClick={applyInventoryBook} variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 shadow-sm">Aplicar</Button>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-5">
                <Label className="text-slate-700 font-medium">Buscar por ISBN en Google Books</Label>
                <div className="flex gap-2">
                  <Input value={isbnSearch} onChange={(event) => setIsbnSearch(event.target.value)} placeholder="978..." className="bg-white border-slate-200 focus-visible:ring-blue-500" />
                  <Button type="button" onClick={searchGoogleByIsbn} disabled={isSearchingGoogle} className="bg-slate-800 hover:bg-slate-900 text-white shadow-sm">
                    {isSearchingGoogle ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-2 pt-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="titulo" className="text-slate-700 font-medium">Título</Label>
                <Input id="titulo" value={form.titulo} onChange={(event) => setForm((prev) => ({ ...prev, titulo: event.target.value }))} required className="bg-slate-50/50 focus:bg-white transition-colors border-slate-200 focus-visible:ring-blue-500" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="autor" className="text-slate-700 font-medium">Autor</Label>
                <Input id="autor" value={form.autor} onChange={(event) => setForm((prev) => ({ ...prev, autor: event.target.value }))} className="bg-slate-50/50 focus:bg-white transition-colors border-slate-200 focus-visible:ring-blue-500" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="isbn" className="text-slate-700 font-medium">ISBN</Label>
                <Input id="isbn" value={form.isbn} onChange={(event) => setForm((prev) => ({ ...prev, isbn: event.target.value }))} className="bg-slate-50/50 focus:bg-white transition-colors border-slate-200 focus-visible:ring-blue-500" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoria" className="text-slate-700 font-medium">Categoría</Label>
                <Input id="categoria" value={form.categoria} onChange={(event) => setForm((prev) => ({ ...prev, categoria: event.target.value }))} placeholder="NOVEDAD, RECOMENDACION..." className="bg-slate-50/50 focus:bg-white transition-colors border-slate-200 focus-visible:ring-blue-500" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="calificacion" className="text-slate-700 font-medium">Calificación</Label>
                <Input id="calificacion" type="number" step="0.1" min="0" max="5" value={form.calificacion} onChange={(event) => setForm((prev) => ({ ...prev, calificacion: event.target.value }))} className="bg-slate-50/50 focus:bg-white transition-colors border-slate-200 focus-visible:ring-blue-500" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="resenas" className="text-slate-700 font-medium">Reseñas</Label>
                <Input id="resenas" type="number" min="0" value={form.resenas} onChange={(event) => setForm((prev) => ({ ...prev, resenas: event.target.value }))} className="bg-slate-50/50 focus:bg-white transition-colors border-slate-200 focus-visible:ring-blue-500" />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="descripcion" className="text-slate-700 font-medium">Descripción / Sinopsis</Label>
                <textarea
                  id="descripcion"
                  className="min-h-32 w-full rounded-md border border-slate-200 bg-slate-50/50 focus:bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-y"
                  value={form.descripcion}
                  onChange={(event) => setForm((prev) => ({ ...prev, descripcion: event.target.value }))}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="portada" className="text-slate-700 font-medium">Portada URL</Label>
                <div className="flex gap-2">
                  <Input id="portada" value={form.portadaUrl} onChange={(event) => setForm((prev) => ({ ...prev, portadaUrl: event.target.value }))} className="bg-slate-50/50 focus:bg-white transition-colors border-slate-200 focus-visible:ring-blue-500" />
                  <label className="inline-flex">
                    <input type="file" accept="image/*" className="hidden" onChange={uploadCover} />
                    <Button type="button" variant="outline" disabled={isUploadingCover} asChild className="border-slate-200 hover:bg-slate-50 text-slate-700 bg-white shadow-sm">
                      <span>{isUploadingCover ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />} Subir</span>
                    </Button>
                  </label>
                </div>
                {form.portadaUrl ? (
                  <div className="mt-4 p-2 border border-slate-100 rounded-lg bg-slate-50/50 w-fit">
                    <img src={form.portadaUrl} alt={form.titulo || "Portada"} className="h-32 rounded shadow-sm object-cover" />
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-slate-50/50 rounded-xl border border-slate-100">
              <Switch id="activo" checked={form.activo} onCheckedChange={(checked) => setForm((prev) => ({ ...prev, activo: checked }))} />
              <Label htmlFor="activo" className="text-slate-700 font-medium cursor-pointer">Activo como libro del mes</Label>
            </div>

            <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-100">
              <Button type="submit" disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isEditing ? <Pencil className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                {isEditing ? "Guardar cambios" : "Crear libro del mes"}
              </Button>
              {isEditing ? (
                <Button type="button" variant="outline" onClick={resetForm} className="border-slate-200 text-slate-600 hover:bg-slate-50 bg-white shadow-sm">Cancelar edición</Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm bg-white overflow-hidden rounded-xl">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
          <CardTitle className="text-lg font-semibold text-slate-800">Libros del mes registrados</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-slate-500 flex flex-col items-center gap-2">
              <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-600"></div>
              Cargando...
            </div>
          ) : sortedItems.length === 0 ? (
            <div className="py-12 text-center text-slate-500">No hay registros todavía.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="font-semibold text-slate-600">Título</TableHead>
                    <TableHead className="font-semibold text-slate-600">Categoría</TableHead>
                    <TableHead className="font-semibold text-slate-600">Autor</TableHead>
                    <TableHead className="font-semibold text-slate-600">Calificación</TableHead>
                    <TableHead className="font-semibold text-slate-600">Activo</TableHead>
                    <TableHead className="text-right font-semibold text-slate-600">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedItems.map((item) => (
                    <TableRow key={item.id} className="border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <TableCell className="font-medium text-slate-900">{item.titulo}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/60">
                          {item.categoria}
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-600">{item.autor || "-"}</TableCell>
                      <TableCell className="text-slate-600">{item.calificacion != null ? item.calificacion.toFixed(1) : "-"}</TableCell>
                      <TableCell>
                        <Switch checked={item.activo} onCheckedChange={(checked) => void handleToggleActivo(item.id, checked)} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50" onClick={() => startEdit(item)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50" onClick={() => void handleDelete(item.id)}>
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
