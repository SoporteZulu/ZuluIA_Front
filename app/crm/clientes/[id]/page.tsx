"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  ArrowLeft,
  Building2,
  Phone,
  Mail,
  Globe,
  MapPin,
  Calendar,
  User,
  Pencil,
  Plus,
  MessageSquare,
  Target,
  Users,
  Clock,
} from "lucide-react"
import {
  useCrmClientes,
  useCrmContactos,
  useCrmOportunidades,
  useCrmInteracciones,
  useCrmTareas,
  useCrmUsuarios,
} from "@/lib/hooks/useCrm"
import type { CRMComment } from "@/lib/types"

const getTipoColor = (tipo: string) => {
  switch (tipo) {
    case "prospecto": return "bg-blue-500/20 text-blue-400"
    case "activo": return "bg-green-500/20 text-green-400"
    case "inactivo": return "bg-yellow-500/20 text-yellow-400"
    case "perdido": return "bg-red-500/20 text-red-400"
    default: return "bg-gray-500/20 text-gray-400"
  }
}

const getEtapaColor = (etapa: string) => {
  switch (etapa) {
    case "lead": return "bg-slate-500/20 text-slate-400"
    case "calificado": return "bg-blue-500/20 text-blue-400"
    case "propuesta": return "bg-purple-500/20 text-purple-400"
    case "negociacion": return "bg-yellow-500/20 text-yellow-400"
    case "cerrado_ganado": return "bg-green-500/20 text-green-400"
    case "cerrado_perdido": return "bg-red-500/20 text-red-400"
    default: return "bg-gray-500/20 text-gray-400"
  }
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(value)

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short", year: "numeric" }).format(date)

const formatDateTime = (date: Date) =>
  new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date)

