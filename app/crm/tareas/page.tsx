"use client"

import Link from "next/link"
import React, { Suspense, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  AlertCircle,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  Clock3,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserCircle2,
} from "lucide-react"
import { CrmPageHero, CrmStatCard, crmPanelClassName } from "@/components/crm/crm-page-kit"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import {
  useCrmCatalogos,
  useCrmClientes,
  useCrmOportunidades,
  useCrmTareas,
  useCrmUsuarios,
} from "@/lib/hooks/useCrm"
import type { CRMTask } from "@/lib/types"

const tipoLabels: Record<CRMTask["tipoTarea"], string> = {
  llamar: "Llamar",
  enviar_email: "Enviar email",
  preparar_propuesta: "Preparar propuesta",
  visitar: "Visitar",
  seguimiento: "Seguimiento",
  otro: "Otro",
}

const prioridadLabels: Record<CRMTask["prioridad"], string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
}

const estadoLabels: Record<CRMTask["estado"], string> = {
  pendiente: "Pendiente",
  en_curso: "En curso",
  completada: "Completada",
  vencida: "Vencida",
}

type TaskFormState = {
  clienteId: string
  oportunidadId: string
  asignadoAId: string
  titulo: string
  descripcion: string
  tipoTarea: CRMTask["tipoTarea"]
  fechaVencimiento: string
  prioridad: CRMTask["prioridad"]
  estado: CRMTask["estado"]
}

function formatDate(value?: Date) {
  if (!value) {
    return "-"
  }

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value))
}

function toDateInputValue(value?: Date) {
  if (!value) {
    return ""
  }

  return new Date(value).toISOString().split("T")[0]
}

function getEstadoBadgeVariant(estado: CRMTask["estado"]) {
  if (estado === "completada") return "secondary"
  if (estado === "vencida") return "destructive"
  return "outline"
}

function getPrioridadBadgeVariant(prioridad: CRMTask["prioridad"]) {
  if (prioridad === "alta") return "destructive"
  if (prioridad === "media") return "default"
  return "secondary"
}

function createEmptyForm(clienteIdParam?: string | null): TaskFormState {
  return {
    clienteId: clienteIdParam ?? "none",
    oportunidadId: "none",
    asignadoAId: "none",
    titulo: "",
    descripcion: "",
    tipoTarea: "seguimiento",
    fechaVencimiento: "",
    prioridad: "media",
    estado: "pendiente",
  }
}

function TareasContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const action = searchParams.get("action")
  const clienteIdParam = searchParams.get("clienteId")

  const [search, setSearch] = useState("")
  const [filterEstado, setFilterEstado] = useState<string>("all")
  const [filterPrioridad, setFilterPrioridad] = useState<string>("all")
  const [filterResponsable, setFilterResponsable] = useState<string>("all")
  const [isFormOpen, setIsFormOpen] = useState(action === "new")
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<CRMTask | null>(null)
  const [formData, setFormData] = useState<TaskFormState>(createEmptyForm(clienteIdParam))
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const {
    tareas,
    loading,
    error,
    createTarea,
    updateTarea,
    completeTarea,
    reopenTarea,
    deleteTarea,
  } = useCrmTareas(clienteIdParam || undefined)
  const { data: catalogos } = useCrmCatalogos()
  const { clientes } = useCrmClientes()
  const { usuarios } = useCrmUsuarios()
  const { oportunidades } = useCrmOportunidades()

  const today = useMemo(() => new Date(), [])

  const clientsMap = useMemo(
    () => new Map(clientes.map((cliente) => [cliente.id, cliente])),
    [clientes]
  )
  const usersMap = useMemo(
    () => new Map(usuarios.map((usuario) => [usuario.id, usuario])),
    [usuarios]
  )
  const opportunitiesMap = useMemo(
    () => new Map(oportunidades.map((oportunidad) => [oportunidad.id, oportunidad])),
    [oportunidades]
  )

  const tipoOptions = useMemo(
    () =>
      catalogos.tiposTarea.length > 0
        ? catalogos.tiposTarea
        : Object.entries(tipoLabels).map(([id, nombre]) => ({ id, nombre })),
    [catalogos.tiposTarea]
  )

  const prioridadOptions = useMemo(
    () =>
      catalogos.prioridadesTarea.length > 0
        ? catalogos.prioridadesTarea
        : Object.entries(prioridadLabels).map(([id, nombre]) => ({ id, nombre })),
    [catalogos.prioridadesTarea]
  )

  const estadoOptions = useMemo(
    () =>
      catalogos.estadosTarea.length > 0
        ? catalogos.estadosTarea
        : Object.entries(estadoLabels).map(([id, nombre]) => ({ id, nombre })),
    [catalogos.estadosTarea]
  )

  const responsableOptions = useMemo(
    () =>
      catalogos.usuarios.length > 0
        ? catalogos.usuarios
        : usuarios.map((user) => ({
            id: user.id,
            nombre: `${user.nombre} ${user.apellido}`,
            rol: user.rol,
          })),
    [catalogos.usuarios, usuarios]
  )

  const clienteOptions = useMemo(
    () =>
      catalogos.clientes.length > 0
        ? catalogos.clientes.map((cliente) => ({ id: cliente.id, nombre: cliente.nombre }))
        : clientes.map((cliente) => ({ id: cliente.id, nombre: cliente.nombre })),
    [catalogos.clientes, clientes]
  )

  const tasksWithContext = useMemo(() => {
    return tareas
      .map((task) => {
        const fechaVencimiento = new Date(task.fechaVencimiento)
        const isOverdue =
          task.estado !== "completada" && fechaVencimiento.getTime() < today.getTime()
        const normalizedEstado = isOverdue && task.estado !== "vencida" ? "vencida" : task.estado
        const cliente = task.clienteId ? clientsMap.get(task.clienteId) : undefined
        const responsable = usersMap.get(task.asignadoAId)
        const oportunidad = task.oportunidadId
          ? opportunitiesMap.get(task.oportunidadId)
          : undefined
        const daysToDue = Math.ceil((fechaVencimiento.getTime() - today.getTime()) / 86400000)

        return {
          ...task,
          normalizedEstado,
          isOverdue,
          cliente,
          responsable,
          oportunidad,
          daysToDue,
        }
      })
      .sort((left, right) => {
        const estadoOrder = { vencida: 0, pendiente: 1, en_curso: 2, completada: 3 }
        const prioridadOrder = { alta: 0, media: 1, baja: 2 }

        if (estadoOrder[left.normalizedEstado] !== estadoOrder[right.normalizedEstado]) {
          return estadoOrder[left.normalizedEstado] - estadoOrder[right.normalizedEstado]
        }

        if (prioridadOrder[left.prioridad] !== prioridadOrder[right.prioridad]) {
          return prioridadOrder[left.prioridad] - prioridadOrder[right.prioridad]
        }

        return (
          new Date(left.fechaVencimiento).getTime() - new Date(right.fechaVencimiento).getTime()
        )
      })
  }, [clientsMap, opportunitiesMap, tareas, today, usersMap])

  const filteredTasks = useMemo(() => {
    const term = search.trim().toLowerCase()

    return tasksWithContext.filter((task) => {
      const matchesSearch =
        term === "" ||
        task.titulo.toLowerCase().includes(term) ||
        task.descripcion?.toLowerCase().includes(term) ||
        task.cliente?.nombre.toLowerCase().includes(term) ||
        task.responsable?.nombre.toLowerCase().includes(term) ||
        task.responsable?.apellido.toLowerCase().includes(term)

      const matchesEstado = filterEstado === "all" || task.normalizedEstado === filterEstado
      const matchesPrioridad = filterPrioridad === "all" || task.prioridad === filterPrioridad
      const matchesResponsable =
        filterResponsable === "all" || task.asignadoAId === filterResponsable

      return matchesSearch && matchesEstado && matchesPrioridad && matchesResponsable
    })
  }, [filterEstado, filterPrioridad, filterResponsable, search, tasksWithContext])

  const stats = useMemo(() => {
    const abiertas = tasksWithContext.filter((task) => task.normalizedEstado !== "completada")
    const vencidas = tasksWithContext.filter((task) => task.normalizedEstado === "vencida")
    const enCurso = tasksWithContext.filter((task) => task.normalizedEstado === "en_curso")
    const prioridadAlta = tasksWithContext.filter(
      (task) => task.prioridad === "alta" && task.normalizedEstado !== "completada"
    )

    return {
      total: tasksWithContext.length,
      abiertas: abiertas.length,
      vencidas: vencidas.length,
      enCurso: enCurso.length,
      prioridadAlta: prioridadAlta.length,
    }
  }, [tasksWithContext])

  const responsablesCarga = useMemo(() => {
    const openTasks = tasksWithContext.filter((task) => task.normalizedEstado !== "completada")
    const grouped = openTasks.reduce<
      Record<string, { total: number; vencidas: number; alta: number }>
    >((accumulator, task) => {
      const key = task.asignadoAId
      if (!accumulator[key]) {
        accumulator[key] = { total: 0, vencidas: 0, alta: 0 }
      }
      accumulator[key].total += 1
      if (task.normalizedEstado === "vencida") accumulator[key].vencidas += 1
      if (task.prioridad === "alta") accumulator[key].alta += 1
      return accumulator
    }, {})

    return Object.entries(grouped)
      .map(([userId, summary]) => ({
        userId,
        usuario: usersMap.get(userId),
        ...summary,
      }))
      .sort((left, right) => right.total - left.total || right.vencidas - left.vencidas)
  }, [tasksWithContext, usersMap])

  const clientesConBacklog = useMemo(() => {
    const openTasks = tasksWithContext.filter(
      (task) => task.normalizedEstado !== "completada" && task.clienteId
    )
    const grouped = openTasks.reduce<Record<string, { total: number; vencidas: number }>>(
      (accumulator, task) => {
        const key = task.clienteId as string
        if (!accumulator[key]) {
          accumulator[key] = { total: 0, vencidas: 0 }
        }
        accumulator[key].total += 1
        if (task.normalizedEstado === "vencida") accumulator[key].vencidas += 1
        return accumulator
      },
      {}
    )

    return Object.entries(grouped)
      .map(([clientId, summary]) => ({
        clientId,
        cliente: clientsMap.get(clientId),
        ...summary,
      }))
      .sort((left, right) => right.total - left.total || right.vencidas - left.vencidas)
      .slice(0, 4)
  }, [clientsMap, tasksWithContext])

  const highlightedTask = tasksWithContext[0] ?? null

  const openNewForm = () => {
    setSelectedTask(null)
    setFormError(null)
    setFormData(createEmptyForm(clienteIdParam))
    setIsFormOpen(true)
  }

  const handleEdit = (task: CRMTask) => {
    setSelectedTask(task)
    setFormError(null)
    setFormData({
      clienteId: task.clienteId ?? "none",
      oportunidadId: task.oportunidadId ?? "none",
      asignadoAId: task.asignadoAId,
      titulo: task.titulo,
      descripcion: task.descripcion ?? "",
      tipoTarea: task.tipoTarea,
      fechaVencimiento: toDateInputValue(task.fechaVencimiento),
      prioridad: task.prioridad,
      estado: task.estado,
    })
    setIsFormOpen(true)
  }

  const handleDelete = (task: CRMTask) => {
    setSelectedTask(task)
    setIsDeleteOpen(true)
  }

  const closeForm = () => {
    setIsFormOpen(false)
    setSelectedTask(null)
    setFormError(null)
    setFormData(createEmptyForm(clienteIdParam))
    router.push("/crm/tareas")
  }

  const toggleComplete = async (task: CRMTask) => {
    setFormError(null)
    if (task.estado === "completada") {
      await reopenTarea(task.id)
      return
    }

    await completeTarea(task.id, new Date())
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!formData.titulo.trim()) {
      setFormError("El título de la tarea es obligatorio.")
      return
    }

    if (!formData.asignadoAId || formData.asignadoAId === "none") {
      setFormError("Asigná un responsable para registrar la tarea.")
      return
    }

    if (!formData.fechaVencimiento) {
      setFormError("La fecha de vencimiento es obligatoria.")
      return
    }

    setSaving(true)
    setFormError(null)

    const payload = {
      clienteId: formData.clienteId === "none" ? undefined : formData.clienteId,
      oportunidadId: formData.oportunidadId === "none" ? undefined : formData.oportunidadId,
      asignadoAId: formData.asignadoAId,
      titulo: formData.titulo.trim(),
      descripcion: formData.descripcion.trim() || undefined,
      tipoTarea: formData.tipoTarea,
      fechaVencimiento: new Date(formData.fechaVencimiento),
      prioridad: formData.prioridad,
      estado: formData.estado,
      fechaCompletado:
        formData.estado === "completada" ? new Date(formData.fechaVencimiento) : undefined,
    }

    try {
      if (selectedTask) {
        await updateTarea(selectedTask.id, payload)
      } else {
        await createTarea(payload)
      }
      closeForm()
    } catch (submissionError) {
      setFormError(
        submissionError instanceof Error ? submissionError.message : "No se pudo guardar la tarea."
      )
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!selectedTask) {
      return
    }

    setDeleting(true)
    try {
      await deleteTarea(selectedTask.id)
      setIsDeleteOpen(false)
      setSelectedTask(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6 pb-6">
      <CrmPageHero
        eyebrow="CRM ejecución"
        title="Tareas CRM"
        description="Consola operativa de seguimientos, vencimientos y asignación comercial apoyada en el contrato real de tareas del backend."
        actions={
          <Button onClick={openNewForm}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva tarea
          </Button>
        }
      />

      {(error || formError) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Tareas CRM</AlertTitle>
          <AlertDescription>{formError ?? error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <CrmStatCard
          label="Tareas visibles"
          value={stats.total}
          hint="Volumen total con filtros aplicados"
          icon={Briefcase}
          tone="slate"
        />
        <CrmStatCard
          label="Abiertas"
          value={stats.abiertas}
          hint="Pendientes o en curso"
          icon={Clock3}
          tone="blue"
        />
        <CrmStatCard
          label="En curso"
          value={stats.enCurso}
          hint="Trabajo activo del equipo comercial"
          icon={UserCircle2}
          tone="violet"
        />
        <CrmStatCard
          label="Vencidas"
          value={stats.vencidas}
          hint="Fuera de término al día de hoy"
          icon={CalendarClock}
          tone="rose"
        />
        <CrmStatCard
          label="Prioridad alta"
          value={stats.prioridadAlta}
          hint="Seguimientos críticos visibles"
          icon={AlertCircle}
          tone="amber"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className={crmPanelClassName}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-sm font-medium">Radar de vencimiento</CardTitle>
              <CalendarClock className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">{stats.vencidas}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Tareas fuera de término con la fecha visible hoy.
            </p>
          </CardContent>
        </Card>
        <Card className={crmPanelClassName}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-sm font-medium">Responsables exigidos</CardTitle>
              <UserCircle2 className="h-4 w-4 text-sky-700" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {responsablesCarga.filter((item) => item.total >= 3).length}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Responsables con tres o más tareas abiertas.
            </p>
          </CardContent>
        </Card>
        <Card className={crmPanelClassName}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-sm font-medium">Clientes con backlog</CardTitle>
              <Briefcase className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">{clientesConBacklog.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Clientes con más carga pendiente visible en seguimiento.
            </p>
          </CardContent>
        </Card>
        <Card className={crmPanelClassName}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-sm font-medium">Cobertura comercial</CardTitle>
              <Clock3 className="h-4 w-4 text-emerald-700" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {tasksWithContext.filter((task) => task.oportunidadId).length}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Tareas ya vinculadas a oportunidades publicadas por backend.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className={crmPanelClassName}>
          <CardHeader>
            <CardTitle>Filtros de seguimiento</CardTitle>
            <CardDescription>
              Busca por tarea, cliente o responsable y recorta el backlog visible.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_180px_180px_220px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar tareas, clientes o responsables..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterEstado} onValueChange={setFilterEstado}>
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {estadoOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterPrioridad} onValueChange={setFilterPrioridad}>
                <SelectTrigger>
                  <SelectValue placeholder="Prioridad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {prioridadOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterResponsable} onValueChange={setFilterResponsable}>
                <SelectTrigger>
                  <SelectValue placeholder="Responsable" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {responsableOptions.map((usuario) => (
                    <SelectItem key={usuario.id} value={usuario.id}>
                      {usuario.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className={crmPanelClassName}>
          <CardHeader>
            <CardTitle>Tarea destacada</CardTitle>
            <CardDescription>
              Prioriza la tarea con mayor tensión entre estado, prioridad y vencimiento.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {highlightedTask ? (
              <div className="space-y-4 rounded-xl border border-red-200 bg-red-50/70 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-red-900">Seguimiento prioritario</p>
                    <h3 className="mt-1 text-lg font-semibold text-red-950">
                      {highlightedTask.titulo}
                    </h3>
                    <p className="text-sm text-red-900/80">
                      {highlightedTask.cliente?.nombre ?? "Sin cliente asociado"}
                    </p>
                  </div>
                  <Badge variant={getEstadoBadgeVariant(highlightedTask.normalizedEstado)}>
                    {estadoLabels[highlightedTask.normalizedEstado]}
                  </Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-red-200 bg-white/70 p-3">
                    <p className="text-xs uppercase tracking-wide text-red-900/70">Responsable</p>
                    <p className="mt-1 text-sm font-medium text-red-950">
                      {highlightedTask.responsable
                        ? `${highlightedTask.responsable.nombre} ${highlightedTask.responsable.apellido}`
                        : "No asignado"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-red-200 bg-white/70 p-3">
                    <p className="text-xs uppercase tracking-wide text-red-900/70">Vencimiento</p>
                    <p className="mt-1 text-sm font-medium text-red-950">
                      {formatDate(highlightedTask.fechaVencimiento)}
                    </p>
                  </div>
                </div>
                {highlightedTask.descripcion ? (
                  <p className="text-sm leading-6 text-red-950/80">{highlightedTask.descripcion}</p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No hay tareas cargadas para destacar.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className={crmPanelClassName}>
          <CardHeader>
            <CardTitle>Backlog operativo</CardTitle>
            <CardDescription>
              Seguimiento de tareas abiertas, responsables y relación con cliente u oportunidad.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">Cargando tareas...</p>
            ) : filteredTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay tareas para los filtros actuales.
              </p>
            ) : (
              filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{task.titulo}</h3>
                        <Badge variant={getPrioridadBadgeVariant(task.prioridad)}>
                          {prioridadLabels[task.prioridad]}
                        </Badge>
                        <Badge variant={getEstadoBadgeVariant(task.normalizedEstado)}>
                          {estadoLabels[task.normalizedEstado]}
                        </Badge>
                        <Badge variant="outline">{tipoLabels[task.tipoTarea]}</Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span>
                          Responsable:{" "}
                          {task.responsable
                            ? `${task.responsable.nombre} ${task.responsable.apellido}`
                            : "No asignado"}
                        </span>
                        <span>Vence: {formatDate(task.fechaVencimiento)}</span>
                        {task.daysToDue >= 0 && task.normalizedEstado !== "completada" ? (
                          <span>{task.daysToDue} días restantes</span>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        {task.cliente ? (
                          <Link
                            href={`/crm/clientes/${task.cliente.id}`}
                            className="hover:underline"
                          >
                            {task.cliente.nombre}
                          </Link>
                        ) : (
                          <span>Sin cliente asociado</span>
                        )}
                        {task.oportunidad ? (
                          <span>Oportunidad: {task.oportunidad.titulo}</span>
                        ) : (
                          <span>Sin oportunidad vinculada</span>
                        )}
                      </div>
                      {task.descripcion ? (
                        <p className="text-sm text-muted-foreground">{task.descripcion}</p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => void toggleComplete(task)}>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        {task.estado === "completada" ? "Reabrir" : "Completar"}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="shrink-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(task)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(task)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className={crmPanelClassName}>
            <CardHeader>
              <CardTitle>Carga por responsable</CardTitle>
              <CardDescription>
                Mide el backlog pendiente por usuario con tareas vencidas visibles.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {responsablesCarga.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No hay responsables con tareas abiertas.
                </p>
              ) : (
                responsablesCarga.slice(0, 5).map((item) => (
                  <div
                    key={item.userId}
                    className="rounded-2xl border border-slate-200 bg-white p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">
                          {item.usuario
                            ? `${item.usuario.nombre} ${item.usuario.apellido}`
                            : item.userId}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.usuario?.rol ?? "Responsable sin detalle"}
                        </p>
                      </div>
                      <Badge variant="outline">{item.total} abiertas</Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {item.vencidas} vencidas · {item.alta} de prioridad alta
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className={crmPanelClassName}>
            <CardHeader>
              <CardTitle>Clientes con seguimiento pendiente</CardTitle>
              <CardDescription>
                Clientes con mayor volumen de tareas abiertas visibles en CRM.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {clientesConBacklog.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No hay clientes con backlog visible en este momento.
                </p>
              ) : (
                clientesConBacklog.map((item) => (
                  <div key={item.clientId} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">
                          {item.cliente?.nombre ?? "Cliente sin referencia"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.cliente?.estadoRelacion ?? "Sin estado de relación"}
                        </p>
                      </div>
                      <Badge variant="outline">{item.total} tareas</Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {item.vencidas} vencidas dentro del backlog actual.
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isFormOpen} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedTask ? "Editar tarea" : "Nueva tarea"}</DialogTitle>
            <DialogDescription>
              Alta y edición sobre el contrato actual de tareas CRM, sin flujos adicionales no
              publicados.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="titulo">Título</Label>
                <Input
                  id="titulo"
                  value={formData.titulo}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, titulo: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  rows={3}
                  value={formData.descripcion}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, descripcion: event.target.value }))
                  }
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={formData.tipoTarea}
                    onValueChange={(value) =>
                      setFormData((current) => ({
                        ...current,
                        tipoTarea: value as CRMTask["tipoTarea"],
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tipoOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Prioridad</Label>
                  <Select
                    value={formData.prioridad}
                    onValueChange={(value) =>
                      setFormData((current) => ({
                        ...current,
                        prioridad: value as CRMTask["prioridad"],
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {prioridadOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select
                    value={formData.estado}
                    onValueChange={(value) =>
                      setFormData((current) => ({
                        ...current,
                        estado: value as CRMTask["estado"],
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {estadoOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fecha-vencimiento">Vencimiento</Label>
                  <Input
                    id="fecha-vencimiento"
                    type="date"
                    value={formData.fechaVencimiento}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        fechaVencimiento: event.target.value,
                      }))
                    }
                    required
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Select
                    value={formData.clienteId}
                    onValueChange={(value) =>
                      setFormData((current) => ({ ...current, clienteId: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin cliente</SelectItem>
                      {clienteOptions.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Oportunidad</Label>
                  <Select
                    value={formData.oportunidadId}
                    onValueChange={(value) =>
                      setFormData((current) => ({ ...current, oportunidadId: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin oportunidad</SelectItem>
                      {oportunidades
                        .filter(
                          (oportunidad) =>
                            formData.clienteId === "none" ||
                            oportunidad.clienteId === formData.clienteId
                        )
                        .map((oportunidad) => (
                          <SelectItem key={oportunidad.id} value={oportunidad.id}>
                            {oportunidad.titulo}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Responsable</Label>
                  <Select
                    value={formData.asignadoAId}
                    onValueChange={(value) =>
                      setFormData((current) => ({ ...current, asignadoAId: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Seleccionar</SelectItem>
                      {responsableOptions.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeForm}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Guardando..." : selectedTask ? "Guardar cambios" : "Crear tarea"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tarea?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará {selectedTask ? `"${selectedTask.titulo}"` : "la tarea seleccionada"} del
              backlog CRM.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleting}
            >
              {deleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default function TareasPage() {
  return (
    <Suspense fallback={<div className="h-64 text-center text-muted-foreground">Cargando...</div>}>
      <TareasContent />
    </Suspense>
  )
}

export function Loading() {
  return null
}
