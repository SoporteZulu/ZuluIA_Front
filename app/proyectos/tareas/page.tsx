"use client"

import { useMemo, useState } from "react"
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock3,
  ClipboardList,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useMiembros, useProyectos, useTareasProyecto } from "@/lib/hooks/useProyectos"
import type { Tarea } from "@/lib/proyectos-types"

type TareaFormState = {
  titulo: string
  descripcion: string
  proyecto: string
  asignado: string
  estado: Tarea["estado"]
  prioridad: Tarea["prioridad"]
  fechaVencimiento: string
  tiempoRegistrado: string
}

const ESTADOS: Tarea["estado"][] = ["Por Hacer", "En Progreso", "En Revisión", "Hecho"]
const PRIORIDADES: Tarea["prioridad"][] = ["Baja", "Media", "Alta", "Crítica"]

const emptyForm = (): TareaFormState => ({
  titulo: "",
  descripcion: "",
  proyecto: "",
  asignado: "",
  estado: "Por Hacer",
  prioridad: "Media",
  fechaVencimiento: "",
  tiempoRegistrado: "0",
})

function SummaryCard({
  title,
  value,
  description,
  icon,
}: {
  title: string
  value: string | number
  description: string
  icon: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  )
}

function formatDate(value?: Date | string) {
  if (!value) return "Sin vencimiento"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Sin vencimiento"

  return date.toLocaleDateString("es-AR")
}

function toInputDate(value?: Date | string) {
  if (!value) return ""

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""

  return date.toISOString().slice(0, 10)
}

function getDaysToDue(value: Date | string | undefined, referenceDate: Date) {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  const base = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  )
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  return Math.round((target.getTime() - base.getTime()) / 86400000)
}

function getPriorityVariant(
  prioridad: Tarea["prioridad"]
): "default" | "secondary" | "outline" | "destructive" {
  switch (prioridad) {
    case "Crítica":
      return "destructive"
    case "Alta":
      return "default"
    case "Media":
      return "secondary"
    case "Baja":
      return "outline"
    default:
      return "outline"
  }
}

