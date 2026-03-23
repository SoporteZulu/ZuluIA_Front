"use client"

import { useEffect, useMemo, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertCircle,
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  Pause,
  Play,
  RefreshCcw,
  Search,
  ShieldAlert,
  TimerReset,
  Users,
} from "lucide-react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { useMiembros, useProyectos, useTareasProyecto } from "@/lib/hooks/useProyectos"
import type { Miembro, Proyecto, Tarea } from "@/lib/proyectos-types"

type TiempoFormState = {
  titulo: string
  descripcion: string
  proyecto: string
  asignado: string
  estado: Tarea["estado"]
  prioridad: Tarea["prioridad"]
  fechaVencimiento: string
  tiempoRegistrado: string
  etiquetas: string
}

const ESTADOS: Tarea["estado"][] = ["Por Hacer", "En Progreso", "En Revisión", "Hecho"]
const PRIORIDADES: Tarea["prioridad"][] = ["Baja", "Media", "Alta", "Crítica"]

const EMPTY_FORM: TiempoFormState = {
  titulo: "",
  descripcion: "",
  proyecto: "",
  asignado: "",
  estado: "Por Hacer",
  prioridad: "Media",
  fechaVencimiento: "",
  tiempoRegistrado: "0",
  etiquetas: "",
}

function hours(value: number) {
  return `${Number(value ?? 0).toLocaleString("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} h`
}

function formatDate(value?: Date | string) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleDateString("es-AR")
}

function toInputDate(value?: Date | string) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toISOString().slice(0, 10)
}

function formatTimer(seconds: number) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainder = seconds % 60
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
}

function buildFormState(task: Tarea): TiempoFormState {
  return {
    titulo: task.titulo,
    descripcion: task.descripcion ?? "",
    proyecto: task.proyecto,
    asignado: task.asignado ?? "unassigned",
    estado: task.estado,
    prioridad: task.prioridad,
    fechaVencimiento: toInputDate(task.fechaVencimiento),
    tiempoRegistrado: String(task.tiempoRegistrado ?? 0),
    etiquetas: (task.etiquetas ?? []).join(", "),
  }
}

