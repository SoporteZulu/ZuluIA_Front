"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Ticket, Clock, CheckCircle, AlertTriangle, TrendingUp, Users, DollarSign, Timer } from "lucide-react"
import { useMemo } from "react"
import { useHdTickets, useHdAgentes, useHdClientes, useHdOrdenesServicio, useHdFacturacion } from "@/lib/hooks/useHelpdesk"

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "USD" }).format(value)
}

export default function ReportesHDPage() {
  const { tickets: hdTickets } = useHdTickets()
  const { agentes: hdAgentes } = useHdAgentes()
  const { clientes: hdClientes } = useHdClientes()
  const { ordenes: hdOrdenesServicio } = useHdOrdenesServicio()
  const { facturas: hdFacturas } = useHdFacturacion()

  const ticketsPorEstado = useMemo(() => [
    { estado: "Nuevos", cantidad: hdTickets.filter(t => t.estado === "nuevo").length, fill: "hsl(var(--chart-1))" },
    { estado: "Asignados", cantidad: hdTickets.filter(t => t.estado === "asignado").length, fill: "hsl(var(--chart-2))" },
    { estado: "En Progreso", cantidad: hdTickets.filter(t => t.estado === "en_progreso").length, fill: "hsl(var(--chart-3))" },
    { estado: "Esperando", cantidad: hdTickets.filter(t => t.estado === "esperando_cliente").length, fill: "hsl(var(--chart-4))" },
    { estado: "Resueltos", cantidad: hdTickets.filter(t => t.estado === "resuelto").length, fill: "hsl(var(--chart-5))" },
    { estado: "Cerrados", cantidad: hdTickets.filter(t => t.estado === "cerrado").length, fill: "hsl(220 70% 50%)" },
  ], [hdTickets])

  const ticketsPorPrioridad = useMemo(() => [
    { prioridad: "Critica", cantidad: hdTickets.filter(t => t.prioridad === "critica").length, fill: "#ef4444" },
    { prioridad: "Alta", cantidad: hdTickets.filter(t => t.prioridad === "alta").length, fill: "#f97316" },
    { prioridad: "Media", cantidad: hdTickets.filter(t => t.prioridad === "media").length, fill: "#eab308" },
    { prioridad: "Baja", cantidad: hdTickets.filter(t => t.prioridad === "baja").length, fill: "#22c55e" },
  ], [hdTickets])

  const ticketsPorCategoria = useMemo(() => [
    { categoria: "Soporte Tecnico", cantidad: hdTickets.filter(t => t.categoria === "soporte_tecnico").length },
    { categoria: "Consulta", cantidad: hdTickets.filter(t => t.categoria === "consulta").length },
    { categoria: "Reclamo", cantidad: hdTickets.filter(t => t.categoria === "reclamo").length },
    { categoria: "Solicitud", cantidad: hdTickets.filter(t => t.categoria === "solicitud_servicio").length },
    { categoria: "Sugerencia", cantidad: hdTickets.filter(t => t.categoria === "sugerencia").length },
  ], [hdTickets])

  const ticketsPorCanal = useMemo(() => [
    { canal: "Email", cantidad: hdTickets.filter(t => t.canal === "email").length },
    { canal: "Telefono", cantidad: hdTickets.filter(t => t.canal === "telefono").length },
    { canal: "Chat", cantidad: hdTickets.filter(t => t.canal === "chat").length },
    { canal: "Web", cantidad: hdTickets.filter(t => t.canal === "web").length },
    { canal: "Presencial", cantidad: hdTickets.filter(t => t.canal === "presencial").length },
  ], [hdTickets])

  const totalTickets = hdTickets.length
  const ticketsAbiertos = hdTickets.filter(t => !["resuelto", "cerrado"].includes(t.estado)).length
  const ticketsResueltos = hdTickets.filter(t => ["resuelto", "cerrado"].includes(t.estado)).length
  const ticketsCumplenSLA = hdTickets.filter(t => t.cumpleSLA).length
  const porcentajeSLA = totalTickets > 0 ? Math.round((ticketsCumplenSLA / totalTickets) * 100) : 0

  const tiempoPromedioRespuesta = hdTickets.filter(t => t.tiempoRespuesta).length > 0
    ? Math.round(hdTickets.filter(t => t.tiempoRespuesta).reduce((sum, t) => sum + (t.tiempoRespuesta || 0), 0) / hdTickets.filter(t => t.tiempoRespuesta).length)
    : 0

  const tiempoPromedioResolucion = hdTickets.filter(t => t.tiempoResolucion).length > 0
    ? Math.round(hdTickets.filter(t => t.tiempoResolucion).reduce((sum, t) => sum + (t.tiempoResolucion || 0), 0) / hdTickets.filter(t => t.tiempoResolucion).length)
    : 0

  const ordenesCompletadas = hdOrdenesServicio.filter(o => o.estado === "completada").length
  const totalOrdenes = hdOrdenesServicio.length
  const tasaCompletacion = totalOrdenes > 0 ? Math.round((ordenesCompletadas / totalOrdenes) * 100) : 0

  const totalFacturado = hdFacturas.reduce((sum, f) => sum + f.total, 0)
  const totalCobrado = hdFacturas.filter(f => f.estado === "pagada").reduce((sum, f) => sum + f.total, 0)
  const tasaCobranza = totalFacturado > 0 ? Math.round((totalCobrado / totalFacturado) * 100) : 0

  const agentesPerformance = useMemo(() =>
    hdAgentes.map(agente => ({
      nombre: `${agente.nombre} ${agente.apellido}`,
      ticketsResueltos: agente.ticketsResueltos,
      tiempoPromedio: agente.tiempoPromedioResolucion,
      calificacion: agente.calificacionPromedio,
    })).sort((a, b) => b.ticketsResueltos - a.ticketsResueltos)
  , [hdAgentes])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reportes Help Desk</h1>
        <p className="text-muted-foreground">Metricas y analisis del desempeno del servicio de soporte</p>
      </div>

      {/* KPIs Principales */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tickets Abiertos</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ticketsAbiertos}</div>
            <p className="text-xs text-muted-foreground">de {totalTickets} totales</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cumplimiento SLA</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{porcentajeSLA}%</div>
            <Progress value={porcentajeSLA} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tiempo Promedio Respuesta</CardTitle>
            <Timer className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMinutes(tiempoPromedioRespuesta)}</div>
            <p className="text-xs text-muted-foreground">Primera respuesta</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tiempo Promedio Resolucion</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMinutes(tiempoPromedioResolucion)}</div>
            <p className="text-xs text-muted-foreground">Hasta cierre</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tickets" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
          <TabsTrigger value="agentes">Agentes</TabsTrigger>
          <TabsTrigger value="servicios">Servicios</TabsTrigger>
          <TabsTrigger value="financiero">Financiero</TabsTrigger>
        </TabsList>

        <TabsContent value="tickets" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Tickets por Estado</CardTitle>
                <CardDescription>Distribucion actual de tickets</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{}} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ticketsPorEstado}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="estado" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip />
                      <Bar dataKey="cantidad" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tickets por Prioridad</CardTitle>
                <CardDescription>Distribucion por nivel de urgencia</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{}} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={ticketsPorPrioridad}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="cantidad"
                        label={({ prioridad, cantidad }) => `${prioridad}: ${cantidad}`}
                      >
                        {ticketsPorPrioridad.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tickets por Categoria</CardTitle>
                <CardDescription>Tipos de solicitudes recibidas</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{}} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ticketsPorCategoria} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" className="text-xs" />
                      <YAxis dataKey="categoria" type="category" className="text-xs" width={100} />
                      <Tooltip />
                      <Bar dataKey="cantidad" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tickets por Canal</CardTitle>
                <CardDescription>Canales de ingreso de tickets</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{}} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ticketsPorCanal}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="canal" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip />
                      <Bar dataKey="cantidad" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="agentes" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Agentes</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{hdAgentes.length}</div>
                <p className="text-xs text-muted-foreground">
                  {hdAgentes.filter(a => a.estado === "activo").length} activos
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tickets Promedio/Agente</CardTitle>
                <Ticket className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {hdAgentes.length > 0 ? Math.round(ticketsAbiertos / hdAgentes.filter(a => a.estado === "activo").length) : 0}
                </div>
                <p className="text-xs text-muted-foreground">tickets abiertos</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Calificacion Promedio</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {hdAgentes.length > 0 
                    ? (hdAgentes.reduce((sum, a) => sum + a.calificacionPromedio, 0) / hdAgentes.length).toFixed(1) 
                    : 0}
                </div>
                <p className="text-xs text-muted-foreground">de 5.0</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Performance de Agentes</CardTitle>
              <CardDescription>Metricas individuales de cada agente</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {agentesPerformance.slice(0, 5).map((agente, index) => (
                  <div key={index} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{agente.nombre}</div>
                        <div className="text-sm text-muted-foreground">
                          Tiempo prom: {formatMinutes(agente.tiempoPromedio)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="font-medium">{agente.ticketsResueltos}</div>
                        <div className="text-xs text-muted-foreground">resueltos</div>
                      </div>
                      <Badge variant={agente.calificacion >= 4.5 ? "default" : agente.calificacion >= 4 ? "secondary" : "outline"}>
                        {agente.calificacion.toFixed(1)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="servicios" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ordenes Totales</CardTitle>
                <Ticket className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalOrdenes}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completadas</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{ordenesCompletadas}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">En Proceso</CardTitle>
                <Clock className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {hdOrdenesServicio.filter(o => o.estado === "en_proceso").length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tasa Completacion</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{tasaCompletacion}%</div>
                <Progress value={tasaCompletacion} className="mt-2" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="financiero" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Facturado</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalFacturado)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Cobrado</CardTitle>
                <DollarSign className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalCobrado)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pendiente de Cobro</CardTitle>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalFacturado - totalCobrado)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tasa Cobranza</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{tasaCobranza}%</div>
                <Progress value={tasaCobranza} className="mt-2" />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Resumen de Facturas</CardTitle>
              <CardDescription>Estado de facturacion por cliente</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {hdClientes.slice(0, 5).map((cliente) => {
                  const facturasCliente = hdFacturas.filter(f => f.clienteId === cliente.id)
                  const totalCliente = facturasCliente.reduce((sum, f) => sum + f.total, 0)
                  const cobradoCliente = facturasCliente.filter(f => f.estado === "pagada").reduce((sum, f) => sum + f.total, 0)
                  return (
                    <div key={cliente.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                      <div>
                        <div className="font-medium">{cliente.nombre}</div>
                        <div className="text-sm text-muted-foreground">
                          {facturasCliente.length} factura(s)
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(totalCliente)}</div>
                          <div className="text-xs text-muted-foreground">facturado</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-green-600">{formatCurrency(cobradoCliente)}</div>
                          <div className="text-xs text-muted-foreground">cobrado</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
