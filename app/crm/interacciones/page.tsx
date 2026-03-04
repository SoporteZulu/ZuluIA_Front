"use client"

import React, { useState, Suspense } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useSearchParams, useRouter } from "next/navigation"
import { Plus, Search, Phone, Mail, Users, MapPin, Video, MessageSquare, Pencil, Trash2, Building2 } from "lucide-react"
import { crmInteractions as initialInteractions, crmClients, crmContacts, crmUsers, getClientById, getContactById, getUserById } from "@/lib/crm-data"
import type { CRMInteraction } from "@/lib/types"

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

function InteraccionesContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const action = searchParams.get("action")
  const clienteIdParam = searchParams.get("clienteId")

  const [search, setSearch] = useState("")
  const [filterTipo, setFilterTipo] = useState<string>("all")
  const [filterResultado, setFilterResultado] = useState<string>("all")
  const [isFormOpen, setIsFormOpen] = useState(action === "new")
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedInteraction, setSelectedInteraction] = useState<CRMInteraction | null>(null)
  const [interactions, setInteractions] = useState(initialInteractions)

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

  const filteredInteractions = interactions.filter(int => {
    const matchesSearch = int.descripcion?.toLowerCase().includes(search.toLowerCase())
    const matchesTipo = filterTipo === "all" || int.tipoInteraccion === filterTipo
    const matchesResultado = filterResultado === "all" || int.resultado === filterResultado
    return matchesSearch && matchesTipo && matchesResultado
  }).sort((a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime())

  const getResultadoColor = (resultado: CRMInteraction["resultado"]) => {
    const colors = {
      exitosa: "bg-emerald-500/20 text-emerald-400",
      sin_respuesta: "bg-amber-500/20 text-amber-400",
      reprogramada: "bg-blue-500/20 text-blue-400",
      cancelada: "bg-red-500/20 text-red-400",
    }
    return colors[resultado]
  }

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
    }).format(date)
  }

  const openNewForm = () => {
    setSelectedInteraction(null)
    setFormData(emptyForm)
    setIsFormOpen(true)
  }

  const handleEdit = (interaction: CRMInteraction) => {
    setSelectedInteraction(interaction)
    setFormData({ ...interaction })
    setIsFormOpen(true)
  }

  const handleDelete = (interaction: CRMInteraction) => {
    setSelectedInteraction(interaction)
    setIsDeleteOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedInteraction) {
      setInteractions(interactions.map(i => 
        i.id === selectedInteraction.id ? { ...i, ...formData, updatedAt: new Date() } as CRMInteraction : i
      ))
    } else {
      const newInteraction: CRMInteraction = {
        ...formData as CRMInteraction,
        id: `int-${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      setInteractions([newInteraction, ...interactions])
    }
    closeForm()
  }

  const confirmDelete = () => {
    if (selectedInteraction) {
      setInteractions(interactions.filter(i => i.id !== selectedInteraction.id))
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
    ? crmContacts.filter(c => c.clienteId === formData.clienteId)
    : []

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
              <SelectTrigger className="w-full md:w-[160px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(tipoLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterResultado} onValueChange={setFilterResultado}>
              <SelectTrigger className="w-full md:w-[160px]">
                <SelectValue placeholder="Resultado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(resultadoLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {filteredInteractions.map((interaction) => {
          const cliente = getClientById(interaction.clienteId)
          const contacto = interaction.contactoId ? getContactById(interaction.contactoId) : null
          const usuario = getUserById(interaction.usuarioResponsableId)
          return (
            <Card key={interaction.id} className="group">
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {tipoIcons[interaction.tipoInteraccion]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium capitalize">{tipoLabels[interaction.tipoInteraccion]}</span>
                          <span className="text-muted-foreground">via {canalLabels[interaction.canal]}</span>
                          <Badge className={getResultadoColor(interaction.resultado)}>
                            {resultadoLabels[interaction.resultado]}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          {cliente && (
                            <Link href={`/crm/clientes/${cliente.id}`} className="hover:underline flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {cliente.nombre}
                            </Link>
                          )}
                          {contacto && (
                            <span>{contacto.nombre} {contacto.apellido}</span>
                          )}
                          <span>{formatDateTime(interaction.fechaHora)}</span>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(interaction)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(interaction)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    {interaction.descripcion && (
                      <p className="mt-2 text-sm">{interaction.descripcion}</p>
                    )}
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
            <DialogTitle>{selectedInteraction ? "Editar Interacción" : "Nueva Interacción"}</DialogTitle>
            <DialogDescription>
              Registra una comunicación con el cliente
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cliente *</Label>
                  <Select
                    value={formData.clienteId}
                    onValueChange={(value) => setFormData({ ...formData, clienteId: value, contactoId: "" })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {crmClients.map(client => (
                        <SelectItem key={client.id} value={client.id}>{client.nombre}</SelectItem>
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
                      {clientContacts.map(contact => (
                        <SelectItem key={contact.id} value={contact.id}>{contact.nombre} {contact.apellido}</SelectItem>
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
                    onValueChange={(value) => setFormData({ ...formData, tipoInteraccion: value as CRMInteraction["tipoInteraccion"] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(tipoLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Canal</Label>
                  <Select
                    value={formData.canal}
                    onValueChange={(value) => setFormData({ ...formData, canal: value as CRMInteraction["canal"] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(canalLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
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
                    value={formData.fechaHora ? new Date(formData.fechaHora).toISOString().slice(0, 16) : ""}
                    onChange={(e) => setFormData({ ...formData, fechaHora: new Date(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Resultado</Label>
                  <Select
                    value={formData.resultado}
                    onValueChange={(value) => setFormData({ ...formData, resultado: value as CRMInteraction["resultado"] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(resultadoLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Responsable</Label>
                <Select
                  value={formData.usuarioResponsableId}
                  onValueChange={(value) => setFormData({ ...formData, usuarioResponsableId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {crmUsers.map(user => (
                      <SelectItem key={user.id} value={user.id}>{user.nombre} {user.apellido}</SelectItem>
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
              <Button type="button" variant="outline" onClick={closeForm}>Cancelar</Button>
              <Button type="submit">{selectedInteraction ? "Guardar" : "Registrar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar interacción?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
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

export default function InteraccionesPage() {
  return (
    <Suspense fallback={<Loading />}>
      <InteraccionesContent />
    </Suspense>
  )
}
