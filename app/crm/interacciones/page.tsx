"use client"

import React, { Suspense, useMemo, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useSearchParams, useRouter } from "next/navigation"
import {
  Plus,
  Search,
  Phone,
  Mail,
  Users,
  MapPin,
  MessageSquare,
  Trash2,
  Building2,
  ArrowRight,
  Eye,
  Target,
} from "lucide-react"
import {
  useCrmInteracciones,
  useCrmClientes,
  useCrmContactos,
  useCrmUsuarios,
  useCrmOportunidades,
  useCrmTareas,
} from "@/lib/hooks/useCrm"
import type { CRMInteraction, CRMOpportunity, CRMTask } from "@/lib/types"

const tipoLabels: Record<CRMInteraction["tipoInteraccion"], string> = {
  llamada: "Llamada",
  email: "Email",
  reunion: "Reunión",
  visita: "Visita",
  ticket: "Ticket",
  mensaje: "Mensaje",
}

const canalLabels: Record<CRMInteraction["canal"], string> = {
  telefono: "Teléfono",
  email: "Email",
  whatsapp: "WhatsApp",
  presencial: "Presencial",
  videollamada: "Videollamada",
}

const resultadoLabels: Record<CRMInteraction["resultado"], string> = {
  exitosa: "Exitosa",
  sin_respuesta: "Sin Respuesta",
  reprogramada: "Reprogramada",
  cancelada: "Cancelada",
}

const tipoIcons: Record<CRMInteraction["tipoInteraccion"], React.ReactNode> = {
  llamada: <Phone className="h-5 w-5" />,
  email: <Mail className="h-5 w-5" />,
  reunion: <Users className="h-5 w-5" />,
  visita: <MapPin className="h-5 w-5" />,
  ticket: <MessageSquare className="h-5 w-5" />,
  mensaje: <MessageSquare className="h-5 w-5" />,
}

const formatDateTime = (date?: Date | string | null) => {
  if (!date) return "Sin fecha"

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date))
}

const getDaysSince = (value?: Date | string | null, referenceDate?: Date) => {
  if (!value) return null

  const baseDate = new Date(referenceDate ?? new Date())
  baseDate.setHours(0, 0, 0, 0)

  const targetDate = new Date(value)
  targetDate.setHours(0, 0, 0, 0)

  return Math.round((baseDate.getTime() - targetDate.getTime()) / 86400000)
}

const getDaysUntil = (value?: Date | string | null, referenceDate?: Date) => {
  if (!value) return null

  const baseDate = new Date(referenceDate ?? new Date())
  baseDate.setHours(0, 0, 0, 0)

  const targetDate = new Date(value)
  targetDate.setHours(0, 0, 0, 0)

  return Math.round((targetDate.getTime() - baseDate.getTime()) / 86400000)
}

function InteraccionesContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const action = searchParams.get("action")
  const clienteIdParam = searchParams.get("clienteId")
  const [today] = useState(() => {
    const baseDate = new Date()
    baseDate.setHours(0, 0, 0, 0)
    return baseDate
  })

  const [search, setSearch] = useState("")
  const [filterTipo, setFilterTipo] = useState<string>("all")
  const [filterResultado, setFilterResultado] = useState<string>("all")
  const [isFormOpen, setIsFormOpen] = useState(action === "new")
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedInteraction, setSelectedInteraction] = useState<CRMInteraction | null>(null)
  const { interacciones, loading, error, createInteraccion, deleteInteraccion } =
    useCrmInteracciones(clienteIdParam || undefined)
  const { clientes: crmClients } = useCrmClientes()
  const { contactos: crmContacts } = useCrmContactos()
  const { usuarios: crmUsers } = useCrmUsuarios()
  const { oportunidades } = useCrmOportunidades(clienteIdParam || undefined)
  const { tareas } = useCrmTareas(clienteIdParam || undefined)

  const clientsById = useMemo(
    () => new Map(crmClients.map((client) => [client.id, client])),
    [crmClients]
  )
  const contactsById = useMemo(
    () => new Map(crmContacts.map((contact) => [contact.id, contact])),
    [crmContacts]
  )
  const usersById = useMemo(() => new Map(crmUsers.map((user) => [user.id, user])), [crmUsers])

  const openOpportunitiesByClient = useMemo(() => {
    const map = new Map<string, CRMOpportunity[]>()

    oportunidades
      .filter((opportunity) => !["cerrado_ganado", "cerrado_perdido"].includes(opportunity.etapa))
      .forEach((opportunity) => {
        const current = map.get(opportunity.clienteId) ?? []
        current.push(opportunity)
        map.set(opportunity.clienteId, current)
      })

    return map
  }, [oportunidades])

  const pendingTasksByClient = useMemo(() => {
    const map = new Map<string, CRMTask[]>()

    tareas
      .filter((task) => task.clienteId && task.estado !== "completada")
      .forEach((task) => {
        const clientId = task.clienteId as string
        const current = map.get(clientId) ?? []
        current.push(task)
        map.set(clientId, current)
      })

    return map
  }, [tareas])

  const emptyForm: Partial<CRMInteraction> = {
    clienteId: clienteIdParam || "",
    contactoId: "",
    tipoInteraccion: "llamada",
    canal: "telefono",
    fechaHora: new Date(),
    usuarioResponsableId: "usr-001",
    resultado: "exitosa",
    descripcion: "",
  }

  const [formData, setFormData] = useState<Partial<CRMInteraction>>(emptyForm)

  const filteredInteractions = interacciones
    .filter((int) => {
      const matchesSearch = int.descripcion?.toLowerCase().includes(search.toLowerCase())
      const matchesTipo = filterTipo === "all" || int.tipoInteraccion === filterTipo
      const matchesResultado = filterResultado === "all" || int.resultado === filterResultado
      return matchesSearch && matchesTipo && matchesResultado
    })
    .sort((a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime())

  const interactionRows = useMemo(() => {
    return filteredInteractions.map((interaction) => {
      const client = clientsById.get(interaction.clienteId)
      const contact = interaction.contactoId ? contactsById.get(interaction.contactoId) : undefined
      const owner = usersById.get(interaction.usuarioResponsableId)
      const clientInteractions = interacciones.filter(
        (item) => item.clienteId === interaction.clienteId
      )
      const pendingTasks = pendingTasksByClient.get(interaction.clienteId) ?? []
      const openOpportunities = openOpportunitiesByClient.get(interaction.clienteId) ?? []
      const lastInteractionDate = clientInteractions.reduce<Date | null>((latest, item) => {
        const current = new Date(item.fechaHora)
        if (!latest || current > latest) return current
        return latest
      }, null)

      return {
        interaction,
        client,
        contact,
        owner,
        pendingTasks,
        openOpportunities,
        lastInteractionDate,
        daysSinceLastTouch: getDaysSince(lastInteractionDate, today),
      }
    })
  }, [
    clientsById,
    contactsById,
    filteredInteractions,
    interacciones,
    openOpportunitiesByClient,
    pendingTasksByClient,
    today,
    usersById,
  ])

  const stats = useMemo(() => {
    const success = filteredInteractions.filter(
      (interaction) => interaction.resultado === "exitosa"
    ).length
    const noResponse = filteredInteractions.filter(
      (interaction) => interaction.resultado === "sin_respuesta"
    ).length
    const rescheduled = filteredInteractions.filter(
      (interaction) => interaction.resultado === "reprogramada"
    ).length
    const activeClients = new Set(filteredInteractions.map((interaction) => interaction.clienteId))
      .size

    return {
      total: filteredInteractions.length,
      success,
      noResponse,
      rescheduled,
      activeClients,
    }
  }, [filteredInteractions])

  const channelCoverage = useMemo(() => {
    return Object.entries(
      filteredInteractions.reduce<Record<string, number>>((acc, interaction) => {
        acc[interaction.canal] = (acc[interaction.canal] ?? 0) + 1
        return acc
      }, {})
    ).sort((left, right) => right[1] - left[1])
  }, [filteredInteractions])

  const ownerLoad = useMemo(() => {
    return crmUsers
      .map((user) => {
        const assigned = filteredInteractions.filter(
          (interaction) => interaction.usuarioResponsableId === user.id
        )
        if (!assigned.length) return null

        return {
          id: user.id,
          nombre: `${user.nombre} ${user.apellido}`,
          total: assigned.length,
          noResponse: assigned.filter((interaction) => interaction.resultado === "sin_respuesta")
            .length,
          reprogramadas: assigned.filter((interaction) => interaction.resultado === "reprogramada")
            .length,
        }
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .sort((left, right) => right.total - left.total || right.noResponse - left.noResponse)
      .slice(0, 4)
  }, [crmUsers, filteredInteractions])

  const clientRadar = useMemo(() => {
    return crmClients
      .map((client) => {
        const clientInteractions = filteredInteractions.filter(
          (interaction) => interaction.clienteId === client.id
        )
        const pendingTasks = pendingTasksByClient.get(client.id) ?? []
        const openOpportunities = openOpportunitiesByClient.get(client.id) ?? []
        const latest = clientInteractions.reduce<Date | null>((latestDate, interaction) => {
          const currentDate = new Date(interaction.fechaHora)
          if (!latestDate || currentDate > latestDate) return currentDate
          return latestDate
        }, null)
        const daysWithoutTouch = getDaysSince(latest, today)
        const urgentClosings = openOpportunities.filter((opportunity) => {
          const daysUntil = getDaysUntil(opportunity.fechaEstimadaCierre, today)
          return daysUntil !== null && daysUntil <= 7
        }).length
        const noResponse = clientInteractions.filter(
          (interaction) => interaction.resultado === "sin_respuesta"
        ).length
        const score =
          (daysWithoutTouch === null ? 2 : daysWithoutTouch > 14 ? 2 : 0) +
          noResponse +
          pendingTasks.filter((task) => {
            const daysUntil = getDaysUntil(task.fechaVencimiento, today)
            return daysUntil !== null && daysUntil < 0
          }).length +
          urgentClosings

        return {
          client,
          latest,
          daysWithoutTouch,
          interactions: clientInteractions.length,
          noResponse,
          pendingTasks: pendingTasks.length,
          urgentClosings,
          score,
        }
      })
      .filter((item) => item.interactions > 0 || item.pendingTasks > 0 || item.urgentClosings > 0)
      .sort((left, right) => right.score - left.score || right.pendingTasks - left.pendingTasks)
      .slice(0, 4)
  }, [crmClients, filteredInteractions, openOpportunitiesByClient, pendingTasksByClient, today])

  const highlightedClient = clientRadar[0] ?? null

  const alerts = useMemo(() => {
    const items: Array<{ title: string; detail: string }> = []
    const overduePending = tareas.filter((task) => {
      const daysUntil = getDaysUntil(task.fechaVencimiento, today)
      return task.estado !== "completada" && daysUntil !== null && daysUntil < 0
    }).length

    if (stats.noResponse > 0) {
      items.push({
        title: "Sin respuesta",
        detail: `${stats.noResponse} interacciones visibles terminaron sin respuesta y piden nuevo intento comercial.`,
      })
    }

    if (stats.rescheduled > 0) {
      items.push({
        title: "Seguimiento reprogramado",
        detail: `${stats.rescheduled} contactos quedaron pendientes para una nueva gestión.`,
      })
    }

    if (overduePending > 0) {
      items.push({
        title: "Tareas vencidas",
        detail: `${overduePending} tareas CRM siguen abiertas fuera de fecha asociadas a clientes visibles.`,
      })
    }

    const staleClients = clientRadar.filter(
      (item) => item.daysWithoutTouch === null || item.daysWithoutTouch > 14
    ).length
    if (staleClients > 0) {
      items.push({
        title: "Clientes sin contacto reciente",
        detail: `${staleClients} cuentas muestran más de 14 días sin interacción visible o sin gestión registrada.`,
      })
    }

    if (!items.length) {
      items.push({
        title: "Sin alertas críticas",
        detail: "La agenda visible de interacciones no muestra desvíos fuertes de seguimiento.",
      })
    }

    return items.slice(0, 4)
  }, [clientRadar, stats.noResponse, stats.rescheduled, tareas, today])

  const getResultadoColor = (resultado: CRMInteraction["resultado"]) => {
    const colors = {
      exitosa: "bg-emerald-500/20 text-emerald-400",
      sin_respuesta: "bg-amber-500/20 text-amber-400",
      reprogramada: "bg-blue-500/20 text-blue-400",
      cancelada: "bg-red-500/20 text-red-400",
    }
    return colors[resultado]
  }

  const openNewForm = () => {
    setSelectedInteraction(null)
    setFormData(emptyForm)
    setIsFormOpen(true)
  }

  const handleView = (interaction: CRMInteraction) => {
    setSelectedInteraction(interaction)
    setIsFormOpen(true)
  }

  const handleDelete = (interaction: CRMInteraction) => {
    setSelectedInteraction(interaction)
    setIsDeleteOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await createInteraccion(formData as Omit<CRMInteraction, "id" | "createdAt" | "updatedAt">)
    closeForm()
  }

  const confirmDelete = async () => {
    if (selectedInteraction) {
      await deleteInteraccion(selectedInteraction.id)
    }
    setIsDeleteOpen(false)
    setSelectedInteraction(null)
  }

  const closeForm = () => {
    setIsFormOpen(false)
    setSelectedInteraction(null)
    setFormData(emptyForm)
    router.push("/crm/interacciones")
  }

  const clientContacts = formData.clienteId
    ? crmContacts.filter((c) => c.clienteId === formData.clienteId)
    : []

  if (loading && interacciones.length === 0) {
    return (
      <div className="flex min-h-80 items-center justify-center rounded-lg border border-dashed text-muted-foreground">
        Cargando agenda de interacciones...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Interacciones</h1>
          <p className="text-muted-foreground">Historial de comunicaciones con clientes</p>
        </div>
        <Button onClick={openNewForm}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Interacción
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Interacciones visibles</p>
            <p className="mt-2 text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">
              {stats.activeClients} clientes con actividad
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Gestiones exitosas</p>
            <p className="mt-2 text-2xl font-bold text-emerald-500">{stats.success}</p>
            <p className="text-xs text-muted-foreground">Resultado positivo en la carga filtrada</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Sin respuesta</p>
            <p className="mt-2 text-2xl font-bold text-amber-500">{stats.noResponse}</p>
            <p className="text-xs text-muted-foreground">Requieren insistencia o cambio de canal</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Reprogramadas</p>
            <p className="mt-2 text-2xl font-bold text-blue-500">{stats.rescheduled}</p>
            <p className="text-xs text-muted-foreground">Gestiones trasladadas a próxima acción</p>
          </CardContent>
        </Card>
      </div>

      {error && (
        <Card className="border-red-500/40">
          <CardContent className="pt-6 text-sm text-red-300">
            No se pudo cargar parte de las interacciones: {error}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar en descripción..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(tipoLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterResultado} onValueChange={setFilterResultado}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Resultado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(resultadoLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Radar de seguimiento</CardTitle>
            <CardDescription>
              Alertas de contacto, reprogramaciones y pendientes asociados a la agenda visible.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.map((alert) => (
              <div key={alert.title} className="rounded-lg border p-4">
                <p className="font-medium">{alert.title}</p>
                <p className="mt-2 text-sm text-muted-foreground">{alert.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cobertura por canal</CardTitle>
            <CardDescription>
              Lectura rápida de cómo se distribuyen las gestiones visibles por canal de contacto.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {channelCoverage.map(([channel, total]) => (
              <div
                key={channel}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div>
                  <p className="font-medium">{canalLabels[channel as CRMInteraction["canal"]]}</p>
                  <p className="text-sm text-muted-foreground">{total} interacciones</p>
                </div>
                <Badge variant="outline">
                  {Math.round((total / Math.max(stats.total, 1)) * 100)}%
                </Badge>
              </div>
            ))}
            {channelCoverage.length === 0 && (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No hay interacciones visibles para resumir por canal.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Cliente a seguir</CardTitle>
              <CardDescription>
                Cuenta con mayor presión visible entre falta de respuesta, pendientes y cierres
                cercanos.
              </CardDescription>
            </div>
            {highlightedClient && (
              <Link href={`/crm/clientes/${highlightedClient.client.id}`}>
                <Button variant="ghost" size="sm">
                  Ver cliente
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {highlightedClient ? (
              <div className="space-y-4 rounded-lg border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold">{highlightedClient.client.nombre}</p>
                    <p className="text-sm text-muted-foreground">
                      {highlightedClient.interactions} interacciones visibles ·{" "}
                      {highlightedClient.pendingTasks} tareas abiertas
                    </p>
                  </div>
                  <Badge variant={highlightedClient.noResponse > 0 ? "destructive" : "outline"}>
                    {highlightedClient.noResponse} sin respuesta
                  </Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Última gestión</p>
                    <p className="mt-2 font-medium">{formatDateTime(highlightedClient.latest)}</p>
                    <p className="text-xs text-muted-foreground">
                      {highlightedClient.daysWithoutTouch === null
                        ? "Sin gestión registrada"
                        : `${highlightedClient.daysWithoutTouch} días desde el último contacto`}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Presión comercial</p>
                    <p className="mt-2 font-medium">
                      {highlightedClient.urgentClosings} cierres próximos
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {highlightedClient.pendingTasks} tareas abiertas asociadas
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No hay un cliente destacado con los filtros actuales.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Responsables con carga</CardTitle>
            <CardDescription>
              Distribución visible de interacciones por usuario responsable.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {ownerLoad.map((owner) => (
              <div key={owner.id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">{owner.nombre}</p>
                    <p className="text-sm text-muted-foreground">
                      {owner.total} interacciones visibles
                    </p>
                  </div>
                  <Badge variant={owner.noResponse > 0 ? "destructive" : "outline"}>
                    {owner.noResponse} sin respuesta
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {owner.reprogramadas} reprogramadas en la agenda filtrada.
                </p>
              </div>
            ))}
            {ownerLoad.length === 0 && (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No hay responsables con actividad visible en los filtros actuales.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {interactionRows.map((row) => {
          const { interaction, client: cliente, contact: contacto, owner: usuario } = row
          return (
            <Card key={interaction.id} className="group">
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    {tipoIcons[interaction.tipoInteraccion]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium capitalize">
                            {tipoLabels[interaction.tipoInteraccion]}
                          </span>
                          <span className="text-muted-foreground">
                            via {canalLabels[interaction.canal]}
                          </span>
                          <Badge className={getResultadoColor(interaction.resultado)}>
                            {resultadoLabels[interaction.resultado]}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          {cliente && (
                            <Link
                              href={`/crm/clientes/${cliente.id}`}
                              className="hover:underline flex items-center gap-1"
                            >
                              <Building2 className="h-3 w-3" />
                              {cliente.nombre}
                            </Link>
                          )}
                          {contacto && (
                            <span>
                              {contacto.nombre} {contacto.apellido}
                            </span>
                          )}
                          <span>{formatDateTime(interaction.fechaHora)}</span>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" onClick={() => handleView(interaction)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(interaction)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    {interaction.descripcion && (
                      <p className="mt-2 text-sm">{interaction.descripcion}</p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>{row.pendingTasks.length} tareas abiertas</span>
                      <span>{row.openOpportunities.length} oportunidades activas</span>
                      <span>
                        {row.daysSinceLastTouch === null
                          ? "Sin gestión previa"
                          : `${row.daysSinceLastTouch} días desde el último contacto`}
                      </span>
                    </div>
                    {usuario && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Registrado por {usuario.nombre} {usuario.apellido}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
        {filteredInteractions.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No se encontraron interacciones
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={isFormOpen} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedInteraction ? "Detalle de Interacción" : "Nueva Interacción"}
            </DialogTitle>
            <DialogDescription>
              {selectedInteraction
                ? "El historial queda registrado como evento inmutable; aquí se muestra el detalle visible del registro."
                : "Registra una comunicación con el cliente"}
            </DialogDescription>
          </DialogHeader>
          {selectedInteraction ? (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2">
                  {tipoIcons[selectedInteraction.tipoInteraccion]}
                  <div>
                    <p className="font-medium">{tipoLabels[selectedInteraction.tipoInteraccion]}</p>
                    <p className="text-sm text-muted-foreground">
                      Vía {canalLabels[selectedInteraction.canal]}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="mt-2 font-medium">
                    {clientsById.get(selectedInteraction.clienteId)?.nombre ?? "No disponible"}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Responsable</p>
                  <p className="mt-2 font-medium">
                    {usersById.get(selectedInteraction.usuarioResponsableId)
                      ? `${usersById.get(selectedInteraction.usuarioResponsableId)?.nombre} ${usersById.get(selectedInteraction.usuarioResponsableId)?.apellido}`
                      : "No disponible"}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Contacto</p>
                  <p className="mt-2 font-medium">
                    {selectedInteraction.contactoId &&
                    contactsById.get(selectedInteraction.contactoId)
                      ? `${contactsById.get(selectedInteraction.contactoId)?.nombre} ${contactsById.get(selectedInteraction.contactoId)?.apellido}`
                      : "Sin contacto asociado"}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Fecha y hora</p>
                  <p className="mt-2 font-medium">
                    {formatDateTime(selectedInteraction.fechaHora)}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Target className="h-4 w-4 text-primary" />
                  Resultado
                </div>
                <Badge className="mt-3 inline-flex w-fit">
                  {resultadoLabels[selectedInteraction.resultado]}
                </Badge>
                <p className="mt-3 text-sm text-muted-foreground">
                  {selectedInteraction.descripcion || "Sin descripción adicional en el registro."}
                </p>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeForm}>
                  Cerrar
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cliente *</Label>
                    <Select
                      value={formData.clienteId}
                      onValueChange={(value) =>
                        setFormData({ ...formData, clienteId: value, contactoId: "" })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {crmClients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Contacto</Label>
                    <Select
                      value={formData.contactoId || ""}
                      onValueChange={(value) => setFormData({ ...formData, contactoId: value })}
                      disabled={!formData.clienteId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {clientContacts.map((contact) => (
                          <SelectItem key={contact.id} value={contact.id}>
                            {contact.nombre} {contact.apellido}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select
                      value={formData.tipoInteraccion}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          tipoInteraccion: value as CRMInteraction["tipoInteraccion"],
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(tipoLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Canal</Label>
                    <Select
                      value={formData.canal}
                      onValueChange={(value) =>
                        setFormData({ ...formData, canal: value as CRMInteraction["canal"] })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(canalLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fecha y Hora</Label>
                    <Input
                      type="datetime-local"
                      value={
                        formData.fechaHora
                          ? new Date(formData.fechaHora).toISOString().slice(0, 16)
                          : ""
                      }
                      onChange={(e) =>
                        setFormData({ ...formData, fechaHora: new Date(e.target.value) })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Resultado</Label>
                    <Select
                      value={formData.resultado}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          resultado: value as CRMInteraction["resultado"],
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(resultadoLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Responsable</Label>
                  <Select
                    value={formData.usuarioResponsableId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, usuarioResponsableId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {crmUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.nombre} {user.apellido}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Textarea
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    rows={3}
                    placeholder="Detalle de la interacción..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeForm}>
                  Cancelar
                </Button>
                <Button type="submit">Registrar</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar interacción?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
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

function Loading() {
  return null
}

export default function InteraccionesPage() {
  return (
    <Suspense fallback={<Loading />}>
      <InteraccionesContent />
    </Suspense>
  )
}
