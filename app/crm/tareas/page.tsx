"use client"

import React from "react"

import { useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Plus, Search, MoreHorizontal, Pencil, Trash2, CheckCircle2, Clock, AlertTriangle, Building2,
} from "lucide-react"
import { useCrmTareas, useCrmClientes, useCrmUsuarios } from "@/lib/hooks/useCrm"
import type { CRMTask } from "@/lib/types"

const tipoLabels: Record<CRMTask["tipoTarea"], string> = {
  llamada: "Llamada",
  email: "Email",
  reunion: "Reunión",
  seguimiento: "Seguimiento",
  otro: "Otro",
}

const prioridadLabels: Record<CRMTask["prioridad"], string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
  urgente: "Urgente",
}

const estadoLabels: Record<CRMTask["estado"], string> = {
  pendiente: "Pendiente",
  en_progreso: "En Progreso",
  completada: "Completada",
  cancelada: "Cancelada",
}

function TareasContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const action = searchParams.get("action")
  const clienteIdParam = searchParams.get("clienteId")

  const [search, setSearch] = useState("")
  const [filterEstado, setFilterEstado] = useState<string>("all")
  const [filterPrioridad, setFilterPrioridad] = useState<string>("all")
  const [isFormOpen, setIsFormOpen] = useState(action === "new")
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<CRMTask | null>(null)
  const { tareas, loading, error, createTarea, updateTarea, deleteTarea } = useCrmTareas(clienteIdParam || undefined)
  const { clientes: crmClients } = useCrmClientes()
  const { usuarios: crmUsers } = useCrmUsuarios()

  const getClientById = (id?: string) => crmClients.find(c => c.id === id)
  const getUserById = (id?: string) => crmUsers.find(u => u.id === id)

  const [tasks, setTasks] = useState(tareas)

  React.useEffect(() => { setTasks(tareas) }, [tareas])

  const emptyForm: Partial<CRMTask> = {
    clienteId: clienteIdParam || "",
    titulo: "",
    descripcion: "",
    tipoTarea: "seguimiento",
    prioridad: "media",
    estado: "pendiente",
    asignadoAId: "",
    creadoPorId: "usr-001",
  }

  const [formData, setFormData] = useState<Partial<CRMTask>>(emptyForm)

  const stats = {
    total: tasks.length,
    pendientes: tasks.filter(t => t.estado === "pendiente").length,
    enProgreso: tasks.filter(t => t.estado === "en_progreso").length,
    completadas: tasks.filter(t => t.estado === "completada").length,
  }

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.titulo.toLowerCase().includes(search.toLowerCase())
    const matchesEstado = filterEstado === "all" || task.estado === filterEstado
    const matchesPrioridad = filterPrioridad === "all" || task.prioridad === filterPrioridad
    return matchesSearch && matchesEstado && matchesPrioridad
  }).sort((a, b) => {
    const prioridadOrder = { urgente: 0, alta: 1, media: 2, baja: 3 }
    return prioridadOrder[a.prioridad] - prioridadOrder[b.prioridad]
  })

  const getPrioridadColor = (prioridad: CRMTask["prioridad"]) => {
    const colors = {
      baja: "bg-slate-500/20 text-slate-400",
      media: "bg-blue-500/20 text-blue-400",
      alta: "bg-amber-500/20 text-amber-400",
      urgente: "bg-red-500/20 text-red-400",
    }
    return colors[prioridad]
  }

  const getEstadoColor = (estado: CRMTask["estado"]) => {
    const colors = {
      pendiente: "bg-slate-500/20 text-slate-400",
      en_progreso: "bg-blue-500/20 text-blue-400",
      completada: "bg-emerald-500/20 text-emerald-400",
      cancelada: "bg-red-500/20 text-red-400",
    }
    return colors[estado]
  }

  const formatDate = (date?: Date) => {
    if (!date) return "-"
    return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short" }).format(date)
  }

  const toggleComplete = async (task: CRMTask) => {
    const newEstado = task.estado === "completada" ? "pendiente" : "completada"
    await updateTarea(task.id, { estado: newEstado, fechaCompletada: newEstado === "completada" ? new Date() : undefined })
  }

  const openNewForm = () => {
    setSelectedTask(null)
    setFormData(emptyForm)
    setIsFormOpen(true)
  }

  const handleEdit = (task: CRMTask) => {
    setSelectedTask(task)
    setFormData({ ...task })
    setIsFormOpen(true)
  }

  const handleDelete = (task: CRMTask) => {
    setSelectedTask(task)
    setIsDeleteOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedTask) {
      await updateTarea(selectedTask.id, formData)
    } else {
      await createTarea(formData as Omit<CRMTask, 'id' | 'createdAt' | 'updatedAt'>)
    }
    closeForm()
  }

  const confirmDelete = async () => {
    if (selectedTask) {
      await deleteTarea(selectedTask.id)
    }
    setIsDeleteOpen(false)
    setSelectedTask(null)
  }

  const closeForm = () => {
    setIsFormOpen(false)
    setSelectedTask(null)
    setFormData(emptyForm)
    router.push("/crm/tareas")
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tareas</h1>
          <p className="text-muted-foreground">Gestión de actividades y seguimientos</p>
        </div>
        <Button onClick={openNewForm}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Tarea
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendientes</p>
                <p className="text-2xl font-bold text-amber-500">{stats.pendientes}</p>
              </div>
              <Clock className="h-8 w-8 text-amber-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">En Progreso</p>
                <p className="text-2xl font-bold text-blue-500">{stats.enProgreso}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completadas</p>
                <p className="text-2xl font-bold text-emerald-500">{stats.completadas}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-emerald-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar tareas..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterEstado} onValueChange={setFilterEstado}>
              <SelectTrigger className="w-full md:w-[160px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(estadoLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterPrioridad} onValueChange={setFilterPrioridad}>
              <SelectTrigger className="w-full md:w-[160px]">
                <SelectValue placeholder="Prioridad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {Object.entries(prioridadLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {filteredTasks.map((task) => {
          const cliente = task.clienteId ? getClientById(task.clienteId) : null
          const asignado = task.asignadoAId ? getUserById(task.asignadoAId) : null
          const isCompleted = task.estado === "completada"
          return (
            <Card key={task.id} className="group">
              <CardContent className="py-4">
                <div className="flex items-start gap-4">
                  <Checkbox
                    checked={isCompleted}
                    onCheckedChange={() => toggleComplete(task)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <p className={`font-medium ${isCompleted ? "line-through text-muted-foreground" : ""}`}>
                          {task.titulo}
                        </p>
                        <div className="flex items-center gap-3 flex-wrap">
                          <Badge className={getPrioridadColor(task.prioridad)}>
                            {prioridadLabels[task.prioridad]}
                          </Badge>
                          <Badge variant="outline" className={getEstadoColor(task.estado)}>
                            {estadoLabels[task.estado]}
                          </Badge>
                          <span className="text-sm text-muted-foreground">{tipoLabels[task.tipoTarea]}</span>
                          {cliente && (
                            <Link href={`/crm/clientes/${cliente.id}`} className="text-sm hover:underline flex items-center gap-1 text-muted-foreground">
                              <Building2 className="h-3 w-3" />
                              {cliente.nombre}
                            </Link>
                          )}
                          {task.fechaVencimiento && (
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Vence: {formatDate(task.fechaVencimiento)}
                            </span>
                          )}
                        </div>
                        {task.descripcion && (
                          <p className="text-sm text-muted-foreground mt-1">{task.descripcion}</p>
                        )}
                        {asignado && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Asignado a: {asignado.nombre} {asignado.apellido}
                          </p>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 flex-shrink-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(task)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDelete(task)} className="text-red-500">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
        {filteredTasks.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No se encontraron tareas
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={isFormOpen} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedTask ? "Editar Tarea" : "Nueva Tarea"}</DialogTitle>
            <DialogDescription>
              {selectedTask ? "Modifica los datos" : "Crea una nueva tarea"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Título *</Label>
                <Input
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={formData.tipoTarea}
                    onValueChange={(value) => setFormData({ ...formData, tipoTarea: value as CRMTask["tipoTarea"] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(tipoLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Prioridad</Label>
                  <Select
                    value={formData.prioridad}
                    onValueChange={(value) => setFormData({ ...formData, prioridad: value as CRMTask["prioridad"] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(prioridadLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select
                    value={formData.estado}
                    onValueChange={(value) => setFormData({ ...formData, estado: value as CRMTask["estado"] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(estadoLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Fecha Vencimiento</Label>
                  <Input
                    type="date"
                    value={formData.fechaVencimiento ? new Date(formData.fechaVencimiento).toISOString().split('T')[0] : ""}
                    onChange={(e) => setFormData({ ...formData, fechaVencimiento: e.target.value ? new Date(e.target.value) : undefined })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Select
                    value={formData.clienteId || ""}
                    onValueChange={(value) => setFormData({ ...formData, clienteId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {crmClients.map(client => (
                        <SelectItem key={client.id} value={client.id}>{client.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Asignar a</Label>
                  <Select
                    value={formData.asignadoAId || ""}
                    onValueChange={(value) => setFormData({ ...formData, asignadoAId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {crmUsers.map(user => (
                        <SelectItem key={user.id} value={user.id}>{user.nombre} {user.apellido}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeForm}>Cancelar</Button>
              <Button type="submit">{selectedTask ? "Guardar" : "Crear"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tarea?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de eliminar "{selectedTask?.titulo}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default function TareasPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-muted-foreground">Cargando...</div>}>
      <TareasContent />
    </Suspense>
  )
}

export function Loading() {
  return null
}
