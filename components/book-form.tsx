"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, CheckCircle2, Search, Loader2 } from "lucide-react"

// Ajusta esta importación a donde tengas tus tipos definidos
import { Sucursal } from "@/lib/types"

interface ExtendedFormData {
  isbn: string;
  titulo: string;
  autor: string;
  precioVenta: number;
  precioCompra: number;
  tasaIva: number;
  editorial: string;
  coleccion: string;
  anioPublicacion: number | undefined;
  genero: string;
  stock: number;
  minStock: number;
  ubicacion: string;
  sucursalId: number;
}

interface BookFormProps {
  initialData?: any;
  onSubmit: (data: any) => Promise<void> | void;
  onCancel: () => void;
  isEditing?: boolean;
  sucursales: Sucursal[];
  // onTransfer es opcional si solo usamos este form para crear/editar simple
  onTransfer?: (data: any) => Promise<void>;
}

export function BookForm({ initialData, onSubmit, onCancel, isEditing = false, sucursales = [] }: BookFormProps) {

  // Estado inicial del formulario
  const [formData, setFormData] = useState<ExtendedFormData>({
    isbn: initialData?.book?.isbn || "",
    titulo: initialData?.book?.titulo || "",
    autor: initialData?.book?.autor || "",
    precioVenta: Number(initialData?.book?.precioVenta) || 0,
    precioCompra: Number(initialData?.book?.precioCompra) || 0,
    tasaIva: Number(initialData?.book?.tasaIva) || 0,
    editorial: initialData?.book?.editorial || "",
    coleccion: initialData?.book?.coleccion || "",
    anioPublicacion: initialData?.book?.anioPublicacion || undefined,
    genero: initialData?.book?.genero || "",
    // Si estamos editando un inventario específico, usamos ese stock, si no, 1
    stock: initialData?.stock || 1,
    minStock: initialData?.minStock || 5,
    ubicacion: initialData?.ubicacion || "",
    sucursalId: initialData?.sucursalId || 0,
  });

  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ESTADO CLAVE: Determina si el libro ya existe en la DB local
  const [isExistingBook, setIsExistingBook] = useState(false);

  // Estilos compartidos
  const inputStyles = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

  // --- LÓGICA DE BÚSQUEDA INTELIGENTE ---
  const handleSmartSearch = async () => {
    if (!formData.isbn) return; // Si está vacío, no hacemos nada

    setIsSearching(true);
    setSearchError(null);
    setSubmitError(null);
    setIsExistingBook(false); // Reseteamos por si acaso

    try {
      // 1. Búsqueda Local (Tu API)
      // Nota: Asumimos que GET /api/books?q=ISBN devuelve un array
      const localRes = await fetch(`/api/books?q=${encodeURIComponent(formData.isbn)}`);

      if (localRes.ok) {
        const localData = await localRes.json();
        // Buscamos coincidencia exacta de ISBN
        const exactMatch = localData.find((b: any) => b.isbn === formData.isbn);

        if (exactMatch) {
          // ¡EUREKA! El libro existe localmente.
          setFormData(prev => ({
            ...prev,
            titulo: exactMatch.titulo,
            autor: exactMatch.autor,
            precioVenta: Number(exactMatch.precioVenta),
            precioCompra: Number(exactMatch.precioCompra),
            editorial: exactMatch.editorial || "",
            coleccion: exactMatch.coleccion || "",
            anioPublicacion: exactMatch.anioPublicacion,
            genero: exactMatch.genero || "",
            tasaIva: Number(exactMatch.tasaIva),
            // IMPORTANTE: No sobreescribimos sucursalId ni stock, 
            // porque queremos agregar NUEVO inventario a lo que ya hay.
          }));
          setIsExistingBook(true); // Esto bloqueará los inputs globales
          setIsSearching(false);
          return; // Terminamos aquí
        }
      }

      // 2. Búsqueda Externa (Google Books) - Solo si no está local
      // Asegúrate de tener la API KEY en tu .env.local
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY;
      if (apiKey) {
        const googleRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${formData.isbn}&key=${apiKey}`);
        const data = await googleRes.json();

        if (data.totalItems > 0) {
          const info = data.items[0].volumeInfo;
          const year = info.publishedDate ? new Date(info.publishedDate).getFullYear() : undefined;

          setFormData(prev => ({
            ...prev,
            titulo: info.title || prev.titulo,
            autor: info.authors ? info.authors.join(', ') : prev.autor,
            editorial: info.publisher || prev.editorial,
            anioPublicacion: year || prev.anioPublicacion,
            genero: info.categories ? info.categories[0] : prev.genero,
          }));
          // No ponemos isExistingBook=true porque no existe en NUESTRA base de datos
        } else {
          setSearchError("No encontrado en Google Books (llenado manual requerido).");
        }
      }

    } catch (e) {
      console.error(e);
      setSearchError("Error de conexión durante la búsqueda.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setIsSubmitting(true);

    // Validación: Sucursal obligatoria si no estamos editando un registro ya existente con sucursal fija
    if (Number(formData.sucursalId) === 0) {
      setSubmitError("Por favor selecciona una Sucursal.");
      setIsSubmitting(false);
      return;
    }

    try {
      const payload = {
        bookData: {
          ...formData,
          isbn: formData.isbn || null
        },
        inventoryData: {
          stock: Number(formData.stock),
          minStock: Number(formData.minStock),
          ubicacion: formData.ubicacion,
          sucursalId: Number(formData.sucursalId),
          // Si estamos editando, pasamos el ID del libro para referencia si es necesario
          bookId: isEditing ? initialData.bookId : undefined
        }
      };

      await onSubmit(payload);

    } catch (error: any) {
      setSubmitError(error.message || "Error al guardar el libro.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof ExtendedFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full w-full">
      <div className="flex-1 overflow-y-auto max-h-[70vh] px-1 pr-2 space-y-6">

        {/* --- ALERTA: LIBRO EXISTENTE --- */}
        {isExistingBook && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-md flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="h-5 w-5 text-blue-600" />
            <div>
              <p className="font-bold text-sm">Este libro ya está en el catálogo global.</p>
              <p className="text-xs text-blue-700/80">
                Los datos principales están bloqueados. Solo necesitas ingresar el inventario para la sucursal seleccionada.
              </p>
            </div>
          </div>
        )}

        <div className="p-4 rounded-lg bg-white shadow-sm border border-slate-200">
          <div className="space-y-4">

            {/* --- ALERTA DE ERRORES --- */}
            {submitError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-start gap-3">
                <AlertCircle className="h-5 w-5 mt-0.5" />
                <p className="text-sm font-medium">{submitError}</p>
              </div>
            )}

            {/* --- BLOQUE 1: BÚSQUEDA Y DATOS PRINCIPALES --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="isbn">ISBN / Código</Label>
                <div className="flex gap-2">
                  <Input
                    id="isbn"
                    value={formData.isbn}
                    onChange={(e) => {
                      handleInputChange("isbn", e.target.value);
                      // Si el usuario cambia el ISBN, asumimos que es otro libro y reseteamos
                      if (isExistingBook) setIsExistingBook(false);
                    }}
                    onBlur={() => {
                      // Buscar automáticamente al salir del campo si hay texto y no hemos confirmado existencia
                      if (formData.isbn && !isExistingBook) handleSmartSearch();
                    }}
                    placeholder="Escanea o escribe..."
                    className={isExistingBook ? "border-blue-300 ring-blue-100" : ""}
                  />
                  <Button type="button" onClick={handleSmartSearch} disabled={isSearching} variant="secondary">
                    {isSearching ? <Loader2 className="animate-spin h-4 w-4" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
                {searchError && <p className="text-xs text-orange-500">{searchError}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="titulo">Título</Label>
                <Input
                  id="titulo"
                  value={formData.titulo}
                  onChange={(e) => handleInputChange("titulo", e.target.value)}
                  required
                  disabled={isExistingBook}
                  className={isExistingBook ? "bg-slate-100 text-slate-500 cursor-not-allowed" : ""}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="autor">Autor</Label>
                <Input
                  id="autor"
                  value={formData.autor}
                  onChange={(e) => handleInputChange("autor", e.target.value)}
                  required
                  disabled={isExistingBook}
                  className={isExistingBook ? "bg-slate-100 text-slate-500 cursor-not-allowed" : ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editorial">Editorial</Label>
                <Input
                  id="editorial"
                  value={formData.editorial}
                  onChange={(e) => handleInputChange("editorial", e.target.value)}
                  disabled={isExistingBook}
                  className={isExistingBook ? "bg-slate-100 text-slate-500 cursor-not-allowed" : ""}
                />
              </div>
            </div>

            {/* --- BLOQUE 2: FINANZAS --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4 mt-2">
              <div className="space-y-2">
                <Label htmlFor="precioCompra">Costo Compra</Label>
                <Input
                  id="precioCompra" type="number" step="0.01" min="0"
                  value={formData.precioCompra}
                  onChange={(e) => handleInputChange("precioCompra", Number(e.target.value))}
                  disabled={isExistingBook}
                  className={isExistingBook ? "bg-slate-100" : ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="precioVenta">Precio Venta <span className="text-red-500">*</span></Label>
                <Input
                  id="precioVenta" type="number" step="0.01" min="0" required
                  value={formData.precioVenta}
                  onChange={(e) => handleInputChange("precioVenta", Number(e.target.value))}
                  disabled={isExistingBook}
                  className={`font-bold ${isExistingBook ? "bg-slate-100 text-slate-600" : "text-green-700 bg-green-50"}`}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tasaIva">IVA (%)</Label>
                <select
                  id="tasaIva"
                  value={formData.tasaIva}
                  onChange={(e) => handleInputChange("tasaIva", Number(e.target.value))}
                  disabled={isExistingBook}
                  className={`${inputStyles} ${isExistingBook ? "bg-slate-100 cursor-not-allowed" : ""}`}
                >
                  <option value="0">0% (Libros)</option>
                  <option value="16">16% (General)</option>
                  <option value="8">8% (Reducido)</option>
                </select>
              </div>
            </div>

            {/* --- BLOQUE 3: INVENTARIO (Siempre Activo) --- */}
            <div className="bg-slate-50 p-4 rounded-md border border-slate-200 mt-4">
              <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                {isExistingBook ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : null}
                Gestión de Inventario (Sucursal)
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <Label htmlFor="sucursalId">Sucursal de Ingreso <span className="text-red-500">*</span></Label>
                  <select
                    id="sucursalId"
                    value={formData.sucursalId}
                    onChange={(e) => handleInputChange("sucursalId", Number(e.target.value))}
                    className={inputStyles}
                    disabled={isEditing} // Si se edita, no se cambia la sucursal de origen
                  >
                    <option value="0">-- Seleccionar --</option>
                    {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ubicacion">Ubicación Física</Label>
                  <Input
                    id="ubicacion"
                    placeholder="Ej. Pasillo A-1"
                    value={formData.ubicacion}
                    onChange={(e) => handleInputChange("ubicacion", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="coleccion">Colección</Label>
                  <Input
                    id="coleccion"
                    value={formData.coleccion || ''}
                    onChange={(e) => handleInputChange("coleccion", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="anioPublicacion">Año</Label>
                  <Input
                    id="anioPublicacion"
                    type="number"
                    value={formData.anioPublicacion || ''}
                    onChange={(e) => handleInputChange("anioPublicacion", e.target.value ? Number(e.target.value) : undefined)}

                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="genero">Género / Categoría</Label>
                  <Input
                    id="genero"
                    value={formData.genero || ''}
                    onChange={(e) => handleInputChange("genero", e.target.value)}
                    className={isExistingBook ? "bg-slate-100 text-slate-500" : ""}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stock">Cantidad a Ingresar</Label>
                  <Input
                    id="stock" type="number" min="1"
                    value={formData.stock}
                    onChange={(e) => handleInputChange("stock", Number(e.target.value))}
                    required
                    className="font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minStock">Alerta Mínimo</Label>
                  <Input
                    id="minStock" type="number" min="1"
                    value={formData.minStock}
                    onChange={(e) => handleInputChange("minStock", Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* --- FOOTER --- */}
      <div className="flex gap-3 pt-4 mt-2 border-t bg-white z-10">
        <Button type="button" variant="ghost" onClick={onCancel} className="flex-1 hover:bg-slate-100 text-slate-600">
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md">
          {isSubmitting ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</>
          ) : (
            isExistingBook ? "Agregar Stock a Sucursal" : "Registrar Nuevo Libro"
          )}
        </Button>
      </div>
    </form>
  )
}