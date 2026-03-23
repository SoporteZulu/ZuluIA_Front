"use client"

import React, { useEffect, useState } from "react"
import {
  CalendarDays,
  Edit,
  Eye,
  FolderKanban,
  Grid3x3,
  Kanban,
  List,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useProyectos } from "@/lib/hooks/useProyectos"
import type { Proyecto } from "@/lib/proyectos-types"

type ViewMode = "grid" | "list" | "kanban"

type ProyectoFormState = {
  nombre: string
  cliente: string
  descripcion: string
  fechaInicio: string
  fechaFin: string
  presupuesto: string
  avance: string
  estado: Proyecto["estado"]
  prioridad: Proyecto["prioridad"]
  equipo: string
  etiquetas: string
}

const ESTADOS: Proyecto["estado"][] = [
  "En Planificación",
  "En Curso",
  "En Riesgo",
  "Completado",
  "Retrasado",
  "En Espera",
]

const PRIORIDADES: Proyecto["prioridad"][] = ["Baja", "Media", "Alta", "Crítica"]

const EMPTY_FORM: ProyectoFormState = {
  nombre: "",
  cliente: "",
  descripcion: "",
  fechaInicio: "",
  fechaFin: "",
  presupuesto: "",
  avance: "0",
  estado: "En Planificación",
  prioridad: "Media",
  equipo: "",
  etiquetas: "",
}

function estadoColor(estado: Proyecto["estado"]) {
  const colores: Record<Proyecto["estado"], string> = {
    "En Planificación": "bg-blue-100 text-blue-800",
    "En Curso": "bg-emerald-100 text-emerald-800",
    "En Riesgo": "bg-amber-100 text-amber-800",
    Completado: "bg-violet-100 text-violet-800",
    Retrasado: "bg-red-100 text-red-800",
    "En Espera": "bg-slate-100 text-slate-800",
  }

  return colores[estado]
}

function prioridadVariant(prioridad: Proyecto["prioridad"]) {
  const colores: Record<Proyecto["prioridad"], string> = {
    Baja: "border-slate-300 text-slate-700",
    Media: "border-sky-300 text-sky-700",
    Alta: "border-amber-300 text-amber-700",
    Crítica: "border-red-300 text-red-700",
  }

  return colores[prioridad]
}

function toInputDate(value: Date | string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ""
  }

  return date.toISOString().slice(0, 10)
}

function currency(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value)
}

function buildFormState(proyecto?: Proyecto | null): ProyectoFormState {
  if (!proyecto) {
    return EMPTY_FORM
  }

  return {
    nombre: proyecto.nombre,
    cliente: proyecto.cliente,
    descripcion: proyecto.descripcion,
    fechaInicio: toInputDate(proyecto.fechaInicio),
    fechaFin: toInputDate(proyecto.fechaFin),
    presupuesto: String(proyecto.presupuesto ?? 0),
    avance: String(proyecto.avance ?? 0),
    estado: proyecto.estado,
    prioridad: proyecto.prioridad,
    equipo: proyecto.equipo.join(", "),
    etiquetas: (proyecto.etiquetas ?? []).join(", "),
  }
}

