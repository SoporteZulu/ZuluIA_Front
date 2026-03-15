"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"
import {
  Ticket,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Users,
  TrendingUp,
  BarChart3,
  Plus,
  ArrowRight,
  Timer,
  Target,
  Headset,
} from "lucide-react"
import { useMemo } from "react"
import { useHdTickets, useHdAgentes, useHdClientes, useHdOrdenesServicio } from "@/lib/hooks/useHelpdesk"

const prioridadColors = {
  critica: "bg-red-500/10 text-red-500 border-red-500/20",
  alta: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  media: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  baja: "bg-green-500/10 text-green-500 border-green-500/20",
}

const estadoColors = {
  nuevo: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  asignado: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  en_progreso: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  esperando_cliente: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  resuelto: "bg-green-500/10 text-green-500 border-green-500/20",
  cerrado: "bg-gray-500/10 text-gray-500 border-gray-500/20",
}

const estadoLabels: Record<string, string> = {
  nuevo: "Nuevo",
  asignado: "Asignado",
  en_progreso: "En Progreso",
  esperando_cliente: "Esperando Cliente",
  resuelto: "Resuelto",
  cerrado: "Cerrado",
}

export default function HelpDeskDashboard() {
  const { tickets } = useHdTickets()
  const { agentes } = useHdAgentes()
  const { clientes } = useHdClientes()
  const { ordenes } = useHdOrdenesServicio()

  const getClienteById = (id: string) => clientes.find((c) => c.id === id)
  const getAgenteById = (id: string) => agentes.find((a) => a.id === id)

  const ticketStats = useMemo(() => {
    const total = tickets.length
    const resueltos = tickets.filter((t) => t.estado === "resuelto").length
    const nuevos = tickets.filter((t) => t.estado === "nuevo").length
    const esperandoCliente = tickets.filter((t) => t.estado === "esperando_cliente").length
    const cumpleSLA = total > 0 ? ((tickets.filter((t) => t.cumpleSLA).length / total) * 100).toFixed(1) : "0"
    return { total, resueltos, nuevos, esperandoCliente, tasaCumplimientoSLA: cumpleSLA }
  }, [tickets])

  const ordenStats = useMemo(() => {
    const enProceso = ordenes.filter((o) => o.estado === "en_proceso").length
    const pendientes = ordenes.filter((o) => o.estado === "programada" || o.estado === "pendiente").length
    return { enProceso, pendientes }
  }, [ordenes])

  // Tickets recientes (ultimos 5)
  const ticketsRecientes = [...tickets]
    .sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime())
    .slice(0, 5)

  // Tickets pendientes por prioridad
  const ticketsPendientes = tickets.filter(
    (t) => t.estado !== "resuelto" && t.estado !== "cerrado"
  )
  const ticketsCriticos = ticketsPendientes.filter((t) => t.prioridad === "critica").length
  const ticketsAlta = ticketsPendientes.filter((t) => t.prioridad === "alta").length

  // Rendimiento de agentes
  const topAgentes = [...agentes]
    .sort((a, b) => b.ticketsResueltos - a.ticketsResueltos)
    .slice(0, 4)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Help Desk</h1>
          <p className="text-muted-foreground">
            Panel de control del modulo de Servicio al Cliente
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/helpdesk/tickets?action=new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Ticket
            </Button>
          </Link>
        </div>
      </div>

      {/* KPIs Principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tickets Abiertos</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ticketStats.total - ticketStats.resueltos}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="text-red-500">{ticketsCriticos} criticos</span>
              <span>|</span>
              <span className="text-orange-500">{ticketsAlta} alta prioridad</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tiempo Prom. Respuesta</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45 min</div>
            <p className="text-xs text-green-500">Dentro del SLA</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Cumplimiento SLA</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ticketStats.tasaCumplimientoSLA}%</div>
            <Progress value={Number(ticketStats.tasaCumplimientoSLA)} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ordenes en Proceso</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ordenStats.enProceso}</div>
            <p className="text-xs text-muted-foreground">
              {ordenStats.pendientes} programadas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Segunda fila de metricas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tickets Nuevos Hoy</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ticketStats.nuevos}</div>
            <p className="text-xs text-muted-foreground">Pendientes de asignar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Esperando Cliente</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ticketStats.esperandoCliente}</div>
            <p className="text-xs text-muted-foreground">Requieren respuesta</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Resueltos Hoy</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ticketStats.resueltos}</div>
            <p className="text-xs text-green-500">+15% vs ayer</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Agentes Activos</CardTitle>
            <Headset className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {agentes.filter((a) => a.estado === "activo").length}
            </div>
            <p className="text-xs text-muted-foreground">de {agentes.length} totales</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Tickets Recientes */}
        <Card className="col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Tickets Recientes</CardTitle>
              <CardDescription>Ultimos tickets creados</CardDescription>
            </div>
            <Link href="/helpdesk/tickets">
              <Button variant="ghost" size="sm">
                Ver todos
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {ticketsRecientes.map((ticket) => {
                const cliente = getClienteById(ticket.clienteId)
                const agente = ticket.asignadoAId ? getAgenteById(ticket.asignadoAId) : null
                return (
                  <div
                    key={ticket.id}
                    className="flex items-start justify-between gap-4 rounded-lg border p-3"
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">
                          {ticket.numero}
                        </span>
                        <Badge
                          variant="outline"
                          className={prioridadColors[ticket.prioridad]}
                        >
                          {ticket.prioridad}
                        </Badge>
                      </div>
                      <p className="font-medium truncate">{ticket.asunto}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{cliente?.nombre}</span>
                        {agente && (
                          <>
                            <span>|</span>
                            <span>Asignado: {agente.nombre}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className={estadoColors[ticket.estado]}>
                      {estadoLabels[ticket.estado]}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Rendimiento de Agentes */}
        <Card className="col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Rendimiento de Agentes</CardTitle>
              <CardDescription>Top agentes por tickets resueltos</CardDescription>
            </div>
            <Link href="/helpdesk/agentes">
              <Button variant="ghost" size="sm">
                Ver todos
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topAgentes.map((agente, index) => (
                <div key={agente.id} className="flex items-center gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {agente.nombre} {agente.apellido}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{agente.ticketsResueltos} resueltos</span>
                      <span>Prom: {agente.tiempoPromedioResolucion} min</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div
                          key={i}
                          className={`h-2 w-2 rounded-full ${
                            i < Math.floor(agente.calificacionPromedio)
                              ? "bg-yellow-500"
                              : "bg-muted"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {agente.calificacionPromedio.toFixed(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Accesos Rapidos */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          {
            title: "Tickets",
            description: "Gestionar tickets de soporte",
            href: "/helpdesk/tickets",
            icon: Ticket,
            color: "text-blue-500",
          },
          {
            title: "Ordenes de Servicio",
            description: "Administrar ordenes",
            href: "/helpdesk/ordenes",
            icon: Clock,
            color: "text-green-500",
          },
          {
            title: "Clientes",
            description: "Gestion de clientes",
            href: "/helpdesk/clientes",
            icon: Users,
            color: "text-purple-500",
          },
          {
            title: "Reportes",
            description: "Metricas y KPIs",
            href: "/helpdesk/reportes",
            icon: BarChart3,
            color: "text-orange-500",
          },
        ].map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="cursor-pointer transition-colors hover:bg-muted/50">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className={`rounded-lg bg-muted p-2 ${item.color}`}>
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base">{item.title}</CardTitle>
                  <CardDescription className="text-xs">{item.description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
