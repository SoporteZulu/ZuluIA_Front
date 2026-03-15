"use client"

import { useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { Plus, Search, MoreHorizontal, Edit, Trash2, Eye, Calendar, MapPin, X, Star } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useHdOrdenesServicio, useHdServicios, useHdClientes, useHdAgentes } from "@/lib/hooks/useHelpdesk"
import type { HDOrdenServicio } from "@/lib/types"

const estadoColors: Record<string, string> = {
  pendiente: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  programada: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  en_proceso: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  pausada: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  completada: "bg-green-500/10 text-green-500 border-green-500/20",
  cancelada: "bg-red-500/10 text-red-500 border-red-500/20",
}

const estadoLabels: Record<string, string> = {
  pendiente: "Pendiente",
  programada: "Programada",
  en_proceso: "En Proceso",
  pausada: "Pausada",
  completada: "Completada",
  cancelada: "Cancelada",
}

function OrdenesContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { ordenes, createOrden, updateOrden, deleteOrden } = useHdOrdenesServicio()
  const { servicios } = useHdServicios()
  const { clientes } = useHdClientes()
  const { agentes } = useHdAgentes()
  const getClienteById = (id: string) => clientes.find((c) => c.id === id)
  const getAgenteById = (id: string) => agentes.find((a) => a.id === id)
  const getServicioById = (id: string) => servicios.find((s) => s.id === id)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterEstado, setFilterEstado] = useState<string>("todos")
  const [filterPrioridad, setFilterPrioridad] = useState<string>("todos")
  const [isFormOpen, setIsFormOpen] = useState(searchParams.get("action") === "new")
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedOrden, setSelectedOrden] = useState<HDOrdenServicio | null>(null)
  const [formData, setFormData] = useState({
    clienteId: "",
    servicioId: "",
    tecnicoAsignadoId: "",
    estado: "pendiente" as HDOrdenServicio["estado"],
    prioridad: "media" as HDOrdenServicio["prioridad"],
    fechaProgramada: "",
    direccionServicio: "",
    descripcionTrabajo: "",
    observaciones: "",
  })

  const filteredOrdenes = ordenes.filter((orden) => {
    const cliente = getClienteById(orden.clienteId)
    const matchesSearch =
      orden.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente?.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesEstado = filterEstado === "todos" || orden.estado === filterEstado
    const matchesPrioridad = filterPrioridad === "todos" || orden.prioridad === filterPrioridad
    return matchesSearch && matchesEstado && matchesPrioridad
  })

  const openForm = (orden?: HDOrdenServicio) => {
    if (orden) {
      setSelectedOrden(orden)
      setFormData({
        clienteId: orden.clienteId,
        servicioId: orden.servicioId,
        tecnicoAsignadoId: orden.tecnicoAsignadoId || "",
        estado: orden.estado,
        prioridad: orden.prioridad,
        fechaProgramada: orden.fechaProgramada ? new Date(orden.fechaProgramada).toISOString().slice(0, 16) : "",
        direccionServicio: orden.direccionServicio || "",
        descripcionTrabajo: orden.descripcionTrabajo || "",
        observaciones: orden.observaciones || "",
      })
    } else {
      setSelectedOrden(null)
      setFormData({
        clienteId: "",
        servicioId: "",
        tecnicoAsignadoId: "",
        estado: "pendiente",
        prioridad: "media",
        fechaProgramada: "",
        direccionServicio: "",
        descripcionTrabajo: "",
        observaciones: "",
      })
    }
    setIsFormOpen(true)
  }

  const closeForm = () => {
    setIsFormOpen(false)
    setSelectedOrden(null)
    router.push("/helpdesk/ordenes")
  }

  const openDetail = (orden: HDOrdenServicio) => {
    setSelectedOrden(orden)
    setIsDetailOpen(true)
  }

  const handleSave = async () => {
    if (selectedOrden) {
      await updateOrden(selectedOrden.id, {
        ...formData,
        fechaProgramada: formData.fechaProgramada ? new Date(formData.fechaProgramada) : undefined,
      })
    } else {
      await createOrden({
        numero: `OS-${Date.now()}`,
        clienteId: formData.clienteId,
        servicioId: formData.servicioId,
        tecnicoAsignadoId: formData.tecnicoAsignadoId || undefined,
        estado: formData.estado,
        prioridad: formData.prioridad,
        fechaProgramada: formData.fechaProgramada ? new Date(formData.fechaProgramada) : undefined,
        direccionServicio: formData.direccionServicio || undefined,
        descripcionTrabajo: formData.descripcionTrabajo || undefined,
        observaciones: formData.observaciones || undefined,
        cumpleSLA: true,
      } as Omit<HDOrdenServicio, 'id' | 'createdAt' | 'updatedAt'>)
    }
    closeForm()
  }

  const handleDelete = async () => {
    if (selectedOrden) {
      await deleteOrden(selectedOrden.id)
      setIsDeleteOpen(false)
      setSelectedOrden(null)
    }
  }

  const handleStatusChange = async (ordenId: string, newStatus: HDOrdenServicio["estado"]) => {
    await updateOrden(ordenId, {
      estado: newStatus,
      fechaInicio: newStatus === "en_proceso" ? new Date() : undefined,
      fechaFin: newStatus === "completada" ? new Date() : undefined,
    })
  }

  const formatDate = (date: Date | undefined) => {
    if (!date) return "-"
    return new Date(date).toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const stats = {
    total: ordenes.length,
    pendientes: ordenes.filter((o) => o.estado === "pendiente" || o.estado === "programada").length,
    enProceso: ordenes.filter((o) => o.estado === "en_proceso").length,
    completadas: ordenes.filter((o) => o.estado === "completada").length,
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ordenes de Servicio</h1>
          <p className="text-muted-foreground">Gestion de ordenes de trabajo</p>
        </div>
        <Button onClick={() => openForm()}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Orden
        </Button>
      </div>

      {/* Estadisticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Ordenes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{stats.pendientes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">En Proceso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{stats.enProceso}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats.completadas}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por numero o cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterEstado} onValueChange={setFilterEstado}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="programada">Programada</SelectItem>
                <SelectItem value="en_proceso">En Proceso</SelectItem>
                <SelectItem value="pausada">Pausada</SelectItem>
                <SelectItem value="completada">Completada</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPrioridad} onValueChange={setFilterPrioridad}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Prioridad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="media">Media</SelectItem>
                <SelectItem value="baja">Baja</SelectItem>
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

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Orden</TableHead>
                <TableHead>Servicio</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Tecnico</TableHead>
                <TableHead>Fecha Prog.</TableHead>
                <TableHead>Prioridad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Calificacion</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrdenes.map((orden) => {
                const cliente = getClienteById(orden.clienteId)
                const servicio = getServicioById(orden.servicioId)
                const tecnico = orden.tecnicoAsignadoId ? getAgenteById(orden.tecnicoAsignadoId) : null
                return (
                  <TableRow key={orden.id} className="group">
                    <TableCell className="font-mono text-xs">{orden.numero}</TableCell>
                    <TableCell>{servicio?.nombre || "-"}</TableCell>
                    <TableCell>{cliente?.nombre || "-"}</TableCell>
                    <TableCell>
                      {tecnico ? `${tecnico.nombre} ${tecnico.apellido}` : "-"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {orden.fechaProgramada ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {formatDate(orden.fechaProgramada)}
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          orden.prioridad === "alta"
                            ? "bg-red-500/10 text-red-500"
                            : orden.prioridad === "media"
                              ? "bg-yellow-500/10 text-yellow-500"
                              : "bg-green-500/10 text-green-500"
                        }
                      >
                        {orden.prioridad}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={estadoColors[orden.estado]}>
                        {estadoLabels[orden.estado]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {orden.calificacion ? (
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                          {orden.calificacion}
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openDetail(orden)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver detalle
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openForm(orden)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedOrden(orden)
                              setIsDeleteOpen(true)
                            }}
                            className="text-red-600"
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
              {filteredOrdenes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No se encontraron ordenes de servicio
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog Formulario */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedOrden ? "Editar Orden" : "Nueva Orden de Servicio"}</DialogTitle>
            <DialogDescription>
              {selectedOrden
                ? "Modifica los datos de la orden"
                : "Complete los datos de la nueva orden"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="clienteId">Cliente *</Label>
                <Select
                  value={formData.clienteId}
                  onValueChange={(v) => setFormData({ ...formData, clienteId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientesHD.map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        {cliente.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="servicioId">Servicio *</Label>
                <Select
                  value={formData.servicioId}
                  onValueChange={(v) => setFormData({ ...formData, servicioId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {servicios.filter(s => s.estado === "activo").map((servicio) => (
                      <SelectItem key={servicio.id} value={servicio.id}>
                        {servicio.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="tecnicoAsignadoId">Tecnico Asignado</Label>
                <Select
                  value={formData.tecnicoAsignadoId}
                  onValueChange={(v) => setFormData({ ...formData, tecnicoAsignadoId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sin asignar" />
                  </SelectTrigger>
                  <SelectContent>
                    {agentes.filter(a => a.rol === "tecnico" || a.rol === "agente").map((agente) => (
                      <SelectItem key={agente.id} value={agente.id}>
                        {agente.nombre} {agente.apellido}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="prioridad">Prioridad</Label>
                <Select
                  value={formData.prioridad}
                  onValueChange={(v) => setFormData({ ...formData, prioridad: v as HDOrdenServicio["prioridad"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="media">Media</SelectItem>
                    <SelectItem value="baja">Baja</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="fechaProgramada">Fecha Programada</Label>
                <Input
                  id="fechaProgramada"
                  type="datetime-local"
                  value={formData.fechaProgramada}
                  onChange={(e) => setFormData({ ...formData, fechaProgramada: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="estado">Estado</Label>
                <Select
                  value={formData.estado}
                  onValueChange={(v) => setFormData({ ...formData, estado: v as HDOrdenServicio["estado"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="programada">Programada</SelectItem>
                    <SelectItem value="en_proceso">En Proceso</SelectItem>
                    <SelectItem value="pausada">Pausada</SelectItem>
                    <SelectItem value="completada">Completada</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="direccionServicio">Direccion del Servicio</Label>
              <Input
                id="direccionServicio"
                value={formData.direccionServicio}
                onChange={(e) => setFormData({ ...formData, direccionServicio: e.target.value })}
                placeholder="Direccion donde se realizara el servicio"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="descripcionTrabajo">Descripcion del Trabajo</Label>
              <Textarea
                id="descripcionTrabajo"
                value={formData.descripcionTrabajo}
                onChange={(e) => setFormData({ ...formData, descripcionTrabajo: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!formData.clienteId || !formData.servicioId}>
              {selectedOrden ? "Guardar cambios" : "Crear orden"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Detalle */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl">
          {selectedOrden && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <DialogTitle className="font-mono">{selectedOrden.numero}</DialogTitle>
                  <Badge variant="outline" className={estadoColors[selectedOrden.estado]}>
                    {estadoLabels[selectedOrden.estado]}
                  </Badge>
                </div>
                <DialogDescription>
                  {getServicioById(selectedOrden.servicioId)?.nombre}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Cliente</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="font-medium">{getClienteById(selectedOrden.clienteId)?.nombre}</p>
                      {selectedOrden.direccionServicio && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <MapPin className="h-3 w-3" />
                          {selectedOrden.direccionServicio}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Tecnico Asignado</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedOrden.tecnicoAsignadoId ? (
                        <p className="font-medium">
                          {getAgenteById(selectedOrden.tecnicoAsignadoId)?.nombre}{" "}
                          {getAgenteById(selectedOrden.tecnicoAsignadoId)?.apellido}
                        </p>
                      ) : (
                        <p className="text-muted-foreground">Sin asignar</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {selectedOrden.descripcionTrabajo && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Descripcion del Trabajo</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{selectedOrden.descripcionTrabajo}</p>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Tiempos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Programada</p>
                        <p>{formatDate(selectedOrden.fechaProgramada)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Inicio</p>
                        <p>{formatDate(selectedOrden.fechaInicio)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Fin</p>
                        <p>{formatDate(selectedOrden.fechaFin)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Duracion Real</p>
                        <p>{selectedOrden.duracionReal ? `${selectedOrden.duracionReal} min` : "-"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {selectedOrden.estado === "completada" && selectedOrden.calificacion && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Evaluacion del Cliente</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-5 w-5 ${i < selectedOrden.calificacion! ? "fill-yellow-500 text-yellow-500" : "text-muted"}`}
                            />
                          ))}
                        </div>
                        <span className="font-medium">{selectedOrden.calificacion}/5</span>
                      </div>
                      {selectedOrden.comentarioCliente && (
                        <p className="text-sm text-muted-foreground mt-2">
                          "{selectedOrden.comentarioCliente}"
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}

                <div className="flex gap-2">
                  <Select
                    value={selectedOrden.estado}
                    onValueChange={(v) => handleStatusChange(selectedOrden.id, v as HDOrdenServicio["estado"])}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendiente">Pendiente</SelectItem>
                      <SelectItem value="programada">Programada</SelectItem>
                      <SelectItem value="en_proceso">En Proceso</SelectItem>
                      <SelectItem value="pausada">Pausada</SelectItem>
                      <SelectItem value="completada">Completada</SelectItem>
                      <SelectItem value="cancelada">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={() => {
                    setIsDetailOpen(false)
                    openForm(selectedOrden)
                  }}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Alert Dialog Eliminar */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar orden de servicio</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer. Se eliminara permanentemente la orden{" "}
              <strong>{selectedOrden?.numero}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
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

export default function OrdenesServicioPage() {
  return (
    <Suspense fallback={<Loading />}>
      <OrdenesContent />
    </Suspense>
  )
}
