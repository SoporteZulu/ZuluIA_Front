"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Textarea } from "@/components/ui/textarea"
import {
  Search,
  X,
  Users,
  Crown,
  UserCheck,
  UserMinus,
  Phone,
  Mail,
  Building2,
  ExternalLink,
  FileText,
  ShieldCheck,
  Ticket,
  Settings2,
  Trash2,
} from "lucide-react"
import { useCrmClientes } from "@/lib/hooks/useCrm"
import { useHdClientes, useHdContratos, useHdSlas, useHdTickets } from "@/lib/hooks/useHelpdesk"
import type { CRMClient, HDCliente, HDContrato, HDTicket } from "@/lib/types"
import Link from "next/link"

function mapClienteToHDType(cliente: CRMClient): "vip" | "estandar" | "basico" {
  if (cliente.segmento === "corporativo" || cliente.segmento === "gobierno") return "vip"
  if (cliente.segmento === "pyme") return "estandar"
  return "basico"
}

const tipoClienteLabels = {
  vip: "VIP",
  estandar: "Estándar",
  basico: "Básico",
}

const tipoClienteColors = {
  vip: "bg-amber-500/10 text-amber-500",
  estandar: "bg-blue-500/10 text-blue-500",
  basico: "bg-slate-500/10 text-slate-500",
}

function isClosedTicket(ticket: HDTicket) {
  return ticket.estado === "resuelto" || ticket.estado === "cerrado"
}

function isCurrentMonth(value: Date | string | undefined) {
  if (!value) return false

  const date = new Date(value)
  const now = new Date()
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
}

function pickActiveContrato(contratos: HDContrato[]) {
  return [...contratos]
    .filter((contrato) => contrato.estado === "activo")
    .sort(
      (left, right) => new Date(left.fechaFin).getTime() - new Date(right.fechaFin).getTime()
    )[0]
}

type HdProfileFormState = {
  codigo: string
  tipoCliente: "vip" | "estandar" | "basico"
  email: string
  telefono: string
  direccion: string
  slaId: string
  contratoActivo: "si" | "no"
  fechaInicioContrato: string
  fechaFinContrato: string
  limiteTicketsMes: string
  ticketsUsadosMes: string
  notas: string
}

function toInputDate(value?: Date | string) {
  if (!value) return ""

  const normalized = typeof value === "string" ? value : value.toISOString()
  return normalized.slice(0, 10)
}

function buildHdProfileFormState(
  cliente: CRMClient,
  hdProfile?: HDCliente | null
): HdProfileFormState {
  return {
    codigo: hdProfile?.codigo ?? cliente.cuit ?? cliente.id,
    tipoCliente: hdProfile?.tipoCliente ?? mapClienteToHDType(cliente),
    email: hdProfile?.email ?? cliente.emailPrincipal ?? "",
    telefono: hdProfile?.telefono ?? cliente.telefonoPrincipal ?? "",
    direccion: hdProfile?.direccion ?? cliente.direccion ?? "",
    slaId: hdProfile?.slaId ?? "none",
    contratoActivo: hdProfile?.contratoActivo ? "si" : "no",
    fechaInicioContrato: toInputDate(hdProfile?.fechaInicioContrato),
    fechaFinContrato: toInputDate(hdProfile?.fechaFinContrato),
    limiteTicketsMes:
      hdProfile?.limiteTicketsMes !== undefined
        ? String(hdProfile.limiteTicketsMes)
        : mapClienteToHDType(cliente) === "vip"
          ? "100"
          : mapClienteToHDType(cliente) === "estandar"
            ? "50"
            : "20",
    ticketsUsadosMes: String(hdProfile?.ticketsUsadosMes ?? 0),
    notas: hdProfile?.notas ?? "",
  }
}

