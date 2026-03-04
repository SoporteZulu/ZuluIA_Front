"use client"

import React from "react"

import { useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
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
  Plus, Search, MoreHorizontal, Pencil, Trash2, Target, DollarSign, TrendingUp, Building2, Calendar,
} from "lucide-react"
import { crmOpportunities as initialOpps, crmClients, crmContacts, crmUsers, getClientById, getUserById } from "@/lib/crm-data"
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

function OportunidadesContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const action = searchParams.get("action")
  const clienteIdParam = searchParams.get("clienteId")

  const [search, setSearch] = useState("")
  const [filterEtapa, setFilterEtapa] = useState<string>("all")
  const [isFormOpen, setIsFormOpen] = useState(action === "new")
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedOpp, setSelectedOpp] = useState<CRMOpportunity | null>(null)
  const [opportunities, setOpportunities] = useState(initialOpps)

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

  const stats = {
    total: opportunities.length,
    valorTotal: opportunities.filter(o => o.etapa !== "cerrado_perdido").reduce((sum, o) => sum + o.montoEstimado, 0),
    ganadas: opportunities.filter(o => o.etapa === "cerrado_ganado").length,
    enPipeline: opportunities.filter(o => !["cerrado_ganado", "cerrado_perdido"].includes(o.etapa)).length,
  }

  const filteredOpps = opportunities.filter(opp => {
    const matchesSearch = opp.titulo.toLowerCase().includes(search.toLowerCase())
    const matchesEtapa = filterEtapa === "all" || opp.etapa === filterEtapa
    return matchesSearch && matchesEtapa
  })

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

  const formatCurrency = (value: number, currency: string = "USD") => {
    return new Intl.NumberFormat("es-AR", { style: "currency", currency, minimumFractionDigits: 0 }).format(value)
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short", year: "numeric" }).format(date)
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedOpp) {
      setOpportunities(opportunities.map(o => 
        o.id === selectedOpp.id ? { ...o, ...formData, updatedAt: new Date() } as CRMOpportunity : o
      ))
    } else {
      const newOpp: CRMOpportunity = {
        ...formData as CRMOpportunity,
        id: `opp-${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      setOpportunities([newOpp, ...opportunities])
    }
    closeForm()
  }

  const confirmDelete = () => {
    if (selectedOpp) {
      setOpportunities(opportunities.filter(o => o.id !== selectedOpp.id))
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

  const clientContacts = formData.clienteId 
    ? crmContacts.filter(c => c.clienteId === formData.clienteId)
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
                <p className="text-2xl font-bold">{formatCurrency(stats.valorTotal)}</p>
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
                <p className="text-sm text-muted-foreground">Ganadas</p>
                <p className="text-2xl font-bold text-emerald-500">{stats.ganadas}</p>
              </div>
              <Target className="h-8 w-8 text-emerald-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

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
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Etapa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {Object.entries(etapaLabels).map(([value, label]) => (
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
                <TableHead>Oportunidad</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Probabilidad</TableHead>
                <TableHead>Cierre</TableHead>
                <TableHead>Responsable</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOpps.map((opp) => {
                const cliente = getClientById(opp.clienteId)
                const responsable = opp.responsableId ? getUserById(opp.responsableId) : null
                return (
                  <TableRow key={opp.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Target className="h-5 w-5 text-primary" />
                        </div>
                        <span className="font-medium">{opp.titulo}</span>
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
                    <TableCell>
                      <Badge className={getEtapaColor(opp.etapa)}>
                        {etapaLabels[opp.etapa]}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{formatCurrency(opp.montoEstimado, opp.moneda)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={opp.probabilidad} className="w-16 h-2" />
                        <span className="text-sm">{opp.probabilidad}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {opp.fechaEstimadaCierre ? (
                        <span className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3" />
                          {formatDate(opp.fechaEstimadaCierre)}
                        </span>
                      ) : "-"}
                    </TableCell>
                    <TableCell>{responsable ? `${responsable.nombre} ${responsable.apellido}` : "-"}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(opp)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDelete(opp)} className="text-red-500">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
              {filteredOpps.length === 0 && (
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
                    onValueChange={(value) => setFormData({ ...formData, clienteId: value, contactoPrincipalId: "" })}
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
                    value={formData.contactoPrincipalId || ""}
                    onValueChange={(value) => setFormData({ ...formData, contactoPrincipalId: value })}
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
                  <Label>Etapa</Label>
                  <Select
                    value={formData.etapa}
                    onValueChange={(value) => setFormData({ ...formData, etapa: value as CRMOpportunity["etapa"] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(etapaLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
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
                    onChange={(e) => setFormData({ ...formData, probabilidad: Number(e.target.value) })}
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
                    onChange={(e) => setFormData({ ...formData, montoEstimado: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Moneda</Label>
                  <Select
                    value={formData.moneda}
                    onValueChange={(value) => setFormData({ ...formData, moneda: value as CRMOpportunity["moneda"] })}
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
                    value={formData.fechaEstimadaCierre ? new Date(formData.fechaEstimadaCierre).toISOString().split('T')[0] : ""}
                    onChange={(e) => setFormData({ ...formData, fechaEstimadaCierre: e.target.value ? new Date(e.target.value) : undefined })}
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
                      {crmUsers.filter(u => ["comercial", "administrador"].includes(u.rol)).map(user => (
                        <SelectItem key={user.id} value={user.id}>{user.nombre} {user.apellido}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Origen</Label>
                <Select
                  value={formData.origen}
                  onValueChange={(value) => setFormData({ ...formData, origen: value as CRMOpportunity["origen"] })}
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
              Estás a punto de eliminar "{selectedOpp?.titulo}".
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
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-muted-foreground">Cargando...</div>}>
      <OportunidadesContent />
    </Suspense>
  )
}
