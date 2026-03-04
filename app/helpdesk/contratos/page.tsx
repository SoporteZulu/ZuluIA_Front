"use client"

import React, { useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { Plus, Search, Edit, Trash2, X, FileText, CheckCircle, XCircle, DollarSign, Calendar, RefreshCw } from "lucide-react"
import { contratos as initialContratos, crmClients, slas, servicios } from "@/lib/shared-data"
import type { HDContrato } from "@/lib/types"

const estadoLabels: Record<string, string> = {
  activo: "Activo",
  pausado: "Pausado",
  vencido: "Vencido",
  cancelado: "Cancelado",
}

const estadoColors: Record<string, string> = {
  activo: "bg-green-500/10 text-green-500",
  pausado: "bg-amber-500/10 text-amber-500",
  vencido: "bg-red-500/10 text-red-500",
  cancelado: "bg-slate-500/10 text-slate-500",
}

const tipoLabels: Record<string, string> = {
  mantenimiento: "Mantenimiento",
  soporte: "Soporte",
  suscripcion: "Suscripcion",
  proyecto: "Proyecto",
}

function ContratosContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [contratosList, setContratosList] = useState<HDContrato[]>(initialContratos)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingContrato, setEditingContrato] = useState<HDContrato | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterEstado, setFilterEstado] = useState<string>("all")
  const [filterTipo, setFilterTipo] = useState<string>("all")
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const [formData, setFormData] = useState<Partial<HDContrato>>({
    numero: "",
    clienteId: "",
    nombre: "",
    tipo: "soporte",
    estado: "activo",
    fechaInicio: new Date(),
    fechaFin: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
    valorMensual: 0,
    valorTotal: 0,
    serviciosIncluidos: [],
    horasIncluidas: 0,
    horasConsumidas: 0,
    slaId: "",
    renovacionAutomatica: false,
    condiciones: "",
  })

  // Filtrar solo clientes activos del CRM
  const clientesActivos = crmClients.filter(c => c.tipoCliente === 'activo' || c.tipoCliente === 'prospecto')

  const filteredContratos = contratosList.filter(contrato => {
    const cliente = crmClients.find(c => c.id === contrato.clienteId)
    const matchesSearch = contrato.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contrato.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente?.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesEstado = filterEstado === "all" || contrato.estado === filterEstado
    const matchesTipo = filterTipo === "all" || contrato.tipo === filterTipo
    return matchesSearch && matchesEstado && matchesTipo
  })

  const stats = {
    total: contratosList.length,
    activos: contratosList.filter(c => c.estado === "activo").length,
    vencidos: contratosList.filter(c => c.estado === "vencido").length,
    valorMensualTotal: contratosList.filter(c => c.estado === "activo").reduce((sum, c) => sum + (c.valorMensual || 0), 0),
  }

  const openForm = (contrato?: HDContrato) => {
    if (contrato) {
      setEditingContrato(contrato)
      setFormData({ ...contrato })
    } else {
      setEditingContrato(null)
      const nextNum = contratosList.length + 1
      setFormData({
        numero: `CON-2024-${String(nextNum).padStart(3, "0")}`,
        clienteId: "",
        nombre: "",
        tipo: "soporte",
        estado: "activo",
        fechaInicio: new Date(),
        fechaFin: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        valorMensual: 0,
        valorTotal: 0,
        serviciosIncluidos: [],
        horasIncluidas: 0,
        horasConsumidas: 0,
        slaId: "",
        renovacionAutomatica: false,
        condiciones: "",
      })
    }
    setIsFormOpen(true)
  }

  const closeForm = () => {
    setIsFormOpen(false)
    setEditingContrato(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingContrato) {
      setContratosList(contratosList.map(c => 
        c.id === editingContrato.id ? { ...c, ...formData, updatedAt: new Date() } as HDContrato : c
      ))
    } else {
      const newContrato: HDContrato = {
        ...formData as HDContrato,
        id: `con-${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      setContratosList([...contratosList, newContrato])
    }
    closeForm()
  }

  const handleDelete = (id: string) => {
    setContratosList(contratosList.filter(c => c.id !== id))
    setDeleteId(null)
  }

  const clearFilters = () => {
    setSearchTerm("")
    setFilterEstado("all")
    setFilterTipo("all")
  }

  const hasActiveFilters = searchTerm || filterEstado !== "all" || filterTipo !== "all"

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-AR", { style: "currency", currency: "USD" }).format(value)
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("es-AR")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contratos</h1>
          <p className="text-muted-foreground">Gestion de contratos de servicio vinculados a clientes del CRM</p>
        </div>
        <Button onClick={() => openForm()}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Contrato
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contratos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
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
            <CardTitle className="text-sm font-medium">Vencidos</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.vencidos}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingreso Mensual</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.valorMensualTotal)}</div>
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
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, numero o cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterEstado} onValueChange={setFilterEstado}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="activo">Activos</SelectItem>
                <SelectItem value="pausado">Pausados</SelectItem>
                <SelectItem value="vencido">Vencidos</SelectItem>
                <SelectItem value="cancelado">Cancelados</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                <SelectItem value="soporte">Soporte</SelectItem>
                <SelectItem value="suscripcion">Suscripcion</SelectItem>
                <SelectItem value="proyecto">Proyecto</SelectItem>
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-2 h-4 w-4" />
                Limpiar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Listado de Contratos</CardTitle>
          <CardDescription>{filteredContratos.length} contrato(s) encontrado(s)</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numero</TableHead>
                <TableHead>Cliente (CRM)</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Vigencia</TableHead>
                <TableHead>Valor Mensual</TableHead>
                <TableHead>Horas</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContratos.map((contrato) => {
                const cliente = crmClients.find(c => c.id === contrato.clienteId)
                const horasPercent = contrato.horasIncluidas 
                  ? Math.min((contrato.horasConsumidas / contrato.horasIncluidas) * 100, 100)
                  : 0
                return (
                  <TableRow key={contrato.id} className="group">
                    <TableCell className="font-mono text-sm">{contrato.numero}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{cliente?.nombre || "Cliente no encontrado"}</div>
                        <div className="text-sm text-muted-foreground">{contrato.nombre}</div>
                        {cliente && (
                          <Badge variant="outline" className="mt-1 text-xs">{cliente.segmento}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{tipoLabels[contrato.tipo]}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {formatDate(contrato.fechaInicio)} - {formatDate(contrato.fechaFin)}
                      </div>
                      {contrato.renovacionAutomatica && (
                        <div className="flex items-center gap-1 mt-1">
                          <RefreshCw className="h-3 w-3 text-blue-500" />
                          <span className="text-xs text-blue-500">Auto-renovable</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {contrato.valorMensual ? formatCurrency(contrato.valorMensual) : "-"}
                      {contrato.valorTotal && !contrato.valorMensual && (
                        <div className="text-sm text-muted-foreground">Total: {formatCurrency(contrato.valorTotal)}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {contrato.horasIncluidas ? (
                        <div className="space-y-1">
                          <div className="text-sm">
                            {contrato.horasConsumidas} / {contrato.horasIncluidas}h
                          </div>
                          <Progress value={horasPercent} className="h-1.5 w-20" />
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Ilimitado</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={estadoColors[contrato.estado]}>
                        {estadoLabels[contrato.estado]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" onClick={() => openForm(contrato)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(contrato.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
              {filteredContratos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No se encontraron contratos
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingContrato ? "Editar Contrato" : "Nuevo Contrato"}</DialogTitle>
            <DialogDescription>
              {editingContrato ? "Modifica los datos del contrato" : "Los clientes se obtienen del modulo CRM"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="numero">Numero de Contrato</Label>
                <Input
                  id="numero"
                  value={formData.numero}
                  onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clienteId">Cliente (CRM) *</Label>
                <Select 
                  value={formData.clienteId} 
                  onValueChange={(value) => setFormData({ ...formData, clienteId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientesActivos.map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        {cliente.nombre} ({cliente.segmento})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre del Contrato *</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Ej: Contrato de Soporte Anual"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo de Contrato</Label>
                <Select 
                  value={formData.tipo} 
                  onValueChange={(value: HDContrato["tipo"]) => setFormData({ ...formData, tipo: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="soporte">Soporte</SelectItem>
                    <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                    <SelectItem value="suscripcion">Suscripcion</SelectItem>
                    <SelectItem value="proyecto">Proyecto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="slaId">SLA Aplicable</Label>
                <Select 
                  value={formData.slaId} 
                  onValueChange={(value) => setFormData({ ...formData, slaId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar SLA" />
                  </SelectTrigger>
                  <SelectContent>
                    {slas.filter(s => s.estado === 'activo').map((sla) => (
                      <SelectItem key={sla.id} value={sla.id}>
                        {sla.nombre} (Resp: {sla.tiempoRespuesta}min)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fechaInicio">Fecha Inicio</Label>
                <Input
                  id="fechaInicio"
                  type="date"
                  value={formData.fechaInicio ? new Date(formData.fechaInicio).toISOString().split('T')[0] : ''}
                  onChange={(e) => setFormData({ ...formData, fechaInicio: new Date(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fechaFin">Fecha Fin</Label>
                <Input
                  id="fechaFin"
                  type="date"
                  value={formData.fechaFin ? new Date(formData.fechaFin).toISOString().split('T')[0] : ''}
                  onChange={(e) => setFormData({ ...formData, fechaFin: new Date(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="valorMensual">Valor Mensual (USD)</Label>
                <Input
                  id="valorMensual"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.valorMensual || ''}
                  onChange={(e) => setFormData({ ...formData, valorMensual: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="valorTotal">Valor Total (USD)</Label>
                <Input
                  id="valorTotal"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.valorTotal || ''}
                  onChange={(e) => setFormData({ ...formData, valorTotal: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="horasIncluidas">Horas Incluidas</Label>
                <Input
                  id="horasIncluidas"
                  type="number"
                  min="0"
                  value={formData.horasIncluidas || ''}
                  onChange={(e) => setFormData({ ...formData, horasIncluidas: parseInt(e.target.value) || 0 })}
                  placeholder="0 = Ilimitado"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="horasConsumidas">Horas Consumidas</Label>
                <Input
                  id="horasConsumidas"
                  type="number"
                  min="0"
                  value={formData.horasConsumidas || 0}
                  onChange={(e) => setFormData({ ...formData, horasConsumidas: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="estado">Estado</Label>
                <Select 
                  value={formData.estado} 
                  onValueChange={(value: HDContrato["estado"]) => setFormData({ ...formData, estado: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activo">Activo</SelectItem>
                    <SelectItem value="pausado">Pausado</SelectItem>
                    <SelectItem value="vencido">Vencido</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2 pt-8">
                <Switch
                  id="renovacionAutomatica"
                  checked={formData.renovacionAutomatica}
                  onCheckedChange={(checked) => setFormData({ ...formData, renovacionAutomatica: checked })}
                />
                <Label htmlFor="renovacionAutomatica">Renovacion Automatica</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="condiciones">Condiciones y Notas</Label>
              <Textarea
                id="condiciones"
                value={formData.condiciones || ''}
                onChange={(e) => setFormData({ ...formData, condiciones: e.target.value })}
                rows={3}
                placeholder="Terminos y condiciones del contrato..."
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeForm}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingContrato ? "Guardar Cambios" : "Crear Contrato"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Contrato</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion eliminara permanentemente el contrato. Esta seguro?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteId && handleDelete(deleteId)} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default function ContratosPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-muted-foreground">Cargando...</div>}>
      <ContratosContent />
    </Suspense>
  )
}
