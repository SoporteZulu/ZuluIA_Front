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
  Target,
  DollarSign,
  TrendingUp,
  Building2,
  Calendar,
  ArrowRight,
  Clock,
} from "lucide-react"
import {
  useCrmOportunidades,
  useCrmClientes,
  useCrmContactos,
  useCrmUsuarios,
  useCrmInteracciones,
  useCrmTareas,
} from "@/lib/hooks/useCrm"
import type { CRMOpportunity } from "@/lib/types"

const etapaLabels: Record<CRMOpportunity["etapa"], string> = {
  lead: "Lead",
  calificado: "Calificado",
  propuesta: "Propuesta",
  negociacion: "Negociación",
  cerrado_ganado: "Cerrado Ganado",
  cerrado_perdido: "Cerrado Perdido",
}

const origenLabels: Record<CRMOpportunity["origen"], string> = {
  campana: "Campaña",
  referido: "Referido",
  web: "Web",
  llamada: "Llamada",
  evento: "Evento",
  otro: "Otro",
}

const formatDate = (date?: Date | string | null) => {
  if (!date) return "Sin fecha"
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date))
}

const formatCurrency = (value: number, currency: string = "USD") => {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(value)
}

const getDaysUntil = (value?: Date | string | null, referenceDate?: Date) => {
  if (!value) return null
  const today = new Date(referenceDate ?? new Date())
  today.setHours(0, 0, 0, 0)
  const target = new Date(value)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

function OportunidadesContent() {
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
  const [filterEtapa, setFilterEtapa] = useState<string>("all")
  const [isFormOpen, setIsFormOpen] = useState(action === "new")
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedOpp, setSelectedOpp] = useState<CRMOpportunity | null>(null)
  const { oportunidades, loading, error, createOportunidad, updateOportunidad, deleteOportunidad } =
    useCrmOportunidades(clienteIdParam || undefined)
  const { clientes: crmClients } = useCrmClientes()
  const { contactos: crmContacts } = useCrmContactos()
  const { usuarios: crmUsers } = useCrmUsuarios()
  const { interacciones } = useCrmInteracciones(clienteIdParam || undefined)
  const { tareas } = useCrmTareas(clienteIdParam || undefined)

  const clientsById = useMemo(
    () => new Map(crmClients.map((client) => [client.id, client])),
    [crmClients]
  )
  const usersById = useMemo(() => new Map(crmUsers.map((user) => [user.id, user])), [crmUsers])

  const emptyForm: Partial<CRMOpportunity> = {
    clienteId: clienteIdParam || "",
    contactoPrincipalId: "",
    titulo: "",
    etapa: "lead",
    probabilidad: 25,
    montoEstimado: 0,
    moneda: "USD",
    fechaApertura: new Date(),
    responsableId: "",
    origen: "web",
    notas: "",
  }

  const [formData, setFormData] = useState<Partial<CRMOpportunity>>(emptyForm)

  const filteredOpps = oportunidades.filter((opp) => {
    const matchesSearch = opp.titulo.toLowerCase().includes(search.toLowerCase())
    const matchesEtapa = filterEtapa === "all" || opp.etapa === filterEtapa
    return matchesSearch && matchesEtapa
  })

  const opportunityRows = useMemo(() => {
    return filteredOpps.map((opp) => {
      const cliente = clientsById.get(opp.clienteId)
      const responsable = opp.responsableId ? usersById.get(opp.responsableId) : undefined
      const relatedInteractions = interacciones.filter(
        (interaction) => interaction.oportunidadId === opp.id
      )
      const relatedTasks = tareas.filter(
        (task) => task.oportunidadId === opp.id && task.estado !== "completada"
      )
      const lastInteraction = relatedInteractions.reduce<Date | null>((latest, interaction) => {
        const current = new Date(interaction.fechaHora)
        if (!latest || current > latest) return current
        return latest
      }, null)
      const daysToClose = getDaysUntil(opp.fechaEstimadaCierre, today)
      const overdueTasks = relatedTasks.filter((task) => {
        const diff = getDaysUntil(task.fechaVencimiento, today)
        return diff !== null && diff < 0
      }).length
      const score =
        (daysToClose !== null && daysToClose < 0 ? 4 : 0) +
        (daysToClose !== null && daysToClose <= 7 ? 2 : 0) +
        (opp.probabilidad <= 40 ? 1 : 0) +
        overdueTasks +
        (lastInteraction ? 0 : 2)

      return {
        opp,
        cliente,
        responsable,
        relatedInteractions,
        relatedTasks,
        lastInteraction,
        daysToClose,
        overdueTasks,
        score,
      }
    })
  }, [clientsById, filteredOpps, interacciones, tareas, today, usersById])

  const stats = useMemo(() => {
    return {
      total: opportunityRows.length,
      ganadas: opportunityRows.filter(({ opp }) => opp.etapa === "cerrado_ganado").length,
      enPipeline: opportunityRows.filter(
        ({ opp }) => !["cerrado_ganado", "cerrado_perdido"].includes(opp.etapa)
      ).length,
      porVencer: opportunityRows.filter(
        ({ daysToClose, opp }) =>
          !["cerrado_ganado", "cerrado_perdido"].includes(opp.etapa) &&
          daysToClose !== null &&
          daysToClose <= 7
      ).length,
    }
  }, [opportunityRows])

  const pipelineByCurrency = useMemo(() => {
    return opportunityRows.reduce<Record<string, number>>((acc, row) => {
      if (["cerrado_ganado", "cerrado_perdido"].includes(row.opp.etapa)) return acc
      acc[row.opp.moneda] = (acc[row.opp.moneda] ?? 0) + Number(row.opp.montoEstimado ?? 0)
      return acc
    }, {})
  }, [opportunityRows])

  const alerts = useMemo(() => {
    const items: Array<{ title: string; detail: string }> = []
    const overdueClosings = opportunityRows.filter(
      ({ opp, daysToClose }) =>
        !["cerrado_ganado", "cerrado_perdido"].includes(opp.etapa) &&
        daysToClose !== null &&
        daysToClose < 0
    ).length
    const withoutTouch = opportunityRows.filter(
      ({ lastInteraction, opp }) =>
        !["cerrado_ganado", "cerrado_perdido"].includes(opp.etapa) && !lastInteraction
    ).length
    const overdueTasks = opportunityRows.reduce((sum, row) => sum + row.overdueTasks, 0)

    if (overdueClosings > 0) {
      items.push({
        title: "Cierres vencidos",
        detail: `${overdueClosings} oportunidades abiertas ya superaron la fecha estimada de cierre.`,
      })
    }
    if (withoutTouch > 0) {
      items.push({
        title: "Sin seguimiento",
        detail: `${withoutTouch} oportunidades visibles no tienen interacciones asociadas en la carga actual.`,
      })
    }
    if (overdueTasks > 0) {
      items.push({
        title: "Tareas vencidas",
        detail: `${overdueTasks} tareas asociadas a oportunidades siguen abiertas fuera de fecha.`,
      })
    }
    if (!items.length) {
      items.push({
        title: "Sin alertas críticas",
        detail: "El pipeline visible no presenta desvíos fuertes con los datos actuales.",
      })
    }

    return items.slice(0, 4)
  }, [opportunityRows])

  const ownerLoad = useMemo(() => {
    return crmUsers
      .filter((user) => ["comercial", "administrador"].includes(user.rol))
      .map((user) => {
        const assigned = opportunityRows.filter((row) => row.opp.responsableId === user.id)
        if (!assigned.length) return null
        return {
          id: user.id,
          nombre: `${user.nombre} ${user.apellido}`,
          total: assigned.length,
          porVencer: assigned.filter(
            (row) =>
              row.daysToClose !== null &&
              row.daysToClose <= 7 &&
              !["cerrado_ganado", "cerrado_perdido"].includes(row.opp.etapa)
          ).length,
          overdueTasks: assigned.reduce((sum, row) => sum + row.overdueTasks, 0),
        }
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .sort((left, right) => right.total - left.total || right.porVencer - left.porVencer)
      .slice(0, 4)
  }, [crmUsers, opportunityRows])

  const highlightedOpp = useMemo(() => {
    const sorted = [...opportunityRows].sort(
      (left, right) =>
        right.score - left.score ||
        Number(right.opp.montoEstimado ?? 0) - Number(left.opp.montoEstimado ?? 0)
    )
    return sorted[0] ?? null
  }, [opportunityRows])

  const getEtapaColor = (etapa: CRMOpportunity["etapa"]) => {
    const colors = {
      lead: "bg-slate-500/20 text-slate-400",
      calificado: "bg-blue-500/20 text-blue-400",
      propuesta: "bg-violet-500/20 text-violet-400",
      negociacion: "bg-amber-500/20 text-amber-400",
      cerrado_ganado: "bg-emerald-500/20 text-emerald-400",
      cerrado_perdido: "bg-red-500/20 text-red-400",
    }
    return colors[etapa]
  }

  const openNewForm = () => {
    setSelectedOpp(null)
    setFormData(emptyForm)
    setIsFormOpen(true)
  }

  const handleEdit = (opp: CRMOpportunity) => {
    setSelectedOpp(opp)
    setFormData({ ...opp })
    setIsFormOpen(true)
  }

  const handleDelete = (opp: CRMOpportunity) => {
    setSelectedOpp(opp)
    setIsDeleteOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedOpp) {
      await updateOportunidad(selectedOpp.id, formData)
    } else {
      await createOportunidad(formData as Omit<CRMOpportunity, "id" | "createdAt" | "updatedAt">)
    }
    closeForm()
  }

  const confirmDelete = async () => {
    if (selectedOpp) {
      await deleteOportunidad(selectedOpp.id)
    }
    setIsDeleteOpen(false)
    setSelectedOpp(null)
  }

  const closeForm = () => {
    setIsFormOpen(false)
    setSelectedOpp(null)
    setFormData(emptyForm)
    router.push("/crm/oportunidades")
  }

  if (loading && oportunidades.length === 0) {
    return (
      <div className="flex min-h-80 items-center justify-center rounded-lg border border-dashed text-muted-foreground">
        Cargando pipeline comercial...
      </div>
    )
  }

  const clientContacts = formData.clienteId
    ? crmContacts.filter((c) => c.clienteId === formData.clienteId)
    : []

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Oportunidades</h1>
          <p className="text-muted-foreground">Pipeline de ventas y negocios</p>
        </div>
        <Button onClick={openNewForm}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Oportunidad
        </Button>
      </div>

      {error && (
        <Card className="border-red-500/40">
          <CardContent className="pt-6 text-sm text-red-300">
            No se pudo cargar parte del pipeline: {error}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Target className="h-8 w-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Valor Pipeline</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {Object.entries(pipelineByCurrency).length > 0 ? (
                    Object.entries(pipelineByCurrency).map(([currency, total]) => (
                      <Badge key={currency} variant="outline">
                        {formatCurrency(total, currency)}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Sin pipeline abierto visible</p>
                  )}
                </div>
              </div>
              <DollarSign className="h-8 w-8 text-emerald-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">En Pipeline</p>
                <p className="text-2xl font-bold text-blue-500">{stats.enPipeline}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Por vencer</p>
                <p className="text-2xl font-bold text-amber-500">{stats.porVencer}</p>
              </div>
              <Clock className="h-8 w-8 text-amber-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Radar de pipeline</CardTitle>
            <CardDescription>
              Alertas visibles de cierres vencidos, falta de seguimiento y tareas fuera de fecha.
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
            <CardTitle>Responsables con carga</CardTitle>
            <CardDescription>
              Distribución visible de oportunidades por responsable comercial.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {ownerLoad.map((owner) => (
              <div key={owner.id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">{owner.nombre}</p>
                    <p className="text-sm text-muted-foreground">
                      {owner.total} oportunidades visibles
                    </p>
                  </div>
                  <Badge variant={owner.porVencer > 0 ? "destructive" : "outline"}>
                    {owner.porVencer} por vencer
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {owner.overdueTasks} tareas vencidas asociadas.
                </p>
              </div>
            ))}
            {ownerLoad.length === 0 && (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No hay responsables con pipeline visible en los filtros actuales.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Oportunidad destacada</CardTitle>
            <CardDescription>
              Negocio con mayor presión visible entre fecha de cierre, seguimiento y tareas
              abiertas.
            </CardDescription>
          </div>
          {highlightedOpp?.cliente && (
            <Link href={`/crm/clientes/${highlightedOpp.cliente.id}`}>
              <Button variant="ghost" size="sm">
                Ver cliente
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          )}
        </CardHeader>
        <CardContent>
          {highlightedOpp ? (
            <div className="grid gap-4 rounded-lg border p-4 lg:grid-cols-3">
              <div>
                <p className="text-lg font-semibold">{highlightedOpp.opp.titulo}</p>
                <p className="text-sm text-muted-foreground">
                  {highlightedOpp.cliente?.nombre || "Cliente no disponible"}
                </p>
                <Badge className="mt-3 {''}">{etapaLabels[highlightedOpp.opp.etapa]}</Badge>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-sm text-muted-foreground">Seguimiento</p>
                <p className="mt-2 font-medium">
                  {highlightedOpp.lastInteraction
                    ? formatDate(highlightedOpp.lastInteraction)
                    : "Sin interacción"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {highlightedOpp.relatedInteractions.length} interacciones visibles
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-sm text-muted-foreground">Presión operativa</p>
                <p className="mt-2 font-medium">
                  {highlightedOpp.relatedTasks.length} tareas abiertas
                </p>
                <p className="text-xs text-muted-foreground">
                  {highlightedOpp.daysToClose === null
                    ? "Sin cierre estimado"
                    : `${highlightedOpp.daysToClose} días al cierre estimado`}
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No hay oportunidades visibles para destacar.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar oportunidades..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterEtapa} onValueChange={setFilterEtapa}>
              <SelectTrigger className="w-full md:w-45">
                <SelectValue placeholder="Etapa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {Object.entries(etapaLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Oportunidad</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Seguimiento</TableHead>
                <TableHead>Cierre</TableHead>
                <TableHead>Responsable</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {opportunityRows.map((row) => {
                const { opp, cliente, responsable } = row
                return (
                  <TableRow key={opp.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                          <Target className="h-5 w-5 text-primary" />
                        </div>
                        <span className="font-medium">{opp.titulo}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {cliente ? (
                        <Link
                          href={`/crm/clientes/${cliente.id}`}
                          className="hover:underline flex items-center gap-1"
                        >
                          <Building2 className="h-3 w-3" />
                          {cliente.nombre}
                        </Link>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={getEtapaColor(opp.etapa)}>{etapaLabels[opp.etapa]}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(opp.montoEstimado, opp.moneda)}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        <p>
                          {row.lastInteraction
                            ? formatDate(row.lastInteraction)
                            : "Sin interacción"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {row.relatedTasks.length} tareas abiertas · {opp.probabilidad}% prob.
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {opp.fechaEstimadaCierre ? (
                        <span className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3" />
                          {formatDate(opp.fechaEstimadaCierre)}
                        </span>
                      ) : (
                        "-"
                      )}
                      {row.daysToClose !== null && (
                        <p className="mt-1 text-xs text-muted-foreground">{row.daysToClose} días</p>
                      )}
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
                            className="opacity-0 group-hover:opacity-100"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(opp)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(opp)}
                            className="text-red-500"
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
              {opportunityRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No se encontraron oportunidades
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedOpp ? "Editar Oportunidad" : "Nueva Oportunidad"}</DialogTitle>
            <DialogDescription>
              {selectedOpp ? "Modifica los datos" : "Ingresa los datos de la nueva oportunidad"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Título *</Label>
                <Input
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cliente *</Label>
                  <Select
                    value={formData.clienteId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, clienteId: value, contactoPrincipalId: "" })
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
                    value={formData.contactoPrincipalId || ""}
                    onValueChange={(value) =>
                      setFormData({ ...formData, contactoPrincipalId: value })
                    }
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
                  <Label>Etapa</Label>
                  <Select
                    value={formData.etapa}
                    onValueChange={(value) =>
                      setFormData({ ...formData, etapa: value as CRMOpportunity["etapa"] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(etapaLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Probabilidad (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={formData.probabilidad}
                    onChange={(e) =>
                      setFormData({ ...formData, probabilidad: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Monto Estimado</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.montoEstimado}
                    onChange={(e) =>
                      setFormData({ ...formData, montoEstimado: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Moneda</Label>
                  <Select
                    value={formData.moneda}
                    onValueChange={(value) =>
                      setFormData({ ...formData, moneda: value as CRMOpportunity["moneda"] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="ARS">ARS</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="MXN">MXN</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cierre Esperado</Label>
                  <Input
                    type="date"
                    value={
                      formData.fechaEstimadaCierre
                        ? new Date(formData.fechaEstimadaCierre).toISOString().split("T")[0]
                        : ""
                    }
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        fechaEstimadaCierre: e.target.value ? new Date(e.target.value) : undefined,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Responsable</Label>
                  <Select
                    value={formData.responsableId || ""}
                    onValueChange={(value) => setFormData({ ...formData, responsableId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {crmUsers
                        .filter((u) => ["comercial", "administrador"].includes(u.rol))
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
                <Label>Origen</Label>
                <Select
                  value={formData.origen}
                  onValueChange={(value) =>
                    setFormData({ ...formData, origen: value as CRMOpportunity["origen"] })
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
              <div className="space-y-2">
                <Label>Notas</Label>
                <Textarea
                  value={formData.notas}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeForm}>
                Cancelar
              </Button>
              <Button type="submit">{selectedOpp ? "Guardar" : "Crear"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar oportunidad?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de eliminar &quot;{selectedOpp?.titulo}&quot;.
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

export default function OportunidadesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          Cargando...
        </div>
      }
    >
      <OportunidadesContent />
    </Suspense>
  )
}
