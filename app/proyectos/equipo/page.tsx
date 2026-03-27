"use client"

import { useMemo, useState } from "react"
import {
  AlertCircle,
  ArrowRightLeft,
  Briefcase,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
  Trash2,
  UserRound,
  Users,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useMiembros, useProyectos, useTareasProyecto } from "@/lib/hooks/useProyectos"
import type { Miembro, Tarea } from "@/lib/proyectos-types"

type MiembroFormState = {
  nombre: string
  rol: string
  departamento: string
  estado: Miembro["estado"]
  tareasAsignadas: string
}

const ESTADOS: Miembro["estado"][] = ["Online", "Ocupado", "Disponible", "Ausente", "Desconectado"]

const emptyForm = (): MiembroFormState => ({
  nombre: "",
  rol: "",
  departamento: "",
  estado: "Disponible",
  tareasAsignadas: "0",
})

function getEstadoVariant(
  estado: Miembro["estado"]
): "default" | "secondary" | "outline" | "destructive" {
  switch (estado) {
    case "Online":
      return "default"
    case "Disponible":
      return "secondary"
    case "Ocupado":
      return "outline"
    case "Ausente":
    case "Desconectado":
      return "destructive"
    default:
      return "outline"
  }
}

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

function getMemberStatus(miembro: Miembro, tareasActivas: number) {
  if (miembro.estado === "Ausente" || miembro.estado === "Desconectado") {
    return {
      label: "No disponible",
      tone: "destructive" as const,
      detail: "El miembro no está operativo y conviene revisar su carga pendiente.",
    }
  }

  if (miembro.estado === "Ocupado" || tareasActivas >= 4) {
    return {
      label: "Carga alta",
      tone: "outline" as const,
      detail: "Tiene carga activa relevante dentro de tareas en progreso o revisión.",
    }
  }

  if (miembro.estado === "Online") {
    return {
      label: "Disponible online",
      tone: "default" as const,
      detail: "Está disponible y con presencia activa dentro del equipo visible.",
    }
  }

  return {
    label: "Disponible",
    tone: "secondary" as const,
    detail: "Tiene capacidad visible para absorber más tareas o proyectos.",
  }
}

function getMemberCircuit(miembro: Miembro, proyectosActivos: number) {
  if (proyectosActivos === 0) {
    return {
      label: "Sin cartera asignada",
      detail: "No aparece vinculado a proyectos activos de la cartera visible.",
    }
  }

  if (proyectosActivos >= 3) {
    return {
      label: "Cobertura transversal",
      detail: "Participa en varias iniciativas activas del dominio proyectos.",
    }
  }

  return {
    label: "Asignación focalizada",
    detail: "Su carga visible se concentra en uno o pocos proyectos concretos.",
  }
}

function getLegacyCoverage(miembro: Miembro, proyectosActivos: number, tareasReales: number) {
  const available = [
    miembro.departamento ? 1 : 0,
    miembro.rol ? 1 : 0,
    proyectosActivos ? 1 : 0,
    tareasReales ? 1 : 0,
  ].reduce((sum, value) => sum + value, 0)

  if (available >= 4) {
    return {
      label: "Cobertura amplia",
      detail:
        "El legajo visible ya cruza rol, departamento, proyectos activos y tareas reales del miembro.",
    }
  }

  if (available >= 2) {
    return {
      label: "Cobertura parcial",
      detail:
        "Hay suficiente contexto operativo, aunque faltan calendarios, turnos y costos horarios del legado.",
    }
  }

  return {
    label: "Cobertura base",
    detail: "La API actual sólo expone el maestro del miembro y su carga principal de proyectos.",
  }
}

function isTaskActive(task: Tarea) {
  return task.estado === "En Progreso" || task.estado === "En Revisión"
}

