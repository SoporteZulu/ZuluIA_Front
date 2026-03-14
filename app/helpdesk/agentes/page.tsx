"use client"

import React, { useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Plus, Search, Edit, Trash2, X, Users, UserCheck, UserMinus, Star, Ticket, Clock } from "lucide-react"
import { useHdAgentes } from \"@/lib/hooks/useHelpdesk\"
import { departamentos as hdDepartamentos } from \"@/lib/helpdesk-data\"
import type { HDAgente } from "@/lib/types"

const rolLabels = {
  administrador: "Administrador",
  supervisor: "Supervisor",
  agente: "Agente",
  tecnico: "Tecnico",
}

const estadoLabels = {
  activo: "Activo",
  inactivo: "Inactivo",
  vacaciones: "Vacaciones",
}

const estadoColors = {
  activo: "bg-green-500/10 text-green-500",
  inactivo: "bg-slate-500/10 text-slate-500",
  vacaciones: "bg-amber-500/10 text-amber-500",
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

function AgentesContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { agentes, loading, error, createAgente, updateAgente, deleteAgente } = useHdAgentes()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingAgente, setEditingAgente] = useState<HDAgente | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterEstado, setFilterEstado] = useState<string>("all")
  const [filterRol, setFilterRol] = useState<string>("all")

  const [formData, setFormData] = useState<Partial<HDAgente>>({
    nombre: "",
    apellido: "",
    email: "",
    telefono: "",
    departamentoId: "",
    rol: "agente",
    estado: "activo",
    habilidades: [],
    ticketsAsignados: 0,
    ticketsResueltos: 0,
    tiempoPromedioResolucion: 0,
    calificacionPromedio: 0,
  })

  const filteredAgentes = agentes.filter(agente => {
    const matchesSearch = agente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agente.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agente.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesEstado = filterEstado === "all" || agente.estado === filterEstado
    const matchesRol = filterRol === "all" || agente.rol === filterRol
    return matchesSearch && matchesEstado && matchesRol
  })

  const stats = {
    total: agentes.length,
    activos: agentes.filter(a => a.estado === "activo").length,
    inactivos: agentes.filter(a => a.estado === "inactivo").length,
    vacaciones: agentes.filter(a => a.estado === "vacaciones").length,
  }

  const openForm = (agente?: HDAgente) => {
    if (agente) {
      setEditingAgente(agente)
      setFormData({ ...agente })
    } else {
      setEditingAgente(null)
      setFormData({
        nombre: "",
        apellido: "",
        email: "",
        telefono: "",
        departamentoId: "",
        rol: "agente",
        estado: "activo",
        habilidades: [],
        ticketsAsignados: 0,
        ticketsResueltos: 0,
        tiempoPromedioResolucion: 0,
        calificacionPromedio: 0,
      })
    }
    setIsFormOpen(true)
  }

  const closeForm = () => {
    setIsFormOpen(false)
    setEditingAgente(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editingAgente) {
      await updateAgente(editingAgente.id, formData)
    } else {
      await createAgente(formData as Omit<HDAgente, 'id' | 'createdAt' | 'updatedAt'>)
    }
    closeForm()
  }

  const handleDelete = async (id: string) => {
    await deleteAgente(id)
  }

  const clearFilters = () => {
    setSearchTerm("")
    setFilterEstado("all")
    setFilterRol("all")
  }

  const hasActiveFilters = searchTerm || filterEstado !== "all" || filterRol !== "all"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agentes</h1>
          <p className="text-muted-foreground">Gestion del equipo de soporte</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openForm()}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Agente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingAgente ? "Editar Agente" : "Nuevo Agente"}</DialogTitle>
              <DialogDescription>
                {editingAgente ? "Modifica los datos del agente" : "Agrega un nuevo miembro al equipo"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apellido">Apellido</Label>
                  <Input
                    id="apellido"
                    value={formData.apellido}
                    onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefono">Telefono</Label>
                <Input
                  id="telefono"
                  value={formData.telefono || ""}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rol">Rol</Label>
                  <Select
                    value={formData.rol}
                    onValueChange={(value) => setFormData({ ...formData, rol: value as HDAgente["rol"] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="administrador">Administrador</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                      <SelectItem value="agente">Agente</SelectItem>
                      <SelectItem value="tecnico">Tecnico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estado">Estado</Label>
                  <Select
                    value={formData.estado}
                    onValueChange={(value) => setFormData({ ...formData, estado: value as HDAgente["estado"] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="activo">Activo</SelectItem>
                      <SelectItem value="inactivo">Inactivo</SelectItem>
                      <SelectItem value="vacaciones">Vacaciones</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="departamentoId">Departamento</Label>
                <Select
                  value={formData.departamentoId || "none"}
                  onValueChange={(value) => setFormData({ ...formData, departamentoId: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin departamento</SelectItem>
                    {hdDepartamentos.map((dep) => (
                      <SelectItem key={dep.id} value={dep.id}>{dep.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeForm}>Cancelar</Button>
                <Button type="submit">{editingAgente ? "Guardar Cambios" : "Crear Agente"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Agentes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activos</CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activos}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vacaciones</CardTitle>
            <UserMinus className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.vacaciones}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactivos</CardTitle>
            <UserMinus className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inactivos}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterEstado} onValueChange={setFilterEstado}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="activo">Activos</SelectItem>
                <SelectItem value="inactivo">Inactivos</SelectItem>
                <SelectItem value="vacaciones">Vacaciones</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterRol} onValueChange={setFilterRol}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="administrador">Administrador</SelectItem>
                <SelectItem value="supervisor">Supervisor</SelectItem>
                <SelectItem value="agente">Agente</SelectItem>
                <SelectItem value="tecnico">Tecnico</SelectItem>
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-2 h-4 w-4" />
                Limpiar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Equipo de Soporte</CardTitle>
          <CardDescription>{filteredAgentes.length} agente(s) encontrado(s)</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agente</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Departamento</TableHead>
                <TableHead>Tickets</TableHead>
                <TableHead>Tiempo Prom.</TableHead>
                <TableHead>Calificacion</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAgentes.map((agente) => {
                const departamento = hdDepartamentos.find(d => d.id === agente.departamentoId)
                return (
                  <TableRow key={agente.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={agente.avatar || "/placeholder.svg"} />
                          <AvatarFallback>{agente.nombre[0]}{agente.apellido[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{agente.nombre} {agente.apellido}</div>
                          <div className="text-sm text-muted-foreground">{agente.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{rolLabels[agente.rol]}</Badge>
                    </TableCell>
                    <TableCell>
                      {departamento?.nombre || <span className="text-muted-foreground">Sin asignar</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Ticket className="h-3 w-3 text-muted-foreground" />
                        <span>{agente.ticketsAsignados}</span>
                        <span className="text-muted-foreground">/</span>
                        <span className="text-green-600">{agente.ticketsResueltos}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {formatMinutes(agente.tiempoPromedioResolucion)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                        {agente.calificacionPromedio.toFixed(1)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={estadoColors[agente.estado]}>
                        {estadoLabels[agente.estado]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" onClick={() => openForm(agente)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Eliminar Agente</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta accion eliminara al agente "{agente.nombre} {agente.apellido}".
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(agente.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AgentesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-muted-foreground">Cargando...</div>}>
      <AgentesContent />
    </Suspense>
  )
}
