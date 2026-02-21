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
    <div className="space-y-5">
      <Card className="border-slate-100 shadow-none bg-white/80">
        <CardHeader>
          <CardTitle>{isEditing ? "Editar libro del mes" : "Registrar libro del mes"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={saveForm}>
            <div className="flex gap-2">
              <Button type="button" variant={sourceType === "inventario" ? "default" : "outline"} onClick={() => setSourceType("inventario")}>Desde inventario</Button>
              <Button type="button" variant={sourceType === "isbn" ? "default" : "outline"} onClick={() => setSourceType("isbn")}>Desde ISBN (Google Books)</Button>
            </div>

            {sourceType === "inventario" ? (
              <div className="space-y-2 rounded-md border border-border p-3">
                <Label>Buscar libro en inventario</Label>
                <div className="flex gap-2">
                  <Input
                    value={inventoryQuery}
                    onChange={(event) => setInventoryQuery(event.target.value)}
                    placeholder="Título, autor o ISBN"
                  />
                  <Button type="button" onClick={searchInventoryBooks} disabled={isSearchingInventory}>
                    {isSearchingInventory ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
                {inventoryResults.length > 0 ? (
                  <div className="flex gap-2">
                    <select
                      className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
                    <Button type="button" onClick={applyInventoryBook}>Aplicar</Button>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="space-y-2 rounded-md border border-border p-3">
                <Label>Buscar por ISBN en Google Books</Label>
                <div className="flex gap-2">
                  <Input value={isbnSearch} onChange={(event) => setIsbnSearch(event.target.value)} placeholder="978..." />
                  <Button type="button" onClick={searchGoogleByIsbn} disabled={isSearchingGoogle}>
                    {isSearchingGoogle ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="titulo">Título</Label>
                <Input id="titulo" value={form.titulo} onChange={(event) => setForm((prev) => ({ ...prev, titulo: event.target.value }))} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="autor">Autor</Label>
                <Input id="autor" value={form.autor} onChange={(event) => setForm((prev) => ({ ...prev, autor: event.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="isbn">ISBN</Label>
                <Input id="isbn" value={form.isbn} onChange={(event) => setForm((prev) => ({ ...prev, isbn: event.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoria">Categoría</Label>
                <Input id="categoria" value={form.categoria} onChange={(event) => setForm((prev) => ({ ...prev, categoria: event.target.value }))} placeholder="NOVEDAD, RECOMENDACION..." />
              </div>

              <div className="space-y-2">
                <Label htmlFor="calificacion">Calificación</Label>
                <Input id="calificacion" type="number" step="0.1" min="0" max="5" value={form.calificacion} onChange={(event) => setForm((prev) => ({ ...prev, calificacion: event.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="resenas">Reseñas</Label>
                <Input id="resenas" type="number" min="0" value={form.resenas} onChange={(event) => setForm((prev) => ({ ...prev, resenas: event.target.value }))} />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="descripcion">Descripción / Sinopsis</Label>
                <textarea
                  id="descripcion"
                  className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.descripcion}
                  onChange={(event) => setForm((prev) => ({ ...prev, descripcion: event.target.value }))}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="portada">Portada URL</Label>
                <div className="flex gap-2">
                  <Input id="portada" value={form.portadaUrl} onChange={(event) => setForm((prev) => ({ ...prev, portadaUrl: event.target.value }))} />
                  <label className="inline-flex">
                    <input type="file" accept="image/*" className="hidden" onChange={uploadCover} />
                    <Button type="button" variant="outline" disabled={isUploadingCover} asChild>
                      <span>{isUploadingCover ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}</span>
                    </Button>
                  </label>
                </div>
                {form.portadaUrl ? <img src={form.portadaUrl} alt={form.titulo || "Portada"} className="h-28 rounded-md border object-cover" /> : null}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch id="activo" checked={form.activo} onCheckedChange={(checked) => setForm((prev) => ({ ...prev, activo: checked }))} />
              <Label htmlFor="activo">Activo como libro del mes</Label>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isEditing ? <Pencil className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                {isEditing ? "Guardar cambios" : "Crear libro del mes"}
              </Button>
              {isEditing ? (
                <Button type="button" variant="outline" onClick={resetForm}>Cancelar edición</Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-slate-100 shadow-none bg-white/80">
        <CardHeader>
          <CardTitle>Libros del mes registrados</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-6 text-center text-muted-foreground">Cargando...</div>
          ) : sortedItems.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground">No hay registros todavía.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Autor</TableHead>
                  <TableHead>Calificación</TableHead>
                  <TableHead>Activo</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.titulo}</TableCell>
                    <TableCell>{item.categoria}</TableCell>
                    <TableCell>{item.autor || "-"}</TableCell>
                    <TableCell>{item.calificacion != null ? item.calificacion.toFixed(1) : "-"}</TableCell>
                    <TableCell>
                      <Switch checked={item.activo} onCheckedChange={(checked) => void handleToggleActivo(item.id, checked)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => startEdit(item)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => void handleDelete(item.id)}>
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