function ClientesHDContent() {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterTipo, setFilterTipo] = useState<string>("all")
  const [filterContrato, setFilterContrato] = useState<string>("all")

  const { clientes: crmClients } = useCrmClientes()
  const { clientes: hdClientes, createCliente, updateCliente, deleteCliente } = useHdClientes()
  const { tickets } = useHdTickets()
  const { contratos } = useHdContratos()
  const { slas } = useHdSlas()
  const [isProfileFormOpen, setIsProfileFormOpen] = useState(false)
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null)
  const [profileSaving, setProfileSaving] = useState(false)
  const [editingCliente, setEditingCliente] = useState<{
    crmClient: CRMClient
    hdProfile: HDCliente | null
  } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nombre: string } | null>(null)
  const [profileForm, setProfileForm] = useState<HdProfileFormState>({
    codigo: "",
    tipoCliente: "estandar",
    email: "",
    telefono: "",
    direccion: "",
    slaId: "none",
    contratoActivo: "no",
    fechaInicioContrato: "",
    fechaFinContrato: "",
    limiteTicketsMes: "0",
    ticketsUsadosMes: "0",
    notas: "",
  })

  const hdClientByTerceroId = useMemo(
    () =>
      new Map(
        hdClientes.map((hdCliente) => [hdCliente.terceroId ?? hdCliente.id, hdCliente] as const)
      ),
    [hdClientes]
  )

  const clientesActivos = useMemo(
    () =>
      crmClients.filter(
        (cliente) => cliente.tipoCliente === "activo" || cliente.tipoCliente === "prospecto"
      ),
    [crmClients]
  )

  const clientesConHD = useMemo(() => {
    return clientesActivos.map((cliente) => {
      const hdProfile = hdClientByTerceroId.get(cliente.id)
      const tipoHD = hdProfile?.tipoCliente ?? mapClienteToHDType(cliente)
      const contratosCliente = contratos.filter((contrato) => contrato.clienteId === cliente.id)
      const contratoPrincipal = pickActiveContrato(contratosCliente)
      const ticketsCliente = tickets.filter((ticket) => ticket.clienteId === cliente.id)
      const ticketsMes = ticketsCliente.filter((ticket) =>
        isCurrentMonth(ticket.fechaCreacion)
      ).length
      const ticketsAbiertos = ticketsCliente.filter((ticket) => !isClosedTicket(ticket)).length
      const ticketsCerrados = ticketsCliente.length - ticketsAbiertos
      const ticketsCumplenSla = ticketsCliente.filter((ticket) => ticket.cumpleSLA).length
      const porcentajeCumplimiento = ticketsCliente.length
        ? Math.round((ticketsCumplenSla / ticketsCliente.length) * 100)
        : null

      const fallbackSla = slas.find((sla) => sla.tipoCliente === tipoHD && sla.estado === "activo")
      const sla =
        slas.find((candidate) => candidate.id === contratoPrincipal?.slaId) ??
        slas.find((candidate) => candidate.id === hdProfile?.slaId) ??
        fallbackSla ??
        null

      const limiteTickets =
        hdProfile?.limiteTicketsMes ?? (tipoHD === "vip" ? 100 : tipoHD === "estandar" ? 50 : 20)
      const ticketsUsados = hdProfile?.ticketsUsadosMes ?? ticketsMes
      const hasHdProfile = Boolean(hdProfile)
      const hasContractCoverage = Boolean(contratoPrincipal) || Boolean(hdProfile?.contratoActivo)

      return {
        ...cliente,
        tipoHD,
        hdProfile,
        hasHdProfile,
        sla,
        contratosCliente,
        contratoActivo: hasContractCoverage,
        contratoPrincipal,
        limiteTickets,
        ticketsUsados,
        ticketsMes,
        ticketsAbiertos,
        ticketsCerrados,
        ticketsTotales: ticketsCliente.length,
        porcentajeCumplimiento,
      }
    })
  }, [clientesActivos, contratos, hdClientByTerceroId, slas, tickets])

  const filteredClientes = clientesConHD.filter((cliente) => {
    const matchesSearch =
      cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.emailPrincipal?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.cuit?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTipo = filterTipo === "all" || cliente.tipoHD === filterTipo
    const matchesContrato =
      filterContrato === "all" ||
      (filterContrato === "activo" && cliente.contratoActivo) ||
      (filterContrato === "inactivo" && !cliente.contratoActivo)
    return matchesSearch && matchesTipo && matchesContrato
  })

  const stats = {
    total: clientesConHD.length,
    vip: clientesConHD.filter((cliente) => cliente.tipoHD === "vip").length,
    estandar: clientesConHD.filter((cliente) => cliente.tipoHD === "estandar").length,
    basico: clientesConHD.filter((cliente) => cliente.tipoHD === "basico").length,
    conContrato: clientesConHD.filter((cliente) => cliente.contratoActivo).length,
    conSla: clientesConHD.filter((cliente) => cliente.sla).length,
    ticketsAbiertos: clientesConHD.reduce((total, cliente) => total + cliente.ticketsAbiertos, 0),
  }

  const clearFilters = () => {
    setSearchTerm("")
    setFilterTipo("all")
    setFilterContrato("all")
  }

  const openProfileForm = (cliente: (typeof clientesConHD)[number]) => {
    setEditingCliente({
      crmClient: cliente,
      hdProfile: cliente.hdProfile ?? null,
    })
    setProfileForm(buildHdProfileFormState(cliente, cliente.hdProfile ?? null))
    setProfileSaveError(null)
    setIsProfileFormOpen(true)
  }

  const closeProfileForm = () => {
    setIsProfileFormOpen(false)
    setEditingCliente(null)
    setProfileSaveError(null)
  }

  const handleProfileSave = async () => {
    if (!editingCliente) return

    try {
      setProfileSaving(true)
      setProfileSaveError(null)

      const payload = {
        terceroId: editingCliente.crmClient.id,
        codigo:
          profileForm.codigo.trim() || editingCliente.crmClient.cuit || editingCliente.crmClient.id,
        nombre: editingCliente.crmClient.nombre,
        tipoCliente: profileForm.tipoCliente,
        email: profileForm.email.trim() || undefined,
        telefono: profileForm.telefono.trim() || undefined,
        direccion: profileForm.direccion.trim() || undefined,
        slaId: profileForm.slaId === "none" ? undefined : profileForm.slaId,
        contratoActivo: profileForm.contratoActivo === "si",
        fechaInicioContrato: profileForm.fechaInicioContrato || undefined,
        fechaFinContrato: profileForm.fechaFinContrato || undefined,
        limiteTicketsMes: profileForm.limiteTicketsMes
          ? Number(profileForm.limiteTicketsMes)
          : undefined,
        ticketsUsadosMes: Number(profileForm.ticketsUsadosMes || 0),
        notas: profileForm.notas.trim() || undefined,
        contactos: editingCliente.hdProfile?.contactos ?? [],
      }

      if (editingCliente.hdProfile?.id) {
        await updateCliente(editingCliente.hdProfile.id, payload)
      } else {
        await createCliente(payload)
      }

      closeProfileForm()
    } catch (error) {
      setProfileSaveError(
        error instanceof Error ? error.message : "No se pudo guardar el perfil Help Desk."
      )
    } finally {
      setProfileSaving(false)
    }
  }

  const handleDeleteProfile = async () => {
    if (!deleteTarget) return

    try {
      await deleteCliente(deleteTarget.id)
      setDeleteTarget(null)
    } catch (error) {
      setProfileSaveError(
        error instanceof Error ? error.message : "No se pudo eliminar el perfil Help Desk."
      )
    }
  }

  const hasActiveFilters = searchTerm || filterTipo !== "all" || filterContrato !== "all"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Clientes Help Desk</h1>
          <p className="text-muted-foreground">
            Clientes del CRM con información de soporte y contratos
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/crm/clientes">
            <Button variant="outline">
              <ExternalLink className="mr-2 h-4 w-4" />
              Gestionar en CRM
            </Button>
          </Link>
        </div>
      </div>

      <Dialog
        open={isProfileFormOpen}
        onOpenChange={(open) => (open ? setIsProfileFormOpen(true) : closeProfileForm())}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCliente?.hdProfile ? "Editar perfil Help Desk" : "Crear perfil Help Desk"}
            </DialogTitle>
            <DialogDescription>
              {editingCliente
                ? `Cliente base: ${editingCliente.crmClient.nombre}`
                : "Completa la configuración operativa del cliente en Help Desk."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {profileSaveError && (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {profileSaveError}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="codigo">Código / CUIT</Label>
                <Input
                  id="codigo"
                  value={profileForm.codigo}
                  onChange={(e) => setProfileForm({ ...profileForm, codigo: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tipoCliente">Tipo Help Desk</Label>
                <Select
                  value={profileForm.tipoCliente}
                  onValueChange={(value) =>
                    setProfileForm({
                      ...profileForm,
                      tipoCliente: value as HdProfileFormState["tipoCliente"],
                    })
                  }
                >
                  <SelectTrigger id="tipoCliente">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vip">VIP</SelectItem>
                    <SelectItem value="estandar">Estándar</SelectItem>
                    <SelectItem value="basico">Básico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email operativo</Label>
                <Input
                  id="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono operativo</Label>
                <Input
                  id="telefono"
                  value={profileForm.telefono}
                  onChange={(e) => setProfileForm({ ...profileForm, telefono: e.target.value })}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="direccion">Dirección de servicio</Label>
                <Input
                  id="direccion"
                  value={profileForm.direccion}
                  onChange={(e) => setProfileForm({ ...profileForm, direccion: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sla">SLA asignado</Label>
                <Select
                  value={profileForm.slaId}
                  onValueChange={(value) => setProfileForm({ ...profileForm, slaId: value })}
                >
                  <SelectTrigger id="sla">
                    <SelectValue placeholder="Selecciona un SLA" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin SLA</SelectItem>
                    {slas.map((sla) => (
                      <SelectItem key={sla.id} value={sla.id}>
                        {sla.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contratoActivo">Cobertura contractual</Label>
                <Select
                  value={profileForm.contratoActivo}
                  onValueChange={(value) =>
                    setProfileForm({
                      ...profileForm,
                      contratoActivo: value as HdProfileFormState["contratoActivo"],
                    })
                  }
                >
                  <SelectTrigger id="contratoActivo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="si">Activo</SelectItem>
                    <SelectItem value="no">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fechaInicioContrato">Inicio de contrato</Label>
                <Input
                  id="fechaInicioContrato"
                  type="date"
                  value={profileForm.fechaInicioContrato}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, fechaInicioContrato: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fechaFinContrato">Fin de contrato</Label>
                <Input
                  id="fechaFinContrato"
                  type="date"
                  value={profileForm.fechaFinContrato}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, fechaFinContrato: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="limiteTicketsMes">Límite mensual de tickets</Label>
                <Input
                  id="limiteTicketsMes"
                  type="number"
                  min="0"
                  value={profileForm.limiteTicketsMes}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, limiteTicketsMes: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ticketsUsadosMes">Tickets usados este mes</Label>
                <Input
                  id="ticketsUsadosMes"
                  type="number"
                  min="0"
                  value={profileForm.ticketsUsadosMes}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, ticketsUsadosMes: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notas">Notas operativas</Label>
                <Textarea
                  id="notas"
                  value={profileForm.notas}
                  onChange={(e) => setProfileForm({ ...profileForm, notas: e.target.value })}
                  rows={4}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeProfileForm} disabled={profileSaving}>
              Cancelar
            </Button>
            <Button onClick={handleProfileSave} disabled={profileSaving || !editingCliente}>
              {profileSaving
                ? "Guardando..."
                : editingCliente?.hdProfile
                  ? "Guardar"
                  : "Crear perfil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar perfil Help Desk</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `Se eliminará el perfil Help Desk de ${deleteTarget.nombre}. La ficha CRM no se modifica.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProfile}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">VIP</CardTitle>
            <Crown className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.vip}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estándar</CardTitle>
            <UserCheck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.estandar}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Básico</CardTitle>
            <UserMinus className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.basico}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Con Contrato</CardTitle>
            <Building2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.conContrato}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Con SLA</CardTitle>
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.conSla}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tickets Abiertos</CardTitle>
            <Ticket className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.ticketsAbiertos}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, email o CUIT..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="vip">VIP</SelectItem>
                <SelectItem value="estandar">Estándar</SelectItem>
                <SelectItem value="basico">Básico</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterContrato} onValueChange={setFilterContrato}>
              <SelectTrigger className="w-45">
                <SelectValue placeholder="Contrato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="activo">Con Contrato</SelectItem>
                <SelectItem value="inactivo">Sin Contrato</SelectItem>
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-2 h-4 w-4" />
                Limpiar filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Listado de Clientes</CardTitle>
          <CardDescription>{filteredClientes.length} cliente(s) encontrado(s)</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo HD</TableHead>
                <TableHead>Segmento</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>SLA</TableHead>
                <TableHead>Contratos</TableHead>
                <TableHead>Tickets Mes</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClientes.map((cliente) => (
                <TableRow key={cliente.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{cliente.nombre}</div>
                      <div className="text-sm text-muted-foreground">{cliente.cuit}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={tipoClienteColors[cliente.tipoHD]}>
                      {tipoClienteLabels[cliente.tipoHD]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{cliente.segmento}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-sm">
                      {(cliente.hdProfile?.email ?? cliente.emailPrincipal) && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Mail className="h-3 w-3" />{" "}
                          {cliente.hdProfile?.email ?? cliente.emailPrincipal}
                        </span>
                      )}
                      {(cliente.hdProfile?.telefono ?? cliente.telefonoPrincipal) && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Phone className="h-3 w-3" />{" "}
                          {cliente.hdProfile?.telefono ?? cliente.telefonoPrincipal}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {cliente.sla ? (
                      <Badge variant="outline" className="text-xs">
                        {cliente.sla.nombre}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">Sin SLA</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {cliente.contratoActivo ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="default">Activo</Badge>
                        <span className="text-xs text-muted-foreground">
                          ({cliente.contratosCliente.filter((c) => c.estado === "activo").length})
                        </span>
                      </div>
                    ) : (
                      <Badge variant="secondary">Sin Contrato</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          cliente.ticketsUsados >= cliente.limiteTickets * 0.8
                            ? "text-destructive font-medium"
                            : ""
                        }
                      >
                        {cliente.ticketsUsados} / {cliente.limiteTickets}
                      </span>
                      {cliente.ticketsUsados >= cliente.limiteTickets * 0.8 && (
                        <Badge variant="destructive" className="text-xs">
                          Alto
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {cliente.ticketsAbiertos} abiertos, {cliente.ticketsCerrados} cerrados
                      {cliente.porcentajeCumplimiento !== null
                        ? `, SLA ${cliente.porcentajeCumplimiento}%`
                        : ""}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2 flex-wrap">
                      <Button variant="ghost" size="sm" onClick={() => openProfileForm(cliente)}>
                        <Settings2 className="h-4 w-4 mr-1" />
                        {cliente.hasHdProfile ? "Editar HD" : "Configurar HD"}
                      </Button>
                      <Link href={`/crm/clientes/${cliente.id}`}>
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Ver en CRM
                        </Button>
                      </Link>
                      <Link href={`/helpdesk/contratos?cliente=${cliente.id}`}>
                        <Button variant="ghost" size="sm">
                          <FileText className="h-4 w-4 mr-1" />
                          {cliente.contratoPrincipal ? "Contrato" : "Contratos"}
                        </Button>
                      </Link>
                      {cliente.hdProfile && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setDeleteTarget({ id: cliente.hdProfile!.id, nombre: cliente.nombre })
                          }
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Eliminar HD
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredClientes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No se encontraron clientes con los filtros aplicados
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ClientesHDPage() {
  return <ClientesHDContent />
}
