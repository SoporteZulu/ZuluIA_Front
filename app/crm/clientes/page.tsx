"use client"

import React from "react"

import { useState, Suspense } from "react"
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
  TrendingUp,
  UserCheck,
  UserX,
  Download,
  Filter,
} from "lucide-react"
import { crmClients as initialClients, crmUsers, getUserById } from "@/lib/crm-data"
import type { CRMClient } from "@/lib/types"

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

function ClientesContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const action = searchParams.get("action")
  const editId = searchParams.get("id")

  const [search, setSearch] = useState("")
  const [filterTipo, setFilterTipo] = useState<string>("all")
  const [filterSegmento, setFilterSegmento] = useState<string>("all")
  const [filterEstado, setFilterEstado] = useState<string>("all")
  const [isFormOpen, setIsFormOpen] = useState(action === "new" || action === "edit")
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<CRMClient | null>(
    editId ? initialClients.find(c => c.id === editId) || null : null
  )
  const [clients, setClients] = useState(initialClients)

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

  const [formData, setFormData] = useState<Partial<CRMClient>>(
    selectedClient ? { ...selectedClient } : emptyForm
  )

  // Estadísticas
  const stats = {
    total: clients.length,
    activos: clients.filter(c => c.tipoCliente === "activo").length,
    prospectos: clients.filter(c => c.tipoCliente === "prospecto").length,
    inactivos: clients.filter(c => c.tipoCliente === "inactivo").length,
  }

  const filteredClients = clients.filter(client => {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (selectedClient) {
      // Editar cliente existente
      setClients(clients.map(c => 
        c.id === selectedClient.id 
          ? { ...c, ...formData, updatedAt: new Date() } as CRMClient 
          : c
      ))
    } else {
      // Crear nuevo cliente
      const newClient: CRMClient = {
        ...formData as CRMClient,
        id: `cli-${Date.now()}`,
        fechaAlta: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      setClients([newClient, ...clients])
    }
    
    closeForm()
  }

  const confirmDelete = () => {
    if (selectedClient) {
      setClients(clients.filter(c => c.id !== selectedClient.id))
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

  const hasActiveFilters = search || filterTipo !== "all" || filterSegmento !== "all" || filterEstado !== "all"

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
                <p className="text-sm text-muted-foreground">Total Clientes</p>
                <p className="text-2xl font-bold">{stats.total}</p>
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
                <p className="text-sm text-muted-foreground">Activos</p>
                <p className="text-2xl font-bold text-emerald-500">{stats.activos}</p>
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
                <p className="text-sm text-muted-foreground">Prospectos</p>
                <p className="text-2xl font-bold text-blue-500">{stats.prospectos}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inactivos</p>
                <p className="text-2xl font-bold text-amber-500">{stats.inactivos}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <UserX className="h-5 w-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
                <SelectTrigger className="w-full md:w-[160px]">
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
                <SelectTrigger className="w-full md:w-[160px]">
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
                <SelectTrigger className="w-full md:w-[180px]">
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

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Segmento</TableHead>
                <TableHead>Industria</TableHead>
                <TableHead>Estado Relación</TableHead>
                <TableHead>Responsable</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => {
                const responsable = client.responsableId ? getUserById(client.responsableId) : null
                return (
                  <TableRow key={client.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
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
                                <Mail className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">{client.emailPrincipal}</span>
                              </span>
                            )}
                            {client.telefonoPrincipal && (
                              <span className="flex items-center gap-1 hidden lg:flex">
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
                    <TableCell>{client.industria || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getEstadoColor(client.estadoRelacion)}>
                        {estadoRelacionLabels[client.estadoRelacion]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {responsable ? `${responsable.nombre} ${responsable.apellido}` : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
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
              {filteredClients.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
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
                : "Completa los datos del nuevo cliente. Los campos marcados con * son obligatorios."
              }
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
                    onValueChange={(value) => setFormData({ ...formData, tipoCliente: value as CRMClient["tipoCliente"] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(tipoClienteLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="segmento">Segmento *</Label>
                  <Select
                    value={formData.segmento}
                    onValueChange={(value) => setFormData({ ...formData, segmento: value as CRMClient["segmento"] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(segmentoLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
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
                    onValueChange={(value) => setFormData({ ...formData, origenCliente: value as CRMClient["origenCliente"] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(origenLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Contacto */}
              <div className="space-y-1 pt-2">
                <h4 className="font-medium text-sm text-muted-foreground">Información de Contacto</h4>
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
                    onChange={(e) => setFormData({ ...formData, telefonoPrincipal: e.target.value })}
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
                    onValueChange={(value) => setFormData({ ...formData, estadoRelacion: value as CRMClient["estadoRelacion"] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(estadoRelacionLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
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
                        .filter(u => u.rol === "comercial" || u.rol === "administrador")
                        .map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.nombre} {user.apellido}
                          </SelectItem>
                        ))
                      }
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
              <Button type="submit">
                {selectedClient ? "Guardar Cambios" : "Crear Cliente"}
              </Button>
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
              Estás a punto de eliminar a <strong>{selectedClient?.nombre}</strong>. 
              Esta acción eliminará también todos los contactos, oportunidades e interacciones asociadas.
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

export default function ClientesPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Cargando clientes...</div>
      </div>
    }>
      <ClientesContent />
    </Suspense>
  )
}

// loading.tsx
// export default function Loading() {
//   return null;
// }
