"use client"

import React, { Suspense, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  DialogTrigger,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Plus,
  Edit,
  Trash2,
  Clock,
  AlertTriangle,
  CheckCircle,
  Timer,
  Search,
  Users,
  ShieldAlert,
} from "lucide-react"
import { useHdClientes, useHdSlas, useHdTickets } from "@/lib/hooks/useHelpdesk"
import type { HDSLA } from "@/lib/types"

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}min`
}

function SLAsContent() {
  const { slas, createSla, updateSla, deleteSla } = useHdSlas()
  const { clientes } = useHdClientes()
  const { tickets } = useHdTickets()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingSLA, setEditingSLA] = useState<HDSLA | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [estadoFilter, setEstadoFilter] = useState<"todos" | HDSLA["estado"]>("todos")
  const [selectedSla, setSelectedSla] = useState<HDSLA | null>(null)

  const [formData, setFormData] = useState<Partial<HDSLA>>({
    nombre: "",
    descripcion: "",
    tipoCliente: "estandar",
    tiempoRespuesta: 60,
    tiempoResolucion: 480,
    horasOperacion: { inicio: "09:00", fin: "18:00" },
    aplicaFinesSemana: false,
    prioridadCriticaMultiplier: 0.5,
    prioridadAltaMultiplier: 0.75,
    prioridadMediaMultiplier: 1,
    prioridadBajaMultiplier: 1.5,
    estado: "activo",
  })

  const filteredSlas = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()

    return slas.filter((sla) => {
      const matchesSearch =
        term === "" ||
        [sla.nombre, sla.descripcion, sla.tipoCliente]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(term)
      const matchesEstado = estadoFilter === "todos" || sla.estado === estadoFilter
      return matchesSearch && matchesEstado
    })
  }, [estadoFilter, searchTerm, slas])

  const slaCoverage = useMemo(() => {
    return filteredSlas
      .map((sla) => {
        const clientesConSla = clientes.filter((cliente) => cliente.slaId === sla.id)
        const ticketsConSla = tickets.filter((ticket) => ticket.slaId === sla.id)
        const ticketsAbiertos = ticketsConSla.filter(
          (ticket) => !["resuelto", "cerrado"].includes(ticket.estado)
        )
        const ticketsFueraSla = ticketsConSla.filter((ticket) => !ticket.cumpleSLA)

        return {
          sla,
          clientes: clientesConSla.length,
          contratosActivos: clientesConSla.filter((cliente) => cliente.contratoActivo).length,
          tickets: ticketsConSla.length,
          ticketsAbiertos: ticketsAbiertos.length,
          ticketsFueraSla: ticketsFueraSla.length,
          ticketsMesConsumidos: clientesConSla.reduce(
            (sum, cliente) => sum + Number(cliente.ticketsUsadosMes ?? 0),
            0
          ),
        }
      })
      .sort((a, b) => {
        if (b.ticketsFueraSla !== a.ticketsFueraSla) return b.ticketsFueraSla - a.ticketsFueraSla
        if (b.ticketsAbiertos !== a.ticketsAbiertos) return b.ticketsAbiertos - a.ticketsAbiertos
        return b.clientes - a.clientes
      })
  }, [clientes, filteredSlas, tickets])

  const stats = useMemo(() => {
    return {
      total: filteredSlas.length,
      activos: filteredSlas.filter((sla) => sla.estado === "activo").length,
      inactivos: filteredSlas.filter((sla) => sla.estado === "inactivo").length,
      clientesCubiertos: slaCoverage.reduce((sum, item) => sum + item.clientes, 0),
      ticketsFueraSla: slaCoverage.reduce((sum, item) => sum + item.ticketsFueraSla, 0),
    }
  }, [filteredSlas, slaCoverage])

  const highlighted = selectedSla
    ? (slaCoverage.find((item) => item.sla.id === selectedSla.id) ?? null)
    : (slaCoverage[0] ?? null)

  const openForm = (sla?: HDSLA) => {
    if (sla) {
      setEditingSLA(sla)
      setSelectedSla(sla)
      setFormData({ ...sla })
    } else {
      setEditingSLA(null)
      setFormData({
        nombre: "",
        descripcion: "",
        tipoCliente: "estandar",
        tiempoRespuesta: 60,
        tiempoResolucion: 480,
        horasOperacion: { inicio: "09:00", fin: "18:00" },
        aplicaFinesSemana: false,
        prioridadCriticaMultiplier: 0.5,
        prioridadAltaMultiplier: 0.75,
        prioridadMediaMultiplier: 1,
        prioridadBajaMultiplier: 1.5,
        estado: "activo",
      })
    }
    setIsFormOpen(true)
  }

  const closeForm = () => {
    setIsFormOpen(false)
    setEditingSLA(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editingSLA) {
      await updateSla(editingSLA.id, formData)
    } else {
      await createSla(formData as Omit<HDSLA, "id" | "createdAt" | "updatedAt">)
    }
    closeForm()
  }

  const handleDelete = async (id: string) => {
    await deleteSla(id)
  }

  const tipoClienteLabels = {
    vip: "VIP",
    estandar: "Estandar",
    basico: "Basico",
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Acuerdos de Nivel de Servicio (SLA)</h1>
          <p className="text-muted-foreground">
            Configura y sigue cobertura SLA sobre clientes y tickets reales
          </p>
        </div>
        <Dialog
          open={isFormOpen}
          onOpenChange={(open) => (open ? setIsFormOpen(true) : closeForm())}
        >
          <DialogTrigger asChild>
            <Button onClick={() => openForm()}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo SLA
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingSLA ? "Editar SLA" : "Nuevo SLA"}</DialogTitle>
              <DialogDescription>
                {editingSLA
                  ? "Modifica la configuracion del SLA"
                  : "Configura un nuevo acuerdo de nivel de servicio"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre del SLA</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    required
                    placeholder="Ej: SLA Premium"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipoCliente">Tipo de Cliente</Label>
                  <Select
                    value={formData.tipoCliente}
                    onValueChange={(value) =>
                      setFormData({ ...formData, tipoCliente: value as HDSLA["tipoCliente"] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vip">VIP</SelectItem>
                      <SelectItem value="estandar">Estandar</SelectItem>
                      <SelectItem value="basico">Basico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripcion</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion || ""}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Tiempos Base (minutos)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tiempoRespuesta">Tiempo de Respuesta</Label>
                    <Input
                      id="tiempoRespuesta"
                      type="number"
                      value={formData.tiempoRespuesta}
                      onChange={(e) =>
                        setFormData({ ...formData, tiempoRespuesta: parseInt(e.target.value) })
                      }
                      required
                      min={1}
                    />
                    <p className="text-xs text-muted-foreground">
                      = {formatMinutes(formData.tiempoRespuesta || 0)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tiempoResolucion">Tiempo de Resolucion</Label>
                    <Input
                      id="tiempoResolucion"
                      type="number"
                      value={formData.tiempoResolucion}
                      onChange={(e) =>
                        setFormData({ ...formData, tiempoResolucion: parseInt(e.target.value) })
                      }
                      required
                      min={1}
                    />
                    <p className="text-xs text-muted-foreground">
                      = {formatMinutes(formData.tiempoResolucion || 0)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Horario de Operacion</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="horaInicio">Hora Inicio</Label>
                    <Input
                      id="horaInicio"
                      type="time"
                      value={formData.horasOperacion?.inicio || "09:00"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          horasOperacion: { ...formData.horasOperacion!, inicio: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="horaFin">Hora Fin</Label>
                    <Input
                      id="horaFin"
                      type="time"
                      value={formData.horasOperacion?.fin || "18:00"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          horasOperacion: { ...formData.horasOperacion!, fin: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="finesSemana"
                    checked={formData.aplicaFinesSemana}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, aplicaFinesSemana: checked })
                    }
                  />
                  <Label htmlFor="finesSemana">Aplica fines de semana</Label>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Multiplicadores por Prioridad</h4>
                <p className="text-sm text-muted-foreground">
                  Los tiempos base se multiplican por estos valores segun la prioridad del ticket
                </p>
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="multCritica">Critica</Label>
                    <Input
                      id="multCritica"
                      type="number"
                      step="0.01"
                      value={formData.prioridadCriticaMultiplier}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          prioridadCriticaMultiplier: parseFloat(e.target.value),
                        })
                      }
                      min={0.1}
                      max={5}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="multAlta">Alta</Label>
                    <Input
                      id="multAlta"
                      type="number"
                      step="0.01"
                      value={formData.prioridadAltaMultiplier}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          prioridadAltaMultiplier: parseFloat(e.target.value),
                        })
                      }
                      min={0.1}
                      max={5}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="multMedia">Media</Label>
                    <Input
                      id="multMedia"
                      type="number"
                      step="0.01"
                      value={formData.prioridadMediaMultiplier}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          prioridadMediaMultiplier: parseFloat(e.target.value),
                        })
                      }
                      min={0.1}
                      max={5}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="multBaja">Baja</Label>
                    <Input
                      id="multBaja"
                      type="number"
                      step="0.01"
                      value={formData.prioridadBajaMultiplier}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          prioridadBajaMultiplier: parseFloat(e.target.value),
                        })
                      }
                      min={0.1}
                      max={5}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="estado"
                  checked={formData.estado === "activo"}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, estado: checked ? "activo" : "inactivo" })
                  }
                />
                <Label htmlFor="estado">SLA Activo</Label>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeForm}>
                  Cancelar
                </Button>
                <Button type="submit">{editingSLA ? "Guardar Cambios" : "Crear SLA"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total SLAs</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activos</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activos}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactivos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inactivos}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes cubiertos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.clientesCubiertos}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tickets fuera SLA</CardTitle>
            <ShieldAlert className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.ticketsFueraSla}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Radar de cobertura</CardTitle>
            <CardDescription>
              Cruza SLAs con clientes y tickets para detectar desvíos reales y presión de demanda.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {slaCoverage.length > 0 ? (
              slaCoverage.slice(0, 6).map((item) => (
                <button
                  key={item.sla.id}
                  className="w-full rounded-lg border p-4 text-left transition hover:bg-muted/40"
                  onClick={() => setSelectedSla(item.sla)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.sla.nombre}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.sla.tipoCliente
                          ? tipoClienteLabels[item.sla.tipoCliente]
                          : "Cobertura general"}
                      </p>
                    </div>
                    <Badge
                      variant={
                        item.ticketsFueraSla > 0
                          ? "destructive"
                          : item.sla.estado === "activo"
                            ? "default"
                            : "secondary"
                      }
                    >
                      {item.ticketsAbiertos} abiertos
                    </Badge>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Clientes</p>
                      <p className="mt-1 font-medium">{item.clientes}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Contratos</p>
                      <p className="mt-1 font-medium">{item.contratosActivos}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Fuera SLA</p>
                      <p className="mt-1 font-medium">{item.ticketsFueraSla}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Tickets mes</p>
                      <p className="mt-1 font-medium">{item.ticketsMesConsumidos}</p>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                No hay SLAs visibles para construir el radar operativo.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SLA destacado</CardTitle>
            <CardDescription>
              Resumen contractual y operativo del acuerdo seleccionado o principal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {highlighted ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{highlighted.sla.nombre}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {highlighted.sla.tipoCliente
                        ? tipoClienteLabels[highlighted.sla.tipoCliente]
                        : "Todos los clientes"}
                    </p>
                  </div>
                  <Badge variant={highlighted.sla.estado === "activo" ? "default" : "secondary"}>
                    {highlighted.sla.estado === "activo" ? "Activo" : "Inactivo"}
                  </Badge>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Respuesta base</p>
                    <p className="mt-2 font-medium">
                      {formatMinutes(highlighted.sla.tiempoRespuesta)}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Resolución base</p>
                    <p className="mt-2 font-medium">
                      {formatMinutes(highlighted.sla.tiempoResolucion)}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Horario</p>
                    <p className="mt-2 font-medium">
                      {highlighted.sla.horasOperacion.inicio} - {highlighted.sla.horasOperacion.fin}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Fines de semana</p>
                    <p className="mt-2 font-medium">
                      {highlighted.sla.aplicaFinesSemana ? "Sí" : "No"}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
                  {highlighted.ticketsFueraSla > 0
                    ? `${highlighted.ticketsFueraSla} tickets visibles ya incumplen este SLA y conviene revisar prioridad, cobertura o carga operativa.`
                    : "No hay tickets visibles fuera de SLA para este acuerdo en la carga actual."}
                </div>

                <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
                  La vista usa sólo tiempos, multiplicadores, clientes y tickets publicados hoy. No
                  simula calendarios de guardia, feriados, escalamiento multinivel ni capacity
                  planning porque el backend actual no lo expone.
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                No hay SLAs visibles para construir el resumen destacado.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Búsqueda y estado sobre el maestro SLA visible.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-10"
                placeholder="Buscar por nombre, descripción o tipo cliente"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            <Select
              value={estadoFilter}
              onValueChange={(value) => setEstadoFilter(value as "todos" | HDSLA["estado"])}
            >
              <SelectTrigger className="w-full md:w-44">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="activo">Activos</SelectItem>
                <SelectItem value="inactivo">Inactivos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Configuracion de SLAs</CardTitle>
          <CardDescription>
            Define los acuerdos de nivel de servicio para diferentes tipos de clientes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo Cliente</TableHead>
                <TableHead>Tiempo Respuesta</TableHead>
                <TableHead>Tiempo Resolucion</TableHead>
                <TableHead>Horario</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSlas.map((sla) => (
                <TableRow key={sla.id} className="group">
                  <TableCell>
                    <div>
                      <div className="font-medium">{sla.nombre}</div>
                      {sla.descripcion && (
                        <div className="text-sm text-muted-foreground">{sla.descripcion}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {sla.tipoCliente ? tipoClienteLabels[sla.tipoCliente] : "Todos"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Timer className="h-4 w-4 text-muted-foreground" />
                      {formatMinutes(sla.tiempoRespuesta)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {formatMinutes(sla.tiempoResolucion)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {sla.horasOperacion.inicio} - {sla.horasOperacion.fin}
                      {sla.aplicaFinesSemana && (
                        <span className="text-muted-foreground ml-1">(+fds)</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={sla.estado === "activo" ? "default" : "secondary"}>
                      {sla.estado === "activo" ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" onClick={() => openForm(sla)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Eliminar SLA</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta accion eliminara permanentemente el SLA &quot;{sla.nombre}&quot;.
                              Los clientes asignados quedaran sin SLA.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(sla.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredSlas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    No se encontraron SLAs con los filtros actuales.
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

export default function SLAsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          Cargando...
        </div>
      }
    >
      <SLAsContent />
    </Suspense>
  )
}
