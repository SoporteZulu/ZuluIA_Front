"use client"

import { Suspense, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  CalendarClock,
  ClipboardList,
  Eye,
  MapPin,
  MoreHorizontal,
  Package,
  PenSquare,
  Plus,
  Search,
  ShieldAlert,
  Signature,
  Star,
  Trash2,
  UserRound,
  Wrench,
  X,
} from "lucide-react"

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
  useHdAgentes,
  useHdClientes,
  useHdOrdenesServicio,
  useHdServicios,
  useHdSlas,
  useHdTickets,
} from "@/lib/hooks/useHelpdesk"
import type { HDOrdenServicio } from "@/lib/types"

const priorityLabels = {
  alta: "Alta",
  media: "Media",
  baja: "Baja",
} as const

const statusLabels = {
  pendiente: "Pendiente",
  programada: "Programada",
  en_proceso: "En proceso",
  pausada: "Pausada",
  completada: "Completada",
  cancelada: "Cancelada",
} as const

type FormState = {
  ticketId: string
  clienteId: string
  servicioId: string
  tecnicoAsignadoId: string
  estado: HDOrdenServicio["estado"]
  prioridad: HDOrdenServicio["prioridad"]
  fechaProgramada: string
  duracionReal: string
  direccionServicio: string
  descripcionTrabajo: string
  observaciones: string
  firmaCliente: string
  calificacion: string
  comentarioCliente: string
}

