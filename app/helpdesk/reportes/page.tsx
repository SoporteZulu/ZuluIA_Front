"use client"

import { useMemo } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  DollarSign,
  FileWarning,
  ShieldAlert,
  Ticket,
  TimerReset,
  Users,
  Wrench,
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

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer } from "@/components/ui/chart"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  useHdAgentes,
  useHdClientes,
  useHdFacturacion,
  useHdOrdenesServicio,
  useHdSlas,
  useHdTickets,
} from "@/lib/hooks/useHelpdesk"

type CurrencyCode = "ARS" | "USD" | "EUR" | "MXN"
type CurrencyTotals = Record<CurrencyCode, number>

const ticketStateLabels = {
  nuevo: "Nuevo",
  asignado: "Asignado",
  en_progreso: "En progreso",
  esperando_cliente: "Esperando cliente",
  resuelto: "Resuelto",
  cerrado: "Cerrado",
} as const

const priorityLabels = {
  critica: "Critica",
  alta: "Alta",
  media: "Media",
  baja: "Baja",
} as const

const orderStateLabels = {
  pendiente: "Pendiente",
  programada: "Programada",
  en_proceso: "En proceso",
  pausada: "Pausada",
  completada: "Completada",
  cancelada: "Cancelada",
} as const

const currencyCodes: CurrencyCode[] = ["ARS", "USD", "EUR", "MXN"]

