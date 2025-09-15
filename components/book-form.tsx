"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { InventarioEntry, Sucursal, BookFormData } from "@/lib/types"

interface BookFormProps {
  initialData?: InventarioEntry;
  onSubmit: (data: any) => Promise<void> | void;
  onCancel: () => void;
  isEditing?: boolean;
  sucursales: Sucursal[];
  onTransfer: (data: { bookId: number, sourceSucursalId: number, destSucursalId: number, quantity: number }) => Promise<void>;
}

export function BookForm({ initialData, onSubmit, onCancel, isEditing = false, sucursales = [], onTransfer }: BookFormProps) {
  const [formData, setFormData] = useState({
    isbn: initialData?.book.isbn || "",
    titulo: initialData?.book.titulo || "",
    autor: initialData?.book.autor || "",
    precio: initialData?.book.precio || 0,
    editorial: initialData?.book.editorial || "",
    coleccion: initialData?.book.coleccion || "",
    anioPublicacion: initialData?.book.anioPublicacion || undefined,
    genero: initialData?.book.genero || "",
    stock: initialData?.stock || 1,
    sucursalId: initialData?.sucursalId || 0,
  });

  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  const [transferData, setTransferData] = useState({
    destSucursalId: 0,
    quantity: 1,
  });
  
  const handleIsbnSearch = async () => {
    if (!formData.isbn) {
      setSearchError("Por favor, introduce un ISBN para buscar.");
      return;
    }
    setIsSearching(true);
    setSearchError(null);

    // --- MODIFICADO: Usamos la variable de entorno para la API Key ---
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY;
    if (!apiKey) {
        setSearchError("La clave de API no está configurada. Contacta al administrador.");
        setIsSearching(false);
        return;
    }
    const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${formData.isbn}&key=${apiKey}`;
    // --- FIN MODIFICADO ---

    try {
      const response = await fetch(url); // Usamos la nueva URL con la clave
      const data = await response.json();

      if (data.totalItems > 0) {
        const bookInfo = data.items[0].volumeInfo;
        const year = bookInfo.publishedDate ? new Date(bookInfo.publishedDate).getFullYear() : undefined;
        setFormData(prev => ({
          ...prev,
          titulo: bookInfo.title || "",
          autor: bookInfo.authors ? bookInfo.authors.join(', ') : "",
          editorial: bookInfo.publisher || "",
          anioPublicacion: year,
          genero: bookInfo.categories ? bookInfo.categories[0] : "",
        }));
      } else {
        setSearchError("No se encontró ningún libro con ese ISBN.");
      }
    } catch (error) {
      console.error("Error al buscar en Google Books API:", error);
      setSearchError("Hubo un error al conectar con el servicio de búsqueda.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fullFormData = {
      ...formData,
      precio: Number(formData.precio),
      stock: Number(formData.stock),
      anioPublicacion: formData.anioPublicacion ? Number(formData.anioPublicacion) : null,
    };

    if (isEditing && initialData) {
      onSubmit({
        bookData: {
          isbn: fullFormData.isbn,
          titulo: fullFormData.titulo,
          autor: fullFormData.autor,
          precio: fullFormData.precio,
          editorial: fullFormData.editorial,
          coleccion: fullFormData.coleccion,
          anioPublicacion: fullFormData.anioPublicacion,
          genero: fullFormData.genero,
        },
        inventoryData: {
          bookId: initialData.bookId,
          sucursalId: initialData.sucursalId,
          stock: fullFormData.stock,
        }
      });
    } else {
      onSubmit(fullFormData as BookFormData);
    }
  };

  const handleTransferClick = () => {
    if (!initialData || transferData.destSucursalId === 0 || transferData.quantity <= 0) {
      alert("Por favor, selecciona una sucursal de destino y una cantidad válida.");
      return;
    }
    if (transferData.quantity > formData.stock) {
      alert("No puedes transferir más stock del que existe en esta sucursal.");
      return;
    }
    onTransfer({
      bookId: initialData.bookId,
      sourceSucursalId: initialData.sucursalId,
      destSucursalId: Number(transferData.destSucursalId),
      quantity: Number(transferData.quantity),
    });
  };

  const handleInputChange = (field: keyof typeof formData, value: string | number | undefined) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleTransferInputChange = (field: keyof typeof transferData, value: string | number) => {
    setTransferData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-4 text-slate-700">
          {isEditing ? `Gestionar "${formData.titulo}"` : 'Datos del Nuevo Libro'}
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label htmlFor="titulo">Título</Label><Input id="titulo" value={formData.titulo} onChange={(e) => handleInputChange("titulo", e.target.value)} required /></div>
            <div className="space-y-2"><Label htmlFor="autor">Autor</Label><Input id="autor" value={formData.autor} onChange={(e) => handleInputChange("autor", e.target.value)} required /></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="isbn">ISBN</Label>
              <div className="flex gap-2">
                <Input id="isbn" value={formData.isbn || ''} onChange={(e) => handleInputChange("isbn", e.target.value)} placeholder="Introduce el ISBN y busca"/>
                <Button type="button" onClick={handleIsbnSearch} disabled={isSearching}>
                  {isSearching ? 'Buscando...' : 'Buscar'}
                </Button>
              </div>
              {searchError && <p className="text-sm text-red-600 mt-1">{searchError}</p>}
            </div>
            <div className="space-y-2"><Label htmlFor="precio">Precio</Label><Input id="precio" type="number" step="0.01" min="0" value={formData.precio} onChange={(e) => handleInputChange("precio", Number(e.target.value))} required /></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label htmlFor="editorial">Editorial</Label><Input id="editorial" value={formData.editorial || ''} onChange={(e) => handleInputChange("editorial", e.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="coleccion">Colección</Label><Input id="coleccion" value={formData.coleccion || ''} onChange={(e) => handleInputChange("coleccion", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label htmlFor="anioPublicacion">Año de Publicación</Label><Input id="anioPublicacion" type="number" placeholder={(new Date().getFullYear()).toString()} value={formData.anioPublicacion || ''} onChange={(e) => handleInputChange("anioPublicacion", e.target.value ? Number(e.target.value) : undefined)} /></div>
            <div className="space-y-2"><Label htmlFor="genero">Género</Label><Input id="genero" value={formData.genero || ''} onChange={(e) => handleInputChange("genero", e.target.value)} /></div>
          </div>

          {isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-2"><Label>Sucursal (Actual)</Label><Input value={sucursales.find(s => s.id === initialData?.sucursalId)?.nombre || 'N/A'} disabled /></div>
              <div className="space-y-2"><Label htmlFor="stock">Stock en esta Sucursal</Label><Input id="stock" type="number" min="0" value={formData.stock} onChange={(e) => handleInputChange("stock", Number(e.target.value))} /></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-slate-50 border-slate-200">
              <div className="space-y-2">
                <Label htmlFor="sucursalId">Sucursal de Ingreso</Label>
                <select id="sucursalId" value={formData.sucursalId} onChange={(e) => handleInputChange("sucursalId", Number(e.target.value))} className="w-full h-10 px-3 py-2 text-sm bg-white border rounded-md" required>
                  <option value="0" disabled>Seleccione una sucursal</option>
                  {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </div>
              <div className="space-y-2"><Label htmlFor="stock">Stock Inicial</Label><Input id="stock" type="number" min="1" value={formData.stock} onChange={(e) => handleInputChange("stock", Number(e.target.value))} required /></div>
            </div>
          )}
        </div>
      </div>

      {isEditing && (
        <div className="p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 text-slate-700">Transferir Stock</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="destSucursalId">Transferir a</Label>
              <select id="destSucursalId" value={transferData.destSucursalId} onChange={(e) => handleTransferInputChange("destSucursalId", Number(e.target.value))} className="w-full h-10 px-3 py-2 text-sm bg-white border rounded-md">
                <option value="0" disabled>Seleccionar destino</option>
                {sucursales.filter(s => s.id !== initialData?.sucursalId).map(s => (<option key={s.id} value={s.id}>{s.nombre}</option>))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Cantidad</Label>
              <Input id="quantity" type="number" min="1" max={formData.stock} value={transferData.quantity} onChange={(e) => handleTransferInputChange("quantity", Number(e.target.value))} />
            </div>
            <Button type="button" variant="outline" onClick={handleTransferClick}>
              Realizar Transferencia
            </Button>
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <Button type="button" variant="minimal" onClick={onCancel} className="flex-1">Cancelar</Button>
        <Button type="submit" className="flex-1">{isEditing ? "Guardar Cambios" : "Agregar Libro"}</Button>
      </div>
    </form>
  )
}