function parseDate(value?: string | Date | null) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatDateTime(value?: string | Date | null) {
  const date = parseDate(value)
  if (!date) return "Sin fecha"
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function formatMinutes(value?: number | null) {
  if (!value) return "Sin dato"
  if (value < 60) return `${value} min`
  const hours = Math.floor(value / 60)
  const minutes = value % 60
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`
}

function formatCurrency(value?: number | null) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value ?? 0)
}

function buildFormState(order?: HDOrdenServicio | null): FormState {
  return {
    ticketId: order?.ticketId ?? "",
    clienteId: order?.clienteId ?? "",
    servicioId: order?.servicioId ?? "",
    tecnicoAsignadoId: order?.tecnicoAsignadoId ?? "",
    estado: order?.estado ?? "pendiente",
    prioridad: order?.prioridad ?? "media",
    fechaProgramada: order?.fechaProgramada
      ? new Date(order.fechaProgramada).toISOString().slice(0, 16)
      : "",
    duracionReal: order?.duracionReal ? String(order.duracionReal) : "",
    direccionServicio: order?.direccionServicio ?? "",
    descripcionTrabajo: order?.descripcionTrabajo ?? "",
    observaciones: order?.observaciones ?? "",
    firmaCliente: order?.firmaCliente ?? "",
    calificacion: order?.calificacion ? String(order.calificacion) : "",
    comentarioCliente: order?.comentarioCliente ?? "",
  }
}

function getStatusTone(status: HDOrdenServicio["estado"]) {
  if (status === "completada") return "bg-emerald-500/10 text-emerald-700"
  if (status === "cancelada") return "bg-rose-500/10 text-rose-700"
  if (status === "pausada") return "bg-orange-500/10 text-orange-700"
  if (status === "en_proceso") return "bg-sky-500/10 text-sky-700"
  if (status === "programada") return "bg-indigo-500/10 text-indigo-700"
  return "bg-slate-500/10 text-slate-700"
}

function getPriorityTone(priority: HDOrdenServicio["prioridad"]) {
  if (priority === "alta") return "bg-rose-500/10 text-rose-700"
  if (priority === "media") return "bg-amber-500/10 text-amber-700"
  return "bg-emerald-500/10 text-emerald-700"
}

function getOrderCircuit(order: HDOrdenServicio) {
  if (order.estado === "cancelada") return "Fuera de circuito"
  if (order.estado === "completada") return "Cierre operativo"
  if (order.estado === "en_proceso") return "Ejecucion en campo"
  if (order.estado === "pausada") return "Seguimiento pendiente"
  if (order.estado === "programada") return "Agenda comprometida"
  return "Pendiente de planificacion"
}

function getLegacyCoverage() {
  return "Cobertura visible: agenda, tecnico, ticket vinculado, feedback, firma y observaciones. Pendiente por contrato actual: catalogo maestro de recursos, adjuntos firmados, costos reales y optimizacion de rutas."
}

function SummaryCard({
  title,
  value,
  description,
}: {
  title: string
  value: string | number
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
    <div className="grid gap-3 md:grid-cols-2">
      {fields.map((field) => (
        <div key={field.label} className="rounded-lg bg-muted/40 p-3">
          <Label>{field.label}</Label>
          <p className="text-sm font-medium">{field.value}</p>
        </div>
      ))}
    </div>
  )
}

function buildOrderPayload(
  form: FormState,
  previous?: HDOrdenServicio | null
): Partial<HDOrdenServicio> {
  const nextStatus = form.estado
  const previousStatus = previous?.estado

  return {
    ticketId: form.ticketId || undefined,
    clienteId: form.clienteId,
    servicioId: form.servicioId,
    tecnicoAsignadoId: form.tecnicoAsignadoId || undefined,
    estado: nextStatus,
    prioridad: form.prioridad,
    fechaProgramada: form.fechaProgramada ? new Date(form.fechaProgramada) : undefined,
    fechaInicio:
      nextStatus === "en_proceso"
        ? (previous?.fechaInicio ?? new Date())
        : nextStatus === "completada"
          ? previous?.fechaInicio
          : undefined,
    fechaFin:
      nextStatus === "completada"
        ? (previous?.fechaFin ?? new Date())
        : nextStatus === previousStatus
          ? previous?.fechaFin
          : undefined,
    duracionReal: form.duracionReal ? Number(form.duracionReal) : undefined,
    direccionServicio: form.direccionServicio || undefined,
    descripcionTrabajo: form.descripcionTrabajo || undefined,
    observaciones: form.observaciones || undefined,
    firmaCliente: form.firmaCliente || undefined,
    calificacion: form.calificacion ? Number(form.calificacion) : undefined,
    comentarioCliente: form.comentarioCliente || undefined,
  }
}

function OrdenesContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { ordenes, createOrden, updateOrden, deleteOrden } = useHdOrdenesServicio()
  const { servicios } = useHdServicios()
  const { clientes } = useHdClientes()
  const { agentes } = useHdAgentes()
  const { tickets } = useHdTickets()
  const { slas } = useHdSlas()

  const [searchTerm, setSearchTerm] = useState("")
  const [filterEstado, setFilterEstado] = useState<string>("todos")
  const [filterPrioridad, setFilterPrioridad] = useState<string>("todos")
  const [formOpen, setFormOpen] = useState(searchParams.get("action") === "new")
  const [detailOpen, setDetailOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<HDOrdenServicio | null>(null)
  const [formData, setFormData] = useState<FormState>(() => buildFormState())

  const clientMap = useMemo(
    () => new Map(clientes.map((client) => [client.id, client])),
    [clientes]
  )
  const serviceMap = useMemo(
    () => new Map(servicios.map((service) => [service.id, service])),
    [servicios]
  )
  const agentMap = useMemo(() => new Map(agentes.map((agent) => [agent.id, agent])), [agentes])
  const ticketMap = useMemo(() => new Map(tickets.map((ticket) => [ticket.id, ticket])), [tickets])
  const slaMap = useMemo(() => new Map(slas.map((sla) => [sla.id, sla])), [slas])

  const filteredOrders = useMemo(() => {
    return ordenes.filter((order) => {
      const client = clientMap.get(order.clienteId)
      const service = serviceMap.get(order.servicioId)
      const technician = order.tecnicoAsignadoId ? agentMap.get(order.tecnicoAsignadoId) : null
      const ticket = order.ticketId ? ticketMap.get(order.ticketId) : null

      const haystack = [
        order.numero,
        client?.nombre,
        service?.nombre,
        technician ? `${technician.nombre} ${technician.apellido}` : null,
        ticket?.numero,
        order.descripcionTrabajo,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      const matchesSearch = haystack.includes(searchTerm.toLowerCase())
      const matchesEstado = filterEstado === "todos" || order.estado === filterEstado
      const matchesPrioridad = filterPrioridad === "todos" || order.prioridad === filterPrioridad

      return matchesSearch && matchesEstado && matchesPrioridad
    })
  }, [
    agentMap,
    clientMap,
    filterEstado,
    filterPrioridad,
    ordenes,
    searchTerm,
    serviceMap,
    ticketMap,
  ])

  const highlightedOrder =
    selectedOrder && filteredOrders.some((order) => order.id === selectedOrder.id)
      ? selectedOrder
      : (filteredOrders[0] ?? null)
  const overdueOrders = filteredOrders.filter((order) => {
    const scheduled = parseDate(order.fechaProgramada)
    if (!scheduled) return false
    return !["completada", "cancelada"].includes(order.estado) && scheduled < new Date()
  })
  const linkedTickets = filteredOrders.filter((order) => Boolean(order.ticketId)).length
  const withoutTechnician = filteredOrders.filter(
    (order) => !order.tecnicoAsignadoId && !["completada", "cancelada"].includes(order.estado)
  ).length
  const completedWithRating = filteredOrders.filter(
    (order) => order.estado === "completada" && typeof order.calificacion === "number"
  )
  const averageRating = completedWithRating.length
    ? (
        completedWithRating.reduce((sum, order) => sum + (order.calificacion ?? 0), 0) /
        completedWithRating.length
      ).toFixed(1)
    : "-"

  function openForm(order?: HDOrdenServicio) {
    setSelectedOrder(order ?? null)
    setFormData(buildFormState(order))
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setSelectedOrder(null)
    setFormData(buildFormState())
    if (searchParams.get("action") === "new") {
      router.push("/helpdesk/ordenes")
    }
  }

  function openDetail(order: HDOrdenServicio) {
    setSelectedOrder(order)
    setDetailOpen(true)
  }

  async function handleSave() {
    const payload = buildOrderPayload(formData, selectedOrder)
    if (selectedOrder) {
      await updateOrden(selectedOrder.id, payload)
    } else {
      await createOrden({
        numero: `OS-${Date.now()}`,
        clienteId: formData.clienteId,
        servicioId: formData.servicioId,
        estado: formData.estado,
        prioridad: formData.prioridad,
        ...payload,
      } as Omit<HDOrdenServicio, "id" | "createdAt" | "updatedAt">)
    }
    closeForm()
  }

  async function handleDelete() {
    if (!selectedOrder) return
    await deleteOrden(selectedOrder.id)
    setDeleteOpen(false)
    setDetailOpen(false)
    setSelectedOrder(null)
  }

  async function handleStatusChange(order: HDOrdenServicio, estado: HDOrdenServicio["estado"]) {
    const payload = buildOrderPayload({ ...buildFormState(order), estado }, order)
    await updateOrden(order.id, payload)
    setSelectedOrder((current) =>
      current ? ({ ...current, ...payload } as HDOrdenServicio) : current
    )
  }

  const highlightedClient = highlightedOrder ? clientMap.get(highlightedOrder.clienteId) : null
  const highlightedService = highlightedOrder ? serviceMap.get(highlightedOrder.servicioId) : null
  const highlightedAgent = highlightedOrder?.tecnicoAsignadoId
    ? agentMap.get(highlightedOrder.tecnicoAsignadoId)
    : null
  const highlightedTicket = highlightedOrder?.ticketId
    ? ticketMap.get(highlightedOrder.ticketId)
    : null
  const highlightedSla = highlightedClient?.slaId ? slaMap.get(highlightedClient.slaId) : null
  const highlightedResources = highlightedOrder?.recursosUtilizados ?? []

  const highlightedFields = highlightedOrder
    ? [
        { label: "Circuito", value: getOrderCircuit(highlightedOrder) },
        { label: "Agenda", value: formatDateTime(highlightedOrder.fechaProgramada) },
        {
          label: "SLA cliente",
          value: highlightedSla
            ? `${highlightedSla.nombre} · Resp ${formatMinutes(highlightedSla.tiempoRespuesta)}`
            : "Sin SLA visible",
        },
        {
          label: "Servicio",
          value: highlightedService
            ? `${highlightedService.nombre} · ${formatMinutes(highlightedService.duracionEstimada)} · ${formatCurrency(highlightedService.precioBase)}`
            : "Sin servicio vinculado",
        },
      ]
    : []

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">Ordenes de Servicio</h1>
          <p className="text-muted-foreground">
            Consola operativa de agenda, ejecucion y cierre de servicios sobre hooks reales.
          </p>
          <p className="text-sm text-muted-foreground">{getLegacyCoverage()}</p>
        </div>
        <Button onClick={() => openForm()}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva orden
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Ordenes activas"
          value={
            filteredOrders.filter((order) => !["completada", "cancelada"].includes(order.estado))
              .length
          }
          description={`${withoutTechnician} sin tecnico asignado`}
        />
        <SummaryCard
          title="Agenda vencida"
          value={overdueOrders.length}
          description="Ordenes con fecha programada ya superada"
        />
        <SummaryCard
          title="Tickets vinculados"
          value={linkedTickets}
          description="Relacion visible entre mesa de ayuda y servicio"
        />
        <SummaryCard
          title="Calificacion promedio"
          value={averageRating}
          description={`${completedWithRating.length} cierres con feedback del cliente`}
        />
      </div>

      {highlightedOrder ? (
        <Card>
          <CardHeader>
            <CardTitle>Orden destacada</CardTitle>
            <CardDescription>
              {highlightedOrder.numero} · {highlightedClient?.nombre ?? "Cliente sin referencia"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={getStatusTone(highlightedOrder.estado)}>
                {statusLabels[highlightedOrder.estado]}
              </Badge>
              <Badge className={getPriorityTone(highlightedOrder.prioridad)}>
                {priorityLabels[highlightedOrder.prioridad]}
              </Badge>
              <Badge variant="outline">{getOrderCircuit(highlightedOrder)}</Badge>
              {highlightedTicket ? (
                <Badge variant="outline">Ticket {highlightedTicket.numero}</Badge>
              ) : null}
            </div>

            <DetailFieldGrid fields={highlightedFields} />

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <UserRound className="h-4 w-4 text-sky-600" />
                  Tecnico
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {highlightedAgent
                    ? `${highlightedAgent.nombre} ${highlightedAgent.apellido} · ${highlightedAgent.estado}`
                    : "Sin tecnico asignado"}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Package className="h-4 w-4 text-amber-600" />
                  Recursos
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {highlightedResources.length > 0
                    ? `${highlightedResources.length} item(s) registrados en la orden.`
                    : "Sin recursos visibles cargados por backend."}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Signature className="h-4 w-4 text-emerald-600" />
                  Cierre cliente
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {highlightedOrder.firmaCliente
                    ? `Firma cargada${highlightedOrder.calificacion ? ` · ${highlightedOrder.calificacion}/5` : ""}`
                    : "Sin firma registrada aún."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar por orden, cliente, servicio, tecnico o ticket..."
                className="pl-10"
              />
            </div>
            <Select value={filterEstado} onValueChange={setFilterEstado}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterPrioridad} onValueChange={setFilterPrioridad}>
              <SelectTrigger className="w-full lg:w-44">
                <SelectValue placeholder="Prioridad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                {Object.entries(priorityLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(filterEstado !== "todos" || filterPrioridad !== "todos") && (
              <Button
                variant="ghost"
                onClick={() => {
                  setFilterEstado("todos")
                  setFilterPrioridad("todos")
                }}
              >
                <X className="mr-2 h-4 w-4" />
                Limpiar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Orden</TableHead>
                <TableHead>Cliente / Servicio</TableHead>
                <TableHead>Tecnico</TableHead>
                <TableHead>Agenda</TableHead>
                <TableHead>Ticket</TableHead>
                <TableHead>Circuito</TableHead>
                <TableHead>Feedback</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => {
                const client = clientMap.get(order.clienteId)
                const service = serviceMap.get(order.servicioId)
                const agent = order.tecnicoAsignadoId ? agentMap.get(order.tecnicoAsignadoId) : null
                const ticket = order.ticketId ? ticketMap.get(order.ticketId) : null

                return (
                  <TableRow key={order.id} className="group">
                    <TableCell>
                      <div className="font-mono text-xs">{order.numero}</div>
                      <div className="text-xs text-muted-foreground">
                        {statusLabels[order.estado]}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {client?.nombre ?? "Cliente sin referencia"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {service?.nombre ?? "Servicio sin referencia"}
                      </div>
                    </TableCell>
                    <TableCell>
                      {agent ? (
                        <div>
                          <div>
                            {agent.nombre} {agent.apellido}
                          </div>
                          <div className="text-xs text-muted-foreground">{agent.estado}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Sin asignar</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{formatDateTime(order.fechaProgramada)}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatMinutes(order.duracionReal)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {ticket ? (
                        <div>
                          <div className="font-medium">{ticket.numero}</div>
                          <div className="text-xs text-muted-foreground">{ticket.asunto}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Sin ticket</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge className={getStatusTone(order.estado)}>
                          {statusLabels[order.estado]}
                        </Badge>
                        <Badge className={getPriorityTone(order.prioridad)}>
                          {priorityLabels[order.prioridad]}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {typeof order.calificacion === "number" ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                          {order.calificacion}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Sin nota</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openDetail(order)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver detalle
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openForm(order)}>
                            <PenSquare className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-rose-700"
                            onClick={() => {
                              setSelectedOrder(order)
                              setDeleteOpen(true)
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    No se encontraron ordenes con los filtros actuales.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeForm()
            return
          }
          setFormOpen(true)
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedOrder ? "Editar orden" : "Nueva orden de servicio"}</DialogTitle>
            <DialogDescription>
              Completa los datos visibles hoy en backend para agenda, ejecucion y cierre con
              cliente.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Ticket vinculado</Label>
              <Select
                value={formData.ticketId || "none"}
                onValueChange={(value) =>
                  setFormData((current) => ({
                    ...current,
                    ticketId: value === "none" ? "" : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin ticket" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin ticket</SelectItem>
                  {tickets.map((ticket) => (
                    <SelectItem key={ticket.id} value={ticket.id}>
                      {ticket.numero} · {ticket.asunto}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Cliente *</Label>
              <Select
                value={formData.clienteId}
                onValueChange={(value) =>
                  setFormData((current) => ({ ...current, clienteId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Servicio *</Label>
              <Select
                value={formData.servicioId}
                onValueChange={(value) =>
                  setFormData((current) => ({ ...current, servicioId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar servicio" />
                </SelectTrigger>
                <SelectContent>
                  {servicios
                    .filter((service) => service.estado === "activo")
                    .map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.nombre}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Tecnico asignado</Label>
              <Select
                value={formData.tecnicoAsignadoId || "none"}
                onValueChange={(value) =>
                  setFormData((current) => ({
                    ...current,
                    tecnicoAsignadoId: value === "none" ? "" : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin asignar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {agentes
                    .filter((agent) => agent.rol === "tecnico" || agent.rol === "agente")
                    .map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.nombre} {agent.apellido}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Prioridad</Label>
              <Select
                value={formData.prioridad}
                onValueChange={(value) =>
                  setFormData((current) => ({
                    ...current,
                    prioridad: value as HDOrdenServicio["prioridad"],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(priorityLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Estado</Label>
              <Select
                value={formData.estado}
                onValueChange={(value) =>
                  setFormData((current) => ({
                    ...current,
                    estado: value as HDOrdenServicio["estado"],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Fecha programada</Label>
              <Input
                type="datetime-local"
                value={formData.fechaProgramada}
                onChange={(event) =>
                  setFormData((current) => ({ ...current, fechaProgramada: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>Duracion real (min)</Label>
              <Input
                type="number"
                min={0}
                value={formData.duracionReal}
                onChange={(event) =>
                  setFormData((current) => ({ ...current, duracionReal: event.target.value }))
                }
                placeholder="Ej: 90"
              />
            </div>

            <div className="grid gap-2 md:col-span-2">
              <Label>Direccion del servicio</Label>
              <Input
                value={formData.direccionServicio}
                onChange={(event) =>
                  setFormData((current) => ({ ...current, direccionServicio: event.target.value }))
                }
                placeholder="Direccion donde se realizara el servicio"
              />
            </div>

            <div className="grid gap-2 md:col-span-2">
              <Label>Descripcion del trabajo</Label>
              <Textarea
                value={formData.descripcionTrabajo}
                onChange={(event) =>
                  setFormData((current) => ({ ...current, descripcionTrabajo: event.target.value }))
                }
                rows={3}
                placeholder="Trabajo a realizar, alcance o pedido heredado"
              />
            </div>

            <div className="grid gap-2 md:col-span-2">
              <Label>Observaciones operativas</Label>
              <Textarea
                value={formData.observaciones}
                onChange={(event) =>
                  setFormData((current) => ({ ...current, observaciones: event.target.value }))
                }
                rows={3}
                placeholder="Accesos, repuestos, coordinacion con cliente, notas de cierre..."
              />
            </div>

            <div className="grid gap-2">
              <Label>Firma cliente</Label>
              <Input
                value={formData.firmaCliente}
                onChange={(event) =>
                  setFormData((current) => ({ ...current, firmaCliente: event.target.value }))
                }
                placeholder="Referencia o hash de firma"
              />
            </div>
            <div className="grid gap-2">
              <Label>Calificacion</Label>
              <Input
                type="number"
                min={1}
                max={5}
                value={formData.calificacion}
                onChange={(event) =>
                  setFormData((current) => ({ ...current, calificacion: event.target.value }))
                }
                placeholder="1 a 5"
              />
            </div>

            <div className="grid gap-2 md:col-span-2">
              <Label>Comentario del cliente</Label>
              <Textarea
                value={formData.comentarioCliente}
                onChange={(event) =>
                  setFormData((current) => ({ ...current, comentarioCliente: event.target.value }))
                }
                rows={2}
                placeholder="Feedback visible del cierre"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!formData.clienteId || !formData.servicioId}>
              {selectedOrder ? "Guardar cambios" : "Crear orden"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-4xl">
          {selectedOrder
            ? (() => {
                const client = clientMap.get(selectedOrder.clienteId)
                const service = serviceMap.get(selectedOrder.servicioId)
                const agent = selectedOrder.tecnicoAsignadoId
                  ? agentMap.get(selectedOrder.tecnicoAsignadoId)
                  : null
                const ticket = selectedOrder.ticketId ? ticketMap.get(selectedOrder.ticketId) : null
                const sla = client?.slaId ? slaMap.get(client.slaId) : null
                const principalFields = [
                  { label: "Cliente", value: client?.nombre ?? "Sin cliente" },
                  { label: "Servicio", value: service?.nombre ?? "Sin servicio" },
                  {
                    label: "Tecnico",
                    value: agent ? `${agent.nombre} ${agent.apellido}` : "Sin asignar",
                  },
                  {
                    label: "Ticket vinculado",
                    value: ticket ? `${ticket.numero} · ${ticket.asunto}` : "Sin ticket",
                  },
                  { label: "Agenda", value: formatDateTime(selectedOrder.fechaProgramada) },
                  { label: "Duracion real", value: formatMinutes(selectedOrder.duracionReal) },
                ]
                const circuitFields = [
                  { label: "Estado", value: statusLabels[selectedOrder.estado] },
                  { label: "Circuito", value: getOrderCircuit(selectedOrder) },
                  { label: "Inicio", value: formatDateTime(selectedOrder.fechaInicio) },
                  { label: "Fin", value: formatDateTime(selectedOrder.fechaFin) },
                  {
                    label: "SLA del cliente",
                    value: sla
                      ? `${sla.nombre} · Resp ${formatMinutes(sla.tiempoRespuesta)} · Resol ${formatMinutes(sla.tiempoResolucion)}`
                      : "Sin SLA visible",
                  },
                  { label: "Cobertura legado", value: getLegacyCoverage() },
                ]

                return (
                  <>
                    <DialogHeader>
                      <div className="flex flex-wrap items-center gap-2">
                        <DialogTitle className="font-mono">{selectedOrder.numero}</DialogTitle>
                        <Badge className={getStatusTone(selectedOrder.estado)}>
                          {statusLabels[selectedOrder.estado]}
                        </Badge>
                        <Badge className={getPriorityTone(selectedOrder.prioridad)}>
                          {priorityLabels[selectedOrder.prioridad]}
                        </Badge>
                      </div>
                      <DialogDescription>
                        {service?.nombre ?? "Servicio sin referencia"} ·{" "}
                        {client?.nombre ?? "Cliente sin referencia"}
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                      <DetailFieldGrid fields={principalFields} />

                      <div className="grid gap-4 md:grid-cols-3">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Cliente y agenda</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2 text-sm text-muted-foreground">
                            <div className="flex items-start gap-2">
                              <MapPin className="mt-0.5 h-4 w-4 text-sky-600" />
                              <span>
                                {selectedOrder.direccionServicio ||
                                  client?.direccion ||
                                  "Sin direccion visible"}
                              </span>
                            </div>
                            <div className="flex items-start gap-2">
                              <CalendarClock className="mt-0.5 h-4 w-4 text-indigo-600" />
                              <span>{formatDateTime(selectedOrder.fechaProgramada)}</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <ShieldAlert className="mt-0.5 h-4 w-4 text-rose-600" />
                              <span>
                                {sla
                                  ? `${sla.nombre} (${client?.tipoCliente ?? "cliente"})`
                                  : "Sin SLA asociado"}
                              </span>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Servicio y recursos</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2 text-sm text-muted-foreground">
                            <div className="flex items-start gap-2">
                              <Wrench className="mt-0.5 h-4 w-4 text-amber-600" />
                              <span>
                                {service
                                  ? `${service.nombre} · ${formatMinutes(service.duracionEstimada)} · ${formatCurrency(service.precioBase)}`
                                  : "Sin servicio vinculado"}
                              </span>
                            </div>
                            <div className="flex items-start gap-2">
                              <Package className="mt-0.5 h-4 w-4 text-emerald-600" />
                              <span>
                                {selectedOrder.recursosUtilizados?.length
                                  ? `${selectedOrder.recursosUtilizados.length} recurso(s) cargados`
                                  : "Sin recursos visibles en backend"}
                              </span>
                            </div>
                            <div className="flex items-start gap-2">
                              <ClipboardList className="mt-0.5 h-4 w-4 text-slate-600" />
                              <span>
                                {selectedOrder.descripcionTrabajo ||
                                  "Sin descripcion operativa cargada"}
                              </span>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Cierre y conformidad</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2 text-sm text-muted-foreground">
                            <div className="flex items-start gap-2">
                              <Signature className="mt-0.5 h-4 w-4 text-emerald-600" />
                              <span>{selectedOrder.firmaCliente || "Sin firma registrada"}</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <Star className="mt-0.5 h-4 w-4 text-yellow-500" />
                              <span>
                                {typeof selectedOrder.calificacion === "number"
                                  ? `${selectedOrder.calificacion}/5`
                                  : "Sin calificacion visible"}
                              </span>
                            </div>
                            <div className="flex items-start gap-2">
                              <PenSquare className="mt-0.5 h-4 w-4 text-sky-600" />
                              <span>
                                {selectedOrder.comentarioCliente ||
                                  selectedOrder.observaciones ||
                                  "Sin comentario registrado"}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      <DetailFieldGrid fields={circuitFields} />

                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <Select
                          value={selectedOrder.estado}
                          onValueChange={(value) =>
                            handleStatusChange(selectedOrder, value as HDOrdenServicio["estado"])
                          }
                        >
                          <SelectTrigger className="w-full md:w-52">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(statusLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setDetailOpen(false)
                            openForm(selectedOrder)
                          }}
                        >
                          <PenSquare className="mr-2 h-4 w-4" />
                          Editar
                        </Button>
                      </div>
                    </div>
                  </>
                )
              })()
            : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar orden de servicio</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer. Se eliminara permanentemente la orden{" "}
              <strong>{selectedOrder?.numero}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700" onClick={handleDelete}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function LoadingFallback() {
  return null
}

export default function OrdenesServicioPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <OrdenesContent />
    </Suspense>
  )
}