function SummaryCard({
  title,
  value,
  description,
}: {
  title: string
  value: string
  description: string
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

function DetailFieldGrid({ fields }: { fields: Array<{ label: string; value: string }> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {fields.map((field) => (
        <div key={field.label} className="rounded-lg border p-3">
          <p className="text-sm text-muted-foreground">{field.label}</p>
          <p className="mt-2 font-medium wrap-break-word">{field.value}</p>
        </div>
      ))}
    </div>
  )
}

function getTaskStatus(task: Tarea) {
  if (task.estado === "Hecho") {
    return {
      label: "Completada",
      tone: "secondary" as const,
      detail: "La tarea ya quedó cerrada y el tiempo registrado pasa a histórico del proyecto.",
    }
  }

  if (task.estado === "En Revisión") {
    return {
      label: "En revisión",
      tone: "outline" as const,
      detail: "La dedicación ya fue cargada y la tarea espera validación final.",
    }
  }

  if (task.estado === "En Progreso") {
    return {
      label: "En ejecución",
      tone: "default" as const,
      detail: "La tarea está activa y consume tiempo registrado dentro del flujo operativo.",
    }
  }

  return {
    label: "Pendiente",
    tone: "secondary" as const,
    detail:
      "La tarea todavía no avanzó y el tiempo registrado debería seguir en cero o ser mínimo.",
  }
}

function getTaskCircuit(task: Tarea) {
  if (task.estado === "Por Hacer") {
    return {
      label: "Previo a ejecución",
      detail: "La tarea está planificada pero aún no consume tiempo operativo del equipo.",
    }
  }

  if (task.estado === "En Progreso") {
    return {
      label: "Registro activo",
      detail:
        "El tiempo cargado impacta en la lectura corriente del proyecto y del miembro asignado.",
    }
  }

  if (task.estado === "En Revisión") {
    return {
      label: "Cierre técnico",
      detail: "La dedicación ya quedó imputada y la tarea transita la etapa previa al cierre.",
    }
  }

  return {
    label: "Histórico del proyecto",
    detail: "La tarea ya integra el acumulado final de horas registradas del proyecto.",
  }
}

function getLegacyCoverage(task: Tarea) {
  const available = [
    task.asignado ? 1 : 0,
    task.fechaVencimiento ? 1 : 0,
    task.etiquetas?.length ? 1 : 0,
    task.descripcion ? 1 : 0,
  ].reduce((sum, value) => sum + value, 0)

  if (available >= 4) {
    return {
      label: "Cobertura amplia",
      detail:
        "La tarea visible expone asignación, vencimiento, detalle y tiempo registrado del dominio actual.",
    }
  }

  if (available >= 2) {
    return {
      label: "Cobertura parcial",
      detail:
        "El seguimiento de tiempo es utilizable aunque faltan partes diarios y registros granulares del legado.",
    }
  }

  return {
    label: "Cobertura base",
    detail: "El backend actual sólo expone el tiempo acumulado sobre la tarea y su estado general.",
  }
}

function findProjectLabel(task: Tarea, proyectos: Proyecto[]) {
  const matched = proyectos.find(
    (proyecto) => proyecto.id === task.proyecto || proyecto.nombre === task.proyecto
  )
  return matched?.nombre ?? task.proyecto
}

function findMemberLabel(task: Tarea, miembros: Miembro[]) {
  if (!task.asignado) return "Sin asignar"
  const matched = miembros.find(
    (miembro) => miembro.id === task.asignado || miembro.nombre === task.asignado
  )
  return matched?.nombre ?? task.asignado
}

export default function TiempoPage() {
  const {
    proyectos,
    loading: loadingProyectos,
    error: errorProyectos,
    refetch: refetchProyectos,
  } = useProyectos()
  const {
    miembros,
    loading: loadingMiembros,
    error: errorMiembros,
    refetch: refetchMiembros,
  } = useMiembros()
  const { tareas, loading, error, updateTarea, refetch } = useTareasProyecto()

  const [searchTerm, setSearchTerm] = useState("")
  const [estadoFiltro, setEstadoFiltro] = useState<"todos" | Tarea["estado"]>("todos")
  const [proyectoFiltro, setProyectoFiltro] = useState("all")
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Tarea | null>(null)
  const [form, setForm] = useState<TiempoFormState>(EMPTY_FORM)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [today] = useState(() => new Date())

  useEffect(() => {
    if (!timerRunning) return
    const interval = setInterval(() => setTimerSeconds((current) => current + 1), 1000)
    return () => clearInterval(interval)
  }, [timerRunning])

  const filteredTasks = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()

    return tareas.filter((task) => {
      const projectLabel = findProjectLabel(task, proyectos)
      const memberLabel = findMemberLabel(task, miembros)
      const matchesSearch =
        !term ||
        [task.titulo, task.descripcion ?? "", projectLabel, memberLabel]
          .join(" ")
          .toLowerCase()
          .includes(term)
      const matchesStatus = estadoFiltro === "todos" || task.estado === estadoFiltro
      const matchesProject = proyectoFiltro === "all" || task.proyecto === proyectoFiltro

      return matchesSearch && matchesStatus && matchesProject
    })
  }, [estadoFiltro, miembros, proyectoFiltro, proyectos, searchTerm, tareas])

  const selectedTask = useMemo(
    () => filteredTasks.find((task) => task.id === selectedTaskId) ?? filteredTasks[0] ?? null,
    [filteredTasks, selectedTaskId]
  )

  const totalHours = filteredTasks.reduce(
    (sum, task) => sum + Number(task.tiempoRegistrado ?? 0),
    0
  )
  const completedCount = filteredTasks.filter((task) => task.estado === "Hecho").length
  const inProgressCount = filteredTasks.filter((task) => task.estado === "En Progreso").length
  const assignedCount = filteredTasks.filter((task) => task.asignado).length
  const overdueCount = filteredTasks.filter(
    (task) =>
      task.estado !== "Hecho" && task.fechaVencimiento && new Date(task.fechaVencimiento) < today
  ).length
  const criticalOpenCount = filteredTasks.filter(
    (task) => task.estado !== "Hecho" && (task.prioridad === "Crítica" || task.prioridad === "Alta")
  ).length
  const unassignedCount = filteredTasks.filter((task) => !task.asignado).length
  const averageHours = filteredTasks.length ? totalHours / filteredTasks.length : 0
  const selectedTaskStatus = selectedTask ? getTaskStatus(selectedTask) : null
  const selectedTaskCircuit = selectedTask ? getTaskCircuit(selectedTask) : null
  const selectedTaskCoverage = selectedTask ? getLegacyCoverage(selectedTask) : null

  const hoursByProject = proyectos
    .map((proyecto) => ({
      proyecto:
        proyecto.nombre.length > 16 ? `${proyecto.nombre.slice(0, 16)}...` : proyecto.nombre,
      horas: Number(
        filteredTasks
          .filter((task) => task.proyecto === proyecto.id || task.proyecto === proyecto.nombre)
          .reduce((sum, task) => sum + Number(task.tiempoRegistrado ?? 0), 0)
          .toFixed(1)
      ),
    }))
    .filter((entry) => entry.horas > 0)

  const hoursByMember = miembros
    .map((miembro) => ({
      miembro: miembro.nombre.length > 16 ? `${miembro.nombre.slice(0, 16)}...` : miembro.nombre,
      horas: Number(
        filteredTasks
          .filter((task) => task.asignado === miembro.id || task.asignado === miembro.nombre)
          .reduce((sum, task) => sum + Number(task.tiempoRegistrado ?? 0), 0)
          .toFixed(1)
      ),
      tareas: filteredTasks.filter(
        (task) => task.asignado === miembro.id || task.asignado === miembro.nombre
      ).length,
    }))
    .filter((entry) => entry.horas > 0 || entry.tareas > 0)
    .sort((a, b) => b.horas - a.horas || b.tareas - a.tareas)
    .slice(0, 6)

  const operationalAlerts = filteredTasks
    .filter((task) => {
      const overdue =
        task.fechaVencimiento && new Date(task.fechaVencimiento) < today && task.estado !== "Hecho"
      const critical =
        task.estado !== "Hecho" && (task.prioridad === "Crítica" || task.prioridad === "Alta")
      return overdue || critical || !task.asignado
    })
    .map((task) => ({
      id: task.id,
      titulo: task.titulo,
      proyecto: findProjectLabel(task, proyectos),
      responsable: findMemberLabel(task, miembros),
      reason:
        task.fechaVencimiento && new Date(task.fechaVencimiento) < today && task.estado !== "Hecho"
          ? "Vencida"
          : !task.asignado
            ? "Sin asignar"
            : "Prioridad alta",
      horas: Number(task.tiempoRegistrado ?? 0),
    }))
    .slice(0, 8)

  const errorMessage = error || errorProyectos || errorMiembros
  const loadingAny = loading || loadingProyectos || loadingMiembros

  const clearFilters = () => {
    setSearchTerm("")
    setEstadoFiltro("todos")
    setProyectoFiltro("all")
  }

  const openEditDialog = (task: Tarea) => {
    setEditingTask(task)
    setForm(buildFormState(task))
    setSaveError(null)
    setTimerRunning(false)
    setTimerSeconds(0)
    setFormOpen(true)
  }

  const handleSave = async () => {
    if (!editingTask) return
    if (!form.titulo.trim() || !form.proyecto.trim()) {
      setSaveError("Título y proyecto son obligatorios para actualizar el registro de tiempo.")
      return
    }

    setSaving(true)
    setSaveError(null)

    try {
      await updateTarea(editingTask.id, {
        titulo: form.titulo.trim(),
        descripcion: form.descripcion.trim() || undefined,
        proyecto: form.proyecto,
        asignado: form.asignado === "unassigned" ? undefined : form.asignado,
        estado: form.estado,
        prioridad: form.prioridad,
        fechaVencimiento: form.fechaVencimiento ? new Date(form.fechaVencimiento) : undefined,
        tiempoRegistrado: Number(form.tiempoRegistrado || 0),
        etiquetas: form.etiquetas
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      })
      setFormOpen(false)
      setEditingTask(null)
      setForm(EMPTY_FORM)
    } catch (issue) {
      setSaveError(
        issue instanceof Error ? issue.message : "No se pudo guardar el tiempo registrado."
      )
    } finally {
      setSaving(false)
    }
  }

  const handleApplyTimer = () => {
    const trackedHours = Number((timerSeconds / 3600).toFixed(2))
    setForm((current) => ({
      ...current,
      tiempoRegistrado: String(Number(current.tiempoRegistrado || 0) + trackedHours),
      estado: current.estado === "Por Hacer" ? "En Progreso" : current.estado,
    }))
    setTimerRunning(false)
    setTimerSeconds(0)
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Registro de Tiempo</h1>
          <p className="mt-1 text-muted-foreground">
            Consola operativa de tiempo basada en tareas reales del proyecto, con dedicación
            acumulada, asignación y seguimiento del circuito actual.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="bg-transparent" onClick={clearFilters}>
            Limpiar filtros
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              refetch()
              refetchProyectos()
              refetchMiembros()
            }}
            disabled={loadingAny}
          >
            <RefreshCcw className="h-4 w-4" />
            Actualizar
          </Button>
          <Button
            onClick={() => selectedTask && openEditDialog(selectedTask)}
            disabled={!selectedTask}
          >
            <Clock className="h-4 w-4" />
            Ajustar tiempo
          </Button>
        </div>
      </div>

      {errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          title="Tareas visibles"
          value={String(filteredTasks.length)}
          description="Tareas filtradas por proyecto, estado y búsqueda local."
        />
        <SummaryCard
          title="Horas registradas"
          value={hours(totalHours)}
          description="Suma del tiempo acumulado visible sobre tareas reales."
        />
        <SummaryCard
          title="Promedio por tarea"
          value={hours(averageHours)}
          description="Horas promedio registradas en la selección actual."
        />
        <SummaryCard
          title="En progreso"
          value={String(inProgressCount)}
          description="Tareas activas consumiendo tiempo dentro del circuito operativo."
        />
        <SummaryCard
          title="Asignadas / hechas"
          value={`${assignedCount} / ${completedCount}`}
          description="Tareas con asignación visible y tareas ya completadas."
        />
        <SummaryCard
          title="Vencidas / críticas"
          value={`${overdueCount} / ${criticalOpenCount}`}
          description="Tareas abiertas fuera de fecha y tareas de prioridad alta o crítica."
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros operativos</CardTitle>
          <CardDescription>
            La pantalla combina tareas, miembros y proyectos reales. No simula partes diarios ni
            registros horarios separados cuando el backend no los expone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_220px_240px_auto]">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Buscar por tarea, proyecto, miembro o descripción..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            <Select
              value={estadoFiltro}
              onValueChange={(value) => setEstadoFiltro(value as typeof estadoFiltro)}
            >
              <SelectTrigger className="w-full">
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
            <Select value={proyectoFiltro} onValueChange={setProyectoFiltro}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Proyecto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los proyectos</SelectItem>
                {proyectos.map((proyecto) => (
                  <SelectItem key={proyecto.id} value={proyecto.id}>
                    {proyecto.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={clearFilters}>
              Limpiar
            </Button>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <div className="rounded-lg border p-3 text-sm">
              <p className="text-muted-foreground">Cobertura actual</p>
              <p className="mt-1 font-medium">
                Tiempo acumulado por tarea, proyecto, asignado, estado y vencimiento ya visibles
              </p>
              <p className="mt-2 text-muted-foreground">
                El ajuste usa el endpoint real de tareas y no una grilla separada de registros
                horarios.
              </p>
            </div>
            <div className="rounded-lg border p-3 text-sm">
              <p className="text-muted-foreground">Gap legacy identificado</p>
              <p className="mt-1 font-medium">
                Partes diarios, cronogramas por minuto y fichadas siguen fuera del backend actual
              </p>
              <p className="mt-2 text-muted-foreground">
                La vista documenta ese faltante y explota el tiempo acumulado que sí existe hoy.
              </p>
            </div>
            <div className="rounded-lg border p-3 text-sm">
              <p className="text-muted-foreground">Equipo visible</p>
              <p className="mt-1 font-medium">
                {miembros.length} miembro(s) y {proyectos.length} proyecto(s) cargados
              </p>
              <p className="mt-2 text-muted-foreground">
                La trazabilidad cruza tareas reales del dominio proyectos con responsables visibles.
              </p>
            </div>
            <div className="rounded-lg border p-3 text-sm">
              <p className="text-muted-foreground">Riesgo operativo</p>
              <p className="mt-1 font-medium">
                {overdueCount} vencidas, {unassignedCount} sin asignar y {criticalOpenCount}{" "}
                críticas activas
              </p>
              <p className="mt-2 text-muted-foreground">
                Priorice regularización sobre tareas fuera de fecha o sin dueño visible.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Horas por proyecto</CardTitle>
            <CardDescription>
              El gráfico toma el tiempo acumulado de las tareas visibles en cada proyecto real.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={hoursByProject}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="proyecto" />
                <YAxis />
                <Tooltip formatter={(value) => `${value} h`} />
                <Bar dataKey="horas" fill="#0f766e" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Horas por miembro</CardTitle>
            <CardDescription>
              Carga visible por responsable sobre las tareas filtradas del dominio actual.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={hoursByMember}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="miembro" />
                <YAxis />
                <Tooltip
                  formatter={(value, _name, payload) => [
                    `${value} h`,
                    `${payload?.payload?.tareas ?? 0} tarea(s)`,
                  ]}
                />
                <Bar dataKey="horas" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Timer de apoyo</CardTitle>
            <CardDescription>
              El cronómetro sólo ayuda a cargar tiempo acumulado sobre la tarea seleccionada.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-6 text-center">
              <p className="font-mono text-5xl font-bold text-emerald-700">
                {formatTimer(timerSeconds)}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Tiempo listo para aplicar al ajuste de tarea
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1"
                variant="outline"
                onClick={() => setTimerRunning(true)}
                disabled={timerRunning}
              >
                <Play className="h-4 w-4" />
                Iniciar
              </Button>
              <Button
                className="flex-1"
                variant="outline"
                onClick={() => setTimerRunning(false)}
                disabled={!timerRunning}
              >
                <Pause className="h-4 w-4" />
                Pausar
              </Button>
              <Button
                className="flex-1"
                variant="outline"
                onClick={() => setTimerSeconds(0)}
                disabled={timerSeconds === 0}
              >
                <TimerReset className="h-4 w-4" />
                Reset
              </Button>
            </div>
            <Button
              className="w-full"
              onClick={() => selectedTask && openEditDialog(selectedTask)}
              disabled={!selectedTask}
            >
              Aplicar sobre tarea seleccionada
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Señales operativas</CardTitle>
          <CardDescription>
            Tareas que requieren atención por vencimiento, prioridad o falta de asignación.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {operationalAlerts.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No hay alertas operativas para la selección actual.
              </p>
            )}
            {operationalAlerts.map((alert) => (
              <div key={alert.id} className="rounded-lg border p-3">
                <p className="font-medium">{alert.titulo}</p>
                <p className="mt-1 text-xs text-muted-foreground">{alert.proyecto}</p>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <Badge variant="outline">{alert.reason}</Badge>
                  <span className="text-muted-foreground">{hours(alert.horas)}</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Responsable: {alert.responsable}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedTask && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ArrowRightLeft className="h-5 w-5" />
              Tarea destacada: {selectedTask.titulo}
            </CardTitle>
            <CardDescription>
              Resumen operativo de la tarea seleccionada con lectura real de dedicación, proyecto y
              responsable.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <div className="space-y-4">
              <DetailFieldGrid
                fields={[
                  { label: "Proyecto", value: findProjectLabel(selectedTask, proyectos) },
                  { label: "Responsable", value: findMemberLabel(selectedTask, miembros) },
                  { label: "Tiempo registrado", value: hours(selectedTask.tiempoRegistrado) },
                  { label: "Prioridad", value: selectedTask.prioridad },
                  { label: "Vencimiento", value: formatDate(selectedTask.fechaVencimiento) },
                  {
                    label: "Etiquetas",
                    value: selectedTask.etiquetas?.length
                      ? selectedTask.etiquetas.join(", ")
                      : "Sin etiquetas",
                  },
                ]}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" /> Estado operativo
                </div>
                <p className="mt-3 font-semibold">{selectedTaskStatus?.label}</p>
                <p className="mt-2 text-sm text-muted-foreground">{selectedTaskStatus?.detail}</p>
              </div>
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" /> Circuito
                </div>
                <p className="mt-3 font-semibold">{selectedTaskCircuit?.label}</p>
                <p className="mt-2 text-sm text-muted-foreground">{selectedTaskCircuit?.detail}</p>
              </div>
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldAlert className="h-4 w-4" /> Cobertura legacy
                </div>
                <p className="mt-3 font-semibold">{selectedTaskCoverage?.label}</p>
                <p className="mt-2 text-sm text-muted-foreground">{selectedTaskCoverage?.detail}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tareas con tiempo visible</CardTitle>
          <CardDescription>
            La tabla cruza horas, proyecto, asignado y estado sin depender de registros locales
            ficticios.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarea</TableHead>
                <TableHead>Proyecto</TableHead>
                <TableHead>Asignado</TableHead>
                <TableHead>Tiempo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingAny && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    Cargando tareas reales...
                  </TableCell>
                </TableRow>
              )}
              {!loadingAny && filteredTasks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    <CheckCircle2 className="mx-auto mb-2 h-8 w-8 opacity-50" />
                    No hay tareas para los filtros actuales.
                  </TableCell>
                </TableRow>
              )}
              {filteredTasks.map((task) => {
                const status = getTaskStatus(task)
                return (
                  <TableRow
                    key={task.id}
                    className={selectedTask?.id === task.id ? "bg-accent/40" : undefined}
                    onClick={() => setSelectedTaskId(task.id)}
                  >
                    <TableCell className="font-medium">{task.titulo}</TableCell>
                    <TableCell>{findProjectLabel(task, proyectos)}</TableCell>
                    <TableCell>{findMemberLabel(task, miembros)}</TableCell>
                    <TableCell className="font-mono">{hours(task.tiempoRegistrado)}</TableCell>
                    <TableCell>
                      <Badge variant={status.tone}>{status.label}</Badge>
                    </TableCell>
                    <TableCell>{formatDate(task.fechaVencimiento)}</TableCell>
                    <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(task)}>
                        Ajustar
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Ajustar tiempo de tarea</DialogTitle>
            <DialogDescription>
              El ajuste actualiza la tarea real y su tiempo acumulado. No crea un parte horario
              separado porque ese contrato todavía no existe en backend.
            </DialogDescription>
          </DialogHeader>

          {saveError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{saveError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="task-title">Tarea</Label>
                <Input
                  id="task-title"
                  value={form.titulo}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, titulo: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Proyecto</Label>
                <Select
                  value={form.proyecto}
                  onValueChange={(value) => setForm((current) => ({ ...current, proyecto: value }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Proyecto" />
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
              <div className="space-y-2">
                <Label>Asignado</Label>
                <Select
                  value={form.asignado || "unassigned"}
                  onValueChange={(value) => setForm((current) => ({ ...current, asignado: value }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sin asignar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Sin asignar</SelectItem>
                    {miembros.map((miembro) => (
                      <SelectItem key={miembro.id} value={miembro.id}>
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
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Estado" />
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
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Prioridad" />
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
                <Label htmlFor="task-deadline">Vencimiento</Label>
                <Input
                  id="task-deadline"
                  type="date"
                  value={form.fechaVencimiento}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, fechaVencimiento: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="task-time">Tiempo registrado</Label>
                <Input
                  id="task-time"
                  type="number"
                  min="0"
                  step="0.25"
                  value={form.tiempoRegistrado}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, tiempoRegistrado: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="task-tags">Etiquetas</Label>
                <Input
                  id="task-tags"
                  value={form.etiquetas}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, etiquetas: event.target.value }))
                  }
                  placeholder="Separar etiquetas por coma"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="task-description">Descripción</Label>
                <Textarea
                  id="task-description"
                  rows={4}
                  value={form.descripcion}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, descripcion: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Cronómetro aplicado a la tarea</p>
                  <p className="mt-1 font-mono text-2xl font-bold">{formatTimer(timerSeconds)}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setTimerRunning(true)}
                    disabled={timerRunning}
                  >
                    <Play className="h-4 w-4" />
                    Iniciar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setTimerRunning(false)}
                    disabled={!timerRunning}
                  >
                    <Pause className="h-4 w-4" />
                    Pausar
                  </Button>
                  <Button onClick={handleApplyTimer} disabled={timerSeconds === 0}>
                    Aplicar
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="bg-transparent" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Guardando..." : "Guardar ajuste"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
