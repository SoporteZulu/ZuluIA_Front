"use client"

import React from "react"

import { useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Plus, Search, MoreHorizontal, Pencil, Trash2, User, Phone, Mail, Building2,
} from "lucide-react"
import { useCrmContactos, useCrmClientes } from "@/lib/hooks/useCrm"
import type { CRMContact } from "@/lib/types"

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

function ContactosContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const action = searchParams.get("action")
  const clienteIdParam = searchParams.get("clienteId")

  const [search, setSearch] = useState("")
  const [filterCliente, setFilterCliente] = useState<string>("all")
  const [filterEstado, setFilterEstado] = useState<string>("all")
  const [isFormOpen, setIsFormOpen] = useState(action === "new")
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedContact, setSelectedContact] = useState<CRMContact | null>(null)
  const [contacts, setContacts] = useState<CRMContact[]>([])
  const { contactos, loading, error, createContacto, updateContacto, deleteContacto } = useCrmContactos(clienteIdParam || undefined)
  const { clientes: crmClients } = useCrmClientes()

  const getClientById = (id?: string) => crmClients.find(c => c.id === id)

  // sync hook data into local state for optimistic UI
  React.useEffect(() => { setContacts(contactos) }, [contactos])

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

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = 
      `${contact.nombre} ${contact.apellido}`.toLowerCase().includes(search.toLowerCase()) ||
      contact.email?.toLowerCase().includes(search.toLowerCase()) ||
      contact.cargo?.toLowerCase().includes(search.toLowerCase())
    const matchesCliente = filterCliente === "all" || contact.clienteId === filterCliente
    const matchesEstado = filterEstado === "all" || contact.estadoContacto === filterEstado
    return matchesSearch && matchesCliente && matchesEstado
  })

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
      const newContact: CRMContact = {
        ...formData as CRMContact,
        id: `con-${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      setContacts([newContact, ...contacts])
      await createContacto(formData as Omit<CRMContact, 'id' | 'createdAt' | 'updatedAt'>)
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
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los clientes</SelectItem>
                {crmClients.map(client => (
                  <SelectItem key={client.id} value={client.id}>{client.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterEstado} onValueChange={setFilterEstado}>
              <SelectTrigger className="w-full md:w-[160px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(estadoLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
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
                <TableHead>Contacto</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Canal Preferido</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContacts.map((contact) => {
                const cliente = getClientById(contact.clienteId)
                return (
                  <TableRow key={contact.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{contact.nombre} {contact.apellido}</p>
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
                        <Link href={`/crm/clientes/${cliente.id}`} className="hover:underline flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {cliente.nombre}
                        </Link>
                      ) : "-"}
                    </TableCell>
                    <TableCell>{contact.cargo || "-"}</TableCell>
                    <TableCell>{canalLabels[contact.canalPreferido]}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getEstadoColor(contact.estadoContacto)}>
                        {estadoLabels[contact.estadoContacto]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(contact)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDelete(contact)} className="text-red-500">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
              {filteredContacts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
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
              {selectedContact ? "Modifica los datos del contacto" : "Ingresa los datos del nuevo contacto"}
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
                    {crmClients.map(client => (
                      <SelectItem key={client.id} value={client.id}>{client.nombre}</SelectItem>
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
                    onValueChange={(value) => setFormData({ ...formData, canalPreferido: value as CRMContact["canalPreferido"] })}
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
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select
                    value={formData.estadoContacto}
                    onValueChange={(value) => setFormData({ ...formData, estadoContacto: value as CRMContact["estadoContacto"] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(estadoLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
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
              <Button type="button" variant="outline" onClick={closeForm}>Cancelar</Button>
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
  return null;
}

export default function ContactosPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ContactosContent />
    </Suspense>
  )
}
