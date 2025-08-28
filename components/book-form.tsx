"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Book {
  id?: number
  isbn: string
  titulo: string
  autor: string
  precio: number
  stock: number
}

interface BookFormProps {
  initialData?: Book
  onSubmit: (data: Omit<Book, "id">) => void
  onCancel: () => void
  isEditing?: boolean
}

export function BookForm({ initialData, onSubmit, onCancel, isEditing = false }: BookFormProps) {
  const [formData, setFormData] = useState({
    isbn: initialData?.isbn || "",
    titulo: initialData?.titulo || "",
    autor: initialData?.autor || "",
    precio: initialData?.precio || 0,
    stock: initialData?.stock || 0,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.isbn.trim()) {
      newErrors.isbn = "El ISBN es requerido"
    }

    if (!formData.titulo.trim()) {
      newErrors.titulo = "El título es requerido"
    }

    if (!formData.autor.trim()) {
      newErrors.autor = "El autor es requerido"
    }

    if (formData.precio <= 0) {
      newErrors.precio = "El precio debe ser mayor a 0"
    }

    if (formData.stock < 0) {
      newErrors.stock = "El stock no puede ser negativo"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (validateForm()) {
      onSubmit(formData)
    }
  }

  const handleInputChange = (field: keyof typeof formData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="isbn">ISBN</Label>
          <Input
            id="isbn"
            value={formData.isbn}
            onChange={(e) => handleInputChange("isbn", e.target.value)}
            placeholder="978-0-123456-78-9"
            className={errors.isbn ? "border-destructive" : ""}
          />
          {errors.isbn && <p className="text-sm text-destructive">{errors.isbn}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="precio">Precio</Label>
          <Input
            id="precio"
            type="number"
            step="0.01"
            min="0"
            value={formData.precio}
            onChange={(e) => handleInputChange("precio", Number.parseFloat(e.target.value) || 0)}
            placeholder="0.00"
            className={errors.precio ? "border-destructive" : ""}
          />
          {errors.precio && <p className="text-sm text-destructive">{errors.precio}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="titulo">Título</Label>
        <Input
          id="titulo"
          value={formData.titulo}
          onChange={(e) => handleInputChange("titulo", e.target.value)}
          placeholder="Título del libro"
          className={errors.titulo ? "border-destructive" : ""}
        />
        {errors.titulo && <p className="text-sm text-destructive">{errors.titulo}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="autor">Autor</Label>
        <Input
          id="autor"
          value={formData.autor}
          onChange={(e) => handleInputChange("autor", e.target.value)}
          placeholder="Nombre del autor"
          className={errors.autor ? "border-destructive" : ""}
        />
        {errors.autor && <p className="text-sm text-destructive">{errors.autor}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="stock">Stock</Label>
        <Input
          id="stock"
          type="number"
          min="0"
          value={formData.stock}
          onChange={(e) => handleInputChange("stock", Number.parseInt(e.target.value) || 0)}
          placeholder="0"
          className={errors.stock ? "border-destructive" : ""}
        />
        {errors.stock && <p className="text-sm text-destructive">{errors.stock}</p>}
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1 bg-transparent">
          Cancelar
        </Button>
        <Button type="submit" className="flex-1">
          {isEditing ? "Actualizar" : "Agregar"} Libro
        </Button>
      </div>
    </form>
  )
}
