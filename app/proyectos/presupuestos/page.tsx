"use client"

import { useMemo, useState } from "react"
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
import { Progress } from "@/components/ui/progress"
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
  CalendarClock,
  FolderKanban,
  PiggyBank,
  RefreshCcw,
  Search,
  ShieldAlert,
  Target,
} from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { useProyectos } from "@/lib/hooks/useProyectos"
import type { Proyecto } from "@/lib/proyectos-types"

type ProyectoBudgetForm = {
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
const PIE_COLORS = ["#0f766e", "#d97706", "#dc2626", "#2563eb", "#7c3aed", "#475569"]

function currency(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0))
}

function toInputDate(value: Date | string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ""
  }

  return date.toISOString().slice(0, 10)
}

function formatDate(value: Date | string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "-"
  }

  return date.toLocaleDateString("es-AR")
}

function buildFormState(proyecto: Proyecto): ProyectoBudgetForm {
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

function getDaysToDeadline(value: Date | string) {
  const target = new Date(value)
  if (Number.isNaN(target.getTime())) {
    return null
  }

  const today = new Date()
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const end = new Date(target.getFullYear(), target.getMonth(), target.getDate())
  return Math.round((end.getTime() - base.getTime()) / 86400000)
}

function getBudgetStatus(proyecto: Proyecto) {
  const daysToDeadline = getDaysToDeadline(proyecto.fechaFin)

  if (proyecto.estado === "Retrasado") {
    return {
      label: "Retrasado",
      tone: "destructive" as const,
      detail: "El proyecto ya figura atrasado en el circuito real de proyectos.",
    }
  }

  if (proyecto.estado === "En Riesgo") {
    return {
      label: "En riesgo",
      tone: "destructive" as const,
      detail: "El seguimiento actual marca desvío operativo o presupuestario.",
    }
  }

  if (daysToDeadline !== null && daysToDeadline <= 14 && proyecto.avance < 100) {
    return {
      label: "Cierre próximo",
      tone: "outline" as const,
      detail: "La fecha fin está próxima y conviene revisar el presupuesto remanente.",
    }
  }

  if (proyecto.estado === "Completado" || proyecto.avance >= 100) {
    return {
      label: "Completado",
      tone: "secondary" as const,
      detail: "El proyecto ya alcanzó cierre operativo dentro del maestro vigente.",
    }
  }

  return {
    label: "Bajo seguimiento",
    tone: "default" as const,
    detail: "El presupuesto sigue activo dentro del circuito operativo de proyectos.",
  }
}

function getBudgetCircuit(proyecto: Proyecto) {
  if (proyecto.estado === "En Planificación") {
    return {
      label: "Presupuesto en preparación",
      detail: "El importe todavía acompaña una etapa previa al inicio operativo.",
    }
  }

  if (proyecto.estado === "En Curso") {
    return {
      label: "Presupuesto en ejecución",
      detail: "La cartera activa ya usa este monto como referencia principal del proyecto.",
    }
  }

  if (proyecto.estado === "Completado") {
    return {
      label: "Presupuesto cerrado",
      detail: "El proyecto terminó y el presupuesto queda como referencia histórica.",
    }
  }

  return {
    label: "Presupuesto condicionado",
    detail: "El monto existe, pero el proyecto atraviesa una etapa de espera, riesgo o atraso.",
  }
}

function getLegacyCoverage(proyecto: Proyecto) {
  const available = [
    proyecto.presupuesto ? 1 : 0,
    proyecto.cliente ? 1 : 0,
    proyecto.equipo.length ? 1 : 0,
    proyecto.etiquetas?.length ? 1 : 0,
  ].reduce((sum, value) => sum + value, 0)

  if (available >= 4) {
    return {
      label: "Cobertura amplia",
      detail:
        "El proyecto visible ya expone cliente, presupuesto, equipo y marcas operativas del dominio actual.",
    }
  }

  if (available >= 2) {
    return {
      label: "Cobertura parcial",
      detail:
        "El presupuesto ya es utilizable, aunque faltan partidas y desagregaciones del legado.",
    }
  }

  return {
    label: "Cobertura base",
    detail: "La API sólo expone el monto total y los datos generales del proyecto presupuestado.",
  }
}

export default function PresupuestosPage() {
  const { proyectos, loading, error, updateProyecto, refetch } = useProyectos()
  const [searchTerm, setSearchTerm] = useState("")
  const [estadoFiltro, setEstadoFiltro] = useState<"todos" | Proyecto["estado"]>("todos")
  const [prioridadFiltro, setPrioridadFiltro] = useState<"todas" | Proyecto["prioridad"]>("todas")
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Proyecto | null>(null)
  const [form, setForm] = useState<ProyectoBudgetForm | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const proyectosFiltrados = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()

    return proyectos.filter((proyecto) => {
      const matchesSearch = [proyecto.nombre, proyecto.cliente, proyecto.descripcion]
        .join(" ")
        .toLowerCase()
        .includes(term)
      const matchesEstado = estadoFiltro === "todos" || proyecto.estado === estadoFiltro
      const matchesPrioridad = prioridadFiltro === "todas" || proyecto.prioridad === prioridadFiltro

      return matchesSearch && matchesEstado && matchesPrioridad
    })
  }, [estadoFiltro, prioridadFiltro, proyectos, searchTerm])

  const proyectoSeleccionado = useMemo(
    () =>
      proyectosFiltrados.find((proyecto) => proyecto.id === selectedProjectId) ??
      proyectosFiltrados[0] ??
      null,
    [proyectosFiltrados, selectedProjectId]
  )

  const presupuestoVisible = proyectosFiltrados.reduce(
    (sum, proyecto) => sum + proyecto.presupuesto,
    0
  )
  const avancePromedio = proyectosFiltrados.length
    ? Math.round(
        proyectosFiltrados.reduce((sum, proyecto) => sum + proyecto.avance, 0) /
          proyectosFiltrados.length
      )
    : 0
  const proyectosEnRiesgo = proyectosFiltrados.filter(
    (proyecto) => proyecto.estado === "En Riesgo" || proyecto.estado === "Retrasado"
  ).length
  const cierreProximo = proyectosFiltrados.filter((proyecto) => {
    const days = getDaysToDeadline(proyecto.fechaFin)
    return days !== null && days >= 0 && days <= 14 && proyecto.avance < 100
  }).length
  const presupuestoPromedio = proyectosFiltrados.length
    ? presupuestoVisible / proyectosFiltrados.length
    : 0

  const chartData = proyectosFiltrados.map((proyecto) => ({
    nombre: proyecto.nombre.length > 18 ? `${proyecto.nombre.slice(0, 18)}...` : proyecto.nombre,
    presupuesto: Math.round(proyecto.presupuesto / 1000000),
    remanente: Math.round((proyecto.presupuesto * (100 - proyecto.avance)) / 1000000),
  }))

  const pieData = ESTADOS.map((estado) => ({
    estado,
    monto: proyectosFiltrados
      .filter((proyecto) => proyecto.estado === estado)
      .reduce((sum, proyecto) => sum + proyecto.presupuesto, 0),
  })).filter((entry) => entry.monto > 0)

  const proyectoStatus = proyectoSeleccionado ? getBudgetStatus(proyectoSeleccionado) : null
  const proyectoCircuit = proyectoSeleccionado ? getBudgetCircuit(proyectoSeleccionado) : null
  const proyectoCoverage = proyectoSeleccionado ? getLegacyCoverage(proyectoSeleccionado) : null

  const clearFilters = () => {
    setSearchTerm("")
    setEstadoFiltro("todos")
    setPrioridadFiltro("todas")
  }

  const openEditDialog = (proyecto: Proyecto) => {
    setEditingProject(proyecto)
    setForm(buildFormState(proyecto))
    setSaveError(null)
    setFormOpen(true)
  }

  const handleSave = async () => {
    if (!editingProject || !form) {
      return
    }

    if (!form.nombre.trim() || !form.cliente.trim() || !form.fechaInicio || !form.fechaFin) {
      setSaveError("Nombre, cliente y fechas son obligatorios.")
      return
    }

    setSaving(true)
    setSaveError(null)

    try {
      const updated = await updateProyecto(editingProject.id, {
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
      })

      setSelectedProjectId(updated.id)
      setFormOpen(false)
      setEditingProject(null)
      setForm(null)
    } catch (issue) {
      setSaveError(
        issue instanceof Error
          ? issue.message
          : "No se pudo actualizar el presupuesto del proyecto."
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Presupuestos</h1>
          <p className="mt-1 text-muted-foreground">
            Consola presupuestaria basada en proyectos reales, con seguimiento del monto vigente,
            avance, fechas y cobertura visible del contrato actual.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="bg-transparent" onClick={clearFilters}>
            Limpiar filtros
          </Button>
          <Button variant="outline" onClick={refetch} disabled={loading}>
            <RefreshCcw className="h-4 w-4" />
            Actualizar
          </Button>
          <Button
            onClick={() => proyectoSeleccionado && openEditDialog(proyectoSeleccionado)}
            disabled={!proyectoSeleccionado}
          >
            <PiggyBank className="h-4 w-4" />
            Ajustar presupuesto
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          title="Proyectos visibles"
          value={String(proyectosFiltrados.length)}
          description="Cartera actual tras filtros de texto, estado y prioridad."
        />
        <SummaryCard
          title="Presupuesto visible"
          value={currency(presupuestoVisible)}
          description="Suma de presupuestos sobre la cartera visible de proyectos."
        />
        <SummaryCard
          title="Promedio por proyecto"
          value={currency(presupuestoPromedio)}
          description="Importe medio de presupuesto en la selección actual."
        />
        <SummaryCard
          title="Avance promedio"
          value={`${avancePromedio}%`}
          description="Promedio de avance operativo del lote presupuestario visible."
        />
        <SummaryCard
          title="Alertas"
          value={`${proyectosEnRiesgo} / ${cierreProximo}`}
          description="En riesgo o retrasados / con cierre próximo dentro de 14 días."
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros operativos</CardTitle>
          <CardDescription>
            Refiná la cartera por texto, estado y prioridad. La vista trabaja exclusivamente con los
            proyectos reales expuestos por el backend.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_220px_220px_auto]">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Buscar por proyecto, cliente o descripción..."
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
            <Select
              value={prioridadFiltro}
              onValueChange={(value) => setPrioridadFiltro(value as typeof prioridadFiltro)}
            >
              <SelectTrigger className="w-full">
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
            <Button variant="outline" onClick={clearFilters}>
              Limpiar
            </Button>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <div className="rounded-lg border p-3 text-sm">
              <p className="text-muted-foreground">Lectura presupuestaria</p>
              <p className="mt-1 font-medium">
                {proyectosFiltrados.length} proyecto(s) con {currency(presupuestoVisible)} visibles
              </p>
              <p className="mt-2 text-muted-foreground">
                El avance se toma del maestro de proyectos y no simula gasto real por partidas.
              </p>
            </div>
            <div className="rounded-lg border p-3 text-sm">
              <p className="text-muted-foreground">Cobertura del contrato</p>
              <p className="mt-1 font-medium">
                Nombre, cliente, presupuesto, avance, fechas, prioridad, equipo y etiquetas ya están
                disponibles
              </p>
              <p className="mt-2 text-muted-foreground">
                La edición usa el endpoint real de proyectos en lugar de un formulario paralelo.
              </p>
            </div>
            <div className="rounded-lg border p-3 text-sm">
              <p className="text-muted-foreground">Gap legacy identificado</p>
              <p className="mt-1 font-medium">
                Partidas, gastos reales y categorías presupuestarias siguen fuera del backend actual
              </p>
              <p className="mt-2 text-muted-foreground">
                La vista los deja explícitos y evita simular gastos inexistentes en la API.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {proyectoSeleccionado && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ArrowRightLeft className="h-5 w-5" />
              Proyecto destacado: {proyectoSeleccionado.nombre}
            </CardTitle>
            <CardDescription>
              Resumen operativo del presupuesto seleccionado antes de abrir la edición del proyecto.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <div className="space-y-4">
              <DetailFieldGrid
                fields={[
                  { label: "Cliente", value: proyectoSeleccionado.cliente },
                  { label: "Presupuesto", value: currency(proyectoSeleccionado.presupuesto) },
                  { label: "Avance", value: `${proyectoSeleccionado.avance}%` },
                  { label: "Inicio", value: formatDate(proyectoSeleccionado.fechaInicio) },
                  { label: "Fin", value: formatDate(proyectoSeleccionado.fechaFin) },
                  {
                    label: "Equipo visible",
                    value: proyectoSeleccionado.equipo.length
                      ? proyectoSeleccionado.equipo.join(", ")
                      : "Sin equipo cargado",
                  },
                ]}
              />
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Avance operativo</p>
                <div className="mt-3 flex items-center gap-3">
                  <Progress value={proyectoSeleccionado.avance} className="h-2" />
                  <span className="text-sm font-medium">{proyectoSeleccionado.avance}%</span>
                </div>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Target className="h-4 w-4" /> Estado operativo
                </div>
                <p className="mt-3 font-semibold">{proyectoStatus?.label}</p>
                <p className="mt-2 text-sm text-muted-foreground">{proyectoStatus?.detail}</p>
              </div>
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarClock className="h-4 w-4" /> Circuito
                </div>
                <p className="mt-3 font-semibold">{proyectoCircuit?.label}</p>
                <p className="mt-2 text-sm text-muted-foreground">{proyectoCircuit?.detail}</p>
              </div>
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldAlert className="h-4 w-4" /> Cobertura legacy
                </div>
                <p className="mt-3 font-semibold">{proyectoCoverage?.label}</p>
                <p className="mt-2 text-sm text-muted-foreground">{proyectoCoverage?.detail}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Presupuesto por proyecto</CardTitle>
            <CardDescription>
              Monto total y remanente teórico según avance porcentual del proyecto actual.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nombre" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value} M ARS`, "Monto"]} />
                <Bar dataKey="presupuesto" fill="#0f766e" name="Presupuesto (M ARS)" />
                <Bar dataKey="remanente" fill="#d97706" name="Remanente teórico (M ARS)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribución por estado</CardTitle>
            <CardDescription>
              Participación presupuestaria de la cartera visible agrupada por estado operativo real.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="monto"
                  nameKey="estado"
                  cx="50%"
                  cy="50%"
                  outerRadius={110}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={entry.estado} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => currency(Number(value ?? 0))} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cartera presupuestaria visible</CardTitle>
          <CardDescription>
            La grilla prioriza presupuesto, avance, prioridad, fechas y circuito visible del
            proyecto.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proyecto</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Presupuesto</TableHead>
                <TableHead>Avance</TableHead>
                <TableHead>Circuito</TableHead>
                <TableHead>Fin</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    Cargando presupuestos reales de proyectos...
                  </TableCell>
                </TableRow>
              )}
              {!loading && proyectosFiltrados.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    <FolderKanban className="mx-auto mb-2 h-8 w-8 opacity-50" />
                    No hay proyectos presupuestarios para los filtros actuales.
                  </TableCell>
                </TableRow>
              )}
              {proyectosFiltrados.map((proyecto) => {
                const status = getBudgetStatus(proyecto)
                const circuit = getBudgetCircuit(proyecto)
                const daysToDeadline = getDaysToDeadline(proyecto.fechaFin)

                return (
                  <TableRow
                    key={proyecto.id}
                    className={
                      proyectoSeleccionado?.id === proyecto.id ? "bg-accent/40" : undefined
                    }
                    onClick={() => setSelectedProjectId(proyecto.id)}
                  >
                    <TableCell className="font-medium">{proyecto.nombre}</TableCell>
                    <TableCell className="text-muted-foreground">{proyecto.cliente}</TableCell>
                    <TableCell className="font-mono">{currency(proyecto.presupuesto)}</TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span>{proyecto.avance}%</span>
                          <span className="text-muted-foreground">{proyecto.prioridad}</span>
                        </div>
                        <Progress value={proyecto.avance} className="h-2" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{circuit.label}</p>
                        <p className="text-xs text-muted-foreground">{circuit.detail}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p>{formatDate(proyecto.fechaFin)}</p>
                        <p className="text-xs text-muted-foreground">
                          {daysToDeadline === null
                            ? "Sin fecha"
                            : daysToDeadline < 0
                              ? `${Math.abs(daysToDeadline)} día(s) vencido`
                              : `${daysToDeadline} día(s)`}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.tone}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(proyecto)}>
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
            <DialogTitle>Ajustar presupuesto de proyecto</DialogTitle>
            <DialogDescription>
              Esta edición usa el endpoint real de proyectos. No crea partidas ni gastos simulados,
              sólo actualiza el presupuesto y el legajo ya expuesto por backend.
            </DialogDescription>
          </DialogHeader>

          {saveError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{saveError}</AlertDescription>
            </Alert>
          )}

          {form && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="proyecto-nombre">Proyecto</Label>
                  <Input
                    id="proyecto-nombre"
                    value={form.nombre}
                    onChange={(event) =>
                      setForm((current) =>
                        current ? { ...current, nombre: event.target.value } : current
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proyecto-cliente">Cliente</Label>
                  <Input
                    id="proyecto-cliente"
                    value={form.cliente}
                    onChange={(event) =>
                      setForm((current) =>
                        current ? { ...current, cliente: event.target.value } : current
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proyecto-inicio">Fecha inicio</Label>
                  <Input
                    id="proyecto-inicio"
                    type="date"
                    value={form.fechaInicio}
                    onChange={(event) =>
                      setForm((current) =>
                        current ? { ...current, fechaInicio: event.target.value } : current
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proyecto-fin">Fecha fin</Label>
                  <Input
                    id="proyecto-fin"
                    type="date"
                    value={form.fechaFin}
                    onChange={(event) =>
                      setForm((current) =>
                        current ? { ...current, fechaFin: event.target.value } : current
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proyecto-presupuesto">Presupuesto</Label>
                  <Input
                    id="proyecto-presupuesto"
                    type="number"
                    min="0"
                    value={form.presupuesto}
                    onChange={(event) =>
                      setForm((current) =>
                        current ? { ...current, presupuesto: event.target.value } : current
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proyecto-avance">Avance</Label>
                  <Input
                    id="proyecto-avance"
                    type="number"
                    min="0"
                    max="100"
                    value={form.avance}
                    onChange={(event) =>
                      setForm((current) =>
                        current ? { ...current, avance: event.target.value } : current
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select
                    value={form.estado}
                    onValueChange={(value) =>
                      setForm((current) =>
                        current ? { ...current, estado: value as Proyecto["estado"] } : current
                      )
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
                      setForm((current) =>
                        current
                          ? { ...current, prioridad: value as Proyecto["prioridad"] }
                          : current
                      )
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
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="proyecto-equipo">Equipo visible</Label>
                  <Input
                    id="proyecto-equipo"
                    value={form.equipo}
                    onChange={(event) =>
                      setForm((current) =>
                        current ? { ...current, equipo: event.target.value } : current
                      )
                    }
                    placeholder="Separar miembros por coma"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="proyecto-etiquetas">Etiquetas</Label>
                  <Input
                    id="proyecto-etiquetas"
                    value={form.etiquetas}
                    onChange={(event) =>
                      setForm((current) =>
                        current ? { ...current, etiquetas: event.target.value } : current
                      )
                    }
                    placeholder="Separar etiquetas por coma"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="proyecto-descripcion">Descripción</Label>
                  <Textarea
                    id="proyecto-descripcion"
                    rows={4}
                    value={form.descripcion}
                    onChange={(event) =>
                      setForm((current) =>
                        current ? { ...current, descripcion: event.target.value } : current
                      )
                    }
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" className="bg-transparent" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Guardando..." : "Guardar presupuesto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
