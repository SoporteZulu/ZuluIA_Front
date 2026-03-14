"use client"

import React, { useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Search, Edit, Trash2, X, FileText, DollarSign, Clock, CheckCircle, AlertCircle, XCircle, Eye, Send } from "lucide-react"
import { useHdFacturacion, useHdServicios } from "@/lib/hooks/useHelpdesk"
import { useCrmClientes } from "@/lib/hooks/useCrm"
import type { HDFacturaServicio, HDFacturaItem } from "@/lib/types"

const estadoLabels = {
  borrador: "Borrador",
  emitida: "Emitida",
  pagada: "Pagada",
  vencida: "Vencida",
  anulada: "Anulada",
}

const estadoColors = {
  borrador: "bg-slate-500/10 text-slate-500",
  emitida: "bg-blue-500/10 text-blue-500",
  pagada: "bg-green-500/10 text-green-500",
  vencida: "bg-red-500/10 text-red-500",
  anulada: "bg-amber-500/10 text-amber-500",
}

function FacturacionContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { facturas, loading, error, createFactura, updateFactura, deleteFactura } = useHdFacturacion()
  const { clientes: hdClientes } = useCrmClientes()
  const { servicios } = useHdServicios()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingFactura, setEditingFactura] = useState<HDFacturaServicio | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterEstado, setFilterEstado] = useState<string>("all")

  const filteredFacturas = facturas.filter(factura => {
    const cliente = hdClientes.find(c => c.id === factura.clienteId)
    const matchesSearch = factura.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente?.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesEstado = filterEstado === "all" || factura.estado === filterEstado
    return matchesSearch && matchesEstado
  })

  const stats = {
    total: facturas.length,
    pendientes: facturas.filter(f => f.estado === "emitida").length,
    pagadas: facturas.filter(f => f.estado === "pagada").length,
    vencidas: facturas.filter(f => f.estado === "vencida").length,
    totalFacturado: facturas.filter(f => f.estado !== "anulada").reduce((sum, f) => sum + f.total, 0),
    totalCobrado: facturas.filter(f => f.estado === "pagada").reduce((sum, f) => sum + f.total, 0),
  }

  const [formData, setFormData] = useState<Partial<HDFacturaServicio>>({
    numero: "",
    clienteId: "",
    ordenesServicioIds: [],
    fecha: new Date(),
    fechaVencimiento: new Date(),
    estado: "borrador",
    items: [],
    subtotal: 0,
    descuento: 0,
    impuestos: 0,
    total: 0,
    moneda: "USD",
    notas: "",
  })

  const openForm = (factura?: HDFacturaServicio) => {
    if (factura) {
      setEditingFactura(factura)
      setFormData({ ...factura })
    } else {
      setEditingFactura(null)
      const nextNumber = `FAC-${String(facturas.length + 1).padStart(5, "0")}`
      const vencimiento = new Date()
      vencimiento.setDate(vencimiento.getDate() + 30)
      setFormData({
        numero: nextNumber,
        clienteId: "",
        ordenesServicioIds: [],
        fecha: new Date(),
        fechaVencimiento: vencimiento,
        estado: "borrador",
        items: [],
        subtotal: 0,
        descuento: 0,
        impuestos: 0,
        total: 0,
        moneda: "USD",
        notas: "",
      })
    }
    setIsFormOpen(true)
  }

  const closeForm = () => {
    setIsFormOpen(false)
    setEditingFactura(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editingFactura) {
      await updateFactura(editingFactura.id, formData)
    } else {
      await createFactura(formData as Omit<HDFacturaServicio, 'id' | 'createdAt' | 'updatedAt'>)
    }
    closeForm()
  }

  const handleDelete = async (id: string) => {
    await deleteFactura(id)
  }

  const handleEmitir = (factura: HDFacturaServicio) => {
    setFacturas(facturas.map(f => 
      f.id === factura.id ? { ...f, estado: "emitida" as const, updatedAt: new Date() } : f
    ))
  }

  const handleMarcarPagada = (factura: HDFacturaServicio) => {
    setFacturas(facturas.map(f => 
      f.id === factura.id ? { ...f, estado: "pagada" as const, updatedAt: new Date() } : f
    ))
  }

  const clearFilters = () => {
    setSearchTerm("")
    setFilterEstado("all")
  }

  const hasActiveFilters = searchTerm || filterEstado !== "all"

  const formatCurrency = (value: number, currency: string = "USD") => {
    return new Intl.NumberFormat("es-AR", { style: "currency", currency }).format(value)
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("es-AR")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Facturacion</h1>
          <p className="text-muted-foreground">Gestion de facturas de servicios</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openForm()}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Factura
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingFactura ? "Editar Factura" : "Nueva Factura"}</DialogTitle>
              <DialogDescription>
                {editingFactura ? "Modifica los datos de la factura" : "Crea una nueva factura de servicios"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="numero">Numero de Factura</Label>
                  <Input
                    id="numero"
                    value={formData.numero}
                    onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                    required
                    disabled={!!editingFactura}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clienteId">Cliente</Label>
                  <Select
                    value={formData.clienteId}
                    onValueChange={(value) => setFormData({ ...formData, clienteId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {hdClientes.map((cliente) => (
                        <SelectItem key={cliente.id} value={cliente.id}>{cliente.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fecha">Fecha Emision</Label>
                  <Input
                    id="fecha"
                    type="date"
                    value={formData.fecha ? new Date(formData.fecha).toISOString().split('T')[0] : ""}
                    onChange={(e) => setFormData({ ...formData, fecha: new Date(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fechaVencimiento">Fecha Vencimiento</Label>
                  <Input
                    id="fechaVencimiento"
                    type="date"
                    value={formData.fechaVencimiento ? new Date(formData.fechaVencimiento).toISOString().split('T')[0] : ""}
                    onChange={(e) => setFormData({ ...formData, fechaVencimiento: new Date(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="moneda">Moneda</Label>
                  <Select
                    value={formData.moneda}
                    onValueChange={(value) => setFormData({ ...formData, moneda: value as HDFacturaServicio["moneda"] })}
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

              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="subtotal">Subtotal</Label>
                  <Input
                    id="subtotal"
                    type="number"
                    value={formData.subtotal || 0}
                    onChange={(e) => {
                      const subtotal = parseFloat(e.target.value) || 0
                      const total = subtotal - (formData.descuento || 0) + (formData.impuestos || 0)
                      setFormData({ ...formData, subtotal, total })
                    }}
                    min={0}
                    step={0.01}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descuento">Descuento</Label>
                  <Input
                    id="descuento"
                    type="number"
                    value={formData.descuento || 0}
                    onChange={(e) => {
                      const descuento = parseFloat(e.target.value) || 0
                      const total = (formData.subtotal || 0) - descuento + (formData.impuestos || 0)
                      setFormData({ ...formData, descuento, total })
                    }}
                    min={0}
                    step={0.01}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="impuestos">Impuestos</Label>
                  <Input
                    id="impuestos"
                    type="number"
                    value={formData.impuestos || 0}
                    onChange={(e) => {
                      const impuestos = parseFloat(e.target.value) || 0
                      const total = (formData.subtotal || 0) - (formData.descuento || 0) + impuestos
                      setFormData({ ...formData, impuestos, total })
                    }}
                    min={0}
                    step={0.01}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="total">Total</Label>
                  <Input
                    id="total"
                    type="number"
                    value={formData.total || 0}
                    disabled
                    className="font-bold"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notas">Notas</Label>
                <Textarea
                  id="notas"
                  value={formData.notas || ""}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  rows={3}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeForm}>Cancelar</Button>
                <Button type="submit">{editingFactura ? "Guardar Cambios" : "Crear Factura"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Facturas</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendientes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pagadas}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Facturado</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalFacturado)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cobrado</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalCobrado)}</div>
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
                  placeholder="Buscar por numero o cliente..."
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
                <SelectItem value="borrador">Borradores</SelectItem>
                <SelectItem value="emitida">Emitidas</SelectItem>
                <SelectItem value="pagada">Pagadas</SelectItem>
                <SelectItem value="vencida">Vencidas</SelectItem>
                <SelectItem value="anulada">Anuladas</SelectItem>
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
          <CardTitle>Listado de Facturas</CardTitle>
          <CardDescription>{filteredFacturas.length} factura(s) encontrada(s)</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numero</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFacturas.map((factura) => {
                const cliente = hdClientes.find(c => c.id === factura.clienteId)
                return (
                  <TableRow key={factura.id} className="group">
                    <TableCell className="font-mono text-sm">{factura.numero}</TableCell>
                    <TableCell className="font-medium">{cliente?.nombre || "Cliente no encontrado"}</TableCell>
                    <TableCell>{formatDate(factura.fecha)}</TableCell>
                    <TableCell>{formatDate(factura.fechaVencimiento)}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(factura.total, factura.moneda)}</TableCell>
                    <TableCell>
                      <Badge className={estadoColors[factura.estado]}>
                        {estadoLabels[factura.estado]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {factura.estado === "borrador" && (
                          <Button variant="ghost" size="icon" onClick={() => handleEmitir(factura)} title="Emitir">
                            <Send className="h-4 w-4" />
                          </Button>
                        )}
                        {factura.estado === "emitida" && (
                          <Button variant="ghost" size="icon" onClick={() => handleMarcarPagada(factura)} title="Marcar como pagada">
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => openForm(factura)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Eliminar Factura</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta accion eliminara permanentemente la factura {factura.numero}.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(factura.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
              {filteredFacturas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No se encontraron facturas
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

export default function FacturacionPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-muted-foreground">Cargando...</div>}>
      <FacturacionContent />
    </Suspense>
  )
}
