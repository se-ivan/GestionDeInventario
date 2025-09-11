"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// Interfaz para los datos que manejará el formulario
export interface SucursalFormData {
  nombre: string
  direccion: string
}

// Interfaz para las propiedades del componente
interface SucursalFormProps {
  initialData?: Partial<SucursalFormData>
  onSubmit: (data: SucursalFormData) => Promise<void> | void
  onCancel: () => void
  isEditing?: boolean
}

/**
 * Componente de formulario para crear o editar una Sucursal.
 * @param initialData - Datos iniciales para precargar el formulario (usado en edición).
 * @param onSubmit - Función que se ejecuta al enviar el formulario con datos válidos.
 * @param onCancel - Función que se ejecuta al presionar el botón de cancelar.
 * @param isEditing - Booleano para cambiar el texto del botón de envío.
 */
export function SucursalForm({
  initialData,
  onSubmit,
  onCancel,
  isEditing = false,
}: SucursalFormProps) {
  // Estado para manejar los datos del formulario
  const [formData, setFormData] = useState<SucursalFormData>({
    nombre: initialData?.nombre || "",
    direccion: initialData?.direccion || "",
  })

  // Estado para manejar los errores de validación
  const [errors, setErrors] = useState<Record<string, string>>({})

  /**
   * Valida los campos del formulario y actualiza el estado de errores.
   * @returns {boolean} - Devuelve true si el formulario es válido, de lo contrario false.
   */
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.nombre.trim()) {
      newErrors.nombre = "El nombre de la sucursal es requerido"
    }
    // La dirección es opcional, así que no se valida su presencia.

    setErrors(newErrors)
    // El formulario es válido si no hay errores
    return Object.keys(newErrors).length === 0
  }

  /**
   * Manejador para el envío del formulario.
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault() // Prevenir el comportamiento por defecto del formulario
    if (validateForm()) {
      onSubmit(formData)
    }
  }

  /**
   * Actualiza el estado del formulario cuando el usuario escribe en un campo.
   * @param field - El nombre del campo a actualizar.
   * @param value - El nuevo valor del campo.
   */
  const handleInputChange = (
    field: keyof SucursalFormData,
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Limpia el error del campo en cuanto el usuario empieza a corregirlo
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-1">
      <div className="space-y-2">
        <Label htmlFor="nombre">Nombre de la Sucursal</Label>
        <Input
          id="nombre"
          value={formData.nombre}
          onChange={(e) => handleInputChange("nombre", e.target.value)}
          placeholder="Ej: Sucursal Centro"
          className={errors.nombre ? "border-destructive" : ""}
        />
        {errors.nombre && (
          <p className="text-sm text-destructive">{errors.nombre}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="direccion">Dirección (Opcional)</Label>
        <Input
          id="direccion"
          value={formData.direccion}
          onChange={(e) => handleInputChange("direccion", e.target.value)}
          placeholder="Ej: Av. Principal 123, Ciudad"
        />
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          Cancelar
        </Button>
        <Button type="submit" className="flex-1">
          {isEditing ? "Actualizar Sucursal" : "Crear Sucursal"}
        </Button>
      </div>
    </form>
  )
}