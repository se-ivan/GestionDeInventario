"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, Plus, Loader2, ScanBarcode, Trash2, Edit, Search, GraduationCap, UserRound } from "lucide-react"
import { toast } from "sonner"
import { getClientes, createCliente, updateCliente, deleteCliente, registrarVisita } from "@/actions/clientes"
import { PrintAllBarcodes } from "@/components/clientes/print-barcodes"

type ClientType = "GENERAL" | "ESTUDIANTE" | "VIP"

type Client = {
  id: number
  nombre: string
  email?: string | null
  telefono?: string | null
  direccion?: string | null
  matricula?: string | null
  semestre?: string | null
  grupo?: string | null
  turno?: string | null
  tipo?: string | null
  codigoBarras: string | null
  _count?: {
    visitas?: number
  }
}

type ClientFormData = {
  nombre: string
  email: string
  telefono: string
  direccion: string
  matricula: string
  semestre: string
  grupo: string
  turno: string
  tipo: ClientType
}

const getInitialFormData = (): ClientFormData => ({
  nombre: "",
  email: "",
  telefono: "",
  direccion: "",
  matricula: "",
  semestre: "",
  grupo: "",
  turno: "",
  tipo: "GENERAL",
})

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [currentId, setCurrentId] = useState<number | null>(null)
  const [scanCode, setScanCode] = useState("")
  const [visitFeedback, setVisitFeedback] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState<"TODOS" | ClientType>("TODOS")
  const [formData, setFormData] = useState<ClientFormData>(getInitialFormData())

  const isStudentType = formData.tipo === "ESTUDIANTE"

  const fetchClients = async () => {
    setLoading(true)
    const res = await getClientes()
    if (res.success) {
      setClients((res.data || []) as Client[])
    } else {
      toast.error(res.error || "No se pudieron cargar los clientes")
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchClients()
  }, [])

  const clientsSummary = useMemo(() => {
    const total = clients.length
    const estudiantes = clients.filter((client) => client.tipo === "ESTUDIANTE").length
    const vip = clients.filter((client) => client.tipo === "VIP").length
    const totalVisits = clients.reduce((sum, client) => sum + (client._count?.visitas || 0), 0)

    return { total, estudiantes, vip, totalVisits }
  }, [clients])

  const filteredClients = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return clients.filter((client) => {
      const matchesType = typeFilter === "TODOS" || client.tipo === typeFilter
      if (!matchesType) return false

      if (!normalizedSearch) return true

      const haystack = [
        client.nombre,
        client.email || "",
        client.telefono || "",
        client.matricula || "",
        client.codigoBarras || "",
      ]
        .join(" ")
        .toLowerCase()

      return haystack.includes(normalizedSearch)
    })
  }, [clients, searchTerm, typeFilter])

  const resetForm = () => {
    setFormData(getInitialFormData())
    setIsEdit(false)
    setCurrentId(null)
  }

  const handleSave = async () => {
    if (!formData.nombre.trim()) {
      toast.error("Nombre es requerido")
      return
    }

    if (isStudentType && !formData.matricula.trim()) {
      toast.error("La matrícula es obligatoria para estudiantes")
      return
    }

    const payload: ClientFormData = {
      ...formData,
      nombre: formData.nombre.trim(),
      email: formData.email.trim(),
      telefono: formData.telefono.trim(),
      direccion: formData.direccion.trim(),
      matricula: isStudentType ? formData.matricula.trim() : "",
      semestre: isStudentType ? formData.semestre.trim() : "",
      grupo: isStudentType ? formData.grupo.trim() : "",
      turno: isStudentType ? formData.turno.trim() : "",
    }

    const res = isEdit && currentId ? await updateCliente(currentId, payload) : await createCliente(payload)

    if (res.error) {
      toast.error(res.error)
      return
    }

    toast.success(isEdit ? "Cliente actualizado" : "Cliente creado")
    setIsOpen(false)
    fetchClients()
    resetForm()
  }

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar este cliente?")) return

    const response = await deleteCliente(id)
    if (response.error) {
      toast.error(response.error)
      return
    }

    toast.success("Cliente eliminado")
    fetchClients()
  }

  const handleScan = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!scanCode.trim()) return

    const res = await registrarVisita(scanCode.trim())
    if (res.success) {
      setVisitFeedback(`✅ ${res.success}`)
      setScanCode("")
      fetchClients()
    } else {
      setVisitFeedback(`❌ ${res.error}`)
    }
    setTimeout(() => setVisitFeedback(""), 3000)
  }

  const openEdit = (client: Client) => {
    const tipo = (client.tipo as ClientType) || "GENERAL"

    setFormData({
      nombre: client.nombre,
      email: client.email || "",
      telefono: client.telefono || "",
      direccion: client.direccion || "",
      matricula: client.matricula || "",
      semestre: client.semestre || "",
      grupo: client.grupo || "",
      turno: client.turno || "",
      tipo,
    })
    setCurrentId(client.id)
    setIsEdit(true)
    setIsOpen(true)
  }

  const openCreate = () => {
    resetForm()
    setIsOpen(true)
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">CRM de Clientes</h1>
          <p className="text-muted-foreground">Segmenta, gestiona perfiles y registra visitas de forma profesional.</p>
        </div>
        <div className="flex gap-2">
          <PrintAllBarcodes clients={clients} />
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Nuevo Cliente
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Total clientes</p>
            <p className="mt-1 text-2xl font-semibold">{clientsSummary.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Estudiantes</p>
            <p className="mt-1 text-2xl font-semibold">{clientsSummary.estudiantes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">VIP</p>
            <p className="mt-1 text-2xl font-semibold">{clientsSummary.vip}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Visitas acumuladas</p>
            <p className="mt-1 text-2xl font-semibold">{clientsSummary.totalVisits}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 bg-slate-50 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ScanBarcode className="h-5 w-5" /> Registro Rápido de Visitas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleScan} className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                placeholder="Escanear código de barras... (Enter para registrar)"
                value={scanCode}
                onChange={(event) => setScanCode(event.target.value)}
                autoFocus
                className="bg-white"
              />
            </div>
            <Button type="submit">Registrar</Button>
          </form>
          {visitFeedback ? <p className="mt-2 font-medium text-blue-600">{visitFeedback}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-3">
          <CardTitle className="text-lg">Pipeline de clientes</CardTitle>
          <div className="grid gap-3 md:grid-cols-[1fr_220px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-9"
                placeholder="Buscar por nombre, email, matrícula o código"
              />
            </div>
            <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as "TODOS" | ClientType)}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                <SelectItem value="GENERAL">General</SelectItem>
                <SelectItem value="ESTUDIANTE">Estudiante</SelectItem>
                <SelectItem value="VIP">VIP</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {loading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredClients.map((client) => {
            const isStudent = client.tipo === "ESTUDIANTE"
            return (
              <Card key={client.id} className="group relative overflow-hidden transition-shadow hover:shadow-md">
                <CardContent className="p-4 pt-6">
                  <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(client)}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => handleDelete(client.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="mb-4 text-center">
                    <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                      {isStudent ? <GraduationCap className="h-6 w-6" /> : <Users className="h-6 w-6" />}
                    </div>
                    <h3 className="truncate font-bold" title={client.nombre}>{client.nombre}</h3>
                    <div className="mt-1">
                      <Badge variant={client.tipo === "VIP" ? "destructive" : "secondary"}>{client.tipo || "GENERAL"}</Badge>
                    </div>
                  </div>

                  <div className="space-y-2 rounded border border-slate-100 bg-slate-50 p-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Código</span>
                      <span className="font-mono text-xs">{client.codigoBarras || "-"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Visitas</span>
                      <span className="font-semibold">{client._count?.visitas || 0}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Email</span>
                      <span className="truncate">{client.email || "-"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Teléfono</span>
                      <span>{client.telefono || "-"}</span>
                    </div>
                    {isStudent ? (
                      <div className="space-y-1 border-t border-slate-200 pt-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Perfil académico</p>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground">Matrícula</span>
                          <span>{client.matricula || "-"}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground">Semestre/Grupo</span>
                          <span>{[client.semestre, client.grupo].filter(Boolean).join(" - ") || "-"}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground">Turno</span>
                          <span>{client.turno || "-"}</span>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            )
          })}
          {filteredClients.length === 0 ? (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              No hay clientes que coincidan con el filtro actual.
            </div>
          ) : null}
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Editar Cliente" : "Nuevo Cliente"}</DialogTitle>
            <DialogDescription>Registro CRM con separación clara entre contacto y perfil académico.</DialogDescription>
          </DialogHeader>

          <div className="max-h-[65vh] overflow-y-auto px-1 py-2">
            <Tabs defaultValue="contacto" className="w-full">
              <TabsList variant="line" className="w-full justify-start">
                <TabsTrigger value="contacto">
                  <UserRound className="h-4 w-4" /> Contacto
                </TabsTrigger>
                <TabsTrigger value="academico" disabled={!isStudentType}>
                  <GraduationCap className="h-4 w-4" /> Estudiante
                </TabsTrigger>
              </TabsList>

              <TabsContent value="contacto" className="mt-4 space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="nombre">Nombre Completo <span className="text-red-500">*</span></Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(event) => setFormData((prev) => ({ ...prev, nombre: event.target.value }))}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="tipo">Segmento</Label>
                    <Select
                      value={formData.tipo}
                      onValueChange={(value) => {
                        const nextType = value as ClientType
                        setFormData((prev) => ({
                          ...prev,
                          tipo: nextType,
                          matricula: nextType === "ESTUDIANTE" ? prev.matricula : "",
                          semestre: nextType === "ESTUDIANTE" ? prev.semestre : "",
                          grupo: nextType === "ESTUDIANTE" ? prev.grupo : "",
                          turno: nextType === "ESTUDIANTE" ? prev.turno : "",
                        }))
                      }}
                    >
                      <SelectTrigger id="tipo">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GENERAL">General</SelectItem>
                        <SelectItem value="ESTUDIANTE">Estudiante</SelectItem>
                        <SelectItem value="VIP">VIP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="telefono">Teléfono</Label>
                    <Input
                      id="telefono"
                      value={formData.telefono}
                      onChange={(event) => setFormData((prev) => ({ ...prev, telefono: event.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="direccion">Dirección</Label>
                  <Input
                    id="direccion"
                    value={formData.direccion}
                    onChange={(event) => setFormData((prev) => ({ ...prev, direccion: event.target.value }))}
                  />
                </div>
              </TabsContent>

              <TabsContent value="academico" className="mt-4 space-y-4">
                {!isStudentType ? (
                  <Card>
                    <CardContent className="pt-5 text-sm text-muted-foreground">
                      Para habilitar esta sección, cambia el segmento a <strong>ESTUDIANTE</strong>.
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="matricula">Matrícula <span className="text-red-500">*</span></Label>
                      <Input
                        id="matricula"
                        value={formData.matricula}
                        onChange={(event) => setFormData((prev) => ({ ...prev, matricula: event.target.value }))}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="grid gap-2">
                        <Label htmlFor="semestre">Semestre</Label>
                        <Input
                          id="semestre"
                          value={formData.semestre}
                          onChange={(event) => setFormData((prev) => ({ ...prev, semestre: event.target.value }))}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="grupo">Grupo</Label>
                        <Input
                          id="grupo"
                          value={formData.grupo}
                          onChange={(event) => setFormData((prev) => ({ ...prev, grupo: event.target.value }))}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="turno">Turno</Label>
                        <Input
                          id="turno"
                          placeholder="M / V"
                          value={formData.turno}
                          onChange={(event) => setFormData((prev) => ({ ...prev, turno: event.target.value }))}
                        />
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