export default function TareasPage() {
  const { proyectos } = useProyectos()
  const { miembros } = useMiembros()
  const [today] = useState(() => new Date())

  const [proyectoFiltro, setProyectoFiltro] = useState("todos")
  const { tareas, loading, error, createTarea, updateTarea, deleteTarea, refetch } =
    useTareasProyecto(proyectoFiltro === "todos" ? undefined : proyectoFiltro)

  const [search, setSearch] = useState("")
  const [estadoFiltro, setEstadoFiltro] = useState<"todos" | Tarea["estado"]>("todos")
  const [prioridadFiltro, setPrioridadFiltro] = useState<"todos" | Tarea["prioridad"]>("todos")
  const [selectedTarea, setSelectedTarea] = useState<Tarea | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTarea, setEditingTarea] = useState<Tarea | null>(null)
  const [form, setForm] = useState<TareaFormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const filteredTareas = useMemo(() => {
    return tareas.filter((tarea) => {
      const matchesSearch =
        tarea.titulo.toLowerCase().includes(search.toLowerCase()) ||
        (tarea.descripcion ?? "").toLowerCase().includes(search.toLowerCase()) ||
        tarea.proyecto.toLowerCase().includes(search.toLowerCase()) ||
        (tarea.asignado ?? "").toLowerCase().includes(search.toLowerCase())
      const matchesEstado = estadoFiltro === "todos" || tarea.estado === estadoFiltro
      const matchesPrioridad = prioridadFiltro === "todos" || tarea.prioridad === prioridadFiltro

      return matchesSearch && matchesEstado && matchesPrioridad
    })
  }, [estadoFiltro, prioridadFiltro, search, tareas])

  const tareasPorEstado = useMemo(() => {
    return ESTADOS.reduce<Record<Tarea["estado"], Tarea[]>>(
      (acc, estado) => {
        acc[estado] = filteredTareas.filter((tarea) => tarea.estado === estado)
        return acc
      },
      {
        "Por Hacer": [],
        "En Progreso": [],
        "En Revisión": [],
        Hecho: [],
      }
    )
  }, [filteredTareas])

  const projectLabels = useMemo(() => {
    const map = new Map<string, string>()

    for (const proyecto of proyectos) {
      map.set(proyecto.id, proyecto.nombre)
      map.set(proyecto.nombre, proyecto.nombre)
    }

    return map
  }, [proyectos])

  const metricas = useMemo(() => {
    const vencidas = filteredTareas.filter((tarea) => {
      if (!tarea.fechaVencimiento || tarea.estado === "Hecho") return false
      const daysToDue = getDaysToDue(tarea.fechaVencimiento, today)
      return daysToDue !== null && daysToDue < 0
    }).length

    const horas = filteredTareas.reduce((acc, tarea) => acc + tarea.tiempoRegistrado, 0)

    const activas = filteredTareas.filter((tarea) => tarea.estado !== "Hecho")
    const completadas = filteredTareas.filter((tarea) => tarea.estado === "Hecho")

    return {
      vencidas,
      horas,
      activas: activas.length,
      completadas: completadas.length,
      criticas: activas.filter((tarea) => tarea.prioridad === "Crítica").length,
      sinAsignar: activas.filter((tarea) => !tarea.asignado).length,
      enRevision: activas.filter((tarea) => tarea.estado === "En Revisión").length,
      tasaCierre: filteredTareas.length
        ? Math.round((completadas.length / filteredTareas.length) * 100)
        : 0,
    }
  }, [filteredTareas, today])

  const coberturaPorProyecto = useMemo(() => {
    return filteredTareas
      .reduce<
        Array<{
          proyecto: string
          total: number
          activas: number
          vencidas: number
          horas: number
          criticas: number
        }>
      >((acc, tarea) => {
        const projectName = projectLabels.get(tarea.proyecto) ?? tarea.proyecto
        const existing = acc.find((item) => item.proyecto === projectName)
        const daysToDue = getDaysToDue(tarea.fechaVencimiento, today)

        if (existing) {
          existing.total += 1
          existing.horas += tarea.tiempoRegistrado
          if (tarea.estado !== "Hecho") existing.activas += 1
          if (daysToDue !== null && daysToDue < 0 && tarea.estado !== "Hecho")
            existing.vencidas += 1
          if (tarea.prioridad === "Crítica" && tarea.estado !== "Hecho") existing.criticas += 1
          return acc
        }

        acc.push({
          proyecto: projectName,
          total: 1,
          activas: tarea.estado !== "Hecho" ? 1 : 0,
          vencidas: daysToDue !== null && daysToDue < 0 && tarea.estado !== "Hecho" ? 1 : 0,
          horas: tarea.tiempoRegistrado,
          criticas: tarea.prioridad === "Crítica" && tarea.estado !== "Hecho" ? 1 : 0,
        })
        return acc
      }, [])
      .sort((a, b) => {
        if (b.activas !== a.activas) return b.activas - a.activas
        if (b.vencidas !== a.vencidas) return b.vencidas - a.vencidas
        return b.horas - a.horas
      })
  }, [filteredTareas, projectLabels, today])

  const cargaPorResponsable = useMemo(() => {
    const assigneeNames = new Set(miembros.map((miembro) => miembro.nombre))

    const summary = filteredTareas.reduce<
      Array<{
        responsable: string
        activas: number
        revision: number
        vencidas: number
        horas: number
        capacidad: string
      }>
    >((acc, tarea) => {
      const responsable = tarea.asignado || "Sin asignar"
      const existing = acc.find((item) => item.responsable === responsable)
      const daysToDue = getDaysToDue(tarea.fechaVencimiento, today)

      if (existing) {
        existing.horas += tarea.tiempoRegistrado
        if (tarea.estado !== "Hecho") existing.activas += 1
        if (tarea.estado === "En Revisión") existing.revision += 1
        if (daysToDue !== null && daysToDue < 0 && tarea.estado !== "Hecho") existing.vencidas += 1
        return acc
      }

      acc.push({
        responsable,
        activas: tarea.estado !== "Hecho" ? 1 : 0,
        revision: tarea.estado === "En Revisión" ? 1 : 0,
        vencidas: daysToDue !== null && daysToDue < 0 && tarea.estado !== "Hecho" ? 1 : 0,
        horas: tarea.tiempoRegistrado,
        capacidad:
          responsable === "Sin asignar"
            ? "Pendiente"
            : assigneeNames.has(responsable)
              ? "Cubierto"
              : "Legado",
      })
      return acc
    }, [])

    return summary.sort((a, b) => {
      if (b.activas !== a.activas) return b.activas - a.activas
      if (b.vencidas !== a.vencidas) return b.vencidas - a.vencidas
      return b.horas - a.horas
    })
  }, [filteredTareas, miembros, today])

  const alertasOperativas = useMemo(() => {
    const alerts: Array<{ title: string; description: string }> = []

    if (metricas.vencidas > 0) {
      alerts.push({
        title: "Vencimientos fuera de fecha",
        description: `${metricas.vencidas} tareas activas ya superaron su vencimiento visible y requieren seguimiento con proyecto o responsable.`,
      })
    }

    if (metricas.sinAsignar > 0) {
      alerts.push({
        title: "Carga sin responsable",
        description: `${metricas.sinAsignar} tareas activas todavía no tienen asignación nominal en el maestro actual.`,
      })
    }

    if (metricas.criticas > 0) {
      alerts.push({
        title: "Prioridades críticas abiertas",
        description: `${metricas.criticas} tareas críticas siguen abiertas y conviene revisarlas antes del próximo corte operativo.`,
      })
    }

    if (metricas.enRevision > 0) {
      alerts.push({
        title: "Pendientes de validación",
        description: `${metricas.enRevision} tareas están en revisión y concentran el cuello de aprobación del flujo actual.`,
      })
    }

    if (!alerts.length) {
      alerts.push({
        title: "Sin alertas mayores",
        description:
          "La vista filtrada no muestra atrasos, críticos ni tareas sin asignar fuera de control.",
      })
    }

    return alerts.slice(0, 4)
  }, [metricas])

  const tareaDestacada =
    selectedTarea && filteredTareas.some((tarea) => tarea.id === selectedTarea.id)
      ? selectedTarea
      : (filteredTareas[0] ?? null)
  const tareaDestacadaDias = tareaDestacada
    ? getDaysToDue(tareaDestacada.fechaVencimiento, today)
    : null
  const tareaDestacadaProyecto = tareaDestacada
    ? (projectLabels.get(tareaDestacada.proyecto) ?? tareaDestacada.proyecto)
    : null

  const openCreate = () => {
    setEditingTarea(null)
    setSaveError(null)
    setForm(emptyForm())
    setIsFormOpen(true)
  }

  const openEdit = (tarea: Tarea) => {
    setEditingTarea(tarea)
    setSaveError(null)
    setForm({
      titulo: tarea.titulo,
      descripcion: tarea.descripcion ?? "",
      proyecto: tarea.proyecto,
      asignado: tarea.asignado ?? "",
      estado: tarea.estado,
      prioridad: tarea.prioridad,
      fechaVencimiento: toInputDate(tarea.fechaVencimiento),
      tiempoRegistrado: String(tarea.tiempoRegistrado),
    })
    setIsFormOpen(true)
  }

  const openDetail = (tarea: Tarea) => {
    setSelectedTarea(tarea)
    setIsDetailOpen(true)
  }

  const handleDelete = async (tarea: Tarea) => {
    try {
      await deleteTarea(tarea.id)
      if (selectedTarea?.id === tarea.id) {
        setSelectedTarea(null)
        setIsDetailOpen(false)
      }
    } catch (deleteError) {
      setSaveError(
        deleteError instanceof Error ? deleteError.message : "No se pudo eliminar la tarea."
      )
    }
  }

  const handleSave = async () => {
    if (!form.titulo.trim() || !form.proyecto.trim()) {
      setSaveError("Titulo y proyecto son obligatorios.")
      return
    }

    const tiempoRegistrado = Number.parseInt(form.tiempoRegistrado, 10)
    if (Number.isNaN(tiempoRegistrado) || tiempoRegistrado < 0) {
      setSaveError("El tiempo registrado debe ser un numero valido mayor o igual a 0.")
      return
    }

    setSaving(true)
    setSaveError(null)

    const payload = {
      titulo: form.titulo.trim(),
      descripcion: form.descripcion.trim() || undefined,
      proyecto: form.proyecto,
      asignado: form.asignado || undefined,
      estado: form.estado,
      prioridad: form.prioridad,
      fechaVencimiento: form.fechaVencimiento
        ? new Date(`${form.fechaVencimiento}T00:00:00`)
        : undefined,
      tiempoRegistrado,
      etiquetas: editingTarea?.etiquetas ?? [],
      subtareas: editingTarea?.subtareas ?? [],
      comentarios: editingTarea?.comentarios ?? [],
    }

    try {
      if (editingTarea) {
        await updateTarea(editingTarea.id, payload)
      } else {
        await createTarea(payload)
      }

      setIsFormOpen(false)
      setEditingTarea(null)
      setForm(emptyForm())
    } catch (persistError) {
      setSaveError(
        persistError instanceof Error ? persistError.message : "No se pudo guardar la tarea."
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tareas</h1>
          <p className="text-muted-foreground mt-1">
            Tablero operativo de proyectos con tareas reales, filtros por cartera y mantenimiento
            backend.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva tarea
          </Button>
        </div>
      </div>

      {(error || saveError) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Gestion de tareas</AlertTitle>
          <AlertDescription>{saveError ?? error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Tareas visibles"
          value={filteredTareas.length}
          description="Resultado de los filtros actuales"
          icon={<ClipboardList className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="En curso"
          value={metricas.activas}
          description="Pendientes, en progreso o en revision"
          icon={<Clock3 className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Completadas"
          value={metricas.completadas}
          description="Marcadas como hechas"
          icon={<CheckCircle2 className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Horas registradas"
          value={metricas.horas}
          description={
            metricas.vencidas > 0
              ? `${metricas.vencidas} vencidas requieren seguimiento`
              : "Sin vencimientos atrasados en la vista"
          }
          icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Radar operativo</CardTitle>
            <CardDescription>
              Lectura de riesgo y cobertura sobre las tareas reales visibles en cartera.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground">Tasa de cierre</p>
              <p className="mt-2 text-3xl font-semibold">{metricas.tasaCierre}%</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {metricas.completadas} cerradas sobre {filteredTareas.length} tareas visibles.
              </p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground">Cobertura de asignación</p>
              <p className="mt-2 text-3xl font-semibold">
                {filteredTareas.length - metricas.sinAsignar}/{filteredTareas.length || 0}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {metricas.sinAsignar > 0
                  ? `${metricas.sinAsignar} tareas activas siguen sin responsable nominal.`
                  : "Toda la vista filtrada tiene responsable o ya fue cerrada."}
              </p>
            </div>

            {alertasOperativas.map((alerta) => (
              <div key={alerta.title} className="rounded-lg border p-4">
                <p className="font-medium">{alerta.title}</p>
                <p className="mt-2 text-sm text-muted-foreground">{alerta.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tarea destacada</CardTitle>
            <CardDescription>
              Resumen directo del frente con mayor visibilidad dentro del filtro actual.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tareaDestacada ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold leading-tight">{tareaDestacada.titulo}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{tareaDestacadaProyecto}</p>
                  </div>
                  <Badge variant={getPriorityVariant(tareaDestacada.prioridad)}>
                    {tareaDestacada.prioridad}
                  </Badge>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Circuito</p>
                    <p className="mt-2 font-medium">{tareaDestacada.estado}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Responsable</p>
                    <p className="mt-2 font-medium">{tareaDestacada.asignado || "Sin asignar"}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Vencimiento</p>
                    <p className="mt-2 font-medium">
                      {formatDate(tareaDestacada.fechaVencimiento)}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Lectura operativa</p>
                    <p className="mt-2 font-medium">
                      {tareaDestacadaDias === null
                        ? "Sin fecha comprometida"
                        : tareaDestacadaDias < 0
                          ? `Atrasada ${Math.abs(tareaDestacadaDias)} dias`
                          : tareaDestacadaDias === 0
                            ? "Vence hoy"
                            : `${tareaDestacadaDias} dias al vencimiento`}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border bg-muted/20 p-4">
                  <p className="text-sm text-muted-foreground">Cobertura legacy visible</p>
                  <p className="mt-2 text-sm">
                    La API actual expone responsable, prioridad, vencimiento, etiquetas, subtareas,
                    comentarios y horas acumuladas. Partes horarios granulares y aprobaciones por
                    etapa siguen fuera del contrato vigente.
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                No hay tareas visibles para construir el resumen destacado.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cobertura por proyecto</CardTitle>
            <CardDescription>
              Distribucion de tareas, horas y atrasos por frente operativo real.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {coberturaPorProyecto.length > 0 ? (
              coberturaPorProyecto.slice(0, 6).map((proyecto) => (
                <div key={proyecto.proyecto} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{proyecto.proyecto}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {proyecto.total} tareas, {proyecto.activas} activas, {proyecto.horas} horas.
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-medium">{proyecto.vencidas} vencidas</p>
                      <p className="text-muted-foreground">{proyecto.criticas} criticas</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                No hay proyectos con tareas visibles para resumir en esta vista.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Carga por responsable</CardTitle>
            <CardDescription>
              Reparto real de trabajo abierto y tareas pendientes de validacion.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {cargaPorResponsable.length > 0 ? (
              cargaPorResponsable.slice(0, 6).map((responsable) => (
                <div key={responsable.responsable} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{responsable.responsable}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {responsable.activas} activas, {responsable.revision} en revision,{" "}
                        {responsable.horas} horas.
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-medium">{responsable.capacidad}</p>
                      <p className="text-muted-foreground">{responsable.vencidas} vencidas</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                No hay responsables cargados para analizar la asignacion visible.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros y vista Kanban</CardTitle>
          <CardDescription>
            El tablero refleja el backend actual. Los cambios de estado se hacen editando la tarea,
            sin drag-and-drop ficticio.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_220px_220px_220px]">
            <div className="space-y-2">
              <Label>Buscar tarea</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-10"
                  placeholder="Titulo, descripcion, proyecto o responsable"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Proyecto</Label>
              <Select value={proyectoFiltro} onValueChange={setProyectoFiltro}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los proyectos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los proyectos</SelectItem>
                  {proyectos.map((proyecto) => (
                    <SelectItem key={proyecto.id} value={proyecto.id}>
                      {proyecto.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={estadoFiltro}
                onValueChange={(value) => setEstadoFiltro(value as "todos" | Tarea["estado"])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los estados" />
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
            </div>

            <div className="space-y-2">
              <Label>Prioridad</Label>
              <Select
                value={prioridadFiltro}
                onValueChange={(value) => setPrioridadFiltro(value as "todos" | Tarea["prioridad"])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas las prioridades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas las prioridades</SelectItem>
                  {PRIORIDADES.map((prioridad) => (
                    <SelectItem key={prioridad} value={prioridad}>
                      {prioridad}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center rounded-md border py-16 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Cargando tareas...
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-4">
              {ESTADOS.map((estado) => (
                <Card key={estado} className="bg-muted/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{estado}</CardTitle>
                    <CardDescription>{tareasPorEstado[estado].length} tareas</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {tareasPorEstado[estado].length === 0 && (
                      <div className="rounded-md border border-dashed bg-background/80 p-4 text-sm text-muted-foreground">
                        Sin tareas en esta columna.
                      </div>
                    )}

                    {tareasPorEstado[estado].map((tarea) => {
                      const subtareas = tarea.subtareas?.length ?? 0
                      const comentarios = tarea.comentarios?.length ?? 0

                      return (
                        <button
                          key={tarea.id}
                          className="w-full rounded-lg border bg-background p-4 text-left transition hover:shadow-sm"
                          onClick={() => openDetail(tarea)}
                          type="button"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium leading-tight">{tarea.titulo}</p>
                              <p className="mt-1 text-xs text-muted-foreground">{tarea.proyecto}</p>
                            </div>
                            <Badge variant={getPriorityVariant(tarea.prioridad)}>
                              {tarea.prioridad}
                            </Badge>
                          </div>

                          {tarea.descripcion && (
                            <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
                              {tarea.descripcion}
                            </p>
                          )}

                          <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                            <div className="flex items-center justify-between gap-2">
                              <span>Responsable</span>
                              <span className="font-medium text-foreground">
                                {tarea.asignado || "Sin asignar"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span>Vencimiento</span>
                              <span className="font-medium text-foreground">
                                {formatDate(tarea.fechaVencimiento)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span>Horas</span>
                              <span className="font-medium text-foreground">
                                {tarea.tiempoRegistrado}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span>Detalle</span>
                              <span className="font-medium text-foreground">
                                {subtareas} subtareas / {comentarios} comentarios
                              </span>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedTarea?.titulo ?? "Detalle de la tarea"}</DialogTitle>
            <DialogDescription>
              Ficha operativa con los campos expuestos por el backend actual.
            </DialogDescription>
          </DialogHeader>

          {selectedTarea && (
            <div className="space-y-4 py-2 text-sm">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-muted-foreground">Proyecto</p>
                  <p className="font-medium">{selectedTarea.proyecto}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Responsable</p>
                  <p className="font-medium">{selectedTarea.asignado || "Sin asignar"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Estado</p>
                  <p className="font-medium">{selectedTarea.estado}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Prioridad</p>
                  <Badge variant={getPriorityVariant(selectedTarea.prioridad)}>
                    {selectedTarea.prioridad}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Vencimiento</p>
                  <p className="font-medium">{formatDate(selectedTarea.fechaVencimiento)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Horas registradas</p>
                  <p className="font-medium">{selectedTarea.tiempoRegistrado}</p>
                </div>
              </div>

              <div>
                <p className="text-muted-foreground mb-1">Descripcion</p>
                <p>{selectedTarea.descripcion || "Sin descripcion adicional."}</p>
              </div>

              <div>
                <p className="text-muted-foreground mb-2">Subtareas</p>
                <div className="space-y-2">
                  {selectedTarea.subtareas && selectedTarea.subtareas.length > 0 ? (
                    selectedTarea.subtareas.map((subtarea) => (
                      <div
                        key={subtarea.id}
                        className="flex items-center gap-2 rounded-md border px-3 py-2"
                      >
                        {subtarea.completada ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <Clock3 className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span>{subtarea.titulo}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">La tarea no tiene subtareas cargadas.</p>
                  )}
                </div>
              </div>

              <div>
                <p className="text-muted-foreground mb-2">Etiquetas y comentarios</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Etiquetas</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedTarea.etiquetas && selectedTarea.etiquetas.length > 0 ? (
                        selectedTarea.etiquetas.map((etiqueta) => (
                          <Badge key={etiqueta} variant="secondary">
                            {etiqueta}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">Sin etiquetas operativas.</p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Comentarios</p>
                    <div className="mt-3 space-y-2">
                      {selectedTarea.comentarios && selectedTarea.comentarios.length > 0 ? (
                        selectedTarea.comentarios.slice(0, 3).map((comentario) => (
                          <div key={comentario.id} className="rounded-md bg-muted/40 p-3">
                            <p className="text-sm font-medium">{comentario.autor}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {comentario.contenido}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          La tarea no tiene comentarios visibles en el backend actual.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            {selectedTarea && (
              <>
                <Button variant="outline" onClick={() => openEdit(selectedTarea)}>
                  Editar tarea
                </Button>
                <Button variant="outline" onClick={() => void handleDelete(selectedTarea)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTarea ? "Editar tarea" : "Nueva tarea"}</DialogTitle>
            <DialogDescription>
              Alta y mantenimiento con los campos soportados por la API de proyectos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="titulo">Titulo</Label>
                <Input
                  id="titulo"
                  value={form.titulo}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, titulo: event.target.value }))
                  }
                  placeholder="Hito, pendiente o entregable"
                />
              </div>

              <div className="space-y-2">
                <Label>Proyecto</Label>
                <Select
                  value={form.proyecto}
                  onValueChange={(value) => setForm((current) => ({ ...current, proyecto: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un proyecto" />
                  </SelectTrigger>
                  <SelectContent>
                    {proyectos.map((proyecto) => (
                      <SelectItem key={proyecto.id} value={proyecto.id}>
                        {proyecto.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripcion</Label>
              <Textarea
                id="descripcion"
                rows={4}
                value={form.descripcion}
                onChange={(event) =>
                  setForm((current) => ({ ...current, descripcion: event.target.value }))
                }
                placeholder="Detalle funcional o tecnico de la tarea"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2 lg:col-span-2">
                <Label>Responsable</Label>
                <Select
                  value={form.asignado || "sin-asignar"}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      asignado: value === "sin-asignar" ? "" : value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sin asignar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sin-asignar">Sin asignar</SelectItem>
                    {miembros.map((miembro) => (
                      <SelectItem key={miembro.id} value={miembro.nombre}>
                        {miembro.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Estado</Label>
                <Select
                  value={form.estado}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, estado: value as Tarea["estado"] }))
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
                    setForm((current) => ({ ...current, prioridad: value as Tarea["prioridad"] }))
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
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fechaVencimiento">Fecha de vencimiento</Label>
                <Input
                  id="fechaVencimiento"
                  type="date"
                  value={form.fechaVencimiento}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, fechaVencimiento: event.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tiempoRegistrado">Horas registradas</Label>
                <Input
                  id="tiempoRegistrado"
                  min="0"
                  type="number"
                  value={form.tiempoRegistrado}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, tiempoRegistrado: event.target.value }))
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={saving} onClick={() => void handleSave()}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Guardar tarea
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