export default function ClienteDetallePage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const [newComment, setNewComment] = useState("")
  const [comments, setComments] = useState<CRMComment[]>([])

  const { clientes } = useCrmClientes()
  const { contactos: contacts } = useCrmContactos(id)
  const { oportunidades: opportunities } = useCrmOportunidades(id)
  const { interacciones: interactions } = useCrmInteracciones(id)
  const { tareas: tasks } = useCrmTareas(id)
  const { usuarios } = useCrmUsuarios()

  const client = clientes.find((c) => c.id === id)
  const responsable = client?.responsableId ? usuarios.find((u) => u.id === client.responsableId) : null
  const getUserById = (userId: string) => usuarios.find((u) => u.id === userId)

  const handleAddComment = () => {
    if (!newComment.trim()) return
    const comment: CRMComment = {
      id: `com-${Date.now()}`,
      usuarioId: "usr-001",
      referenciaId: id,
      referenciaTipo: "cliente",
      texto: newComment,
      fechaHora: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setComments([...comments, comment])
    setNewComment("")
  }

  if (!client) return <div className="p-8 text-center text-muted-foreground">Cliente no encontrado</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{client.nombre}</h1>
            <Badge className={getTipoColor(client.tipoCliente)}>{client.tipoCliente}</Badge>
          </div>
          <p className="text-muted-foreground capitalize">{client.segmento} - {client.industria}</p>
        </div>
        <Button asChild>
          <Link href={`/crm/clientes?action=edit&id=${id}`}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Link>
        </Button>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Contacto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {client.telefonoPrincipal && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{client.telefonoPrincipal}</span>
              </div>
            )}
            {client.emailPrincipal && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{client.emailPrincipal}</span>
              </div>
            )}
            {client.sitioWeb && (
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <a href={`https://${client.sitioWeb}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  {client.sitioWeb}
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ubicacion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{client.ciudad}, {client.provincia}</span>
            </div>
            <p className="text-sm text-muted-foreground">{client.direccion}</p>
            <p className="text-sm">{client.pais}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Informacion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {client.cuit && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>CUIT: {client.cuit}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Alta: {formatDate(client.fechaAlta)}</span>
            </div>
            {responsable && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{responsable.nombre} {responsable.apellido}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="contactos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="contactos">
            <Users className="mr-2 h-4 w-4" />
            Contactos ({contacts.length})
          </TabsTrigger>
          <TabsTrigger value="oportunidades">
            <Target className="mr-2 h-4 w-4" />
            Oportunidades ({opportunities.length})
          </TabsTrigger>
          <TabsTrigger value="interacciones">
            <Phone className="mr-2 h-4 w-4" />
            Interacciones ({interactions.length})
          </TabsTrigger>
          <TabsTrigger value="tareas">
            <Clock className="mr-2 h-4 w-4" />
            Tareas ({tasks.length})
          </TabsTrigger>
          <TabsTrigger value="comentarios">
            <MessageSquare className="mr-2 h-4 w-4" />
            Comentarios ({comments.length})
          </TabsTrigger>
        </TabsList>

        {/* Contactos */}
        <TabsContent value="contactos">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Contactos</CardTitle>
                <CardDescription>Personas de contacto del cliente</CardDescription>
              </div>
              <Button size="sm" asChild>
                <Link href={`/crm/contactos?action=new&clienteId=${id}`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Contacto
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefono</TableHead>
                    <TableHead>Canal Preferido</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell className="font-medium">
                        <Link href={`/crm/contactos/${contact.id}`} className="hover:underline">
                          {contact.nombre} {contact.apellido}
                        </Link>
                      </TableCell>
                      <TableCell>{contact.cargo || "-"}</TableCell>
                      <TableCell>{contact.email || "-"}</TableCell>
                      <TableCell>{contact.telefono || "-"}</TableCell>
                      <TableCell className="capitalize">{contact.canalPreferido}</TableCell>
                    </TableRow>
                  ))}
                  {contacts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No hay contactos registrados
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Oportunidades */}
        <TabsContent value="oportunidades">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Oportunidades</CardTitle>
                <CardDescription>Negocios y oportunidades del cliente</CardDescription>
              </div>
              <Button size="sm" asChild>
                <Link href={`/crm/oportunidades?action=new&clienteId=${id}`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva Oportunidad
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titulo</TableHead>
                    <TableHead>Etapa</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Probabilidad</TableHead>
                    <TableHead>Cierre Esperado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {opportunities.map((opp) => (
                    <TableRow key={opp.id}>
                      <TableCell className="font-medium">
                        <Link href={`/crm/oportunidades/${opp.id}`} className="hover:underline">
                          {opp.titulo}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge className={getEtapaColor(opp.etapa)}>
                          {opp.etapa.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(opp.montoEstimado)}</TableCell>
                      <TableCell>{opp.probabilidad}%</TableCell>
                      <TableCell>{opp.fechaEstimadaCierre ? formatDate(opp.fechaEstimadaCierre) : "-"}</TableCell>
                    </TableRow>
                  ))}
                  {opportunities.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No hay oportunidades registradas
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Interacciones */}
        <TabsContent value="interacciones">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Interacciones</CardTitle>
                <CardDescription>Historial de comunicaciones</CardDescription>
              </div>
              <Button size="sm" asChild>
                <Link href={`/crm/interacciones?action=new&clienteId=${id}`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva Interaccion
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {interactions.map((interaction) => {
                  const user = getUserById(interaction.usuarioResponsableId)
                  return (
                    <div key={interaction.id} className="flex gap-4 p-4 bg-muted/50 rounded-lg">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        {interaction.tipoInteraccion === "llamada" && <Phone className="h-5 w-5 text-primary" />}
                        {interaction.tipoInteraccion === "email" && <Mail className="h-5 w-5 text-primary" />}
                        {interaction.tipoInteraccion === "reunion" && <Users className="h-5 w-5 text-primary" />}
                        {interaction.tipoInteraccion === "visita" && <MapPin className="h-5 w-5 text-primary" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium capitalize">{interaction.tipoInteraccion} - {interaction.canal}</p>
                          <span className="text-sm text-muted-foreground">{formatDateTime(interaction.fechaHora)}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{interaction.descripcion}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline">{interaction.resultado}</Badge>
                          {user && <span className="text-xs text-muted-foreground">por {user.nombre} {user.apellido}</span>}
                        </div>
                      </div>
                    </div>
                  )
                })}
                {interactions.length === 0 && (
                  <p className="text-center py-8 text-muted-foreground">
                    No hay interacciones registradas
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tareas */}
        <TabsContent value="tareas">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Tareas</CardTitle>
                <CardDescription>Tareas y seguimientos</CardDescription>
              </div>
              <Button size="sm" asChild>
                <Link href={`/crm/tareas?action=new&clienteId=${id}`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva Tarea
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titulo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead>Prioridad</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">{task.titulo}</TableCell>
                      <TableCell className="capitalize">{task.tipoTarea.replace("_", " ")}</TableCell>
                      <TableCell>{formatDate(task.fechaVencimiento)}</TableCell>
                      <TableCell>
                        <Badge variant={task.prioridad === "alta" ? "destructive" : task.prioridad === "media" ? "default" : "secondary"}>
                          {task.prioridad}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={task.estado === "completada" ? "default" : task.estado === "vencida" ? "destructive" : "outline"}>
                          {task.estado}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {tasks.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No hay tareas registradas
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Comentarios */}
        <TabsContent value="comentarios">
          <Card>
            <CardHeader>
              <CardTitle>Comentarios</CardTitle>
              <CardDescription>Notas y comentarios del equipo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Escribe un comentario..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={2}
                />
                <Button onClick={handleAddComment}>Agregar</Button>
              </div>
              <div className="space-y-3">
                {comments.map((comment) => {
                  const user = getUserById(comment.usuarioId)
                  return (
                    <div key={comment.id} className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{user ? `${user.nombre} ${user.apellido}` : "Usuario"}</span>
                        <span className="text-sm text-muted-foreground">{formatDateTime(comment.fechaHora)}</span>
                      </div>
                      <p className="text-sm">{comment.texto}</p>
                    </div>
                  )
                })}
                {comments.length === 0 && (
                  <p className="text-center py-4 text-muted-foreground">
                    No hay comentarios
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Notas generales */}
      {client.notasGenerales && (
        <Card>
          <CardHeader>
            <CardTitle>Notas Generales</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{client.notasGenerales}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
