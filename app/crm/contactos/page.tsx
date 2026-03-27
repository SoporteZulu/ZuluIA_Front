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
  User,
  Mail,
  Building2,
  ArrowRight,
  BriefcaseBusiness,
} from "lucide-react"
import {
  useCrmContactos,
  useCrmClientes,
  useCrmInteracciones,
  useCrmOportunidades,
  useCrmTareas,
} from "@/lib/hooks/useCrm"
import type { CRMContact, CRMOpportunity } from "@/lib/types"

const canalLabels: Record<CRMContact["canalPreferido"], string> = {
  email: "Email",
  telefono: "Teléfono",
  whatsapp: "WhatsApp",
  presencial: "Presencial",
}

const estadoLabels: Record<CRMContact["estadoContacto"], string> = {
  activo: "Activo",
  no_contactar: "No Contactar",
  bounced: "Bounced",
  inactivo: "Inactivo",
}

const formatDateTime = (value?: Date | string | null) => {
  if (!value) return "Sin interacción"

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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

function ContactosContent() {
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
  const [filterCliente, setFilterCliente] = useState<string>("all")
  const [filterEstado, setFilterEstado] = useState<string>("all")
  const [isFormOpen, setIsFormOpen] = useState(action === "new")
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedContact, setSelectedContact] = useState<CRMContact | null>(null)
  const { contactos, loading, error, createContacto, updateContacto, deleteContacto } =
    useCrmContactos(clienteIdParam || undefined)
  const { clientes: crmClients } = useCrmClientes()
  const { interacciones } = useCrmInteracciones(clienteIdParam || undefined)
  const { oportunidades } = useCrmOportunidades(clienteIdParam || undefined)
  const { tareas } = useCrmTareas(clienteIdParam || undefined)

  const clientsById = useMemo(
    () => new Map(crmClients.map((client) => [client.id, client])),
    [crmClients]
  )

  const emptyForm: Partial<CRMContact> = {
    clienteId: clienteIdParam || "",
    nombre: "",
    apellido: "",
    cargo: "",
    email: "",
    telefono: "",
    canalPreferido: "email",
    estadoContacto: "activo",
    notas: "",
  }

  const [formData, setFormData] = useState<Partial<CRMContact>>(emptyForm)

  const filteredContacts = contactos.filter((contact) => {
    const matchesSearch =
      `${contact.nombre} ${contact.apellido}`.toLowerCase().includes(search.toLowerCase()) ||
      contact.email?.toLowerCase().includes(search.toLowerCase()) ||
      contact.cargo?.toLowerCase().includes(search.toLowerCase())
    const matchesCliente = filterCliente === "all" || contact.clienteId === filterCliente
    const matchesEstado = filterEstado === "all" || contact.estadoContacto === filterEstado
    return matchesSearch && matchesCliente && matchesEstado
  })

  const contactRows = useMemo(() => {
    return filteredContacts.map((contact) => {
      const cliente = clientsById.get(contact.clienteId)
      const contactInteractions = interacciones.filter(
        (interaction) => interaction.contactoId === contact.id
      )
      const contactTasks = tareas.filter(
        (task) => task.clienteId === contact.clienteId && task.estado !== "completada"
      )
      const contactPipeline = oportunidades.filter(
        (opportunity) =>
          opportunity.clienteId === contact.clienteId &&
          opportunity.contactoPrincipalId === contact.id &&
          !["cerrado_ganado", "cerrado_perdido"].includes(opportunity.etapa)
      )
      const lastInteraction = contactInteractions.reduce<Date | null>((latest, interaction) => {
        const current = new Date(interaction.fechaHora)
        if (!latest || current > latest) return current
        return latest
      }, null)
      const daysSinceLastTouch = getDaysSince(lastInteraction, today)
      const pipelineByCurrency = contactPipeline.reduce<Record<string, number>>(
        (acc, opportunity) => {
          acc[opportunity.moneda] =
            (acc[opportunity.moneda] ?? 0) + Number(opportunity.montoEstimado ?? 0)
          return acc
        },
        {}
      )

      const score =
        (contact.estadoContacto === "no_contactar" ? 4 : 0) +
        (contact.estadoContacto === "bounced" ? 3 : 0) +
        (daysSinceLastTouch === null ? 2 : daysSinceLastTouch > 30 ? 2 : 0) +
        contactTasks.length +
        contactPipeline.length

      return {
        contact,
        cliente,
        contactInteractions,
        contactTasks,
        contactPipeline,
        lastInteraction,
        daysSinceLastTouch,
        pipelineByCurrency,
        score,
      }
    })
  }, [clientsById, filteredContacts, interacciones, oportunidades, tareas, today])

  const stats = useMemo(() => {
    return {
      visible: contactRows.length,
      activos: contactRows.filter(({ contact }) => contact.estadoContacto === "activo").length,
      preferWhatsApp: contactRows.filter(({ contact }) => contact.canalPreferido === "whatsapp")
        .length,
      sinGestionReciente: contactRows.filter(
        ({ daysSinceLastTouch }) => daysSinceLastTouch === null || daysSinceLastTouch > 30
      ).length,
    }
  }, [contactRows])

  const channelCoverage = useMemo(() => {
    return Object.entries(
      contactRows.reduce<Record<string, number>>((acc, row) => {
        acc[row.contact.canalPreferido] = (acc[row.contact.canalPreferido] ?? 0) + 1
        return acc
      }, {})
    ).sort((left, right) => right[1] - left[1])
  }, [contactRows])

  const accountCoverage = useMemo(() => {
    return crmClients
      .map((client) => {
        const clientContacts = contactRows.filter((row) => row.contact.clienteId === client.id)
        if (!clientContacts.length) return null

        return {
          id: client.id,
          nombre: client.nombre,
          contactos: clientContacts.length,
          sinGestion: clientContacts.filter(
            (row) => row.daysSinceLastTouch === null || row.daysSinceLastTouch > 30
          ).length,
          noContactar: clientContacts.filter((row) => row.contact.estadoContacto === "no_contactar")
            .length,
        }
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .sort((left, right) => right.contactos - left.contactos || right.sinGestion - left.sinGestion)
      .slice(0, 4)
  }, [contactRows, crmClients])

  const alerts = useMemo(() => {
    const items: Array<{ title: string; detail: string }> = []
    const bounced = contactRows.filter(({ contact }) => contact.estadoContacto === "bounced").length
    const noContact = contactRows.filter(
      ({ contact }) => contact.estadoContacto === "no_contactar"
    ).length
    const withoutTouch = contactRows.filter(
      ({ daysSinceLastTouch }) => daysSinceLastTouch === null || daysSinceLastTouch > 30
    ).length

    if (bounced > 0) {
      items.push({
        title: "Correos rebotados",
        detail: `${bounced} contactos visibles están en bounced y conviene revisar su canal preferido.`,
      })
    }

    if (noContact > 0) {
      items.push({
        title: "Bloqueo comercial",
        detail: `${noContact} contactos están marcados como no contactar dentro de la red filtrada.`,
      })
    }

    if (withoutTouch > 0) {
      items.push({
        title: "Sin gestión reciente",
        detail: `${withoutTouch} contactos no muestran interacción reciente o no tienen actividad visible registrada.`,
      })
    }

    if (!items.length) {
      items.push({
        title: "Sin alertas críticas",
        detail: "La red visible de contactos no presenta desvíos fuertes con la carga actual.",
      })
    }

    return items.slice(0, 4)
  }, [contactRows])

  const highlightedContact = useMemo(() => {
    const sorted = [...contactRows].sort(
      (left, right) =>
        right.score - left.score || right.contactPipeline.length - left.contactPipeline.length
    )

    return sorted[0] ?? null
  }, [contactRows])

  const getEstadoColor = (estado: CRMContact["estadoContacto"]) => {
    const colors = {
      activo: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      no_contactar: "bg-red-500/20 text-red-400 border-red-500/30",
      bounced: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      inactivo: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    }
    return colors[estado]
  }

  const openNewForm = () => {
    setSelectedContact(null)
    setFormData(emptyForm)
    setIsFormOpen(true)
  }

  const handleEdit = (contact: CRMContact) => {
    setSelectedContact(contact)
    setFormData({ ...contact })
    setIsFormOpen(true)
  }

  const handleDelete = (contact: CRMContact) => {
    setSelectedContact(contact)
    setIsDeleteOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedContact) {
      await updateContacto(selectedContact.id, formData)
    } else {
      await createContacto(formData as Omit<CRMContact, "id" | "createdAt" | "updatedAt">)
    }
    closeForm()
  }

  const confirmDelete = async () => {
    if (selectedContact) {
      await deleteContacto(selectedContact.id)
    }
    setIsDeleteOpen(false)
    setSelectedContact(null)
  }

  const closeForm = () => {
    setIsFormOpen(false)
    setSelectedContact(null)
    setFormData(emptyForm)
    router.push("/crm/contactos")
  }

  if (loading && contactos.length === 0) {
    return (
      <div className="flex min-h-80 items-center justify-center rounded-lg border border-dashed text-muted-foreground">
        Cargando red de contactos...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contactos</h1>
          <p className="text-muted-foreground">Personas de contacto de los clientes</p>
        </div>
        <Button onClick={openNewForm}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Contacto
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Contactos visibles</p>
            <p className="mt-2 text-2xl font-bold">{stats.visible}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Activos</p>
            <p className="mt-2 text-2xl font-bold text-emerald-500">{stats.activos}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Canal WhatsApp</p>
            <p className="mt-2 text-2xl font-bold text-blue-500">{stats.preferWhatsApp}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Sin gestión reciente</p>
            <p className="mt-2 text-2xl font-bold text-amber-500">{stats.sinGestionReciente}</p>
          </CardContent>
        </Card>
      </div>

      {error && (
        <Card className="border-red-500/40">
          <CardContent className="pt-6 text-sm text-red-300">
            No se pudo cargar parte de la red de contactos: {error}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, email o cargo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterCliente} onValueChange={setFilterCliente}>
              <SelectTrigger className="w-full md:w-50">
                <SelectValue placeholder="Cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los clientes</SelectItem>
                {crmClients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterEstado} onValueChange={setFilterEstado}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(estadoLabels).map(([value, label]) => (
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
            <CardTitle>Radar de red comercial</CardTitle>
            <CardDescription>
              Alertas de cobertura, rebotes y contactos sin actividad reciente dentro de la red
              visible.
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
              Preferencias visibles de contacto sobre la red filtrada.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {channelCoverage.map(([channel, total]) => (
              <div
                key={channel}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div>
                  <p className="font-medium">
                    {canalLabels[channel as CRMContact["canalPreferido"]]}
                  </p>
                  <p className="text-sm text-muted-foreground">{total} contactos</p>
                </div>
                <Badge variant="outline">
                  {Math.round((total / Math.max(stats.visible, 1)) * 100)}%
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Contacto destacado</CardTitle>
              <CardDescription>
                Persona con mayor sensibilidad visible por estado, pendiente comercial o falta de
                gestión.
              </CardDescription>
            </div>
            {highlightedContact?.cliente && (
              <Link href={`/crm/clientes/${highlightedContact.cliente.id}`}>
                <Button variant="ghost" size="sm">
                  Ver cliente
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {highlightedContact ? (
              <div className="space-y-4 rounded-lg border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold">
                      {highlightedContact.contact.nombre} {highlightedContact.contact.apellido}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {highlightedContact.contact.cargo || "Sin cargo informado"} ·{" "}
                      {highlightedContact.cliente?.nombre || "Cliente no disponible"}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={getEstadoColor(highlightedContact.contact.estadoContacto)}
                  >
                    {estadoLabels[highlightedContact.contact.estadoContacto]}
                  </Badge>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Última interacción</p>
                    <p className="mt-2 font-medium">
                      {formatDateTime(highlightedContact.lastInteraction)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {highlightedContact.daysSinceLastTouch === null
                        ? "Sin gestión registrada"
                        : `${highlightedContact.daysSinceLastTouch} días desde el último contacto`}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Pendientes</p>
                    <p className="mt-2 font-medium">
                      {highlightedContact.contactTasks.length} tareas abiertas
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {highlightedContact.contactInteractions.length} interacciones visibles
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border p-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <BriefcaseBusiness className="h-4 w-4 text-primary" />
                    Pipeline asociado
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {Object.entries(highlightedContact.pipelineByCurrency).length > 0 ? (
                      Object.entries(highlightedContact.pipelineByCurrency).map(
                        ([currency, total]) => (
                          <Badge key={currency} variant="outline">
                            {formatCurrency(total, currency as CRMOpportunity["moneda"])}
                          </Badge>
                        )
                      )
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Sin oportunidades abiertas donde figure como contacto principal.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No hay un contacto destacado con los filtros actuales.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cobertura por cuenta</CardTitle>
            <CardDescription>
              Clientes con mayor densidad de contactos y señales de seguimiento pendientes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {accountCoverage.map((account) => (
              <div key={account.id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">{account.nombre}</p>
                    <p className="text-sm text-muted-foreground">
                      {account.contactos} contactos visibles
                    </p>
                  </div>
                  <Badge variant={account.noContactar > 0 ? "destructive" : "outline"}>
                    {account.noContactar} no contactar
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {account.sinGestion} sin gestión reciente dentro de la cuenta.
                </p>
              </div>
            ))}
            {accountCoverage.length === 0 && (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No hay cobertura suficiente para resumir por cliente con los filtros actuales.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contacto</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Canal Preferido</TableHead>
                <TableHead>Última Gestión</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contactRows.map((row) => {
                const { contact, cliente } = row
                return (
                  <TableRow key={contact.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {contact.nombre} {contact.apellido}
                          </p>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            {contact.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {contact.email}
                              </span>
                            )}
                          </div>
                        </div>
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
                    <TableCell>{contact.cargo || "-"}</TableCell>
                    <TableCell>{canalLabels[contact.canalPreferido]}</TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        <p>{formatDateTime(row.lastInteraction)}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.daysSinceLastTouch === null
                            ? "Sin gestión visible"
                            : `${row.daysSinceLastTouch} días desde el último contacto`}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getEstadoColor(contact.estadoContacto)}>
                        {estadoLabels[contact.estadoContacto]}
                      </Badge>
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
                          <DropdownMenuItem onClick={() => handleEdit(contact)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(contact)}
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
              {contactRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No se encontraron contactos
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
            <DialogTitle>{selectedContact ? "Editar Contacto" : "Nuevo Contacto"}</DialogTitle>
            <DialogDescription>
              {selectedContact
                ? "Modifica los datos del contacto"
                : "Ingresa los datos del nuevo contacto"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <Select
                  value={formData.clienteId}
                  onValueChange={(value) => setFormData({ ...formData, clienteId: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente" />
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre *</Label>
                  <Input
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Apellido *</Label>
                  <Input
                    value={formData.apellido}
                    onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cargo</Label>
                <Input
                  value={formData.cargo}
                  onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Canal Preferido</Label>
                  <Select
                    value={formData.canalPreferido}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        canalPreferido: value as CRMContact["canalPreferido"],
                      })
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
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select
                    value={formData.estadoContacto}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        estadoContacto: value as CRMContact["estadoContacto"],
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(estadoLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
              <Button type="submit">{selectedContact ? "Guardar" : "Crear"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar contacto?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de eliminar a {selectedContact?.nombre} {selectedContact?.apellido}.
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

function Loading() {
  return null
}

export default function ContactosPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ContactosContent />
    </Suspense>
  )
}