function parseDate(value?: string | Date | null) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatDate(value?: string | Date | null) {
  const date = parseDate(value)
  if (!date) return "Sin fecha"
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

function formatMinutes(minutes?: number) {
  if (!minutes) return "Sin dato"
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`
}

function formatCurrency(value: number, currency: CurrencyCode) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

function sumByCurrency(items: { moneda: CurrencyCode; total: number }[]) {
  return items.reduce<CurrencyTotals>(
    (accumulator, item) => {
      accumulator[item.moneda] += item.total
      return accumulator
    },
    { ARS: 0, USD: 0, EUR: 0, MXN: 0 }
  )
}

function renderCurrencySummary(values: CurrencyTotals) {
  const entries = currencyCodes.filter((currency) => values[currency] > 0)
  if (!entries.length) return "Sin movimientos"
  return entries.map((currency) => formatCurrency(values[currency], currency)).join(" • ")
}

function daysUntil(value?: string | Date | null) {
  const date = parseDate(value)
  if (!date) return null
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

function getTicketStatusTone(state: keyof typeof ticketStateLabels) {
  if (state === "cerrado" || state === "resuelto") return "bg-emerald-500/10 text-emerald-700"
  if (state === "esperando_cliente") return "bg-amber-500/10 text-amber-700"
  if (state === "en_progreso" || state === "asignado") return "bg-sky-500/10 text-sky-700"
  return "bg-rose-500/10 text-rose-700"
}

function getPriorityTone(priority: keyof typeof priorityLabels) {
  if (priority === "critica") return "bg-rose-500/10 text-rose-700"
  if (priority === "alta") return "bg-orange-500/10 text-orange-700"
  if (priority === "media") return "bg-amber-500/10 text-amber-700"
  return "bg-emerald-500/10 text-emerald-700"
}

function getLegacyCoverage() {
  return "Cobertura visible: tickets, SLA, cartera, agentes, clientes y ordenes de servicio. Pendiente por contrato actual: costos por tecnico, agenda detallada, partes firmados y forecast de renovaciones."
}

function MetricCard({
  title,
  value,
  hint,
  icon: Icon,
}: {
  title: string
  value: string | number
  hint: string
  icon: typeof Ticket
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  )
}

export default function ReportesHDPage() {
  const { tickets: hdTickets } = useHdTickets()
  const { agentes: hdAgentes } = useHdAgentes()
  const { clientes: hdClientes } = useHdClientes()
  const { ordenes: hdOrdenesServicio } = useHdOrdenesServicio()
  const { facturas: hdFacturas } = useHdFacturacion()
  const { slas: hdSlas } = useHdSlas()

  const clientMap = useMemo(
    () => new Map(hdClientes.map((cliente) => [cliente.id, cliente])),
    [hdClientes]
  )
  const agentMap = useMemo(
    () => new Map(hdAgentes.map((agente) => [agente.id, agente])),
    [hdAgentes]
  )
  const slaMap = useMemo(() => new Map(hdSlas.map((sla) => [sla.id, sla])), [hdSlas])

  const openTickets = hdTickets.filter((ticket) => !["resuelto", "cerrado"].includes(ticket.estado))
  const closedTickets = hdTickets.filter((ticket) =>
    ["resuelto", "cerrado"].includes(ticket.estado)
  )
  const unassignedTickets = openTickets.filter((ticket) => !ticket.asignadoAId)
  const breachedTickets = hdTickets.filter((ticket) => !ticket.cumpleSLA)
  const ticketsWithoutSla = hdTickets.filter(
    (ticket) => !(ticket.slaId || clientMap.get(ticket.clienteId)?.slaId)
  )
  const waitingCustomerTickets = hdTickets.filter((ticket) => ticket.estado === "esperando_cliente")
  const criticalOpenTickets = openTickets.filter(
    (ticket) => ticket.prioridad === "critica" || ticket.prioridad === "alta"
  )
  const slaCompliance = hdTickets.length
    ? Math.round((hdTickets.filter((ticket) => ticket.cumpleSLA).length / hdTickets.length) * 100)
    : 0

  const averageResponse = hdTickets.filter((ticket) => ticket.tiempoRespuesta).length
    ? Math.round(
        hdTickets.reduce((sum, ticket) => sum + (ticket.tiempoRespuesta || 0), 0) /
          hdTickets.filter((ticket) => ticket.tiempoRespuesta).length
      )
    : 0

  const averageResolution = hdTickets.filter((ticket) => ticket.tiempoResolucion).length
    ? Math.round(
        hdTickets.reduce((sum, ticket) => sum + (ticket.tiempoResolucion || 0), 0) /
          hdTickets.filter((ticket) => ticket.tiempoResolucion).length
      )
    : 0

  const activeOrders = hdOrdenesServicio.filter(
    (order) => !["completada", "cancelada"].includes(order.estado)
  )
  const scheduledLateOrders = hdOrdenesServicio.filter((order) => {
    const targetDate = parseDate(order.fechaProgramada)
    if (!targetDate) return false
    return !["completada", "cancelada"].includes(order.estado) && targetDate < new Date()
  })
  const completedOrders = hdOrdenesServicio.filter((order) => order.estado === "completada")
  const completionRate = hdOrdenesServicio.length
    ? Math.round((completedOrders.length / hdOrdenesServicio.length) * 100)
    : 0

  const invoicesIssued = hdFacturas.filter((invoice) => invoice.estado !== "anulada")
  const paidInvoices = hdFacturas.filter((invoice) => invoice.estado === "pagada")
  const overdueInvoices = hdFacturas.filter(
    (invoice) =>
      invoice.estado === "vencida" ||
      (invoice.estado === "emitida" && (daysUntil(invoice.fechaVencimiento) ?? 0) < 0)
  )
  const pendingInvoices = hdFacturas.filter((invoice) =>
    ["emitida", "vencida"].includes(invoice.estado)
  )
  const issuedByCurrency = sumByCurrency(
    invoicesIssued.map((invoice) => ({ moneda: invoice.moneda, total: invoice.total }))
  )
  const paidByCurrency = sumByCurrency(
    paidInvoices.map((invoice) => ({ moneda: invoice.moneda, total: invoice.total }))
  )
  const pendingByCurrency = sumByCurrency(
    pendingInvoices.map((invoice) => ({ moneda: invoice.moneda, total: invoice.total }))
  )
  const collectionRate = invoicesIssued.length
    ? Math.round((paidInvoices.length / invoicesIssued.length) * 100)
    : 0

  const ticketsByState = useMemo(
    () =>
      Object.entries(ticketStateLabels).map(([state, label], index) => ({
        estado: label,
        cantidad: hdTickets.filter((ticket) => ticket.estado === state).length,
        fill: `hsl(var(--chart-${(index % 5) + 1}))`,
      })),
    [hdTickets]
  )

  const ticketsByPriority = useMemo(
    () =>
      Object.entries(priorityLabels).map(([priority, label]) => ({
        prioridad: label,
        cantidad: hdTickets.filter((ticket) => ticket.prioridad === priority).length,
        fill:
          priority === "critica"
            ? "#dc2626"
            : priority === "alta"
              ? "#ea580c"
              : priority === "media"
                ? "#d97706"
                : "#16a34a",
      })),
    [hdTickets]
  )

  const ordersByState = useMemo(
    () =>
      Object.entries(orderStateLabels).map(([state, label], index) => ({
        estado: label,
        cantidad: hdOrdenesServicio.filter((order) => order.estado === state).length,
        fill: `hsl(var(--chart-${(index % 5) + 1}))`,
      })),
    [hdOrdenesServicio]
  )

  const agentPerformance = useMemo(
    () =>
      hdAgentes
        .map((agent) => {
          const agentTickets = hdTickets.filter((ticket) => ticket.asignadoAId === agent.id)
          return {
            id: agent.id,
            nombre: `${agent.nombre} ${agent.apellido}`,
            estado: agent.estado,
            abiertos: agentTickets.filter(
              (ticket) => !["resuelto", "cerrado"].includes(ticket.estado)
            ).length,
            resueltos: agent.ticketsResueltos,
            incumplimientos: agentTickets.filter((ticket) => !ticket.cumpleSLA).length,
            promedio: agent.tiempoPromedioResolucion,
            calificacion: agent.calificacionPromedio,
          }
        })
        .sort((left, right) => right.abiertos - left.abiertos || right.resueltos - left.resueltos),
    [hdAgentes, hdTickets]
  )

  const criticalClients = useMemo(
    () =>
      hdClientes
        .map((client) => {
          const clientTickets = hdTickets.filter(
            (ticket) =>
              ticket.clienteId === client.id && !["resuelto", "cerrado"].includes(ticket.estado)
          )
          const clientInvoices = hdFacturas.filter(
            (invoice) =>
              invoice.clienteId === client.id && ["emitida", "vencida"].includes(invoice.estado)
          )
          const quota = client.limiteTicketsMes
            ? Math.round((client.ticketsUsadosMes / client.limiteTicketsMes) * 100)
            : null

          return {
            id: client.id,
            nombre: client.nombre,
            tipo: client.tipoCliente,
            contratoActivo: client.contratoActivo,
            ticketsAbiertos: clientTickets.length,
            ticketsCriticos: clientTickets.filter(
              (ticket) => ticket.prioridad === "critica" || ticket.prioridad === "alta"
            ).length,
            coberturaSla: client.slaId
              ? (slaMap.get(client.slaId)?.nombre ?? "SLA asignado")
              : "Sin SLA",
            cuota: quota,
            pendiente: renderCurrencySummary(
              sumByCurrency(
                clientInvoices.map((invoice) => ({ moneda: invoice.moneda, total: invoice.total }))
              )
            ),
          }
        })
        .filter((client) => client.ticketsAbiertos > 0 || client.pendiente !== "Sin movimientos")
        .sort(
          (left, right) =>
            right.ticketsCriticos - left.ticketsCriticos ||
            right.ticketsAbiertos - left.ticketsAbiertos
        )
        .slice(0, 6),
    [hdClientes, hdFacturas, hdTickets, slaMap]
  )

  const slaAlerts = useMemo(
    () =>
      hdTickets
        .map((ticket) => {
          const client = clientMap.get(ticket.clienteId)
          const rawPriority = ticket.prioridad
          const rawState = ticket.estado
          const sla = slaMap.get(ticket.slaId || client?.slaId || "")
          const responseTarget = sla?.tiempoRespuesta
          const resolutionTarget = sla?.tiempoResolucion

          return {
            id: ticket.id,
            numero: ticket.numero,
            asunto: ticket.asunto,
            cliente: client?.nombre ?? "Cliente sin referencia",
            prioridad: priorityLabels[rawPriority],
            prioridadKey: rawPriority,
            estado: ticketStateLabels[rawState],
            estadoKey: rawState,
            cumpleSla: ticket.cumpleSLA,
            cobertura: sla?.nombre ?? "Sin SLA",
            respuesta:
              responseTarget && ticket.tiempoRespuesta
                ? ticket.tiempoRespuesta - responseTarget
                : null,
            resolucion:
              resolutionTarget && ticket.tiempoResolucion
                ? ticket.tiempoResolucion - resolutionTarget
                : null,
          }
        })
        .filter(
          (ticket) =>
            !ticket.cumpleSla ||
            ticket.cobertura === "Sin SLA" ||
            (ticket.respuesta ?? 0) > 0 ||
            (ticket.resolucion ?? 0) > 0
        )
        .sort((left, right) => Number(left.cumpleSla) - Number(right.cumpleSla))
        .slice(0, 6),
    [clientMap, hdTickets, slaMap]
  )

  const orderFollowUp = useMemo(
    () =>
      hdOrdenesServicio
        .map((order) => ({
          id: order.id,
          numero: order.numero,
          estado: orderStateLabels[order.estado],
          cliente: clientMap.get(order.clienteId)?.nombre ?? "Cliente sin referencia",
          tecnico: order.tecnicoAsignadoId
            ? `${agentMap.get(order.tecnicoAsignadoId)?.nombre ?? "Tecnico"} ${agentMap.get(order.tecnicoAsignadoId)?.apellido ?? ""}`.trim()
            : "Sin tecnico",
          programada: formatDate(order.fechaProgramada),
          atraso: daysUntil(order.fechaProgramada),
          duracion: formatMinutes(order.duracionReal),
          prioridad: priorityLabels[order.prioridad],
          prioridadKey: order.prioridad,
        }))
        .filter((order) => !["Completada", "Cancelada"].includes(order.estado))
        .sort((left, right) => (left.atraso ?? 9999) - (right.atraso ?? 9999))
        .slice(0, 6),
    [agentMap, clientMap, hdOrdenesServicio]
  )

  const portfolioByClient = useMemo(
    () =>
      hdClientes
        .map((client) => {
          const clientInvoices = hdFacturas.filter(
            (invoice) =>
              invoice.clienteId === client.id && ["emitida", "vencida"].includes(invoice.estado)
          )
          return {
            id: client.id,
            nombre: client.nombre,
            tipo: client.tipoCliente,
            vencidas: clientInvoices.filter((invoice) => invoice.estado === "vencida").length,
            pendiente: renderCurrencySummary(
              sumByCurrency(
                clientInvoices.map((invoice) => ({ moneda: invoice.moneda, total: invoice.total }))
              )
            ),
            tickets: hdTickets.filter(
              (ticket) =>
                ticket.clienteId === client.id && !["resuelto", "cerrado"].includes(ticket.estado)
            ).length,
          }
        })
        .filter((client) => client.pendiente !== "Sin movimientos")
        .sort((left, right) => right.vencidas - left.vencidas || right.tickets - left.tickets)
        .slice(0, 6),
    [hdClientes, hdFacturas, hdTickets]
  )

  const activeAgents = hdAgentes.filter((agent) => agent.estado === "activo")
  const averageOpenPerAgent = activeAgents.length
    ? Math.round(openTickets.length / activeAgents.length)
    : 0
  const averageRating = hdAgentes.length
    ? (
        hdAgentes.reduce((sum, agent) => sum + agent.calificacionPromedio, 0) / hdAgentes.length
      ).toFixed(1)
    : "0.0"

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Reportes Help Desk</h1>
        <p className="text-muted-foreground">
          Consola operativa de tickets, SLA, ordenes de servicio y cartera usando solo contratos ya
          expuestos.
        </p>
        <p className="text-sm text-muted-foreground">{getLegacyCoverage()}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Tickets Abiertos"
          value={openTickets.length}
          hint={`${unassignedTickets.length} sin asignar • ${criticalOpenTickets.length} alta prioridad`}
          icon={Ticket}
        />
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cobertura SLA</CardTitle>
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{slaCompliance}%</div>
            <Progress value={slaCompliance} className="mt-2" />
            <p className="mt-2 text-xs text-muted-foreground">
              {breachedTickets.length} fuera de SLA • {ticketsWithoutSla.length} sin configuracion
            </p>
          </CardContent>
        </Card>
        <MetricCard
          title="Ordenes Activas"
          value={activeOrders.length}
          hint={`${scheduledLateOrders.length} vencidas • ${completionRate}% completadas`}
          icon={Wrench}
        />
        <MetricCard
          title="Cartera Pendiente"
          value={renderCurrencySummary(pendingByCurrency)}
          hint={`${overdueInvoices.length} facturas vencidas • ${collectionRate}% cobradas`}
          icon={DollarSign}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Respuesta Promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMinutes(averageResponse)}</div>
            <p className="text-xs text-muted-foreground">Primera respuesta registrada</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Resolucion Promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMinutes(averageResolution)}</div>
            <p className="text-xs text-muted-foreground">
              Tickets con cierre o resolucion informada
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Clientes en Espera</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{waitingCustomerTickets.length}</div>
            <p className="text-xs text-muted-foreground">
              Tickets frenados por respuesta del cliente
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tickets" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
          <TabsTrigger value="agentes">Agentes</TabsTrigger>
          <TabsTrigger value="servicios">Servicios</TabsTrigger>
          <TabsTrigger value="financiero">Financiero</TabsTrigger>
        </TabsList>

        <TabsContent value="tickets" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Backlog por Estado</CardTitle>
                <CardDescription>Vista actual del circuito de tickets</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{}} className="h-75">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ticketsByState}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="estado" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip />
                      <Bar dataKey="cantidad" radius={[4, 4, 0, 0]}>
                        {ticketsByState.map((entry) => (
                          <Cell key={entry.estado} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Presion por Prioridad</CardTitle>
                <CardDescription>Cuanto backlog queda en segmentos criticos</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{}} className="h-75">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={ticketsByPriority}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={100}
                        paddingAngle={4}
                        dataKey="cantidad"
                        label={({ prioridad, cantidad }) => `${prioridad}: ${cantidad}`}
                      >
                        {ticketsByPriority.map((entry) => (
                          <Cell key={entry.prioridad} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Clientes Criticos</CardTitle>
                <CardDescription>
                  Combina carga operativa, contrato y saldo pendiente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {criticalClients.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No hay clientes con desvio operativo visible.
                  </p>
                ) : (
                  criticalClients.map((client) => (
                    <div key={client.id} className="rounded-lg border p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{client.nombre}</span>
                            <Badge variant="outline">{client.tipo}</Badge>
                            <Badge variant={client.contratoActivo ? "secondary" : "outline"}>
                              {client.contratoActivo ? "Contrato activo" : "Sin contrato activo"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            SLA: {client.coberturaSla} • Pendiente: {client.pendiente}
                          </p>
                        </div>
                        <div className="text-sm text-muted-foreground md:text-right">
                          <div>{client.ticketsAbiertos} tickets abiertos</div>
                          <div>{client.ticketsCriticos} criticos/alta prioridad</div>
                        </div>
                      </div>
                      {client.cuota !== null ? (
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Uso del limite mensual</span>
                            <span>{client.cuota}%</span>
                          </div>
                          <Progress value={Math.min(client.cuota, 100)} />
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Alertas de SLA</CardTitle>
                <CardDescription>
                  Tickets sin cobertura o con desvio visible contra el acuerdo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {slaAlerts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No hay alertas abiertas con el dataset actual.
                  </p>
                ) : (
                  slaAlerts.map((ticket) => (
                    <div key={ticket.id} className="rounded-lg border p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">#{ticket.numero}</span>
                        <Badge className={getTicketStatusTone(ticket.estadoKey)}>
                          {ticket.estado}
                        </Badge>
                        <Badge className={getPriorityTone(ticket.prioridadKey)}>
                          {ticket.prioridad}
                        </Badge>
                        <Badge variant="outline">{ticket.cobertura}</Badge>
                      </div>
                      <p className="mt-2 text-sm">{ticket.asunto}</p>
                      <p className="text-sm text-muted-foreground">{ticket.cliente}</p>
                      <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
                        <span>
                          Respuesta:{" "}
                          {ticket.respuesta === null
                            ? "sin comparacion"
                            : `${ticket.respuesta > 0 ? "+" : ""}${ticket.respuesta} min`}
                        </span>
                        <span>
                          Resolucion:{" "}
                          {ticket.resolucion === null
                            ? "sin comparacion"
                            : `${ticket.resolucion > 0 ? "+" : ""}${ticket.resolucion} min`}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="agentes" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard
              title="Agentes Activos"
              value={activeAgents.length}
              hint={`${hdAgentes.length} agentes cargados en total`}
              icon={Users}
            />
            <MetricCard
              title="Backlog por Agente"
              value={averageOpenPerAgent}
              hint={`${openTickets.length} tickets abiertos en cartera`}
              icon={TimerReset}
            />
            <MetricCard
              title="Calificacion Promedio"
              value={averageRating}
              hint="Promedio declarado por agente sobre 5 puntos"
              icon={CheckCircle2}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Distribucion Operativa por Agente</CardTitle>
              <CardDescription>
                Backlog real, volumen resuelto e incumplimientos de SLA
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {agentPerformance.slice(0, 8).map((agent) => (
                <div key={agent.id} className="rounded-lg border p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{agent.nombre}</span>
                        <Badge variant={agent.estado === "activo" ? "secondary" : "outline"}>
                          {agent.estado}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Resolucion promedio: {formatMinutes(agent.promedio)} • Calificacion:{" "}
                        {agent.calificacion.toFixed(1)}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm md:text-right">
                      <div>
                        <div className="font-medium">{agent.abiertos}</div>
                        <div className="text-xs text-muted-foreground">abiertos</div>
                      </div>
                      <div>
                        <div className="font-medium">{agent.resueltos}</div>
                        <div className="text-xs text-muted-foreground">resueltos</div>
                      </div>
                      <div>
                        <div className="font-medium">{agent.incumplimientos}</div>
                        <div className="text-xs text-muted-foreground">fuera SLA</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="servicios" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard
              title="Ordenes Totales"
              value={hdOrdenesServicio.length}
              hint={`${activeOrders.length} activas`}
              icon={Wrench}
            />
            <MetricCard
              title="Programadas / Pausadas"
              value={
                hdOrdenesServicio.filter((order) =>
                  ["programada", "pausada"].includes(order.estado)
                ).length
              }
              hint={`${scheduledLateOrders.length} fuera de fecha`}
              icon={Clock3}
            />
            <MetricCard
              title="Completadas"
              value={completedOrders.length}
              hint={`${completionRate}% del total`}
              icon={CheckCircle2}
            />
            <MetricCard
              title="Sin Tecnico"
              value={activeOrders.filter((order) => !order.tecnicoAsignadoId).length}
              hint="Ordenes activas sin responsable asignado"
              icon={AlertTriangle}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <Card>
              <CardHeader>
                <CardTitle>Circuito de Ordenes</CardTitle>
                <CardDescription>Estado actual de la operacion de campo</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{}} className="h-75">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ordersByState}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="estado" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip />
                      <Bar dataKey="cantidad" radius={[4, 4, 0, 0]}>
                        {ordersByState.map((entry) => (
                          <Cell key={entry.estado} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Seguimiento Requerido</CardTitle>
                <CardDescription>
                  Ordenes activas con prioridad o fecha comprometida
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {orderFollowUp.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No hay ordenes activas para seguimiento inmediato.
                  </p>
                ) : (
                  orderFollowUp.map((order) => (
                    <div key={order.id} className="rounded-lg border p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">#{order.numero}</span>
                        <Badge variant="outline">{order.estado}</Badge>
                        <Badge className={getPriorityTone(order.prioridadKey)}>
                          {order.prioridad}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm">{order.cliente}</p>
                      <div className="mt-3 grid gap-2 text-xs text-muted-foreground">
                        <span>Tecnico: {order.tecnico}</span>
                        <span>Programada: {order.programada}</span>
                        <span>
                          Desvio:{" "}
                          {order.atraso === null
                            ? "sin fecha"
                            : order.atraso < 0
                              ? `${Math.abs(order.atraso)} dias vencida`
                              : `${order.atraso} dias para ejecutar`}
                        </span>
                        <span>Duracion real registrada: {order.duracion}</span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="financiero" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Facturacion Emitida"
              value={renderCurrencySummary(issuedByCurrency)}
              hint={`${invoicesIssued.length} comprobantes vigentes`}
              icon={DollarSign}
            />
            <MetricCard
              title="Cobrado"
              value={renderCurrencySummary(paidByCurrency)}
              hint={`${paidInvoices.length} facturas pagadas`}
              icon={CheckCircle2}
            />
            <MetricCard
              title="Pendiente"
              value={renderCurrencySummary(pendingByCurrency)}
              hint={`${pendingInvoices.length} facturas emitidas o vencidas`}
              icon={FileWarning}
            />
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tasa de Cobranza</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{collectionRate}%</div>
                <Progress value={collectionRate} className="mt-2" />
                <p className="mt-2 text-xs text-muted-foreground">
                  Basada en cantidad de facturas pagadas sobre emitidas
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Cartera con Seguimiento</CardTitle>
                <CardDescription>
                  Clientes con facturas pendientes y carga operativa simultanea
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {portfolioByClient.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay cartera pendiente visible.</p>
                ) : (
                  portfolioByClient.map((client) => (
                    <div key={client.id} className="rounded-lg border p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{client.nombre}</span>
                        <Badge variant="outline">{client.tipo}</Badge>
                        {client.vencidas > 0 ? (
                          <Badge className="bg-rose-500/10 text-rose-700">
                            {client.vencidas} vencidas
                          </Badge>
                        ) : null}
                      </div>
                      <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                        <span>Pendiente: {client.pendiente}</span>
                        <span>Tickets abiertos: {client.tickets}</span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Lectura Financiera</CardTitle>
                <CardDescription>
                  Relaciones visibles entre facturacion, cartera y clientes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    Riesgo de cobranza
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {overdueInvoices.length} facturas ya vencidas y {pendingInvoices.length} aun
                    abiertas. La lectura se separa por moneda para evitar mezclar importes
                    heterogeneos.
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Users className="h-4 w-4 text-sky-600" />
                    Cruce cliente-servicio
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Los paneles superiores priorizan clientes con backlog operativo y deuda
                    simultanea para recuperar la lectura de cartera que solia existir en los
                    tableros legacy.
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <ShieldAlert className="h-4 w-4 text-rose-600" />
                    Cobertura disponible
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{getLegacyCoverage()}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Lectura Ejecutiva</CardTitle>
          <CardDescription>
            Resumen de circuito para recuperar visibilidad del sistema anterior
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
          <div className="rounded-lg border p-4">
            <div className="font-medium text-foreground">Operacion</div>
            <p className="mt-2">
              {openTickets.length} tickets abiertos contra {activeAgents.length} agentes activos. La
              principal tension visible hoy esta en {unassignedTickets.length} tickets sin asignar y{" "}
              {scheduledLateOrders.length} ordenes fuera de fecha.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <div className="font-medium text-foreground">SLA</div>
            <p className="mt-2">
              {slaCompliance}% de cumplimiento general, con {breachedTickets.length} casos fuera de
              acuerdo y {ticketsWithoutSla.length} tickets sin cobertura identificable por ticket o
              cliente.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <div className="font-medium text-foreground">Finanzas</div>
            <p className="mt-2">
              Emitido: {renderCurrencySummary(issuedByCurrency)}. Pendiente:{" "}
              {renderCurrencySummary(pendingByCurrency)}. La prioridad se concentra en{" "}
              {overdueInvoices.length} comprobantes vencidos y clientes con incidentes aun abiertos.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground">
        Tickets cerrados: {closedTickets.length} • Clientes monitoreados: {hdClientes.length} • SLAs
        cargados: {hdSlas.length}
      </div>
    </div>
  )
}
