"use client"

import React, { Suspense, useMemo, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Building2,
  Phone,
  Mail,
  Users,
  UserCheck,
  Download,
  Filter,
  AlertTriangle,
  Clock,
  BriefcaseBusiness,
  ArrowRight,
  Target,
} from "lucide-react"
import {
  useCrmClientes,
  useCrmInteracciones,
  useCrmOportunidades,
  useCrmTareas,
  useCrmUsuarios,
} from "@/lib/hooks/useCrm"
import type { CRMClient, CRMOpportunity, CRMTask } from "@/lib/types"

const tipoClienteLabels: Record<CRMClient["tipoCliente"], string> = {
  prospecto: "Prospecto",
  activo: "Activo",
  inactivo: "Inactivo",
  perdido: "Perdido",
}

const segmentoLabels: Record<CRMClient["segmento"], string> = {
  pyme: "PYME",
  corporativo: "Corporativo",
  gobierno: "Gobierno",
  startup: "Startup",
  otro: "Otro",
}

const origenLabels: Record<CRMClient["origenCliente"], string> = {
  campana: "Campaña",
  referido: "Referido",
  web: "Web",
  llamada: "Llamada",
  evento: "Evento",
  otro: "Otro",
}

const estadoRelacionLabels: Record<CRMClient["estadoRelacion"], string> = {
  nuevo: "Nuevo",
  en_negociacion: "En Negociación",
  en_riesgo: "En Riesgo",
  fidelizado: "Fidelizado",
}

const formatDate = (value?: Date | string | null) => {
  if (!value) return "Sin gestión"

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value))
}

const formatCurrency = (value: number, currency: CRMOpportunity["moneda"]) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

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

function ClientesContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const action = searchParams.get("action")
  const editId = searchParams.get("id")

  const [today] = useState(() => {
    const baseDate = new Date()
    baseDate.setHours(0, 0, 0, 0)
    return baseDate
  })

  const {
    clientes: clients,
    loading: clientsLoading,
    error,
    createCliente,
    updateCliente,
    deleteCliente,
  } = useCrmClientes()
  const { usuarios: crmUsers } = useCrmUsuarios()
  const { oportunidades } = useCrmOportunidades()
  const { interacciones } = useCrmInteracciones()
  const { tareas } = useCrmTareas()

  const usersById = useMemo(() => new Map(crmUsers.map((user) => [user.id, user])), [crmUsers])

  const opportunitiesByClient = useMemo(() => {
    const map = new Map<string, CRMOpportunity[]>()

    oportunidades
      .filter((oportunidad) => !["cerrado_ganado", "cerrado_perdido"].includes(oportunidad.etapa))
      .forEach((oportunidad) => {
        const current = map.get(oportunidad.clienteId) ?? []
        current.push(oportunidad)
        map.set(oportunidad.clienteId, current)
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

  const overdueTasksByClient = useMemo(() => {
    const map = new Map<string, number>()

    tareas
      .filter((task) => task.clienteId && task.estado !== "completada")
      .forEach((task) => {
        const overdue = getDaysUntil(task.fechaVencimiento, today)
        if (overdue !== null && overdue < 0) {
          const clientId = task.clienteId as string
          map.set(clientId, (map.get(clientId) ?? 0) + 1)
        }
      })

    return map
  }, [tareas, today])

  const lastInteractionByClient = useMemo(() => {
    const map = new Map<string, Date>()

    interacciones.forEach((interaction) => {
      const currentDate = new Date(interaction.fechaHora)
      const previousDate = map.get(interaction.clienteId)
      if (!previousDate || currentDate > previousDate) {
        map.set(interaction.clienteId, currentDate)
      }
    })

    return map
  }, [interacciones])

  const [search, setSearch] = useState("")
  const [filterTipo, setFilterTipo] = useState<string>("all")
  const [filterSegmento, setFilterSegmento] = useState<string>("all")
  const [filterEstado, setFilterEstado] = useState<string>("all")
  const [isFormOpen, setIsFormOpen] = useState(action === "new" || action === "edit")
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<CRMClient | null>(null)

  const emptyForm: Partial<CRMClient> = {
    nombre: "",
    tipoCliente: "prospecto",
    segmento: "pyme",
    industria: "",
    cuit: "",
    pais: "Argentina",
    provincia: "",
    ciudad: "",
    direccion: "",
    telefonoPrincipal: "",
    emailPrincipal: "",
    sitioWeb: "",
    origenCliente: "web",
    estadoRelacion: "nuevo",
    responsableId: "",
    notasGenerales: "",
  }

  const [formData, setFormData] = useState<Partial<CRMClient>>(emptyForm)

  const filteredClients = clients.filter((client) => {
    const matchesSearch =
      client.nombre.toLowerCase().includes(search.toLowerCase()) ||
      client.emailPrincipal?.toLowerCase().includes(search.toLowerCase()) ||
      client.industria?.toLowerCase().includes(search.toLowerCase()) ||
      client.cuit?.includes(search)
    const matchesTipo = filterTipo === "all" || client.tipoCliente === filterTipo
    const matchesSegmento = filterSegmento === "all" || client.segmento === filterSegmento
    const matchesEstado = filterEstado === "all" || client.estadoRelacion === filterEstado
    return matchesSearch && matchesTipo && matchesSegmento && matchesEstado
  })

  const clientRows = useMemo(() => {
    return filteredClients.map((client) => {
      const responsable = client.responsableId ? usersById.get(client.responsableId) : undefined
      const openOpportunities = opportunitiesByClient.get(client.id) ?? []
      const pendingTasks = pendingTasksByClient.get(client.id) ?? []
      const overdueTasks = overdueTasksByClient.get(client.id) ?? 0
      const lastInteraction = lastInteractionByClient.get(client.id)
      const daysWithoutTouch = getDaysSince(lastInteraction, today)
      const urgentClosings = openOpportunities.filter((opportunity) => {
        const daysUntilClose = getDaysUntil(opportunity.fechaEstimadaCierre, today)
        return daysUntilClose !== null && daysUntilClose <= 7
      }).length

      const pipelineByCurrency = openOpportunities.reduce<Record<string, number>>(
        (acc, opportunity) => {
          acc[opportunity.moneda] =
            (acc[opportunity.moneda] ?? 0) + Number(opportunity.montoEstimado ?? 0)
          return acc
        },
        {}
      )

      const score =
        (client.estadoRelacion === "en_riesgo" ? 4 : 0) +
        (!client.responsableId ? 2 : 0) +
        (daysWithoutTouch === null ? 2 : daysWithoutTouch > 30 ? 2 : 0) +
        overdueTasks +
        urgentClosings +
        openOpportunities.length

      return {
        client,
        responsable,
        openOpportunities,
        pendingTasks,
        overdueTasks,
        lastInteraction,
        daysWithoutTouch,
        urgentClosings,
        pipelineByCurrency,
        score,
      }
    })
  }, [
    filteredClients,
    lastInteractionByClient,
    opportunitiesByClient,
    overdueTasksByClient,
    pendingTasksByClient,
    today,
    usersById,
  ])

  const stats = useMemo(() => {
    return {
      visible: clientRows.length,
      total: clients.length,
      activos: clientRows.filter(({ client }) => client.tipoCliente === "activo").length,
      carteraActiva: clientRows.filter(({ client }) =>
        ["activo", "prospecto"].includes(client.tipoCliente)
      ).length,
      enRiesgo: clientRows.filter(({ client }) => client.estadoRelacion === "en_riesgo").length,
      seguimientoVencido: clientRows.filter(
        ({ daysWithoutTouch }) => daysWithoutTouch === null || daysWithoutTouch > 30
      ).length,
    }
  }, [clientRows, clients.length])

  const pipelineVisibleByCurrency = useMemo(() => {
    return clientRows.reduce<Record<string, number>>((acc, row) => {
      Object.entries(row.pipelineByCurrency).forEach(([currency, total]) => {
        acc[currency] = (acc[currency] ?? 0) + total
      })
      return acc
    }, {})
  }, [clientRows])

  const segmentCoverage = useMemo(() => {
    return Object.entries(
      clientRows.reduce<Record<string, number>>((acc, row) => {
        acc[row.client.segmento] = (acc[row.client.segmento] ?? 0) + 1
        return acc
      }, {})
    )
      .sort((left, right) => right[1] - left[1])
      .slice(0, 4)
  }, [clientRows])

  const ownerCoverage = useMemo(() => {
    return crmUsers
      .filter((user) => user.rol === "comercial" || user.rol === "administrador")
      .map((user) => {
        const cartera = clientRows.filter((row) => row.client.responsableId === user.id)
        return {
          id: user.id,
          nombre: `${user.nombre} ${user.apellido}`,
          cartera: cartera.length,
          riesgo: cartera.filter((row) => row.client.estadoRelacion === "en_riesgo").length,
          seguimientoVencido: cartera.filter(
            (row) => row.daysWithoutTouch === null || row.daysWithoutTouch > 30
          ).length,
          oportunidades: cartera.reduce((sum, row) => sum + row.openOpportunities.length, 0),
        }
      })
      .filter((row) => row.cartera > 0)
      .sort(
        (left, right) => right.cartera - left.cartera || right.oportunidades - left.oportunidades
      )
      .slice(0, 4)
  }, [clientRows, crmUsers])

  const alerts = useMemo(() => {
    const items: Array<{ title: string; detail: string }> = []

    const overdueTasks = clientRows.reduce((sum, row) => sum + row.overdueTasks, 0)
    const urgentClosings = clientRows.reduce((sum, row) => sum + row.urgentClosings, 0)
    const withoutResponsible = clientRows.filter((row) => !row.client.responsableId).length

    if (stats.enRiesgo > 0) {
      items.push({
        title: "Relaciones en riesgo",
        detail: `${stats.enRiesgo} clientes visibles figuran en riesgo y requieren seguimiento comercial.`,
      })
    }

    if (stats.seguimientoVencido > 0) {
      items.push({
        title: "Seguimiento vencido",
        detail: `${stats.seguimientoVencido} cuentas no muestran interacción reciente dentro de la cartera filtrada.`,
      })
    }

    if (overdueTasks > 0) {
      items.push({
        title: "Tareas vencidas",
        detail: `${overdueTasks} tareas comerciales siguen abiertas fuera de fecha comprometida.`,
      })
    }

    if (urgentClosings > 0) {
      items.push({
        title: "Cierres cercanos",
        detail: `${urgentClosings} oportunidades abiertas vencen en los próximos 7 días.`,
      })
    }

    if (withoutResponsible > 0) {
      items.push({
        title: "Cartera sin responsable",
        detail: `${withoutResponsible} clientes visibles todavía no tienen dueño comercial asignado.`,
      })
    }

    if (!items.length) {
      items.push({
        title: "Sin alertas críticas",
        detail:
          "La cartera filtrada no muestra desvíos operativos relevantes con los datos visibles del CRM.",
      })
    }

    return items.slice(0, 4)
  }, [clientRows, stats.enRiesgo, stats.seguimientoVencido])

  const highlightedClient = useMemo(() => {
    const sorted = [...clientRows].sort(
      (left, right) =>
        right.score - left.score ||
        right.openOpportunities.length - left.openOpportunities.length ||
        right.overdueTasks - left.overdueTasks
    )

    return sorted[0] ?? null
  }, [clientRows])

  const getTipoColor = (tipo: CRMClient["tipoCliente"]) => {
    const colors = {
      prospecto: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      activo: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      inactivo: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      perdido: "bg-red-500/20 text-red-400 border-red-500/30",
    }
    return colors[tipo] || "bg-gray-500/20 text-gray-400"
  }

  const getEstadoColor = (estado: CRMClient["estadoRelacion"]) => {
    const colors = {
      nuevo: "bg-sky-500/20 text-sky-400 border-sky-500/30",
      en_negociacion: "bg-violet-500/20 text-violet-400 border-violet-500/30",
      en_riesgo: "bg-rose-500/20 text-rose-400 border-rose-500/30",
      fidelizado: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    }
    return colors[estado] || "bg-gray-500/20 text-gray-400"
  }

  const openNewForm = () => {
    setSelectedClient(null)
    setFormData(emptyForm)
    setIsFormOpen(true)
  }

  const handleEdit = (client: CRMClient) => {
    setSelectedClient(client)
    setFormData({ ...client })
    setIsFormOpen(true)
  }

  const handleDelete = (client: CRMClient) => {
    setSelectedClient(client)
    setIsDeleteOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (selectedClient) {
      await updateCliente(selectedClient.id, formData)
    } else {
      await createCliente(formData as Omit<CRMClient, "id" | "createdAt" | "updatedAt">)
    }

    closeForm()
  }

  const confirmDelete = async () => {
    if (selectedClient) {
      await deleteCliente(selectedClient.id)
    }
    setIsDeleteOpen(false)
    setSelectedClient(null)
  }

  const closeForm = () => {
    setIsFormOpen(false)
    setSelectedClient(null)
    setFormData(emptyForm)
    router.push("/crm/clientes")
  }

  const clearFilters = () => {
    setSearch("")
    setFilterTipo("all")
    setFilterSegmento("all")
    setFilterEstado("all")
  }

  const hasActiveFilters =
    search || filterTipo !== "all" || filterSegmento !== "all" || filterEstado !== "all"

  if (clientsLoading && clients.length === 0) {
    return (
      <div className="flex min-h-80 items-center justify-center rounded-lg border border-dashed text-muted-foreground">
        Cargando cartera de clientes...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">Gestión completa de clientes y prospectos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
          <Button onClick={openNewForm}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Cliente
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cartera Visible</p>
                <p className="text-2xl font-bold">{stats.visible}</p>
                <p className="text-xs text-muted-foreground">{stats.total} clientes en padrón</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cartera Activa</p>
                <p className="text-2xl font-bold text-emerald-500">{stats.carteraActiva}</p>
                <p className="text-xs text-muted-foreground">{stats.activos} clientes ya activos</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <UserCheck className="h-5 w-5 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Seguimiento Vencido</p>
                <p className="text-2xl font-bold text-amber-500">{stats.seguimientoVencido}</p>
                <p className="text-xs text-muted-foreground">
                  Sin interacción reciente o sin gestión visible
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Relaciones en Riesgo</p>
                <p className="text-2xl font-bold text-rose-500">{stats.enRiesgo}</p>
                <p className="text-xs text-muted-foreground">
                  Clientes con estado comercial sensible
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-rose-500/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-rose-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {error && (
        <Card className="border-red-500/40">
          <CardContent className="pt-6 text-sm text-red-300">
            No se pudo cargar parte del CRM: {error}
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, email, industria o CUIT..."
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
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="prospecto">Prospecto</SelectItem>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="inactivo">Inactivo</SelectItem>
                  <SelectItem value="perdido">Perdido</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterSegmento} onValueChange={setFilterSegmento}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder="Segmento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pyme">PYME</SelectItem>
                  <SelectItem value="corporativo">Corporativo</SelectItem>
                  <SelectItem value="gobierno">Gobierno</SelectItem>
                  <SelectItem value="startup">Startup</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterEstado} onValueChange={setFilterEstado}>
                <SelectTrigger className="w-full md:w-45">
                  <SelectValue placeholder="Estado relación" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="nuevo">Nuevo</SelectItem>
                  <SelectItem value="en_negociacion">En Negociación</SelectItem>
                  <SelectItem value="en_riesgo">En Riesgo</SelectItem>
                  <SelectItem value="fidelizado">Fidelizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {hasActiveFilters && (
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {filteredClients.length} de {clients.length} clientes
                </span>
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Radar comercial</CardTitle>
            <CardDescription>
              Alertas de seguimiento, cierre y asignación derivadas de clientes, oportunidades e
              interacciones visibles.
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
            <CardTitle>Pipeline visible</CardTitle>
            <CardDescription>
              Importes abiertos separados por moneda y composición actual de la cartera filtrada.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <BriefcaseBusiness className="h-4 w-4 text-primary" />
                Oportunidades abiertas por moneda
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {Object.entries(pipelineVisibleByCurrency).length > 0 ? (
                  Object.entries(pipelineVisibleByCurrency).map(([currency, total]) => (
                    <Badge key={currency} variant="outline">
                      {formatCurrency(total, currency as CRMOpportunity["moneda"])}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Sin pipeline abierto visible con los filtros actuales.
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {segmentCoverage.map(([segment, total]) => (
                <div key={segment} className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">
                    {segmentoLabels[segment as CRMClient["segmento"]]}
                  </p>
                  <p className="mt-2 text-2xl font-semibold">{total}</p>
                </div>
              ))}
              {segmentCoverage.length === 0 && (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground sm:col-span-2">
                  No hay cobertura por segmento para resumir con la cartera filtrada.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Cliente destacado</CardTitle>
              <CardDescription>
                Cuenta que hoy concentra mayor presión comercial según riesgo, pendientes y
                pipeline.
              </CardDescription>
            </div>
            {highlightedClient && (
              <Link href={`/crm/clientes/${highlightedClient.client.id}`}>
                <Button variant="ghost" size="sm">
                  Ver detalle
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {highlightedClient ? (
              <div className="space-y-4 rounded-lg border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold">{highlightedClient.client.nombre}</p>
                    <p className="text-sm text-muted-foreground">
                      {segmentoLabels[highlightedClient.client.segmento]} ·{" "}
                      {estadoRelacionLabels[highlightedClient.client.estadoRelacion]}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={getTipoColor(highlightedClient.client.tipoCliente)}
                  >
                    {tipoClienteLabels[highlightedClient.client.tipoCliente]}
                  </Badge>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Última gestión</p>
                    <p className="mt-2 font-medium">
                      {formatDate(highlightedClient.lastInteraction)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {highlightedClient.daysWithoutTouch === null
                        ? "Sin interacción visible"
                        : `${highlightedClient.daysWithoutTouch} días desde el último contacto`}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Responsable</p>
                    <p className="mt-2 font-medium">
                      {highlightedClient.responsable
                        ? `${highlightedClient.responsable.nombre} ${highlightedClient.responsable.apellido}`
                        : "Sin responsable asignado"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {highlightedClient.openOpportunities.length} oportunidades abiertas ·{" "}
                      {highlightedClient.pendingTasks.length} tareas abiertas
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border p-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Target className="h-4 w-4 text-primary" />
                    Pipeline por moneda
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {Object.entries(highlightedClient.pipelineByCurrency).length > 0 ? (
                      Object.entries(highlightedClient.pipelineByCurrency).map(
                        ([currency, total]) => (
                          <Badge key={currency} variant="outline">
                            {formatCurrency(total, currency as CRMOpportunity["moneda"])}
                          </Badge>
                        )
                      )
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Sin oportunidades abiertas visibles.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No hay clientes visibles para destacar con los filtros actuales.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Responsables con carga</CardTitle>
            <CardDescription>
              Distribución operativa de la cartera filtrada entre comerciales visibles.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {ownerCoverage.map((owner) => (
              <div key={owner.id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">{owner.nombre}</p>
                    <p className="text-sm text-muted-foreground">
                      {owner.cartera} clientes · {owner.oportunidades} oportunidades abiertas
                    </p>
                  </div>
                  <Badge variant={owner.riesgo > 0 ? "destructive" : "outline"}>
                    {owner.riesgo} en riesgo
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {owner.seguimientoVencido} cuentas con seguimiento vencido dentro de su cartera.
                </p>
              </div>
            ))}
            {ownerCoverage.length === 0 && (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Ningún responsable comercial aparece asociado a la cartera filtrada.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Segmento</TableHead>
                <TableHead>Estado Relación</TableHead>
                <TableHead>Pipeline</TableHead>
                <TableHead>Última Gestión</TableHead>
                <TableHead>Pendientes</TableHead>
                <TableHead>Responsable</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientRows.map((row) => {
                const { client, responsable } = row
                return (
                  <TableRow key={client.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/crm/clientes/${client.id}`}
                            className="font-medium hover:underline block truncate"
                          >
                            {client.nombre}
                          </Link>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            {client.emailPrincipal && (
                              <span className="flex items-center gap-1 truncate">
                                <Mail className="h-3 w-3 shrink-0" />
                                <span className="truncate">{client.emailPrincipal}</span>
                              </span>
                            )}
                            {client.telefonoPrincipal && (
                              <span className="hidden items-center gap-1 lg:flex">
                                <Phone className="h-3 w-3" />
                                {client.telefonoPrincipal}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getTipoColor(client.tipoCliente)}>
                        {tipoClienteLabels[client.tipoCliente]}
                      </Badge>
                    </TableCell>
                    <TableCell>{segmentoLabels[client.segmento]}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getEstadoColor(client.estadoRelacion)}>
                        {estadoRelacionLabels[client.estadoRelacion]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(row.pipelineByCurrency).length > 0 ? (
                          Object.entries(row.pipelineByCurrency).map(([currency, total]) => (
                            <Badge key={currency} variant="outline">
                              {formatCurrency(total, currency as CRMOpportunity["moneda"])}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">Sin pipeline</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p>{formatDate(row.lastInteraction)}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.daysWithoutTouch === null
                            ? "Sin gestión registrada"
                            : `${row.daysWithoutTouch} días desde el último contacto`}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        <p>{row.pendingTasks.length} abiertas</p>
                        <p className="text-xs text-muted-foreground">
                          {row.overdueTasks} vencidas · {row.urgentClosings} cierres próximos
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {responsable ? `${responsable.nombre} ${responsable.apellido}` : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/crm/clientes/${client.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              Ver detalle
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(client)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(client)}
                            className="text-red-500 focus:text-red-500"
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
              {clientRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="h-8 w-8 text-muted-foreground/50" />
                      <p className="text-muted-foreground">No se encontraron clientes</p>
                      {hasActiveFilters && (
                        <Button variant="link" onClick={clearFilters}>
                          Limpiar filtros
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedClient ? "Editar Cliente" : "Nuevo Cliente"}</DialogTitle>
            <DialogDescription>
              {selectedClient
                ? "Modifica los datos del cliente. Los campos marcados con * son obligatorios."
                : "Completa los datos del nuevo cliente. Los campos marcados con * son obligatorios."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              {/* Información básica */}
              <div className="space-y-1">
                <h4 className="font-medium text-sm text-muted-foreground">Información Básica</h4>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre / Razón Social *</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Ej: Empresa S.A."
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cuit">CUIT / ID Fiscal</Label>
                  <Input
                    id="cuit"
                    value={formData.cuit}
                    onChange={(e) => setFormData({ ...formData, cuit: e.target.value })}
                    placeholder="Ej: 30-12345678-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipoCliente">Tipo de Cliente *</Label>
                  <Select
                    value={formData.tipoCliente}
                    onValueChange={(value) =>
                      setFormData({ ...formData, tipoCliente: value as CRMClient["tipoCliente"] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(tipoClienteLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="segmento">Segmento *</Label>
                  <Select
                    value={formData.segmento}
                    onValueChange={(value) =>
                      setFormData({ ...formData, segmento: value as CRMClient["segmento"] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(segmentoLabels).map(([value, label]) => (
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
                  <Label htmlFor="industria">Industria</Label>
                  <Input
                    id="industria"
                    value={formData.industria}
                    onChange={(e) => setFormData({ ...formData, industria: e.target.value })}
                    placeholder="Ej: Tecnología"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="origenCliente">Origen del Cliente</Label>
                  <Select
                    value={formData.origenCliente}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        origenCliente: value as CRMClient["origenCliente"],
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(origenLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Contacto */}
              <div className="space-y-1 pt-2">
                <h4 className="font-medium text-sm text-muted-foreground">
                  Información de Contacto
                </h4>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emailPrincipal">Email Principal</Label>
                  <Input
                    id="emailPrincipal"
                    type="email"
                    value={formData.emailPrincipal}
                    onChange={(e) => setFormData({ ...formData, emailPrincipal: e.target.value })}
                    placeholder="contacto@empresa.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefonoPrincipal">Teléfono Principal</Label>
                  <Input
                    id="telefonoPrincipal"
                    value={formData.telefonoPrincipal}
                    onChange={(e) =>
                      setFormData({ ...formData, telefonoPrincipal: e.target.value })
                    }
                    placeholder="+54 11 1234-5678"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sitioWeb">Sitio Web</Label>
                <Input
                  id="sitioWeb"
                  value={formData.sitioWeb}
                  onChange={(e) => setFormData({ ...formData, sitioWeb: e.target.value })}
                  placeholder="www.empresa.com"
                />
              </div>

              {/* Ubicación */}
              <div className="space-y-1 pt-2">
                <h4 className="font-medium text-sm text-muted-foreground">Ubicación</h4>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pais">País</Label>
                  <Input
                    id="pais"
                    value={formData.pais}
                    onChange={(e) => setFormData({ ...formData, pais: e.target.value })}
                    placeholder="Argentina"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="provincia">Provincia</Label>
                  <Input
                    id="provincia"
                    value={formData.provincia}
                    onChange={(e) => setFormData({ ...formData, provincia: e.target.value })}
                    placeholder="Buenos Aires"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ciudad">Ciudad</Label>
                  <Input
                    id="ciudad"
                    value={formData.ciudad}
                    onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                    placeholder="CABA"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="direccion">Dirección</Label>
                <Input
                  id="direccion"
                  value={formData.direccion}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                  placeholder="Av. Corrientes 1234, Piso 5"
                />
              </div>

              {/* Estado y Responsable */}
              <div className="space-y-1 pt-2">
                <h4 className="font-medium text-sm text-muted-foreground">Gestión</h4>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="estadoRelacion">Estado de Relación</Label>
                  <Select
                    value={formData.estadoRelacion}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        estadoRelacion: value as CRMClient["estadoRelacion"],
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(estadoRelacionLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="responsableId">Responsable</Label>
                  <Select
                    value={formData.responsableId || ""}
                    onValueChange={(value) => setFormData({ ...formData, responsableId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar responsable" />
                    </SelectTrigger>
                    <SelectContent>
                      {crmUsers
                        .filter((u) => u.rol === "comercial" || u.rol === "administrador")
                        .map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.nombre} {user.apellido}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notasGenerales">Notas Generales</Label>
                <Textarea
                  id="notasGenerales"
                  value={formData.notasGenerales}
                  onChange={(e) => setFormData({ ...formData, notasGenerales: e.target.value })}
                  placeholder="Información adicional sobre el cliente..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeForm}>
                Cancelar
              </Button>
              <Button type="submit">{selectedClient ? "Guardar Cambios" : "Crear Cliente"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de eliminar a <strong>{selectedClient?.nombre}</strong>. Esta acción
              eliminará también todos los contactos, oportunidades e interacciones asociadas. Esta
              acción no se puede deshacer.
            </AlertDialogDescription>
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

export default function ClientesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Cargando clientes...</div>
        </div>
      }
    >
      <ClientesContent />
    </Suspense>
  )
}

// loading.tsx
// export default function Loading() {
//   return null;
// }
