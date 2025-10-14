"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  Plus,
  Phone,
  Mail,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Users,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

interface PendingSearch {
  id: number
  titulo: string
  autor: string
  isbn: string
  editorial: string
  genero: string
  descripcion: string
  precio_estimado: number
  cliente_nombre: string
  cliente_telefono: string
  cliente_email: string
  cliente_notas: string
  estado: "pendiente" | "buscando" | "encontrado" | "entregado" | "cancelado"
  prioridad: "baja" | "media" | "alta" | "urgente"
  fecha_solicitud: string
  fecha_limite: string
  fecha_actualizacion: string
  notas_internas: string
  precio_encontrado?: number
  proveedor_encontrado?: string
}

const estadoConfig = {
  pendiente: { color: "bg-gray-100 text-gray-800", icon: Clock, label: "Pendiente" },
  buscando: { color: "bg-blue-100 text-blue-800", icon: Search, label: "Buscando" },
  encontrado: { color: "bg-green-100 text-green-800", icon: CheckCircle, label: "Encontrado" },
  entregado: { color: "bg-purple-100 text-purple-800", icon: CheckCircle, label: "Entregado" },
  cancelado: { color: "bg-red-100 text-red-800", icon: XCircle, label: "Cancelado" },
}

const prioridadConfig = {
  baja: { color: "bg-slate-100 text-slate-600", label: "Baja" },
  media: { color: "bg-yellow-100 text-yellow-700", label: "Media" },
  alta: { color: "bg-orange-100 text-orange-700", label: "Alta" },
  urgente: { color: "bg-red-100 text-red-700", label: "Urgente" },
}

export default function PendingSearchesPage() {
  const [searches, setSearches] = useState<PendingSearch[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterEstado, setFilterEstado] = useState<string>("todos")
  const [filterPrioridad, setFilterPrioridad] = useState<string>("todos")
  const pathname = usePathname()

  useEffect(() => {
    fetchPendingSearches()
  }, [])

  const fetchPendingSearches = async () => {
    try {
      const response = await fetch("/api/pending-searches")
      if (response.ok) {
        const data = await response.json()
        setSearches(data)
      }
    } catch (error) {
      console.error("Error fetching pending searches:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredSearches = searches.filter((search) => {
    const matchesSearch =
      searchTerm === "" ||
      search.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      search.autor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      search.cliente_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      search.cliente_telefono.includes(searchTerm)

    const matchesEstado = filterEstado === "todos" || search.estado === filterEstado
    const matchesPrioridad = filterPrioridad === "todos" || search.prioridad === filterPrioridad

    return matchesSearch && matchesEstado && matchesPrioridad
  })

  const getStats = () => {
    const total = searches.length
    const pendientes = searches.filter((s) => s.estado === "pendiente").length
    const buscando = searches.filter((s) => s.estado === "buscando").length
    const encontrados = searches.filter((s) => s.estado === "encontrado").length
    const urgentes = searches.filter((s) => s.prioridad === "urgente").length

    return { total, pendientes, buscando, encontrados, urgentes }
  }

  const stats = getStats()

  if (loading) {
    return (
      <div className="flex h-screen bg-slate-50 font-sans">
        <nav className="w-20 bg-white border-r border-slate-200">{/* Navigation skeleton */}</nav>
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-200 rounded w-1/4 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-slate-200 rounded"></div>
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Búsquedas Pendientes</h1>
          <p className="text-slate-600">Gestiona las solicitudes de libros de tus clientes</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Pendientes</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pendientes}</p>
                </div>
                <Clock className="h-8 w-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Buscando</p>
                  <p className="text-2xl font-bold text-blue-900">{stats.buscando}</p>
                </div>
                <Search className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Encontrados</p>
                  <p className="text-2xl font-bold text-green-900">{stats.encontrados}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Urgentes</p>
                  <p className="text-2xl font-bold text-red-900">{stats.urgentes}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              placeholder="Buscar por título, autor, cliente o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="buscando">Buscando</option>
            <option value="encontrado">Encontrado</option>
            <option value="entregado">Entregado</option>
            <option value="cancelado">Cancelado</option>
          </select>

          <select
            value={filterPrioridad}
            onChange={(e) => setFilterPrioridad(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Todas las prioridades</option>
            <option value="baja">Baja</option>
            <option value="media">Media</option>
            <option value="alta">Alta</option>
            <option value="urgente">Urgente</option>
          </select>

          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Búsqueda
          </Button>
        </div>

        {/* Search Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSearches.map((search) => {
            const EstadoIcon = estadoConfig[search.estado].icon
            return (
              <Card key={search.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold text-slate-900 mb-1">{search.titulo}</CardTitle>
                      <CardDescription className="text-slate-600">
                        {search.autor} • {search.editorial}
                      </CardDescription>
                    </div>
                    <div className="flex flex-col gap-2 ml-4">
                      <Badge className={`${estadoConfig[search.estado].color} text-xs`}>
                        <EstadoIcon className="h-3 w-3 mr-1" />
                        {estadoConfig[search.estado].label}
                      </Badge>
                      <Badge className={`${prioridadConfig[search.prioridad].color} text-xs`}>
                        {prioridadConfig[search.prioridad].label}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {/* Cliente Info */}
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-4 w-4 text-slate-600" />
                        <span className="font-medium text-slate-900">{search.cliente_nombre}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {search.cliente_telefono}
                        </div>
                        {search.cliente_email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {search.cliente_email.split("@")[0]}...
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Book Details */}
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Género:</span>
                        <span className="font-medium">{search.genero}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Precio estimado:</span>
                        <span className="font-medium">€{search.precio_estimado}</span>
                      </div>
                      {search.fecha_limite && (
                        <div className="flex justify-between">
                          <span className="text-slate-600">Fecha límite:</span>
                          <span className="font-medium flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(search.fecha_limite).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    {search.cliente_notas && (
                      <div className="text-sm">
                        <span className="text-slate-600">Notas: </span>
                        <span className="text-slate-800">{search.cliente_notas}</span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                        <Eye className="h-3 w-3 mr-1" />
                        Ver
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                        <Edit className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Empty State */}
        {filteredSearches.length === 0 && !loading && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No hay búsquedas pendientes</h3>
            <p className="text-slate-600 mb-4">
              {searchTerm || filterEstado !== "todos" || filterPrioridad !== "todos"
                ? "No se encontraron resultados con los filtros aplicados"
                : "Comienza agregando una nueva búsqueda de libro"}
            </p>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Búsqueda
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}
