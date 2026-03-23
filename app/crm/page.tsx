"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import {
  Users,
  Target,
  DollarSign,
  TrendingUp,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Phone,
  Building2,
  ArrowRight,
  RefreshCw,
} from "lucide-react"
import {
  useCrmClientes,
  useCrmOportunidades,
  useCrmTareas,
  useCrmInteracciones,
  useCrmUsuarios,
} from "@/lib/hooks/useCrm"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Funnel,
  FunnelChart,
  LabelList,
} from "recharts"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(value)

const formatDate = (value?: Date | string | null) => {
  if (!value) return "Sin fecha"
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value))
}

const getDaysUntil = (value?: Date | string | null) => {
  if (!value) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(value)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

const getRelationshipLabel = (value: string) =>
  ({
    nuevo: "Nuevo",
    en_negociacion: "En negociacion",
    en_riesgo: "En riesgo",
    fidelizado: "Fidelizado",
  })[value] ?? value

const getPrioridadColor = (p: string) =>
  ({
    alta: "bg-red-500/20 text-red-400",
    media: "bg-yellow-500/20 text-yellow-400",
    baja: "bg-green-500/20 text-green-400",
  })[p] ?? "bg-gray-500/20 text-gray-400"

const getEtapaColor = (e: string) =>
  ({
    lead: "bg-slate-500/20 text-slate-400",
    calificado: "bg-blue-500/20 text-blue-400",
    propuesta: "bg-purple-500/20 text-purple-400",
    negociacion: "bg-yellow-500/20 text-yellow-400",
    cerrado_ganado: "bg-green-500/20 text-green-400",
    cerrado_perdido: "bg-red-500/20 text-red-400",
  })[e] ?? "bg-gray-500/20 text-gray-400"

export default function CRMDashboard() {
  const { clientes, loading: loadingC, error: errorC } = useCrmClientes()
  const { oportunidades, loading: loadingO } = useCrmOportunidades()
  const { tareas, loading: loadingT } = useCrmTareas()
  const { interacciones, loading: loadingI } = useCrmInteracciones()
  const { usuarios, loading: loadingU } = useCrmUsuarios()

  const loading = loadingC || loadingO || loadingT || loadingI || loadingU
  const error = errorC

  const usuarioMap = useMemo(
    () => new Map(usuarios.map((usuario) => [usuario.id, `${usuario.nombre} ${usuario.apellido}`])),
    [usuarios]
  )

  const lastInteractionByClient = useMemo(() => {
    const map = new Map<string, Date>()
    interacciones.forEach((interaccion) => {
      const current = new Date(interaccion.fechaHora)
      const previous = map.get(interaccion.clienteId)
      if (!previous || current > previous) map.set(interaccion.clienteId, current)
    })
    return map
  }, [interacciones])

  const lastInteractionByOpportunity = useMemo(() => {
    const map = new Map<string, Date>()
    interacciones.forEach((interaccion) => {
      if (!interaccion.oportunidadId) return
      const current = new Date(interaccion.fechaHora)
      const previous = map.get(interaccion.oportunidadId)
      if (!previous || current > previous) map.set(interaccion.oportunidadId, current)
    })
    return map
  }, [interacciones])

  const stats = useMemo(() => {
    const totalClientes = clientes.length
    const activos = clientes.filter((c) => c.tipoCliente === "activo").length
    const prospectos = clientes.filter((c) => c.tipoCliente === "prospecto").length
    const inactivos = clientes.filter((c) => c.tipoCliente === "inactivo").length
    const perdidos = clientes.filter((c) => c.tipoCliente === "perdido").length

    const oppsActivas = oportunidades.filter(
      (o) => !["cerrado_ganado", "cerrado_perdido"].includes(o.etapa)
    )
    const oppsGanadas = oportunidades.filter((o) => o.etapa === "cerrado_ganado")
    const montoTotal = oppsActivas.reduce((s, o) => s + Number(o.montoEstimado ?? 0), 0)
    const montoGanado = oppsGanadas.reduce((s, o) => s + Number(o.montoEstimado ?? 0), 0)

    const now = new Date()
    const tareasPendientes = tareas.filter((t) => t.estado === "pendiente").length
    const tareasCompletadas = tareas.filter((t) => t.estado === "completada").length
    const tareasVencidas = tareas.filter(
      (t) => t.estado !== "completada" && t.fechaVencimiento && new Date(t.fechaVencimiento) < now
    ).length
    const seguimientoVencido = clientes.filter((cliente) => {
      if (cliente.estadoRelacion === "en_riesgo") return true
      const lastInteraction = lastInteractionByClient.get(cliente.id)
      if (!lastInteraction) return true
      return getDaysUntil(lastInteraction) !== null && getDaysUntil(lastInteraction)! < -30
    }).length
    const cierresComprometidos = oppsActivas.filter((oportunidad) => {
      const daysUntil = getDaysUntil(oportunidad.fechaEstimadaCierre)
      return daysUntil !== null && daysUntil <= 7
    }).length

    return {
      totalClientes,
      activos,
      prospectos,
      inactivos,
      perdidos,
      oppsActivas: oppsActivas.length,
      montoTotal,
      montoGanado,
      tareasPendientes,
      tareasCompletadas,
      tareasVencidas,
      seguimientoVencido,
      cierresComprometidos,
      totalTareas: tareas.length,
    }
  }, [clientes, lastInteractionByClient, oportunidades, tareas])

  const clientesRadar = useMemo(
    () =>
      clientes
        .map((cliente) => {
          const lastInteraction = lastInteractionByClient.get(cliente.id)
          const pipeline = oportunidades
            .filter(
              (oportunidad) =>
                oportunidad.clienteId === cliente.id &&
                !["cerrado_ganado", "cerrado_perdido"].includes(oportunidad.etapa)
            )
            .reduce((acc, oportunidad) => acc + Number(oportunidad.montoEstimado ?? 0), 0)
          const staleDays = lastInteraction ? getDaysUntil(lastInteraction) : null
          const criticidad =
            (cliente.estadoRelacion === "en_riesgo" ? 3 : 0) +
            (staleDays !== null && staleDays < -30 ? 2 : 0) +
            (pipeline > 0 ? 1 : 0)

          return {
            id: cliente.id,
            nombre: cliente.nombre,
            responsable: cliente.responsableId
              ? (usuarioMap.get(cliente.responsableId) ?? "Sin responsable")
              : "Sin responsable",
            relacion: getRelationshipLabel(cliente.estadoRelacion),
            ultimaGestion: lastInteraction,
            pipeline,
            criticidad,
          }
        })
        .filter((cliente) => cliente.criticidad > 0)
        .sort((left, right) => right.criticidad - left.criticidad || right.pipeline - left.pipeline)
        .slice(0, 6),
    [clientes, lastInteractionByClient, oportunidades, usuarioMap]
  )

  const oportunidadesSeguimiento = useMemo(
    () =>
      oportunidades
        .filter((oportunidad) => !["cerrado_ganado", "cerrado_perdido"].includes(oportunidad.etapa))
        .map((oportunidad) => {
          const cliente = clientes.find((current) => current.id === oportunidad.clienteId)
          const lastInteraction = lastInteractionByOpportunity.get(oportunidad.id)
          const daysToClose = getDaysUntil(oportunidad.fechaEstimadaCierre)
          const criticidad =
            (daysToClose !== null && daysToClose < 0 ? 3 : 0) +
            (daysToClose !== null && daysToClose <= 7 ? 2 : 0) +
            (!lastInteraction ? 1 : 0) +
            (oportunidad.probabilidad <= 40 ? 1 : 0)

          return {
            id: oportunidad.id,
            titulo: oportunidad.titulo,
            cliente: cliente?.nombre ?? "Cliente no disponible",
            responsable: oportunidad.responsableId
              ? (usuarioMap.get(oportunidad.responsableId) ?? "Sin responsable")
              : "Sin responsable",
            etapa: oportunidad.etapa.replaceAll("_", " "),
            probabilidad: oportunidad.probabilidad,
            cierre: oportunidad.fechaEstimadaCierre,
            ultimaGestion: lastInteraction,
            monto: Number(oportunidad.montoEstimado ?? 0),
            criticidad,
          }
        })
        .sort((left, right) => right.criticidad - left.criticidad || right.monto - left.monto)
        .slice(0, 6),
    [clientes, lastInteractionByOpportunity, oportunidades, usuarioMap]
  )

  const clientesPorEstadoData = [
    { name: "Prospectos", value: stats.prospectos, color: "#3b82f6" },
    { name: "Activos", value: stats.activos, color: "#10b981" },
    { name: "Inactivos", value: stats.inactivos, color: "#f59e0b" },
    { name: "Perdidos", value: stats.perdidos, color: "#ef4444" },
  ]

  const pipelineData = [
    {
      name: "Lead",
      value: oportunidades.filter((o) => o.etapa === "lead").length,
      fill: "#94a3b8",
    },
    {
      name: "Calificado",
      value: oportunidades.filter((o) => o.etapa === "calificado").length,
      fill: "#3b82f6",
    },
    {
      name: "Propuesta",
      value: oportunidades.filter((o) => o.etapa === "propuesta").length,
      fill: "#8b5cf6",
    },
    {
      name: "Negociación",
      value: oportunidades.filter((o) => o.etapa === "negociacion").length,
      fill: "#f59e0b",
    },
    {
      name: "Ganado",
      value: oportunidades.filter((o) => o.etapa === "cerrado_ganado").length,
      fill: "#10b981",
    },
  ]

  const interaccionesPorTipo = [
    {
      tipo: "Llamadas",
      cantidad: interacciones.filter((i) => i.tipoInteraccion === "llamada").length,
    },
    { tipo: "Emails", cantidad: interacciones.filter((i) => i.tipoInteraccion === "email").length },
    {
      tipo: "Reuniones",
      cantidad: interacciones.filter((i) => i.tipoInteraccion === "reunion").length,
    },
    {
      tipo: "Visitas",
      cantidad: interacciones.filter((i) => i.tipoInteraccion === "visita").length,
    },
  ]

  const now = new Date()
  const tareasProximas = [...tareas]
    .filter((t) => t.estado === "pendiente" || t.estado === "en_curso")
    .sort((a, b) => new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime())
    .slice(0, 5)

  const oportunidadesActivas = [...oportunidades]
    .filter((o) => !["cerrado_ganado", "cerrado_perdido"].includes(o.etapa))
    .sort((a, b) => Number(b.montoEstimado ?? 0) - Number(a.montoEstimado ?? 0))
    .slice(0, 5)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-balance">ZULU CRM</h1>
          <p className="text-muted-foreground">Vista general de tu pipeline comercial</p>
        </div>
        <div className="flex gap-2">
          {loading && (
            <RefreshCw className="h-4 w-4 animate-spin self-center text-muted-foreground" />
          )}
          <Button asChild>
            <Link href="/crm/clientes?action=new">Nuevo Cliente</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/crm/oportunidades?action=new">Nueva Oportunidad</Link>
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClientes}</div>
            <p className="text-xs text-muted-foreground">{stats.activos} activos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Oportunidades Activas</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.oppsActivas}</div>
            <p className="text-xs text-muted-foreground">
              {oportunidades.filter((o) => o.etapa === "negociacion").length} en negociación
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.montoTotal)}</div>
            <p className="text-xs text-muted-foreground">En oportunidades activas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ganado</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.montoGanado)}</div>
            <p className="text-xs text-muted-foreground">
              {oportunidades.filter((o) => o.etapa === "cerrado_ganado").length} negocios cerrados
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Seguimiento vencido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.seguimientoVencido}</div>
            <p className="text-xs text-muted-foreground">
              Clientes sin gestion reciente o en riesgo
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cierres comprometidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.cierresComprometidos}</div>
            <p className="text-xs text-muted-foreground">
              Oportunidades con cierre en los proximos 7 dias
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Interacciones registradas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{interacciones.length}</div>
            <p className="text-xs text-muted-foreground">Base visible de actividad comercial</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Responsables activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usuarios.filter((usuario) => usuario.estado === "activo").length}
            </div>
            <p className="text-xs text-muted-foreground">Equipo comercial disponible en CRM</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pipeline de Ventas</CardTitle>
            <CardDescription>Oportunidades por etapa</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-75">
              <ResponsiveContainer width="100%" height="100%">
                <FunnelChart>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                    }}
                  />
                  <Funnel dataKey="value" data={pipelineData} isAnimationActive>
                    <LabelList position="center" fill="#fff" stroke="none" dataKey="name" />
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Clientes por Estado</CardTitle>
            <CardDescription>Distribución de la cartera</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-75">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={clientesPorEstadoData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {clientesPorEstadoData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activities and Tasks Row */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Actividad Comercial</CardTitle>
            <CardDescription>Interacciones por tipo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={interaccionesPorTipo}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="tipo" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                    }}
                  />
                  <Bar dataKey="cantidad" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumen de Tareas</CardTitle>
            <CardDescription>Estado actual de tareas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                <span>Pendientes</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">{stats.tareasPendientes}</span>
                <Progress
                  value={stats.totalTareas ? (stats.tareasPendientes / stats.totalTareas) * 100 : 0}
                  className="w-20"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Completadas</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">{stats.tareasCompletadas}</span>
                <Progress
                  value={
                    stats.totalTareas ? (stats.tareasCompletadas / stats.totalTareas) * 100 : 0
                  }
                  className="w-20"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span>Vencidas</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">{stats.tareasVencidas}</span>
                <Progress
                  value={stats.totalTareas ? (stats.tareasVencidas / stats.totalTareas) * 100 : 0}
                  className="w-20"
                />
              </div>
            </div>
            <div className="pt-4 border-t">
              <Button variant="outline" className="w-full bg-transparent" asChild>
                <Link href="/crm/tareas">Ver todas las tareas</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lists Row */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tareas Próximas</CardTitle>
            <CardDescription>Tareas a vencer en los próximos días</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tareasProximas.map((tarea) => {
                const cliente = clientes.find((c) => c.id === tarea.clienteId)
                const dias = Math.ceil(
                  (new Date(tarea.fechaVencimiento).getTime() - now.getTime()) / 86400000
                )
                return (
                  <div
                    key={tarea.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{tarea.titulo}</p>
                      {cliente && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {cliente.nombre}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getPrioridadColor(tarea.prioridad)}>
                        {tarea.prioridad}
                      </Badge>
                      <Badge variant={dias <= 2 ? "destructive" : "secondary"}>
                        {dias <= 0 ? "Hoy" : `${dias}d`}
                      </Badge>
                    </div>
                  </div>
                )
              })}
              {tareasProximas.length === 0 && (
                <p className="text-center text-muted-foreground py-4">No hay tareas próximas</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Oportunidades</CardTitle>
            <CardDescription>Por monto estimado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {oportunidadesActivas.map((opp) => {
                const cliente = clientes.find((c) => c.id === opp.clienteId)
                return (
                  <Link key={opp.id} href={`/crm/oportunidades/${opp.id}`}>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                      <div className="space-y-1">
                        <p className="font-medium">{opp.titulo}</p>
                        {cliente && (
                          <p className="text-sm text-muted-foreground">{cliente.nombre}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getEtapaColor(opp.etapa)}>
                          {opp.etapa.replace("_", " ")}
                        </Badge>
                        <span className="font-bold text-sm">
                          {formatCurrency(Number(opp.montoEstimado ?? 0))}
                        </span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Radar de Clientes</CardTitle>
            <CardDescription>
              Cartera con seguimiento vencido, pipeline pendiente y responsable comercial.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Responsable</TableHead>
                  <TableHead>Ult. gestion</TableHead>
                  <TableHead className="text-right">Pipeline</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientesRadar.map((cliente) => (
                  <TableRow key={cliente.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{cliente.nombre}</div>
                        <div className="text-xs text-muted-foreground">{cliente.relacion}</div>
                      </div>
                    </TableCell>
                    <TableCell>{cliente.responsable}</TableCell>
                    <TableCell>{formatDate(cliente.ultimaGestion)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(cliente.pipeline)}</TableCell>
                    <TableCell>
                      <Badge variant={cliente.criticidad >= 4 ? "destructive" : "secondary"}>
                        {cliente.criticidad >= 4 ? "Prioritario" : "Seguimiento"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {clientesRadar.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-4 text-center text-muted-foreground">
                      Sin clientes en radar comercial.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Seguimiento de Oportunidades</CardTitle>
            <CardDescription>
              Cierres comprometidos, responsable asignado y ultima actividad vinculada.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Oportunidad</TableHead>
                  <TableHead>Responsable</TableHead>
                  <TableHead>Cierre</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Circuito</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {oportunidadesSeguimiento.map((oportunidad) => {
                  const daysToClose = getDaysUntil(oportunidad.cierre)
                  return (
                    <TableRow key={oportunidad.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{oportunidad.titulo}</div>
                          <div className="text-xs text-muted-foreground">
                            {oportunidad.cliente} · {oportunidad.etapa}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{oportunidad.responsable}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div>{formatDate(oportunidad.cierre)}</div>
                          <div className="text-xs text-muted-foreground">
                            {daysToClose === null
                              ? "Sin compromiso"
                              : daysToClose < 0
                                ? `${Math.abs(daysToClose)} dias vencida`
                                : `${daysToClose} dias restantes`}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(oportunidad.monto)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={oportunidad.criticidad >= 4 ? "destructive" : "outline"}>
                          {oportunidad.criticidad >= 4 ? "Critica" : `${oportunidad.probabilidad}%`}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {oportunidadesSeguimiento.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-4 text-center text-muted-foreground">
                      Sin oportunidades activas en seguimiento.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/crm/clientes">
                <Users className="mr-2 h-4 w-4" />
                Ver Clientes
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/crm/interacciones?action=new">
                <Phone className="mr-2 h-4 w-4" />
                Registrar Llamada
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/crm/tareas?action=new">
                <Calendar className="mr-2 h-4 w-4" />
                Crear Tarea
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/crm/reportes">
                <TrendingUp className="mr-2 h-4 w-4" />
                Ver Reportes
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