const ProyectosListPage = () => {
  const { proyectos, loading, error, createProyecto, updateProyecto, deleteProyecto, refetch } =
    useProyectos()
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [searchTerm, setSearchTerm] = useState("")
  const [estadoFiltro, setEstadoFiltro] = useState<"todos" | Proyecto["estado"]>("todos")
  const [prioridadFiltro, setPrioridadFiltro] = useState<"todas" | Proyecto["prioridad"]>("todas")
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [editingProject, setEditingProject] = useState<Proyecto | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Proyecto | null>(null)
  const [form, setForm] = useState<ProyectoFormState>(EMPTY_FORM)

  const proyectosFiltrados = proyectos.filter((proyecto) => {
    const matchesSearch = [proyecto.nombre, proyecto.cliente, proyecto.descripcion]
      .join(" ")
      .toLowerCase()
      .includes(searchTerm.toLowerCase())

    const matchesEstado = estadoFiltro === "todos" || proyecto.estado === estadoFiltro
    const matchesPrioridad = prioridadFiltro === "todas" || proyecto.prioridad === prioridadFiltro

    return matchesSearch && matchesEstado && matchesPrioridad
  })

  const proyectoSeleccionado =
    proyectosFiltrados.find((proyecto) => proyecto.id === selectedProjectId) ?? null

  useEffect(() => {
    if (!proyectosFiltrados.length) {
      setSelectedProjectId(null)
      return
    }

    if (
      !selectedProjectId ||
      !proyectosFiltrados.some((proyecto) => proyecto.id === selectedProjectId)
    ) {
      setSelectedProjectId(proyectosFiltrados[0].id)
    }
  }, [proyectosFiltrados, selectedProjectId])

  const proyectosActivos = proyectos.filter((proyecto) => proyecto.estado === "En Curso").length
  const proyectosEnRiesgo = proyectos.filter(
    (proyecto) => proyecto.estado === "En Riesgo" || proyecto.estado === "Retrasado"
  ).length
  const presupuestoTotal = proyectos.reduce((total, proyecto) => total + proyecto.presupuesto, 0)
  const avancePromedio = proyectos.length
    ? Math.round(
        proyectos.reduce((total, proyecto) => total + proyecto.avance, 0) / proyectos.length
      )
    : 0

  const openCreateDialog = () => {
    setEditingProject(null)
    setForm(EMPTY_FORM)
    setSaveError(null)
    setFormOpen(true)
  }

  const openEditDialog = (proyecto: Proyecto) => {
    setEditingProject(proyecto)
    setForm(buildFormState(proyecto))
    setSaveError(null)
    setFormOpen(true)
  }

  const handleSave = async () => {
    if (!form.nombre.trim() || !form.cliente.trim() || !form.fechaInicio || !form.fechaFin) {
      setSaveError("Nombre, cliente y fechas son obligatorios.")
      return
    }

    setSaving(true)
    setSaveError(null)

    const payload = {
      nombre: form.nombre.trim(),
      cliente: form.cliente.trim(),
      descripcion: form.descripcion.trim(),
      fechaInicio: new Date(form.fechaInicio),
      fechaFin: new Date(form.fechaFin),
      presupuesto: Number(form.presupuesto || 0),
      avance: Number(form.avance || 0),
      estado: form.estado,
      prioridad: form.prioridad,
      equipo: form.equipo
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      etiquetas: form.etiquetas
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    }

    try {
      const proyectoGuardado = editingProject
        ? await updateProyecto(editingProject.id, payload)
        : await createProyecto(payload)

      setFormOpen(false)
      setEditingProject(null)
      setForm(EMPTY_FORM)
      setSelectedProjectId(proyectoGuardado.id)
    } catch (saveIssue) {
      setSaveError(
        saveIssue instanceof Error ? saveIssue.message : "No se pudo guardar el proyecto."
      )
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) {
      return
    }

    try {
      await deleteProyecto(deleteTarget.id)
      if (selectedProjectId === deleteTarget.id) {
        setSelectedProjectId(null)
      }
      setDeleteTarget(null)
    } catch (deleteIssue) {
      setSaveError(
        deleteIssue instanceof Error ? deleteIssue.message : "No se pudo eliminar el proyecto."
      )
      setDeleteTarget(null)
    }
  }

  const renderProyectoCard = (proyecto: Proyecto) => (
    <Card
      key={proyecto.id}
      className={[
        "cursor-pointer border transition-all hover:shadow-md",
        selectedProjectId === proyecto.id ? "border-primary shadow-sm" : "border-border",
      ].join(" ")}
      onClick={() => setSelectedProjectId(proyecto.id)}
    >
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">{proyecto.nombre}</CardTitle>
            <p className="text-sm text-muted-foreground">{proyecto.cliente}</p>
          </div>
          <Badge className={estadoColor(proyecto.estado)}>{proyecto.estado}</Badge>
        </div>
        <p className="line-clamp-2 text-sm text-muted-foreground">{proyecto.descripcion}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span>Avance</span>
            <span className="font-medium">{proyecto.avance}%</span>
          </div>
          <Progress value={proyecto.avance} className="h-2" />
        </div>
        <div className="grid gap-3 text-sm md:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Presupuesto</p>
            <p className="font-semibold">{currency(proyecto.presupuesto)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Prioridad</p>
            <Badge variant="outline" className={prioridadVariant(proyecto.prioridad)}>
              {proyecto.prioridad}
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
          <div className="flex flex-wrap gap-1">
            {(proyecto.etiquetas ?? []).slice(0, 2).map((etiqueta) => (
              <Badge key={etiqueta} variant="secondary" className="text-xs">
                {etiqueta}
              </Badge>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={(event) => {
                event.stopPropagation()
                setSelectedProjectId(proyecto.id)
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={(event) => {
                event.stopPropagation()
                openEditDialog(proyecto)
              }}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={(event) => {
                event.stopPropagation()
                setDeleteTarget(proyecto)
              }}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="flex-1 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Proyectos</h1>
          <p className="mt-1 text-muted-foreground">
            Maestro operativo de proyectos con seguimiento, responsables y mantenimiento básico.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void refetch()}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Proyecto
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <FolderKanban className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Proyectos</p>
              <p className="text-2xl font-semibold">{proyectos.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <TrendingUp className="h-8 w-8 text-emerald-600" />
            <div>
              <p className="text-sm text-muted-foreground">Activos</p>
              <p className="text-2xl font-semibold">{proyectosActivos}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <CalendarDays className="h-8 w-8 text-amber-600" />
            <div>
              <p className="text-sm text-muted-foreground">En Riesgo</p>
              <p className="text-2xl font-semibold">{proyectosEnRiesgo}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <Users className="h-8 w-8 text-sky-600" />
            <div>
              <p className="text-sm text-muted-foreground">Avance Promedio</p>
              <p className="text-2xl font-semibold">{avancePromedio}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 pt-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-1 flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar por proyecto, cliente o descripción"
                className="pl-9"
              />
            </div>
            <Select
              value={estadoFiltro}
              onValueChange={(value) => setEstadoFiltro(value as "todos" | Proyecto["estado"])}
            >
              <SelectTrigger className="w-full md:w-56">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                {ESTADOS.map((estado) => (
                  <SelectItem key={estado} value={estado}>
                    {estado}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={prioridadFiltro}
              onValueChange={(value) =>
                setPrioridadFiltro(value as "todas" | Proyecto["prioridad"])
              }
            >
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Prioridad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las prioridades</SelectItem>
                {PRIORIDADES.map((prioridad) => (
                  <SelectItem key={prioridad} value={prioridad}>
                    {prioridad}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("grid")}
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "kanban" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("kanban")}
            >
              <Kanban className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Card className="border-destructive/40">
          <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_360px]">
        <div className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="pt-6 text-sm text-muted-foreground">
                Cargando proyectos...
              </CardContent>
            </Card>
          ) : null}

          {!loading && !proyectosFiltrados.length ? (
            <Card>
              <CardContent className="space-y-2 pt-6 text-sm text-muted-foreground">
                <p>No hay proyectos para los filtros seleccionados.</p>
                <p>Podés limpiar filtros o registrar un nuevo proyecto.</p>
              </CardContent>
            </Card>
          ) : null}

          {!loading && viewMode === "grid" ? (
            <div className="grid gap-4 md:grid-cols-2">
              {proyectosFiltrados.map(renderProyectoCard)}
            </div>
          ) : null}

          {!loading && viewMode === "list" ? (
            <div className="space-y-3">
              {proyectosFiltrados.map((proyecto) => (
                <Card
                  key={proyecto.id}
                  className={[
                    "cursor-pointer transition-colors hover:bg-muted/40",
                    selectedProjectId === proyecto.id ? "border-primary" : "",
                  ].join(" ")}
                  onClick={() => setSelectedProjectId(proyecto.id)}
                >
                  <CardContent className="flex flex-col gap-4 py-4 lg:flex-row lg:items-center">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{proyecto.nombre}</p>
                      <p className="text-sm text-muted-foreground">{proyecto.cliente}</p>
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span>Avance</span>
                        <span>{proyecto.avance}%</span>
                      </div>
                      <Progress value={proyecto.avance} className="h-2" />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                      <Badge className={estadoColor(proyecto.estado)}>{proyecto.estado}</Badge>
                      <Badge variant="outline" className={prioridadVariant(proyecto.prioridad)}>
                        {proyecto.prioridad}
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(event) => {
                          event.stopPropagation()
                          openEditDialog(proyecto)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(event) => {
                          event.stopPropagation()
                          setDeleteTarget(proyecto)
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null}

          {!loading && viewMode === "kanban" ? (
            <div className="grid gap-4 xl:grid-cols-3 2xl:grid-cols-6">
              {ESTADOS.map((estado) => (
                <div key={estado} className="rounded-lg border bg-muted/20 p-3">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{estado}</p>
                    <Badge variant="secondary">
                      {proyectosFiltrados.filter((proyecto) => proyecto.estado === estado).length}
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    {proyectosFiltrados
                      .filter((proyecto) => proyecto.estado === estado)
                      .map((proyecto) => renderProyectoCard(proyecto))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Detalle</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {proyectoSeleccionado ? (
              <>
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-semibold">{proyectoSeleccionado.nombre}</h2>
                      <p className="text-sm text-muted-foreground">
                        {proyectoSeleccionado.cliente}
                      </p>
                    </div>
                    <Badge className={estadoColor(proyectoSeleccionado.estado)}>
                      {proyectoSeleccionado.estado}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {proyectoSeleccionado.descripcion}
                  </p>
                </div>

                <div className="space-y-2 rounded-lg border p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Avance</span>
                    <span className="font-medium">{proyectoSeleccionado.avance}%</span>
                  </div>
                  <Progress value={proyectoSeleccionado.avance} className="h-2" />
                </div>

                <div className="grid gap-3 text-sm">
                  <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                    <span className="text-muted-foreground">Presupuesto</span>
                    <span className="font-semibold">
                      {currency(proyectoSeleccionado.presupuesto)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                    <span className="text-muted-foreground">Fechas</span>
                    <span className="text-right font-medium">
                      {toInputDate(proyectoSeleccionado.fechaInicio)} al{" "}
                      {toInputDate(proyectoSeleccionado.fechaFin)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                    <span className="text-muted-foreground">Prioridad</span>
                    <Badge
                      variant="outline"
                      className={prioridadVariant(proyectoSeleccionado.prioridad)}
                    >
                      {proyectoSeleccionado.prioridad}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Equipo</p>
                  <div className="flex flex-wrap gap-2">
                    {proyectoSeleccionado.equipo.length ? (
                      proyectoSeleccionado.equipo.map((miembro) => (
                        <Badge key={miembro} variant="secondary">
                          {miembro}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">Sin responsables definidos.</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Etiquetas</p>
                  <div className="flex flex-wrap gap-2">
                    {(proyectoSeleccionado.etiquetas ?? []).length ? (
                      (proyectoSeleccionado.etiquetas ?? []).map((etiqueta) => (
                        <Badge key={etiqueta} variant="outline">
                          {etiqueta}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">Sin etiquetas.</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    className="flex-1"
                    variant="outline"
                    onClick={() => openEditDialog(proyectoSeleccionado)}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                  <Button
                    className="flex-1"
                    variant="destructive"
                    onClick={() => setDeleteTarget(proyectoSeleccionado)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Seleccioná un proyecto para ver su detalle.
              </p>
            )}

            <div className="rounded-lg border bg-muted/20 p-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Presupuesto total filtrado</span>
                <span className="font-semibold">
                  {currency(
                    proyectosFiltrados.reduce((total, proyecto) => total + proyecto.presupuesto, 0)
                  )}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Proyectos filtrados</span>
                <span className="font-semibold">{proyectosFiltrados.length}</span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Presupuesto total general</span>
                <span className="font-semibold">{currency(presupuestoTotal)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingProject ? "Editar Proyecto" : "Nuevo Proyecto"}</DialogTitle>
            <DialogDescription>
              Registrá la cabecera del proyecto y mantené su estado operativo desde esta misma
              vista.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                value={form.nombre}
                onChange={(event) =>
                  setForm((current) => ({ ...current, nombre: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cliente">Cliente</Label>
              <Input
                id="cliente"
                value={form.cliente}
                onChange={(event) =>
                  setForm((current) => ({ ...current, cliente: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="presupuesto">Presupuesto</Label>
              <Input
                id="presupuesto"
                type="number"
                min="0"
                value={form.presupuesto}
                onChange={(event) =>
                  setForm((current) => ({ ...current, presupuesto: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fechaInicio">Fecha de inicio</Label>
              <Input
                id="fechaInicio"
                type="date"
                value={form.fechaInicio}
                onChange={(event) =>
                  setForm((current) => ({ ...current, fechaInicio: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fechaFin">Fecha de fin</Label>
              <Input
                id="fechaFin"
                type="date"
                value={form.fechaFin}
                onChange={(event) =>
                  setForm((current) => ({ ...current, fechaFin: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={form.estado}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, estado: value as Proyecto["estado"] }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS.map((estado) => (
                    <SelectItem key={estado} value={estado}>
                      {estado}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prioridad</Label>
              <Select
                value={form.prioridad}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, prioridad: value as Proyecto["prioridad"] }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORIDADES.map((prioridad) => (
                    <SelectItem key={prioridad} value={prioridad}>
                      {prioridad}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="avance">Avance (%)</Label>
              <Input
                id="avance"
                type="number"
                min="0"
                max="100"
                value={form.avance}
                onChange={(event) =>
                  setForm((current) => ({ ...current, avance: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="equipo">Equipo</Label>
              <Input
                id="equipo"
                placeholder="Ej: Ana Pérez, Carlos Díaz"
                value={form.equipo}
                onChange={(event) =>
                  setForm((current) => ({ ...current, equipo: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="etiquetas">Etiquetas</Label>
              <Input
                id="etiquetas"
                placeholder="Ej: ERP, implementación, cliente estratégico"
                value={form.etiquetas}
                onChange={(event) =>
                  setForm((current) => ({ ...current, etiquetas: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                rows={4}
                value={form.descripcion}
                onChange={(event) =>
                  setForm((current) => ({ ...current, descripcion: event.target.value }))
                }
              />
            </div>
          </div>
          {saveError ? <p className="text-sm text-destructive">{saveError}</p> : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? "Guardando..." : editingProject ? "Guardar cambios" : "Crear proyecto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar proyecto</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `Se eliminará ${deleteTarget.nombre} y dejará de estar disponible en el maestro de proyectos.`
                : "Confirmá la eliminación del proyecto."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default ProyectosListPage
