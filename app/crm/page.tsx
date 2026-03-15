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
import { useCrmClientes, useCrmOportunidades, useCrmTareas, useCrmInteracciones } from "@/lib/hooks/useCrm"
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

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(value)

const getPrioridadColor = (p: string) => ({
  alta: "bg-red-500/20 text-red-400",
  media: "bg-yellow-500/20 text-yellow-400",
  baja: "bg-green-500/20 text-green-400",
}[p] ?? "bg-gray-500/20 text-gray-400")

const getEtapaColor = (e: string) => ({
  lead: "bg-slate-500/20 text-slate-400",
  calificado: "bg-blue-500/20 text-blue-400",
  propuesta: "bg-purple-500/20 text-purple-400",
  negociacion: "bg-yellow-500/20 text-yellow-400",
  cerrado_ganado: "bg-green-500/20 text-green-400",
  cerrado_perdido: "bg-red-500/20 text-red-400",
}[e] ?? "bg-gray-500/20 text-gray-400")

export default function CRMDashboard() {
  const { clientes, loading: loadingC, error: errorC } = useCrmClientes()
  const { oportunidades, loading: loadingO } = useCrmOportunidades()
  const { tareas, loading: loadingT } = useCrmTareas()
  const { interacciones, loading: loadingI } = useCrmInteracciones()

  const loading = loadingC || loadingO || loadingT || loadingI
  const error = errorC

  const stats = useMemo(() => {
    const totalClientes = clientes.length
    const activos = clientes.filter(c => c.tipoCliente === "activo").length
    const prospectos = clientes.filter(c => c.tipoCliente === "prospecto").length
    const inactivos = clientes.filter(c => c.tipoCliente === "inactivo").length
    const perdidos = clientes.filter(c => c.tipoCliente === "perdido").length

    const oppsActivas = oportunidades.filter(o => !["cerrado_ganado", "cerrado_perdido"].includes(o.etapa))
    const oppsGanadas = oportunidades.filter(o => o.etapa === "cerrado_ganado")
    const montoTotal = oppsActivas.reduce((s, o) => s + Number(o.montoEstimado ?? 0), 0)
    const montoGanado = oppsGanadas.reduce((s, o) => s + Number(o.montoEstimado ?? 0), 0)

    const now = new Date()
    const tareasPendientes = tareas.filter(t => t.estado === "pendiente").length
    const tareasCompletadas = tareas.filter(t => t.estado === "completada").length
    const tareasVencidas = tareas.filter(t => t.estado !== "completada" && t.fechaVencimiento && new Date(t.fechaVencimiento) < now).length

    return {
      totalClientes, activos, prospectos, inactivos, perdidos,
      oppsActivas: oppsActivas.length,
      montoTotal, montoGanado,
      tareasPendientes, tareasCompletadas, tareasVencidas,
      totalTareas: tareas.length,
    }
  }, [clientes, oportunidades, tareas])

  const clientesPorEstadoData = [
    { name: "Prospectos", value: stats.prospectos, color: "#3b82f6" },
    { name: "Activos", value: stats.activos, color: "#10b981" },
    { name: "Inactivos", value: stats.inactivos, color: "#f59e0b" },
    { name: "Perdidos", value: stats.perdidos, color: "#ef4444" },
  ]

  const pipelineData = [
    { name: "Lead", value: oportunidades.filter(o => o.etapa === "lead").length, fill: "#94a3b8" },
    { name: "Calificado", value: oportunidades.filter(o => o.etapa === "calificado").length, fill: "#3b82f6" },
    { name: "Propuesta", value: oportunidades.filter(o => o.etapa === "propuesta").length, fill: "#8b5cf6" },
    { name: "Negociación", value: oportunidades.filter(o => o.etapa === "negociacion").length, fill: "#f59e0b" },
    { name: "Ganado", value: oportunidades.filter(o => o.etapa === "cerrado_ganado").length, fill: "#10b981" },
  ]

  const interaccionesPorTipo = [
    { tipo: "Llamadas", cantidad: interacciones.filter(i => i.tipoInteraccion === "llamada").length },
    { tipo: "Emails", cantidad: interacciones.filter(i => i.tipoInteraccion === "email").length },
    { tipo: "Reuniones", cantidad: interacciones.filter(i => i.tipoInteraccion === "reunion").length },
    { tipo: "Visitas", cantidad: interacciones.filter(i => i.tipoInteraccion === "visita").length },
  ]

  const now = new Date()
  const tareasProximas = [...tareas]
    .filter(t => t.estado === "pendiente" || t.estado === "en_curso")
    .sort((a, b) => new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime())
    .slice(0, 5)

  const oportunidadesActivas = [...oportunidades]
    .filter(o => !["cerrado_ganado", "cerrado_perdido"].includes(o.etapa))
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
          {loading && <RefreshCw className="h-4 w-4 animate-spin self-center text-muted-foreground" />}
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
              {oportunidades.filter(o => o.etapa === "negociacion").length} en negociación
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
              {oportunidades.filter(o => o.etapa === "cerrado_ganado").length} negocios cerrados
            </p>
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
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <FunnelChart>
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
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
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={clientesPorEstadoData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {clientesPorEstadoData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
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
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={interaccionesPorTipo}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="tipo" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
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
                <Progress value={stats.totalTareas ? (stats.tareasPendientes / stats.totalTareas) * 100 : 0} className="w-20" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Completadas</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">{stats.tareasCompletadas}</span>
                <Progress value={stats.totalTareas ? (stats.tareasCompletadas / stats.totalTareas) * 100 : 0} className="w-20" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span>Vencidas</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">{stats.tareasVencidas}</span>
                <Progress value={stats.totalTareas ? (stats.tareasVencidas / stats.totalTareas) * 100 : 0} className="w-20" />
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
                const cliente = clientes.find(c => c.id === tarea.clienteId)
                const dias = Math.ceil((new Date(tarea.fechaVencimiento).getTime() - now.getTime()) / 86400000)
                return (
                  <div key={tarea.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="space-y-1">
                      <p className="font-medium">{tarea.titulo}</p>
                      {cliente && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Building2 className="h-3 w-3" />{cliente.nombre}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getPrioridadColor(tarea.prioridad)}>{tarea.prioridad}</Badge>
                      <Badge variant={dias <= 2 ? "destructive" : "secondary"}>{dias <= 0 ? "Hoy" : `${dias}d`}</Badge>
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
                const cliente = clientes.find(c => c.id === opp.clienteId)
                return (
                  <Link key={opp.id} href={`/crm/oportunidades/${opp.id}`}>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                      <div className="space-y-1">
                        <p className="font-medium">{opp.titulo}</p>
                        {cliente && <p className="text-sm text-muted-foreground">{cliente.nombre}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getEtapaColor(opp.etapa)}>{opp.etapa.replace("_", " ")}</Badge>
                        <span className="font-bold text-sm">{formatCurrency(Number(opp.montoEstimado ?? 0))}</span>
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

      {/* Quick Actions */}
      <Card>
        <CardHeader><CardTitle>Acciones Rápidas</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/crm/clientes"><Users className="mr-2 h-4 w-4" />Ver Clientes</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/crm/interacciones?action=new"><Phone className="mr-2 h-4 w-4" />Registrar Llamada</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/crm/tareas?action=new"><Calendar className="mr-2 h-4 w-4" />Crear Tarea</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/crm/reportes"><TrendingUp className="mr-2 h-4 w-4" />Ver Reportes</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

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

export default function CRMDashboard() {
  const stats = getDashboardStats()

  const clientesPorEstadoData = [
    { name: "Prospectos", value: stats.clientesPorEstado.prospecto, color: "#3b82f6" },
    { name: "Activos", value: stats.clientesPorEstado.activo, color: "#10b981" },
    { name: "Inactivos", value: stats.clientesPorEstado.inactivo, color: "#f59e0b" },
    { name: "Perdidos", value: stats.clientesPorEstado.perdido, color: "#ef4444" },
  ]

  const pipelineData = [
    { name: "Lead", value: stats.oportunidadesPorEtapa.lead, fill: "#94a3b8" },
    { name: "Calificado", value: stats.oportunidadesPorEtapa.calificado, fill: "#3b82f6" },
    { name: "Propuesta", value: stats.oportunidadesPorEtapa.propuesta, fill: "#8b5cf6" },
    { name: "Negociación", value: stats.oportunidadesPorEtapa.negociacion, fill: "#f59e0b" },
    { name: "Ganado", value: stats.oportunidadesPorEtapa.cerrado_ganado, fill: "#10b981" },
  ]

  const interaccionesPorTipo = [
    { tipo: "Llamadas", cantidad: crmInteractions.filter(i => i.tipoInteraccion === "llamada").length },
    { tipo: "Emails", cantidad: crmInteractions.filter(i => i.tipoInteraccion === "email").length },
    { tipo: "Reuniones", cantidad: crmInteractions.filter(i => i.tipoInteraccion === "reunion").length },
    { tipo: "Visitas", cantidad: crmInteractions.filter(i => i.tipoInteraccion === "visita").length },
  ]

  const tareasProximas = crmTasks
    .filter(t => t.estado === "pendiente" || t.estado === "en_curso")
    .sort((a, b) => a.fechaVencimiento.getTime() - b.fechaVencimiento.getTime())
    .slice(0, 5)

  const oportunidadesActivas = crmOpportunities
    .filter(o => !["cerrado_ganado", "cerrado_perdido"].includes(o.etapa))
    .sort((a, b) => b.montoEstimado - a.montoEstimado)
    .slice(0, 5)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(value)
  }

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case "alta": return "bg-red-500/20 text-red-400"
      case "media": return "bg-yellow-500/20 text-yellow-400"
      case "baja": return "bg-green-500/20 text-green-400"
      default: return "bg-gray-500/20 text-gray-400"
    }
  }

  const getEtapaColor = (etapa: string) => {
    switch (etapa) {
      case "lead": return "bg-slate-500/20 text-slate-400"
      case "calificado": return "bg-blue-500/20 text-blue-400"
      case "propuesta": return "bg-purple-500/20 text-purple-400"
      case "negociacion": return "bg-yellow-500/20 text-yellow-400"
      case "cerrado_ganado": return "bg-green-500/20 text-green-400"
      case "cerrado_perdido": return "bg-red-500/20 text-red-400"
      default: return "bg-gray-500/20 text-gray-400"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-balance">ZULU CRM</h1>
          <p className="text-muted-foreground">Vista general de tu pipeline comercial</p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/crm/clientes?action=new">Nuevo Cliente</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/crm/oportunidades?action=new">Nueva Oportunidad</Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClientes}</div>
            <p className="text-xs text-muted-foreground">
              {stats.clientesPorEstado.activo} activos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Oportunidades Activas</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalOportunidades - stats.oportunidadesPorEtapa.cerrado_ganado - stats.oportunidadesPorEtapa.cerrado_perdido}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.oportunidadesPorEtapa.negociacion} en negociacion
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.montoTotalPipeline)}</div>
            <p className="text-xs text-muted-foreground">
              En oportunidades activas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ganado Este Periodo</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.montoGanado)}</div>
            <p className="text-xs text-muted-foreground">
              {stats.oportunidadesPorEtapa.cerrado_ganado} negocios cerrados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Pipeline Funnel */}
        <Card>
          <CardHeader>
            <CardTitle>Pipeline de Ventas</CardTitle>
            <CardDescription>Oportunidades por etapa</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <FunnelChart>
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                  />
                  <Funnel dataKey="value" data={pipelineData} isAnimationActive>
                    <LabelList position="center" fill="#fff" stroke="none" dataKey="name" />
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Clientes por Estado */}
        <Card>
          <CardHeader>
            <CardTitle>Clientes por Estado</CardTitle>
            <CardDescription>Distribucion de la cartera</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
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
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activities and Tasks Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Interacciones por Tipo */}
        <Card>
          <CardHeader>
            <CardTitle>Actividad Comercial</CardTitle>
            <CardDescription>Interacciones por tipo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={interaccionesPorTipo}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="tipo" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                  />
                  <Bar dataKey="cantidad" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Tasks Summary */}
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
                <Progress value={(stats.tareasPendientes / crmTasks.length) * 100} className="w-20" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Completadas</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">{stats.tareasCompletadas}</span>
                <Progress value={(stats.tareasCompletadas / crmTasks.length) * 100} className="w-20" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span>Vencidas</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">{stats.tareasVencidas}</span>
                <Progress value={(stats.tareasVencidas / crmTasks.length) * 100} className="w-20" />
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
        {/* Tareas Proximas */}
        <Card>
          <CardHeader>
            <CardTitle>Tareas Proximas</CardTitle>
            <CardDescription>Tareas a vencer en los proximos dias</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tareasProximas.map((tarea) => {
                const cliente = tarea.clienteId ? getClientById(tarea.clienteId) : null
                const diasRestantes = Math.ceil(
                  (tarea.fechaVencimiento.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                )
                return (
                  <div key={tarea.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
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
                      <Badge variant={diasRestantes <= 2 ? "destructive" : "secondary"}>
                        {diasRestantes <= 0 ? "Hoy" : `${diasRestantes}d`}
                      </Badge>
                    </div>
                  </div>
                )
              })}
              {tareasProximas.length === 0 && (
                <p className="text-center text-muted-foreground py-4">No hay tareas proximas</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Oportunidades Top */}
        <Card>
          <CardHeader>
            <CardTitle>Top Oportunidades</CardTitle>
            <CardDescription>Por monto estimado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {oportunidadesActivas.map((opp) => {
                const cliente = getClientById(opp.clienteId)
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
                          {formatCurrency(opp.montoEstimado)}
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

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Rapidas</CardTitle>
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
