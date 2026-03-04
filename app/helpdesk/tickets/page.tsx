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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Clock,
  MessageSquare,
  Paperclip,
  Send,
  X,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  tickets as initialTickets,
  ticketComments,
  clientesHD,
  agentes,
  departamentos,
  slas,
  getClienteById,
  getAgenteById,
  getDepartamentoById,
} from "@/lib/helpdesk-data"
import type { HDTicket, HDTicketComment } from "@/lib/types"

const prioridadColors: Record<string, string> = {
  critica: "bg-red-500/10 text-red-500 border-red-500/20",
  alta: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  media: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  baja: "bg-green-500/10 text-green-500 border-green-500/20",
}

const estadoColors: Record<string, string> = {
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

const categoriaLabels: Record<string, string> = {
  soporte_tecnico: "Soporte Tecnico",
  consulta: "Consulta",
  reclamo: "Reclamo",
  solicitud_servicio: "Solicitud de Servicio",
  sugerencia: "Sugerencia",
}

const canalLabels: Record<string, string> = {
  email: "Email",
  telefono: "Telefono",
  chat: "Chat",
  web: "Web",
  presencial: "Presencial",
}

function TicketsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [ticketsList, setTicketsList] = useState<HDTicket[]>(initialTickets)
  const [commentsList, setCommentsList] = useState<HDTicketComment[]>(ticketComments)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterEstado, setFilterEstado] = useState<string>("todos")
  const [filterPrioridad, setFilterPrioridad] = useState<string>("todos")
  const [filterCategoria, setFilterCategoria] = useState<string>("todos")
  const [isFormOpen, setIsFormOpen] = useState(searchParams.get("action") === "new")
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<HDTicket | null>(null)
  const [newComment, setNewComment] = useState("")
  const [isInternalComment, setIsInternalComment] = useState(false)
  const [formData, setFormData] = useState({
    asunto: "",
    descripcion: "",
    clienteId: "",
    categoria: "soporte_tecnico" as HDTicket["categoria"],
    prioridad: "media" as HDTicket["prioridad"],
    canal: "email" as HDTicket["canal"],
    asignadoAId: "",
    departamentoId: "",
    tags: "",
  })

  const filteredTickets = ticketsList.filter((ticket) => {
    const matchesSearch =
      ticket.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.asunto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getClienteById(ticket.clienteId)?.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesEstado = filterEstado === "todos" || ticket.estado === filterEstado
    const matchesPrioridad = filterPrioridad === "todos" || ticket.prioridad === filterPrioridad
    const matchesCategoria = filterCategoria === "todos" || ticket.categoria === filterCategoria
    return matchesSearch && matchesEstado && matchesPrioridad && matchesCategoria
  })

  const openForm = (ticket?: HDTicket) => {
    if (ticket) {
      setSelectedTicket(ticket)
      setFormData({
        asunto: ticket.asunto,
        descripcion: ticket.descripcion,
        clienteId: ticket.clienteId,
        categoria: ticket.categoria,
        prioridad: ticket.prioridad,
        canal: ticket.canal,
        asignadoAId: ticket.asignadoAId || "",
        departamentoId: ticket.departamentoId || "",
        tags: ticket.tags?.join(", ") || "",
      })
    } else {
      setSelectedTicket(null)
      setFormData({
        asunto: "",
        descripcion: "",
        clienteId: "",
        categoria: "soporte_tecnico",
        prioridad: "media",
        canal: "email",
        asignadoAId: "",
        departamentoId: "",
        tags: "",
      })
    }
    setIsFormOpen(true)
  }

  const closeForm = () => {
    setIsFormOpen(false)
    setSelectedTicket(null)
    router.push("/helpdesk/tickets")
  }

  const openDetail = (ticket: HDTicket) => {
    setSelectedTicket(ticket)
    setIsDetailOpen(true)
  }

  const handleSave = () => {
    if (selectedTicket) {
      setTicketsList((prev) =>
        prev.map((t) =>
          t.id === selectedTicket.id
            ? {
                ...t,
                ...formData,
                tags: formData.tags ? formData.tags.split(",").map((s) => s.trim()) : [],
                estado: formData.asignadoAId && t.estado === "nuevo" ? "asignado" : t.estado,
                updatedAt: new Date(),
              }
            : t
        )
      )
    } else {
      const newTicket: HDTicket = {
        id: `tk-${Date.now()}`,
        numero: `TK-2024-${String(ticketsList.length + 1).padStart(4, "0")}`,
        asunto: formData.asunto,
        descripcion: formData.descripcion,
        clienteId: formData.clienteId,
        categoria: formData.categoria,
        prioridad: formData.prioridad,
        estado: formData.asignadoAId ? "asignado" : "nuevo",
        canal: formData.canal,
        asignadoAId: formData.asignadoAId || undefined,
        departamentoId: formData.departamentoId || undefined,
        slaId: clientesHD.find((c) => c.id === formData.clienteId)?.slaId,
        fechaCreacion: new Date(),
        cumpleSLA: true,
        tags: formData.tags ? formData.tags.split(",").map((s) => s.trim()) : [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      setTicketsList((prev) => [newTicket, ...prev])
    }
    closeForm()
  }

  const handleDelete = () => {
    if (selectedTicket) {
      setTicketsList((prev) => prev.filter((t) => t.id !== selectedTicket.id))
      setIsDeleteOpen(false)
      setSelectedTicket(null)
    }
  }

  const handleStatusChange = (ticketId: string, newStatus: HDTicket["estado"]) => {
    setTicketsList((prev) =>
      prev.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              estado: newStatus,
              fechaResolucion: newStatus === "resuelto" ? new Date() : t.fechaResolucion,
              fechaCierre: newStatus === "cerrado" ? new Date() : t.fechaCierre,
              updatedAt: new Date(),
            }
          : t
      )
    )
  }

  const handleAddComment = () => {
    if (!selectedTicket || !newComment.trim()) return
    const comment: HDTicketComment = {
      id: `com-${Date.now()}`,
      ticketId: selectedTicket.id,
      usuarioId: "ag-001", // Usuario actual simulado
      texto: newComment,
      esInterno: isInternalComment,
      fechaHora: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setCommentsList((prev) => [...prev, comment])
    setNewComment("")
  }

  const getTicketComments = (ticketId: string) => {
    return commentsList
      .filter((c) => c.ticketId === ticketId)
      .sort((a, b) => new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime())
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
    total: ticketsList.length,
    nuevos: ticketsList.filter((t) => t.estado === "nuevo").length,
    enProgreso: ticketsList.filter((t) => ["asignado", "en_progreso"].includes(t.estado)).length,
    resueltos: ticketsList.filter((t) => ["resuelto", "cerrado"].includes(t.estado)).length,
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tickets</h1>
          <p className="text-muted-foreground">Gestion de tickets de soporte</p>
        </div>
        <Button onClick={() => openForm()}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Ticket
        </Button>
      </div>

      {/* Estadisticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Nuevos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{stats.nuevos}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">En Progreso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{stats.enProgreso}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Resueltos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats.resueltos}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por numero, asunto o cliente..."
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
                <SelectItem value="nuevo">Nuevo</SelectItem>
                <SelectItem value="asignado">Asignado</SelectItem>
                <SelectItem value="en_progreso">En Progreso</SelectItem>
                <SelectItem value="esperando_cliente">Esperando Cliente</SelectItem>
                <SelectItem value="resuelto">Resuelto</SelectItem>
                <SelectItem value="cerrado">Cerrado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPrioridad} onValueChange={setFilterPrioridad}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Prioridad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                <SelectItem value="critica">Critica</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="media">Media</SelectItem>
                <SelectItem value="baja">Baja</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCategoria} onValueChange={setFilterCategoria}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                <SelectItem value="soporte_tecnico">Soporte Tecnico</SelectItem>
                <SelectItem value="consulta">Consulta</SelectItem>
                <SelectItem value="reclamo">Reclamo</SelectItem>
                <SelectItem value="solicitud_servicio">Solicitud de Servicio</SelectItem>
                <SelectItem value="sugerencia">Sugerencia</SelectItem>
              </SelectContent>
            </Select>
            {(filterEstado !== "todos" || filterPrioridad !== "todos" || filterCategoria !== "todos") && (
              <Button
                variant="ghost"
                onClick={() => {
                  setFilterEstado("todos")
                  setFilterPrioridad("todos")
                  setFilterCategoria("todos")
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
                <TableHead>Ticket</TableHead>
                <TableHead>Asunto</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Prioridad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Asignado</TableHead>
                <TableHead>Creado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTickets.map((ticket) => {
                const cliente = getClienteById(ticket.clienteId)
                const agente = ticket.asignadoAId ? getAgenteById(ticket.asignadoAId) : null
                return (
                  <TableRow key={ticket.id} className="group">
                    <TableCell className="font-mono text-xs">{ticket.numero}</TableCell>
                    <TableCell>
                      <div className="max-w-[200px]">
                        <p className="font-medium truncate">{ticket.asunto}</p>
                        {ticket.tags && ticket.tags.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {ticket.tags.slice(0, 2).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{cliente?.nombre || "-"}</TableCell>
                    <TableCell>{categoriaLabels[ticket.categoria]}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={prioridadColors[ticket.prioridad]}>
                        {ticket.prioridad}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={estadoColors[ticket.estado]}>
                        {estadoLabels[ticket.estado]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {agente ? `${agente.nombre} ${agente.apellido}` : "-"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(ticket.fechaCreacion)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openDetail(ticket)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver detalle
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openForm(ticket)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedTicket(ticket)
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
              {filteredTickets.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No se encontraron tickets
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog Formulario */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTicket ? "Editar Ticket" : "Nuevo Ticket"}</DialogTitle>
            <DialogDescription>
              {selectedTicket
                ? "Modifica los datos del ticket"
                : "Complete los datos para crear un nuevo ticket"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="asunto">Asunto *</Label>
              <Input
                id="asunto"
                value={formData.asunto}
                onChange={(e) => setFormData({ ...formData, asunto: e.target.value })}
                placeholder="Describe brevemente el problema"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="descripcion">Descripcion *</Label>
              <Textarea
                id="descripcion"
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Detalle completo del problema o solicitud"
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="clienteId">Cliente *</Label>
                <Select
                  value={formData.clienteId}
                  onValueChange={(v) => setFormData({ ...formData, clienteId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente" />
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
                <Label htmlFor="canal">Canal</Label>
                <Select
                  value={formData.canal}
                  onValueChange={(v) => setFormData({ ...formData, canal: v as HDTicket["canal"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="telefono">Telefono</SelectItem>
                    <SelectItem value="chat">Chat</SelectItem>
                    <SelectItem value="web">Web</SelectItem>
                    <SelectItem value="presencial">Presencial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="categoria">Categoria</Label>
                <Select
                  value={formData.categoria}
                  onValueChange={(v) => setFormData({ ...formData, categoria: v as HDTicket["categoria"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="soporte_tecnico">Soporte Tecnico</SelectItem>
                    <SelectItem value="consulta">Consulta</SelectItem>
                    <SelectItem value="reclamo">Reclamo</SelectItem>
                    <SelectItem value="solicitud_servicio">Solicitud de Servicio</SelectItem>
                    <SelectItem value="sugerencia">Sugerencia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="prioridad">Prioridad</Label>
                <Select
                  value={formData.prioridad}
                  onValueChange={(v) => setFormData({ ...formData, prioridad: v as HDTicket["prioridad"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critica">Critica</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="media">Media</SelectItem>
                    <SelectItem value="baja">Baja</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="departamentoId">Departamento</Label>
                <Select
                  value={formData.departamentoId}
                  onValueChange={(v) => setFormData({ ...formData, departamentoId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {departamentos.map((dep) => (
                      <SelectItem key={dep.id} value={dep.id}>
                        {dep.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="asignadoAId">Asignar a</Label>
                <Select
                  value={formData.asignadoAId}
                  onValueChange={(v) => setFormData({ ...formData, asignadoAId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sin asignar" />
                  </SelectTrigger>
                  <SelectContent>
                    {agentes.map((agente) => (
                      <SelectItem key={agente.id} value={agente.id}>
                        {agente.nombre} {agente.apellido}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tags">Etiquetas</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="Separadas por coma: urgente, erp, produccion"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!formData.asunto || !formData.clienteId}>
              {selectedTicket ? "Guardar cambios" : "Crear ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Detalle */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedTicket && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <DialogTitle className="font-mono">{selectedTicket.numero}</DialogTitle>
                  <Badge variant="outline" className={prioridadColors[selectedTicket.prioridad]}>
                    {selectedTicket.prioridad}
                  </Badge>
                  <Badge variant="outline" className={estadoColors[selectedTicket.estado]}>
                    {estadoLabels[selectedTicket.estado]}
                  </Badge>
                </div>
                <DialogDescription>{selectedTicket.asunto}</DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="detalle" className="mt-4">
                <TabsList>
                  <TabsTrigger value="detalle">Detalle</TabsTrigger>
                  <TabsTrigger value="comentarios">
                    Comentarios ({getTicketComments(selectedTicket.id).length})
                  </TabsTrigger>
                  <TabsTrigger value="historial">Historial</TabsTrigger>
                </TabsList>

                <TabsContent value="detalle" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Descripcion</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap">{selectedTicket.descripcion}</p>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Informacion del Cliente</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Cliente:</span>
                          <span>{getClienteById(selectedTicket.clienteId)?.nombre}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tipo:</span>
                          <span>{getClienteById(selectedTicket.clienteId)?.tipoCliente.toUpperCase()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Canal:</span>
                          <span>{canalLabels[selectedTicket.canal]}</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Asignacion</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Departamento:</span>
                          <span>
                            {selectedTicket.departamentoId
                              ? getDepartamentoById(selectedTicket.departamentoId)?.nombre
                              : "-"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Agente:</span>
                          <span>
                            {selectedTicket.asignadoAId
                              ? `${getAgenteById(selectedTicket.asignadoAId)?.nombre} ${getAgenteById(selectedTicket.asignadoAId)?.apellido}`
                              : "-"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Categoria:</span>
                          <span>{categoriaLabels[selectedTicket.categoria]}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Tiempos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Creado</p>
                          <p className="text-sm">{formatDate(selectedTicket.fechaCreacion)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Primera Respuesta</p>
                          <p className="text-sm">{formatDate(selectedTicket.fechaPrimeraRespuesta)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Resolucion</p>
                          <p className="text-sm">{formatDate(selectedTicket.fechaResolucion)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Cumple SLA</p>
                          <Badge variant={selectedTicket.cumpleSLA ? "default" : "destructive"}>
                            {selectedTicket.cumpleSLA ? "Si" : "No"}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex gap-2">
                    <Select
                      value={selectedTicket.estado}
                      onValueChange={(v) => handleStatusChange(selectedTicket.id, v as HDTicket["estado"])}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nuevo">Nuevo</SelectItem>
                        <SelectItem value="asignado">Asignado</SelectItem>
                        <SelectItem value="en_progreso">En Progreso</SelectItem>
                        <SelectItem value="esperando_cliente">Esperando Cliente</SelectItem>
                        <SelectItem value="resuelto">Resuelto</SelectItem>
                        <SelectItem value="cerrado">Cerrado</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={() => openForm(selectedTicket)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="comentarios" className="space-y-4">
                  <div className="space-y-4 max-h-[300px] overflow-y-auto">
                    {getTicketComments(selectedTicket.id).map((comment) => {
                      const autor = getAgenteById(comment.usuarioId)
                      return (
                        <div
                          key={comment.id}
                          className={`rounded-lg border p-3 ${comment.esInterno ? "bg-yellow-500/5 border-yellow-500/20" : ""}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {autor ? `${autor.nombre} ${autor.apellido}` : "Usuario"}
                              </span>
                              {comment.esInterno && (
                                <Badge variant="outline" className="text-xs">
                                  Interno
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(comment.fechaHora)}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{comment.texto}</p>
                        </div>
                      )
                    })}
                    {getTicketComments(selectedTicket.id).length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        No hay comentarios aun
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Escribe un comentario..."
                      className="flex-1"
                      rows={2}
                    />
                    <div className="flex flex-col gap-2">
                      <Button size="sm" variant={isInternalComment ? "default" : "outline"} onClick={() => setIsInternalComment(!isInternalComment)}>
                        {isInternalComment ? "Interno" : "Publico"}
                      </Button>
                      <Button size="sm" onClick={handleAddComment} disabled={!newComment.trim()}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="historial">
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-center text-muted-foreground">
                        Historial de cambios del ticket
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Alert Dialog Eliminar */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar ticket</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer. Se eliminara permanentemente el ticket{" "}
              <strong>{selectedTicket?.numero}</strong>.
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

export default function TicketsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64">Cargando...</div>}>
      <TicketsContent />
    </Suspense>
  )
}

// loading.tsx
// export default function Loading() {
//   return null
// }