export default function EquipoPage() {
  const { miembros, loading, error, createMiembro, updateMiembro, deleteMiembro, refetch } =
    useMiembros()
  const { proyectos } = useProyectos()
  const { tareas } = useTareasProyecto()

  const [search, setSearch] = useState("")
  const [estado, setEstado] = useState<"todos" | Miembro["estado"]>("todos")
  const [departamento, setDepartamento] = useState("todos")
  const [selectedMiembro, setSelectedMiembro] = useState<Miembro | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingMiembro, setEditingMiembro] = useState<Miembro | null>(null)
  const [form, setForm] = useState<MiembroFormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const departamentos = useMemo(
    () =>
      Array.from(new Set(miembros.map((miembro) => miembro.departamento).filter(Boolean))).sort(
        (a, b) => a.localeCompare(b)
      ),
    [miembros]
  )

  const proyectosPorMiembro = useMemo(() => {
    const map = new Map<string, string[]>()

    for (const miembro of miembros) {
      map.set(miembro.nombre, [])
    }

    for (const proyecto of proyectos) {
      for (const nombre of proyecto.equipo ?? []) {
        const actuales = map.get(nombre) ?? []
        map.set(nombre, [...actuales, proyecto.nombre])
      }
    }

    return map
  }, [miembros, proyectos])

  const tareasPorMiembro = useMemo(() => {
    const map = new Map<string, Tarea[]>()

    for (const tarea of tareas) {
      if (!tarea.asignado) continue
      const current = map.get(tarea.asignado) ?? []
      map.set(tarea.asignado, [...current, tarea])
    }

    for (const tarea of tareas) {
      if (!tarea.asignado) continue
      const miembro = miembros.find((item) => item.nombre === tarea.asignado)
      if (!miembro) continue
      const current = map.get(miembro.id) ?? []
      map.set(miembro.id, [...current, tarea])
    }

    return map
  }, [miembros, tareas])

  const filteredMiembros = useMemo(() => {
    return miembros.filter((miembro) => {
      const matchesSearch =
        miembro.nombre.toLowerCase().includes(search.toLowerCase()) ||
        miembro.rol.toLowerCase().includes(search.toLowerCase()) ||
        miembro.departamento.toLowerCase().includes(search.toLowerCase())
      const matchesEstado = estado === "todos" || miembro.estado === estado
      const matchesDepartamento = departamento === "todos" || miembro.departamento === departamento

      return matchesSearch && matchesEstado && matchesDepartamento
    })
  }, [departamento, estado, miembros, search])

  const totales = useMemo(() => {
    const disponibles = miembros.filter(
      (miembro) => miembro.estado === "Disponible" || miembro.estado === "Online"
    ).length
    const ocupados = miembros.filter((miembro) => miembro.estado === "Ocupado").length
    const ausentes = miembros.filter(
      (miembro) => miembro.estado === "Ausente" || miembro.estado === "Desconectado"
    ).length
    const tareas = miembros.reduce((acc, miembro) => acc + miembro.tareasAsignadas, 0)

    return {
      disponibles,
      ocupados,
      ausentes,
      tareas,
    }
  }, [miembros])

  const tareasActivasReales = tareas.filter(isTaskActive).length
  const miembrosConProyecto = miembros.filter(
    (miembro) => (proyectosPorMiembro.get(miembro.nombre) ?? []).length > 0
  ).length
  const promedioTareasReales = miembros.length ? tareas.length / miembros.length : 0
  const miembroActivo =
    selectedMiembro && filteredMiembros.some((miembro) => miembro.id === selectedMiembro.id)
      ? selectedMiembro
      : (filteredMiembros[0] ?? null)
  const memberTasks = miembroActivo
    ? (tareasPorMiembro.get(miembroActivo.id) ?? tareasPorMiembro.get(miembroActivo.nombre) ?? [])
    : []
  const memberActiveTasks = memberTasks.filter(isTaskActive)
  const memberProjects = miembroActivo ? (proyectosPorMiembro.get(miembroActivo.nombre) ?? []) : []
  const memberStatus = miembroActivo
    ? getMemberStatus(miembroActivo, memberActiveTasks.length)
    : null
  const memberCircuit = miembroActivo
    ? getMemberCircuit(miembroActivo, memberProjects.length)
    : null
  const memberCoverage = miembroActivo
    ? getLegacyCoverage(miembroActivo, memberProjects.length, memberTasks.length)
    : null

  const openCreate = () => {
    setEditingMiembro(null)
    setSaveError(null)
    setForm(emptyForm())
    setIsFormOpen(true)
  }

  const openEdit = (miembro: Miembro) => {
    setEditingMiembro(miembro)
    setSaveError(null)
    setForm({
      nombre: miembro.nombre,
      rol: miembro.rol,
      departamento: miembro.departamento,
      estado: miembro.estado,
      tareasAsignadas: String(miembro.tareasAsignadas),
    })
    setIsFormOpen(true)
  }

  const openDetail = (miembro: Miembro) => {
    setSelectedMiembro(miembro)
    setIsDetailOpen(true)
  }

  const handleDelete = async (miembro: Miembro) => {
    try {
      await deleteMiembro(miembro.id)
      if (selectedMiembro?.id === miembro.id) {
        setSelectedMiembro(null)
        setIsDetailOpen(false)
      }
    } catch (deleteError) {
      setSaveError(
        deleteError instanceof Error ? deleteError.message : "No se pudo eliminar el miembro."
      )
    }
  }

  const handleSave = async () => {
    if (!form.nombre.trim() || !form.rol.trim() || !form.departamento.trim()) {
      setSaveError("Nombre, rol y departamento son obligatorios.")
      return
    }

    const tareasAsignadas = Number.parseInt(form.tareasAsignadas, 10)
    if (Number.isNaN(tareasAsignadas) || tareasAsignadas < 0) {
      setSaveError("La carga de tareas debe ser un numero valido mayor o igual a 0.")
      return
    }

    setSaving(true)
    setSaveError(null)

    const payload = {
      nombre: form.nombre.trim(),
      rol: form.rol.trim(),
      departamento: form.departamento.trim(),
      estado: form.estado,
      tareasAsignadas,
    }

    try {
      if (editingMiembro) {
        await updateMiembro(editingMiembro.id, payload)
      } else {
        await createMiembro(payload)
      }

      setIsFormOpen(false)
      setEditingMiembro(null)
      setForm(emptyForm())
    } catch (persistError) {
      setSaveError(
        persistError instanceof Error ? persistError.message : "No se pudo guardar el miembro."
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Equipo y Recursos</h1>
          <p className="text-muted-foreground mt-1">
            Consola operativa del equipo con asignaciones reales y mantenimiento backend.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo miembro
          </Button>
        </div>
      </div>

      {(error || saveError) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Equipo de proyectos</AlertTitle>
          <AlertDescription>{saveError ?? error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Miembros registrados"
          value={miembros.length}
          description="Plantilla disponible en el modulo"
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Disponibles"
          value={totales.disponibles}
          description="Online o listos para asignacion"
          icon={<UserRound className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Ocupados"
          value={totales.ocupados}
          description="Con carga activa en seguimiento"
          icon={<Briefcase className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Tareas asignadas"
          value={totales.tareas}
          description="Carga consolidada desde miembros"
          icon={<AlertCircle className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SummaryCard
          title="Tareas reales activas"
          value={tareasActivasReales}
          description="Tareas en progreso o revisión recuperadas del dominio proyectos."
          icon={<Briefcase className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Miembros con proyecto"
          value={miembrosConProyecto}
          description="Integrantes que aparecen vinculados a proyectos activos visibles."
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Promedio real"
          value={promedioTareasReales.toFixed(1)}
          description="Promedio de tareas reales por miembro cargado en backend."
          icon={<UserRound className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dotacion operativa</CardTitle>
          <CardDescription>
            Filtra por estado, departamento o texto libre para revisar capacidad y asignaciones.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_220px_220px]">
            <div className="space-y-2">
              <Label>Buscar miembro</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-10"
                  placeholder="Nombre, rol o departamento"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={estado}
                onValueChange={(value) => setEstado(value as "todos" | Miembro["estado"])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los estados</SelectItem>
                  {ESTADOS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Departamento</Label>
              <Select value={departamento} onValueChange={setDepartamento}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los departamentos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los departamentos</SelectItem>
                  {departamentos.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <div className="rounded-lg border p-3 text-sm">
              <p className="text-muted-foreground">Lectura de capacidad</p>
              <p className="mt-1 font-medium">
                {miembros.length} miembro(s), {tareasActivasReales} tarea(s) activas y{" "}
                {miembrosConProyecto} con proyecto visible
              </p>
              <p className="mt-2 text-muted-foreground">
                La vista cruza el maestro de miembros con tareas y proyectos reales ya publicados.
              </p>
            </div>
            <div className="rounded-lg border p-3 text-sm">
              <p className="text-muted-foreground">Cobertura actual</p>
              <p className="mt-1 font-medium">
                Rol, departamento, estado, tareas asignadas y vínculos a proyectos ya están
                disponibles
              </p>
              <p className="mt-2 text-muted-foreground">
                Se prioriza lectura operativa sin inventar calendarios, turnos ni costos horarios.
              </p>
            </div>
            <div className="rounded-lg border p-3 text-sm">
              <p className="text-muted-foreground">Gap legacy identificado</p>
              <p className="mt-1 font-medium">
                Calendarios, disponibilidad por turno y costos por recurso siguen fuera del contrato
                actual
              </p>
              <p className="mt-2 text-muted-foreground">
                El módulo deja ese faltante explícito y refuerza el cruce con tareas reales del
                equipo.
              </p>
            </div>
          </div>

          {miembroActivo && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ArrowRightLeft className="h-4 w-4" /> Miembro destacado
                </CardTitle>
                <CardDescription>
                  Resumen operativo del recurso seleccionado antes de abrir su ficha completa.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
                <div className="space-y-4">
                  <DetailFieldGrid
                    fields={[
                      { label: "Nombre", value: miembroActivo.nombre },
                      { label: "Rol", value: miembroActivo.rol },
                      { label: "Departamento", value: miembroActivo.departamento },
                      { label: "Estado", value: miembroActivo.estado },
                      { label: "Tareas reales", value: String(memberTasks.length) },
                      {
                        label: "Proyectos visibles",
                        value: memberProjects.length
                          ? memberProjects.join(", ")
                          : "Sin proyectos activos",
                      },
                    ]}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Estado operativo</p>
                    <p className="mt-3 font-semibold">{memberStatus?.label}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{memberStatus?.detail}</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Circuito</p>
                    <p className="mt-3 font-semibold">{memberCircuit?.label}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{memberCircuit?.detail}</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ShieldAlert className="h-4 w-4" /> Cobertura legacy
                    </div>
                    <p className="mt-3 font-semibold">{memberCoverage?.label}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{memberCoverage?.detail}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_360px]">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Miembro</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Tareas</TableHead>
                    <TableHead>Proyectos</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                        <div className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Cargando equipo...
                        </div>
                      </TableCell>
                    </TableRow>
                  )}

                  {!loading && filteredMiembros.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                        No hay miembros que coincidan con los filtros actuales.
                      </TableCell>
                    </TableRow>
                  )}

                  {!loading &&
                    filteredMiembros.map((miembro) => {
                      const proyectosAsignados = proyectosPorMiembro.get(miembro.nombre) ?? []

                      const tareasReales =
                        tareasPorMiembro.get(miembro.id) ??
                        tareasPorMiembro.get(miembro.nombre) ??
                        []

                      return (
                        <TableRow
                          key={miembro.id}
                          className={miembroActivo?.id === miembro.id ? "bg-accent/40" : undefined}
                          onClick={() => setSelectedMiembro(miembro)}
                        >
                          <TableCell>
                            <button
                              className="text-left hover:underline"
                              onClick={() => openDetail(miembro)}
                              type="button"
                            >
                              <div className="font-medium">{miembro.nombre}</div>
                              <div className="text-xs text-muted-foreground">ID: {miembro.id}</div>
                            </button>
                          </TableCell>
                          <TableCell>{miembro.rol}</TableCell>
                          <TableCell>{miembro.departamento}</TableCell>
                          <TableCell>
                            <Badge variant={getEstadoVariant(miembro.estado)}>
                              {miembro.estado}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {tareasReales.length || miembro.tareasAsignadas}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {proyectosAsignados.length > 0 ? (
                                proyectosAsignados.slice(0, 2).map((proyecto) => (
                                  <Badge key={proyecto} variant="outline">
                                    {proyecto}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  Sin asignacion
                                </span>
                              )}
                              {proyectosAsignados.length > 2 && (
                                <Badge variant="secondary">+{proyectosAsignados.length - 2}</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell
                            className="text-right"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => openEdit(miembro)}>
                                Editar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => void handleDelete(miembro)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                </TableBody>
              </Table>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Lectura operativa</CardTitle>
                <CardDescription>
                  Resumen del miembro seleccionado y su contexto en proyectos.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedMiembro ? (
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="text-lg font-semibold">{selectedMiembro.nombre}</p>
                      <p className="text-muted-foreground">{selectedMiembro.rol}</p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-muted-foreground">Departamento</p>
                        <p className="font-medium">{selectedMiembro.departamento}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Estado</p>
                        <Badge variant={getEstadoVariant(selectedMiembro.estado)}>
                          {selectedMiembro.estado}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Tareas asignadas</p>
                        <p className="font-medium">
                          {memberTasks.length || selectedMiembro.tareasAsignadas}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Proyectos activos</p>
                        <p className="font-medium">{memberProjects.length}</p>
                      </div>
                    </div>

                    <div className="rounded-lg border border-dashed p-4">
                      <p className="font-medium">{memberCoverage?.detail}</p>
                      <p className="mt-2 text-muted-foreground">
                        El backend actual ya permite leer la dotación con proyectos y tareas reales,
                        pero no expone calendarios, disponibilidad horaria ni costos del recurso.
                      </p>
                    </div>

                    <div>
                      <p className="text-muted-foreground mb-2">Proyectos vinculados</p>
                      <div className="flex flex-wrap gap-2">
                        {memberProjects.length > 0 ? (
                          memberProjects.map((proyecto) => (
                            <Badge key={proyecto} variant="outline">
                              {proyecto}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            No aparece asignado en los proyectos cargados.
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        className="flex-1"
                        variant="outline"
                        onClick={() => openEdit(selectedMiembro)}
                      >
                        Editar miembro
                      </Button>
                      <Button
                        className="flex-1"
                        variant="outline"
                        onClick={() => setIsDetailOpen(true)}
                      >
                        Ver ficha
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="py-10 text-sm text-muted-foreground">
                    Selecciona un miembro desde la grilla para ver su carga, estado y proyectos
                    asociados.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedMiembro?.nombre ?? "Ficha del miembro"}</DialogTitle>
            <DialogDescription>
              Detalle disponible desde el backend y cruce con proyectos vigentes.
            </DialogDescription>
          </DialogHeader>

          {selectedMiembro && (
            <div className="grid gap-4 py-2 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Rol</p>
                <p className="font-medium">{selectedMiembro.rol}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Departamento</p>
                <p className="font-medium">{selectedMiembro.departamento}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estado</p>
                <Badge variant={getEstadoVariant(selectedMiembro.estado)}>
                  {selectedMiembro.estado}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tareas asignadas</p>
                <p className="font-medium">
                  {memberTasks.length || selectedMiembro.tareasAsignadas}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-sm text-muted-foreground">Proyectos asociados</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {memberProjects.length > 0 ? (
                    memberProjects.map((proyecto) => (
                      <Badge key={proyecto} variant="outline">
                        {proyecto}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      Sin asignaciones detectadas en la cartera activa.
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingMiembro ? "Editar miembro" : "Nuevo miembro"}</DialogTitle>
            <DialogDescription>
              Mantenimiento de recursos humanos del modulo proyectos usando el backend vigente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  value={form.nombre}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, nombre: event.target.value }))
                  }
                  placeholder="Nombre completo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rol">Rol</Label>
                <Input
                  id="rol"
                  value={form.rol}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, rol: event.target.value }))
                  }
                  placeholder="Jefe de obra, analista, PM"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="departamento">Departamento</Label>
                <Input
                  id="departamento"
                  value={form.departamento}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, departamento: event.target.value }))
                  }
                  placeholder="Oficina tecnica, administracion"
                />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select
                  value={form.estado}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, estado: value as Miembro["estado"] }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADOS.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tareas">Tareas asignadas</Label>
              <Input
                id="tareas"
                min="0"
                type="number"
                value={form.tareasAsignadas}
                onChange={(event) =>
                  setForm((current) => ({ ...current, tareasAsignadas: event.target.value }))
                }
              />
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
              Guardar miembro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
