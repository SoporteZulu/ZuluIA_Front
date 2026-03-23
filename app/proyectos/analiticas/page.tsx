"use client"

import { useMemo, useState } from "react"
import { AlertCircle, Download, FolderKanban, TimerReset, TrendingUp, Users } from "lucide-react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import {
  useClientesProyectos,
  useMiembros,
  useProyectos,
  useTareasProyecto,
} from "@/lib/hooks/useProyectos"
import type { Proyecto, Tarea } from "@/lib/proyectos-types"

type TimeRange = "mes" | "trimestre" | "semestre" | "anio"

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(value?: Date | string) {
  if (!value) return "Sin fecha"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Sin fecha"

  return date.toLocaleDateString("es-AR")
}

function getRangeStart(timeRange: TimeRange) {
  const date = new Date()
  date.setHours(0, 0, 0, 0)

  switch (timeRange) {
    case "mes":
      date.setMonth(date.getMonth() - 1)
      break
    case "trimestre":
      date.setMonth(date.getMonth() - 3)
      break
    case "semestre":
      date.setMonth(date.getMonth() - 6)
      break
    case "anio":
      date.setFullYear(date.getFullYear() - 1)
      break
  }

  date.setDate(1)
  return date
}

function getMonthKey(value: Date | string) {
  const date = new Date(value)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

function buildPeriods(timeRange: TimeRange) {
  const start = getRangeStart(timeRange)
  const end = new Date()
  const periods: Array<{ key: string; label: string }> = []
  const cursor = new Date(start)

  while (cursor <= end) {
    periods.push({
      key: getMonthKey(cursor),
      label: cursor.toLocaleDateString("es-AR", { month: "short", year: "2-digit" }),
    })
    cursor.setMonth(cursor.getMonth() + 1)
  }

  return periods
}

function getProjectBadgeVariant(
  estado: Proyecto["estado"]
): "default" | "secondary" | "outline" | "destructive" {
  if (estado === "Retrasado" || estado === "En Riesgo") return "destructive"
  if (estado === "En Curso") return "default"
  if (estado === "Completado") return "secondary"
  return "outline"
}

function getPriorityBadgeVariant(
  prioridad: Proyecto["prioridad"]
): "default" | "secondary" | "outline" | "destructive" {
  if (prioridad === "Crítica") return "destructive"
  if (prioridad === "Alta") return "default"
  if (prioridad === "Media") return "secondary"
  return "outline"
}

function getTaskMapKey(proyecto: Proyecto) {
  return [proyecto.id, proyecto.nombre]
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
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

export default function AnaliticasPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>("trimestre")
  const { proyectos, loading: loadingProyectos, error: errorProyectos } = useProyectos()
  const { tareas, loading: loadingTareas, error: errorTareas } = useTareasProyecto()
  const { clientes, loading: loadingClientes, error: errorClientes } = useClientesProyectos()
  const { miembros, loading: loadingMiembros, error: errorMiembros } = useMiembros()

  const loading = loadingProyectos || loadingTareas || loadingClientes || loadingMiembros
  const error = errorProyectos ?? errorTareas ?? errorClientes ?? errorMiembros

  const clientesByName = useMemo(
    () => new Map(clientes.map((cliente) => [cliente.nombre.toLowerCase(), cliente])),
    [clientes]
  )

  const tasksByProject = useMemo(() => {
    const map = new Map<string, Tarea[]>()
    tareas.forEach((tarea) => {
      const key = tarea.proyecto.trim().toLowerCase()
      map.set(key, [...(map.get(key) ?? []), tarea])
    })
    return map
  }, [tareas])

  const rangeStart = useMemo(() => getRangeStart(timeRange), [timeRange])
  const periods = useMemo(() => buildPeriods(timeRange), [timeRange])

  const proyectosFiltrados = useMemo(() => {
    return proyectos.filter((proyecto) => {
      const startDate = new Date(proyecto.fechaInicio)
      const endDate = new Date(proyecto.fechaFin)
      const updatedDate = new Date(proyecto.updatedAt)
      return startDate >= rangeStart || endDate >= rangeStart || updatedDate >= rangeStart
    })
  }, [proyectos, rangeStart])

  const tareasFiltradas = useMemo(() => {
    return tareas.filter((tarea) => {
      const dueDate = tarea.fechaVencimiento ? new Date(tarea.fechaVencimiento) : null
      const updatedDate = new Date(tarea.updatedAt)
      return (
        (dueDate && dueDate >= rangeStart) || updatedDate >= rangeStart || tarea.estado !== "Hecho"
      )
    })
  }, [rangeStart, tareas])

  const resumen = useMemo(() => {
    const proyectosActivos = proyectosFiltrados.filter((proyecto) => proyecto.estado === "En Curso")
    const proyectosCriticos = proyectosFiltrados.filter(
      (proyecto) => proyecto.estado === "En Riesgo" || proyecto.estado === "Retrasado"
    )
    const presupuestoActivo = proyectosActivos.reduce(
      (acc, proyecto) => acc + Number(proyecto.presupuesto ?? 0),
      0
    )
    const avancePromedio = proyectosActivos.length
      ? Math.round(
          proyectosActivos.reduce((acc, proyecto) => acc + Number(proyecto.avance ?? 0), 0) /
            proyectosActivos.length
        )
      : 0
    const tareasVencidas = tareasFiltradas.filter((tarea) => {
      if (!tarea.fechaVencimiento || tarea.estado === "Hecho") return false
      return new Date(tarea.fechaVencimiento).getTime() < Date.now()
    }).length

    return {
      proyectosActivos: proyectosActivos.length,
      presupuestoActivo,
      avancePromedio,
      tareasVencidas,
      proyectosCriticos: proyectosCriticos.length,
      clientesActivos: clientes.filter((cliente) => cliente.estado === "Activo").length,
      miembrosDisponibles: miembros.filter(
        (miembro) => miembro.estado === "Disponible" || miembro.estado === "Online"
      ).length,
    }
  }, [clientes, miembros, proyectosFiltrados, tareasFiltradas])

  const evolucionProyectos = useMemo(() => {
    return periods.map((period) => {
      const iniciados = proyectosFiltrados.filter(
        (proyecto) => getMonthKey(proyecto.fechaInicio) === period.key
      ).length
      const completados = proyectosFiltrados.filter(
        (proyecto) =>
          proyecto.estado === "Completado" && getMonthKey(proyecto.fechaFin) === period.key
      ).length
      const criticos = proyectosFiltrados.filter(
        (proyecto) =>
          (proyecto.estado === "En Riesgo" || proyecto.estado === "Retrasado") &&
          getMonthKey(proyecto.updatedAt) === period.key
      ).length

      return {
        periodo: period.label,
        iniciados,
        completados,
        criticos,
      }
    })
  }, [periods, proyectosFiltrados])

  const presupuestoData = useMemo(() => {
    return periods.map((period) => {
      const presupuestoInicial = proyectosFiltrados
        .filter((proyecto) => getMonthKey(proyecto.fechaInicio) === period.key)
        .reduce((acc, proyecto) => acc + Number(proyecto.presupuesto ?? 0), 0)
      const presupuestoCierre = proyectosFiltrados
        .filter(
          (proyecto) =>
            proyecto.estado === "Completado" && getMonthKey(proyecto.fechaFin) === period.key
        )
        .reduce((acc, proyecto) => acc + Number(proyecto.presupuesto ?? 0), 0)

      return {
        periodo: period.label,
        inicial: presupuestoInicial,
        cierre: presupuestoCierre,
      }
    })
  }, [periods, proyectosFiltrados])

  const performanceData = useMemo(() => {
    return proyectosFiltrados.slice(0, 12).map((proyecto) => {
      const projectTasks = getTaskMapKey(proyecto).flatMap(
        (key) => tasksByProject.get(key.toLowerCase()) ?? []
      )
      const abiertas = projectTasks.filter((tarea) => tarea.estado !== "Hecho").length
      const cumplimiento = projectTasks.length
        ? Math.round(
            (projectTasks.filter((tarea) => tarea.estado === "Hecho").length /
              projectTasks.length) *
              100
          )
        : Number(proyecto.avance ?? 0)

      return {
        proyecto: proyecto.nombre,
        avance: Number(proyecto.avance ?? 0),
        abiertas,
        cumplimiento,
        equipo: proyecto.equipo.length,
      }
    })
  }, [proyectosFiltrados, tasksByProject])

  const radarOperativo = useMemo(() => {
    return proyectosFiltrados
      .map((proyecto) => {
        const projectTasks = getTaskMapKey(proyecto).flatMap(
          (key) => tasksByProject.get(key.toLowerCase()) ?? []
        )
        const tareasAbiertas = projectTasks.filter((tarea) => tarea.estado !== "Hecho").length
        const tareasVencidas = projectTasks.filter((tarea) => {
          if (!tarea.fechaVencimiento || tarea.estado === "Hecho") return false
          return new Date(tarea.fechaVencimiento).getTime() < Date.now()
        }).length
        const client = clientesByName.get(proyecto.cliente.toLowerCase())
        const startDate = new Date(proyecto.fechaInicio)
        const endDate = new Date(proyecto.fechaFin)
        const today = Date.now()
        const totalRange = Math.max(endDate.getTime() - startDate.getTime(), 1)
        const elapsed = Math.min(Math.max((today - startDate.getTime()) / totalRange, 0), 1)
        const expectedAdvance = Math.round(elapsed * 100)
        const desvio = expectedAdvance - Number(proyecto.avance ?? 0)
        const criticidad =
          (proyecto.estado === "Retrasado" ? 3 : 0) +
          (proyecto.estado === "En Riesgo" ? 2 : 0) +
          (tareasVencidas > 0 ? 2 : 0) +
          (desvio > 15 ? 2 : 0) +
          (proyecto.prioridad === "Crítica" ? 1 : 0)

        let accion = "Seguimiento normal"
        if (tareasVencidas > 0) accion = "Regularizar tareas vencidas"
        else if (desvio > 15) accion = "Replanificar cronograma"
        else if (proyecto.estado === "En Riesgo") accion = "Revisar desvio operativo"

        return {
          id: proyecto.id,
          nombre: proyecto.nombre,
          cliente: proyecto.cliente,
          sector: client?.sector ?? "Sin sector",
          prioridad: proyecto.prioridad,
          estado: proyecto.estado,
          fechaFin: proyecto.fechaFin,
          equipo: proyecto.equipo.length,
          tareasAbiertas,
          tareasVencidas,
          desvio,
          criticidad,
          accion,
        }
      })
      .sort((a, b) => b.criticidad - a.criticidad || b.tareasVencidas - a.tareasVencidas)
      .slice(0, 8)
  }, [clientesByName, proyectosFiltrados, tasksByProject])

  const riesgos = useMemo(() => {
    return radarOperativo
      .filter((proyecto) => proyecto.criticidad > 0)
      .map((proyecto) => ({
        ...proyecto,
        nivel: proyecto.criticidad >= 5 ? "Alto" : proyecto.criticidad >= 3 ? "Medio" : "Bajo",
        riesgo:
          proyecto.tareasVencidas > 0
            ? `${proyecto.tareasVencidas} tareas vencidas impactan el circuito.`
            : proyecto.desvio > 15
              ? `El avance real esta ${proyecto.desvio} puntos debajo del esperado.`
              : "El estado operativo requiere control preventivo.",
      }))
  }, [radarOperativo])

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analíticas</h1>
          <p className="mt-1 text-muted-foreground">
            Lectura operativa de proyectos con cartera, tareas, equipo y desvíos reales.
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mes">Ultimo mes</SelectItem>
              <SelectItem value="trimestre">Ultimo trimestre</SelectItem>
              <SelectItem value="semestre">Ultimo semestre</SelectItem>
              <SelectItem value="anio">Ultimo año</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Analíticas de proyectos</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SummaryCard
          title="Proyectos activos"
          value={loading ? "..." : resumen.proyectosActivos}
          description="Cartera en curso dentro del rango analizado."
          icon={<FolderKanban className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Presupuesto activo"
          value={loading ? "..." : formatCurrency(resumen.presupuestoActivo)}
          description="Monto comprometido por proyectos en ejecución."
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Avance promedio"
          value={loading ? "..." : `${resumen.avancePromedio}%`}
          description="Promedio real de avance sobre proyectos activos."
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Tareas vencidas"
          value={loading ? "..." : resumen.tareasVencidas}
          description="Pendientes que ya superaron su fecha comprometida."
          icon={<TimerReset className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Clientes activos"
          value={loading ? "..." : resumen.clientesActivos}
          description="Clientes con cartera vigente en proyectos."
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Equipo disponible"
          value={loading ? "..." : resumen.miembrosDisponibles}
          description="Miembros online o disponibles para reasignación."
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Evolución de Proyectos</CardTitle>
            <CardDescription>Altas, cierres y focos críticos por período.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={evolucionProyectos}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="periodo" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="iniciados" fill="#10b981" name="Iniciados" />
                <Bar dataKey="completados" fill="#3b82f6" name="Completados" />
                <Bar dataKey="criticos" fill="#ef4444" name="Criticos" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Presupuesto de Cartera</CardTitle>
            <CardDescription>
              Presupuesto incorporado al pipeline versus proyectos cerrados en el período.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={presupuestoData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="periodo" />
                <YAxis />
                <Tooltip formatter={(value: number) => formatCurrency(Number(value))} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="inicial"
                  fill="#6366f1"
                  stroke="#6366f1"
                  name="Ingreso"
                />
                <Area
                  type="monotone"
                  dataKey="cierre"
                  fill="#f59e0b"
                  stroke="#f59e0b"
                  name="Cierre"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Radar Operativo</CardTitle>
            <CardDescription>
              Vista de cliente, prioridad, vencimientos y circuito para los proyectos mas sensibles.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proyecto</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Equipo</TableHead>
                  <TableHead>Fecha fin</TableHead>
                  <TableHead className="text-right">Abiertas</TableHead>
                  <TableHead>Circuito</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {radarOperativo.map((proyecto) => (
                  <TableRow key={proyecto.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{proyecto.nombre}</div>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <Badge variant={getPriorityBadgeVariant(proyecto.prioridad)}>
                            {proyecto.prioridad}
                          </Badge>
                          <span>{proyecto.sector}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{proyecto.cliente}</TableCell>
                    <TableCell>{proyecto.equipo} personas</TableCell>
                    <TableCell>{formatDate(proyecto.fechaFin)}</TableCell>
                    <TableCell className="text-right">
                      {proyecto.tareasAbiertas}
                      {proyecto.tareasVencidas > 0 ? ` / ${proyecto.tareasVencidas} vencidas` : ""}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant={getProjectBadgeVariant(proyecto.estado)}>
                          {proyecto.estado}
                        </Badge>
                        <p className="text-xs text-muted-foreground">{proyecto.accion}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!radarOperativo.length && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Sin proyectos para analizar en el rango seleccionado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cumplimiento por Proyecto</CardTitle>
            <CardDescription>
              Cruce entre avance informado, cumplimiento de tareas y carga abierta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" dataKey="avance" name="Avance" unit="%" />
                <YAxis type="number" dataKey="abiertas" name="Tareas abiertas" />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  formatter={(value, name) => [value, name === "abiertas" ? "Abiertas" : name]}
                />
                <Scatter data={performanceData} fill="#6366f1" name="Proyectos" />
              </ScatterChart>
            </ResponsiveContainer>
            <div className="mt-4 grid gap-2">
              {performanceData.slice(0, 5).map((proyecto) => (
                <div
                  key={proyecto.proyecto}
                  className="flex items-center justify-between rounded-lg border p-3 text-sm"
                >
                  <div>
                    <p className="font-medium">{proyecto.proyecto}</p>
                    <p className="text-xs text-muted-foreground">
                      {proyecto.abiertas} abiertas · cumplimiento {proyecto.cumplimiento}%
                    </p>
                  </div>
                  <Badge variant="outline">Equipo {proyecto.equipo}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Análisis de Riesgos</CardTitle>
          <CardDescription>
            Alertas derivadas del estado real del proyecto, sus tareas y el desvío frente al
            calendario.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {riesgos.map((riesgo) => (
            <div
              key={riesgo.id}
              className="flex items-start gap-4 rounded-lg border bg-muted/40 p-4"
            >
              <AlertCircle
                className={[
                  "mt-1 h-5 w-5 shrink-0",
                  riesgo.nivel === "Alto"
                    ? "text-red-600"
                    : riesgo.nivel === "Medio"
                      ? "text-orange-600"
                      : "text-yellow-600",
                ].join(" ")}
              />
              <div className="flex-1 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{riesgo.nombre}</p>
                  <Badge variant={riesgo.nivel === "Alto" ? "destructive" : "outline"}>
                    {riesgo.nivel}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{riesgo.riesgo}</p>
                <p className="text-xs text-muted-foreground">Accion sugerida: {riesgo.accion}</p>
              </div>
            </div>
          ))}
          {!riesgos.length && (
            <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
              No se detectaron riesgos relevantes con los datos visibles del rango actual.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
