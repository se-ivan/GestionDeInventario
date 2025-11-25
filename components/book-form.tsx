"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sucursal } from "@/lib/types" // Asumiendo que tus tipos están aquí
import { AlertCircle } from "lucide-react" // Opcional: para ícono de error

// Interfaz para los datos del formulario
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
  onSubmit: (data: any) => Promise<void> | void; // Importante: debe retornar Promise para cachar el error
  onCancel: () => void;
  isEditing?: boolean;
  sucursales: Sucursal[];
  onTransfer: (data: { bookId: number, sourceSucursalId: number, destSucursalId: number, quantity: number }) => Promise<void>;
}

export function BookForm({ initialData, onSubmit, onCancel, isEditing = false, sucursales = [], onTransfer }: BookFormProps) {
  
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
    stock: initialData?.stock || 1,
    minStock: initialData?.minStock || 5,
    ubicacion: initialData?.ubicacion || "",
    sucursalId: initialData?.sucursalId || 0,
  });

  const sucursalRef = useRef<HTMLSelectElement>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  // Nuevo estado para errores de envío (duplicados)
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [transferData, setTransferData] = useState({
    destSucursalId: 0,
    quantity: 1,
  });

  // Clases CSS compartidas para inputs y selects para mantener consistencia visual
  const inputStyles = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
  
  const handleIsbnSearch = async () => {
    if (!formData.isbn) {
      setSearchError("Por favor, introduce un ISBN para buscar.");
      return;
    }
    setIsSearching(true);
    setSearchError(null);

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY;
    if (!apiKey) {
        setSearchError("La clave de API no está configurada.");
        setIsSearching(false);
        return;
    }
    const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${formData.isbn}&key=${apiKey}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.totalItems > 0) {
        const bookInfo = data.items[0].volumeInfo;
        const year = bookInfo.publishedDate ? new Date(bookInfo.publishedDate).getFullYear() : undefined;
        setFormData(prev => ({
          ...prev,
          titulo: bookInfo.title || prev.titulo,
          autor: bookInfo.authors ? bookInfo.authors.join(', ') : prev.autor,
          editorial: bookInfo.publisher || prev.editorial,
          anioPublicacion: year || prev.anioPublicacion,
          genero: bookInfo.categories ? bookInfo.categories[0] : prev.genero,
        }));
      } else {
        setSearchError("No se encontró ningún libro con ese ISBN.");
      }
    } catch (error) {
      console.error("Error al buscar en Google Books API:", error);
      setSearchError("Error de conexión.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setIsSubmitting(true);
    if (!isEditing && Number(formData.sucursalId) === 0) {
        setSubmitError("Por favor selecciona una Sucursal de Ingreso válida.");
        setIsSubmitting(false);
        
        // Enfocamos el select
        sucursalRef.current?.focus(); 
        return;
    }
    
    const cleanIsbn = formData.isbn.trim() === "" ? null : formData.isbn.trim();

    const fullPayload = {
      bookData: {
        isbn: cleanIsbn,
        titulo: formData.titulo,
        autor: formData.autor,
        precioVenta: Number(formData.precioVenta),
        precioCompra: Number(formData.precioCompra),
        tasaIva: Number(formData.tasaIva),
        editorial: formData.editorial,
        coleccion: formData.coleccion,
        anioPublicacion: formData.anioPublicacion ? Number(formData.anioPublicacion) : null,
        genero: formData.genero,
      },
      inventoryData: {
        stock: Number(formData.stock),
        minStock: Number(formData.minStock),
        ubicacion: formData.ubicacion,
        sucursalId: isEditing ? initialData.sucursalId : Number(formData.sucursalId),
        bookId: isEditing ? initialData.bookId : undefined
      }
    };

    try {
      // Intentamos enviar los datos
      await onSubmit(fullPayload);
    } catch (error: any) {
      console.error("Error al guardar:", error);
      
      const errorMessage = error?.message || "";
      // Convertimos a minúsculas para comparar sin importar si es "ISBN" o "isbn"
      const lowerCaseError = errorMessage.toLowerCase();

      // Buscamos palabras clave: códigos de prisma o frases de tu backend
      const isUniqueConstraint = 
          lowerCaseError.includes("unique constraint") || 
          lowerCaseError.includes("p2002") ||
          lowerCaseError.includes("isbn") ||      // Detecta "ISBN" o "isbn"
          lowerCaseError.includes("ya existe");   // Detecta tu mensaje personalizado

      if (isUniqueConstraint) {
        // Usamos el mensaje que viene del backend porque ya es amigable ("Ya existe un libro con este ISBN.")
        // Si por alguna razón el mensaje es técnico (P2002), ponemos el personalizado.
        if (lowerCaseError.includes("p2002") || lowerCaseError.includes("unique constraint")) {
             setSubmitError(`El ISBN "${cleanIsbn}" ya está registrado en el sistema.`);
        } else {
             setSubmitError(errorMessage); // Muestra: "Ya existe un libro con este ISBN."
        }
      } else {
        setSubmitError("Ocurrió un error inesperado al guardar el libro. Intenta de nuevo.");
      }

    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransferClick = () => {
    if (!initialData || transferData.destSucursalId === 0 || transferData.quantity <= 0) return;
    onTransfer({
      bookId: initialData.bookId,
      sourceSucursalId: initialData.sucursalId,
      destSucursalId: Number(transferData.destSucursalId),
      quantity: Number(transferData.quantity),
    });
  };

  const handleInputChange = (field: keyof ExtendedFormData, value: string | number | undefined) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Limpiamos el error si el usuario cambia el ISBN
    if (field === 'isbn') setSubmitError(null);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full w-full">
      
      {/* --- CONTENEDOR SCROLLABLE --- */}
      {/* max-h-[75vh] limita la altura y overflow-y-auto habilita el scroll interno */}
      <div className="flex-1 overflow-y-auto max-h-[70vh] px-1 pr-2 space-y-6">
        
        <div className="p-4 rounded-lg bg-white shadow-sm border border-slate-200">        
          <div className="space-y-4">
            
            {/* Mensaje de error global (duplicados) */}
            {submitError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-start gap-3">
                <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <p className="text-sm font-medium">{submitError}</p>
              </div>
            )}

            {/* --- BLOQUE 1: IDENTIFICACIÓN --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="isbn">ISBN / Código de Barras</Label>
                <div className="flex gap-2">
                  <Input 
                    id="isbn" 
                    value={formData.isbn || ''} 
                    onChange={(e) => handleInputChange("isbn", e.target.value)} 
                    placeholder="Dejar vacío para mercancia general"
                    className={submitError ? "border-red-500 focus-visible:ring-red-500" : ""}
                  />
                  <Button type="button" onClick={handleIsbnSearch} disabled={isSearching} variant="secondary">
                    {isSearching ? '...' : '🔍'}
                  </Button>
                </div>
                {searchError && <p className="text-xs text-red-500">{searchError}</p>}
              </div>
              
              <div className="space-y-2">
                  <Label htmlFor="titulo">Título / Nombre Producto <span className="text-red-500">*</span></Label>
                  <Input id="titulo" value={formData.titulo} onChange={(e) => handleInputChange("titulo", e.target.value)} required />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                  <Label htmlFor="autor">Autor / Marca</Label>
                  <Input id="autor" value={formData.autor} onChange={(e) => handleInputChange("autor", e.target.value)} required />
              </div>
              <div className="space-y-2">
                  <Label htmlFor="editorial">Editorial / Proveedor</Label>
                  <Input id="editorial" value={formData.editorial || ''} onChange={(e) => handleInputChange("editorial", e.target.value)} />
              </div>
            </div>

            {/* --- BLOQUE 2: FINANCIERO --- */}
            <div className="bg-slate-50 p-3 rounded-md border border-slate-200 mt-2">
              <h4 className="text-sm font-medium text-slate-500 mb-3 uppercase tracking-wider">Datos Financieros</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                      <Label htmlFor="precioCompra">Costo Unitario ($)</Label>
                      <Input 
                          id="precioCompra" 
                          type="number" 
                          step="0.01" 
                          min="0" 
                          value={formData.precioCompra} 
                          onChange={(e) => handleInputChange("precioCompra", Number(e.target.value))} 
                          className="bg-white"
                      />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="precioVenta">Precio Venta Público ($) <span className="text-red-500">*</span></Label>
                      <Input 
                          id="precioVenta" 
                          type="number" 
                          step="0.01" 
                          min="0" 
                          value={formData.precioVenta} 
                          onChange={(e) => handleInputChange("precioVenta", Number(e.target.value))} 
                          required 
                          className="bg-white font-bold text-green-700"
                      />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="tasaIva">IVA (%)</Label>
                      {/* SELECT ESTILIZADO CON inputStyles */}
                      <select 
                          id="tasaIva"
                          value={formData.tasaIva}
                          onChange={(e) => handleInputChange("tasaIva", Number(e.target.value))}
                          className={inputStyles} 
                      >
                          <option value="0">0% (Libros)</option>
                          <option value="16">16% (General)</option>
                          <option value="8">8% (Frontera)</option>
                      </select>
                  </div>
              </div>
            </div>

            {/* --- BLOQUE 3: DETALLES --- */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                  <Label htmlFor="coleccion">Colección</Label>
                  <Input id="coleccion" value={formData.coleccion || ''} onChange={(e) => handleInputChange("coleccion", e.target.value)} />
              </div>
              <div className="space-y-2">
                  <Label htmlFor="anioPublicacion">Año</Label>
                  <Input id="anioPublicacion" type="number" value={formData.anioPublicacion || ''} onChange={(e) => handleInputChange("anioPublicacion", e.target.value ? Number(e.target.value) : undefined)} />
              </div>
              <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="genero">Género / Categoría</Label>
                  <Input id="genero" value={formData.genero || ''} onChange={(e) => handleInputChange("genero", e.target.value)} />
              </div>
            </div>

            {/* --- BLOQUE 4: INVENTARIO Y UBICACIÓN --- */}
            <div className="border-t pt-4 mt-4">
              <h4 className="text-sm font-medium text-slate-500 mb-3 uppercase tracking-wider">Inventario Inicial</h4>
              
              {!isEditing && (
                   <div className="mb-4">
                      <Label htmlFor="sucursalId">Sucursal de Ingreso</Label>
                      {/* SELECT ESTILIZADO */}
                      <select 
                          id="sucursalId" 
                          value={formData.sucursalId} 
                          onChange={(e) => handleInputChange("sucursalId", Number(e.target.value))} 
                          className={inputStyles}
                          required
                      >
                          <option value="0" disabled>Seleccione una sucursal</option>
                          {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                      </select>
                  </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                      <Label htmlFor="stock">Cantidad Actual</Label>
                      <Input id="stock" type="number" min="0" value={formData.stock} onChange={(e) => handleInputChange("stock", Number(e.target.value))} required />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="minStock">Alerta Mínimo</Label>
                      <Input 
                          id="minStock" 
                          type="number" 
                          min="1" 
                          value={formData.minStock} 
                          onChange={(e) => handleInputChange("minStock", Number(e.target.value))} 
                      />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="ubicacion">Ubicación Física</Label>
                      <Input 
                          id="ubicacion" 
                          placeholder="Ej. Pasillo 1, Estante B" 
                          value={formData.ubicacion} 
                          onChange={(e) => handleInputChange("ubicacion", e.target.value)} 
                      />
                  </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- BLOQUE TRANSFERENCIA (Solo Edición) --- */}
        {isEditing && (
          <div className="p-4 rounded-lg bg-orange-50 border border-orange-200">
            <h3 className="text-md font-semibold mb-4 text-orange-800">Transferir Mercancía</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="destSucursalId">Transferir a</Label>
                {/* SELECT ESTILIZADO */}
                <select 
                  id="destSucursalId" 
                  value={transferData.destSucursalId} 
                  onChange={(e) => setTransferData(prev => ({...prev, destSucursalId: Number(e.target.value)}))} 
                  className={inputStyles}
                >
                  <option value="0" disabled>Seleccionar destino</option>
                  {sucursales.filter(s => s.id !== initialData?.sucursalId).map(s => (<option key={s.id} value={s.id}>{s.nombre}</option>))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Cantidad</Label>
                <Input id="quantity" type="number" min="1" max={formData.stock} value={transferData.quantity} onChange={(e) => setTransferData(prev => ({...prev, quantity: Number(e.target.value)}))} />
              </div>
              <Button type="button" variant="outline" onClick={handleTransferClick} className="border-orange-300 text-orange-700 hover:bg-orange-100">
                Confirmar
              </Button>
            </div>
          </div>
        )}
      </div> 
      {/* FIN DEL SCROLL AREA */}

      {/* --- FOOTER DE BOTONES (Fijo fuera del scroll) --- */}
      <div className="flex gap-3 pt-4 mt-2 border-t bg-white z-10">
        <Button type="button" className="flex-1 bg-white hover:bg-red-200 hover:text-red-900 text-primary" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" className="flex-1 bg-primary/80 text-white hover:bg-primary-dark" disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : (isEditing ? "Guardar Cambios" : "Registrar Producto")}
        </Button>
      </div>
    </form>
  )
}