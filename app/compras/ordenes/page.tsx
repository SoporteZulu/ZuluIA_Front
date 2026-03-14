"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Send,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  ArrowLeft,
  ArrowRight,
  Printer,
  Package,
} from "lucide-react"
import type { PurchaseOrder, PurchaseOrderItem } from "@/lib/compras-types"
import {
  suppliers,
  paymentConditions,
  warehouses,
  products,
} from "@/lib/compras-data"
import { useOrdenesCompra } from "@/lib/hooks/useOrdenesCompra"
import type { OrdenCompra } from "@/lib/types/configuracion"

const estadoBadgeVariant = {
  borrador: "secondary",
  enviada: "default",
  confirmada: "default",
  en_transito: "default",
  recibida_parcial: "default",
  recibida_total: "default",
  cerrada: "secondary",
  cancelada: "destructive",
}

export default function OrdenesCompraPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const { ordenes, loading, error, recibir, cancelar } = useOrdenesCompra()
  const [searchTerm, setSearchTerm] = useState("")
  const [filterEstado, setFilterEstado] = useState<string>("todos")
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const [wizardStep, setWizardStep] = useState(1)
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [detailOrder, setDetailOrder] = useState<OrdenCompra | null>(null)

  // Wizard Form State
  const [formData, setFormData] = useState<Partial<PurchaseOrder>>({
    codigo: "",
    proveedorId: "",
    fechaEmision: new Date(),
    fechaEntregaEsperada: new Date(),
    almacenId: "",
    condicionPagoId: "",
    divisa: "ARS",
    estado: "borrador",
    estadoAprobacion: "pendiente",
    prioridad: "normal",
    referencia: "",
    subtotal: 0,
    descuento: 0,
    impuestos: 0,
    total: 0,
    items: [],
  })

  const [formItems, setFormItems] = useState<PurchaseOrderItem[]>([])

  const filteredOrders = ordenes.filter((order) => {
    const matchesSearch = String(order.id).includes(searchTerm) ||
      String(order.proveedorId).includes(searchTerm)
    const matchesEstado = filterEstado === "todos" || order.estadoOc.toLowerCase() === filterEstado.toLowerCase()
    return matchesSearch && matchesEstado
  })

  const handleNew = () => {
    setEditingOrder(null)
    setFormData({
      codigo: `OC-2024-${String(ordenes.length + 1).padStart(3, '0')}`,
      proveedorId: "",
      fechaEmision: new Date(),
      fechaEntregaEsperada: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      almacenId: warehouses[0]?.id || "",
      condicionPagoId: paymentConditions[0]?.id || "",
      divisa: "ARS",
      estado: "borrador",
      estadoAprobacion: "pendiente",
      prioridad: "normal",
      referencia: "",
      subtotal: 0,
      descuento: 0,
      impuestos: 0,
      total: 0,
      items: [],
    })
    setFormItems([])
    setWizardStep(1)
    setIsWizardOpen(true)
  }

  const handleViewDetail = (order: OrdenCompra) => {
    setDetailOrder(order)
    setIsDetailOpen(true)
  }

  const handleEdit = (order: PurchaseOrder) => {
    setEditingOrder(order)
    setFormData({
      codigo: order.codigo,
      proveedorId: order.proveedorId,
      fechaEmision: order.fechaEmision,
      fechaEntregaEsperada: order.fechaEntregaEsperada,
      almacenId: order.almacenId,
      condicionPagoId: order.condicionPagoId,
      divisa: order.divisa,
      estado: order.estado,
      estadoAprobacion: order.estadoAprobacion,
      prioridad: order.prioridad,
      referencia: order.referencia,
      subtotal: order.subtotal,
      descuento: order.descuento,
      impuestos: order.impuestos,
      total: order.total,
      items: order.items,
      direccionEnvio: order.direccionEnvio,
      notasInternas: order.notasInternas,
      notasProveedor: order.notasProveedor,
    })
    setFormItems(order.items)
    setWizardStep(1)
    setIsWizardOpen(true)
  }

  const addItem = () => {
    const newItem: PurchaseOrderItem = {
      id: `item-${Date.now()}`,
      ordenCompraId: formData.codigo || "",
      productoId: "",
      descripcion: "",
      cantidad: 1,
      cantidadRecibida: 0,
      cantidadRechazada: 0,
      uom: "unid",
      precioUnitario: 0,
      descuentoPorcentaje: 0,
      subtotal: 0,
    }
    setFormItems([...formItems, newItem])
  }

  const updateItem = (index: number, field: keyof PurchaseOrderItem, value: any) => {
    const updated = [...formItems]
    updated[index] = { ...updated[index], [field]: value }
    
    // Recalculate subtotal
    const cantidad = updated[index].cantidad
    const precio = updated[index].precioUnitario
    const descuento = updated[index].descuentoPorcentaje
    updated[index].subtotal = cantidad * precio * (1 - descuento / 100)
    
    setFormItems(updated)
  }

  const removeItem = (index: number) => {
    setFormItems(formItems.filter((_, i) => i !== index))
  }

  const calculateTotals = () => {
    const subtotal = formItems.reduce((sum, item) => sum + item.subtotal, 0)
    const descuento = 0
    const impuestos = subtotal * 0.21
    const total = subtotal - descuento + impuestos
    return { subtotal, descuento, impuestos, total }
  }

  const handleSaveOrder = () => {
    // Note: no backend create endpoint yet
    setIsWizardOpen(false)
    setWizardStep(1)
  }

  const nextStep = () => {
    if (wizardStep < 4) setWizardStep(wizardStep + 1)
  }

  const prevStep = () => {
    if (wizardStep > 1) setWizardStep(wizardStep - 1)
  }

  const getSupplierName = (supplierId: string) => {
    return suppliers.find(s => s.id === supplierId)?.razonSocial || "N/A"
  }

  const getWarehouseName = (warehouseId: string) => {
    return warehouses.find(w => w.id === warehouseId)?.nombre || "N/A"
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Órdenes de Compra</h1>
          <p className="text-muted-foreground">
            Gestión de órdenes de compra a proveedores
          </p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Orden de Compra
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código u orden..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={filterEstado} onValueChange={setFilterEstado}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="borrador">Borrador</SelectItem>
                <SelectItem value="enviada">Enviada</SelectItem>
                <SelectItem value="confirmada">Confirmada</SelectItem>
                <SelectItem value="en_transito">En Tránsito</SelectItem>
                <SelectItem value="recibida_parcial">Recibida Parcial</SelectItem>
                <SelectItem value="recibida_total">Recibida Total</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Órdenes ({filteredOrders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : error ? (
            <p className="text-center py-8 text-red-600 text-sm">{error}</p>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Proveedor ID</TableHead>
                <TableHead>Fecha Entrega Req.</TableHead>
                <TableHead>Estado OC</TableHead>
                <TableHead>Habilitada</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Sin ordenes de compra.</TableCell></TableRow>
              ) : filteredOrders.map((order) => (
                <TableRow
                  key={order.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleViewDetail(order)}
                >
                  <TableCell className="font-medium font-mono">OC-{order.id}</TableCell>
                  <TableCell className="text-muted-foreground">{order.proveedorId}</TableCell>
                  <TableCell>{order.fechaEntregaReq ? new Date(order.fechaEntregaReq).toLocaleDateString('es-AR') : '-'}</TableCell>
                  <TableCell>
                    <Badge variant={order.estadoOc === 'CANCELADA' ? 'destructive' : order.estadoOc === 'RECIBIDA' ? 'secondary' : 'default'}>
                      {order.estadoOc}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {order.habilitada
                      ? <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">Si</Badge>
                      : <Badge variant="outline" className="text-xs">No</Badge>}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleViewDetail(order)} title="Ver detalle">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {order.estadoOc === 'PENDIENTE' && (
                        <Button variant="ghost" size="icon" title="Recibir" onClick={() => recibir(order.id)}>
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </Button>
                      )}
                      {order.estadoOc === 'PENDIENTE' && (
                        <Button variant="ghost" size="icon" title="Cancelar" onClick={() => cancelar(order.id)}>
                          <XCircle className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>

      {/* Wizard Dialog */}
      <Dialog open={isWizardOpen} onOpenChange={setIsWizardOpen}>
        <DialogContent className="max-w-[95vw] w-[1400px] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingOrder ? "Editar" : "Nueva"} Orden de Compra
            </DialogTitle>
            <DialogDescription>
              Paso {wizardStep} de 4: {
                wizardStep === 1 ? "Información General" :
                wizardStep === 2 ? "Detalle de Productos" :
                wizardStep === 3 ? "Términos y Condiciones" :
                "Revisión y Confirmación"
              }
            </DialogDescription>
          </DialogHeader>

          <div className="py-6">
            {/* Step 1: Información General */}
            {wizardStep === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="proveedor">Proveedor *</Label>
                    <Select
                      value={formData.proveedorId}
                      onValueChange={(value) => setFormData({ ...formData, proveedorId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione un proveedor" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.filter(s => s.estado === 'activo').map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.razonSocial}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="almacen">Almacén de Recepción *</Label>
                    <Select
                      value={formData.almacenId}
                      onValueChange={(value) => setFormData({ ...formData, almacenId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione un almacén" />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses.filter(w => w.activo).map((warehouse) => (
                          <SelectItem key={warehouse.id} value={warehouse.id}>
                            {warehouse.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fechaEmision">Fecha de Emisión</Label>
                    <Input
                      id="fechaEmision"
                      type="date"
                      value={formData.fechaEmision ? new Date(formData.fechaEmision).toISOString().split('T')[0] : ''}
                      onChange={(e) => setFormData({ ...formData, fechaEmision: new Date(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fechaEntrega">Fecha de Entrega Esperada *</Label>
                    <Input
                      id="fechaEntrega"
                      type="date"
                      value={formData.fechaEntregaEsperada ? new Date(formData.fechaEntregaEsperada).toISOString().split('T')[0] : ''}
                      onChange={(e) => setFormData({ ...formData, fechaEntregaEsperada: new Date(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prioridad">Prioridad</Label>
                    <Select
                      value={formData.prioridad}
                      onValueChange={(value: any) => setFormData({ ...formData, prioridad: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="urgente">Urgente</SelectItem>
                        <SelectItem value="critica">Crítica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="condicionPago">Condición de Pago</Label>
                    <Select
                      value={formData.condicionPagoId}
                      onValueChange={(value) => setFormData({ ...formData, condicionPagoId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentConditions.map((condition) => (
                          <SelectItem key={condition.id} value={condition.id}>
                            {condition.descripcion}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="divisa">Divisa</Label>
                    <Select
                      value={formData.divisa}
                      onValueChange={(value: any) => setFormData({ ...formData, divisa: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ARS">ARS - Peso Argentino</SelectItem>
                        <SelectItem value="USD">USD - Dólar Estadounidense</SelectItem>
                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="referencia">Referencia / Cotización</Label>
                  <Input
                    id="referencia"
                    value={formData.referencia}
                    onChange={(e) => setFormData({ ...formData, referencia: e.target.value })}
                    placeholder="Número de cotización del proveedor"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Detalle de Productos */}
            {wizardStep === 2 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Productos a Ordenar</h3>
                  <Button onClick={addItem} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Ítem
                  </Button>
                </div>
                
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[300px]">Descripción</TableHead>
                        <TableHead className="w-[120px]">Cantidad</TableHead>
                        <TableHead className="w-[100px]">UOM</TableHead>
                        <TableHead className="w-[140px]">Precio Unit.</TableHead>
                        <TableHead className="w-[110px]">Desc. %</TableHead>
                        <TableHead className="w-[150px] text-right">Subtotal</TableHead>
                        <TableHead className="w-[60px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formItems.map((item, index) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Input
                              value={item.descripcion}
                              onChange={(e) => updateItem(index, 'descripcion', e.target.value)}
                              placeholder="Descripción del producto"
                              className="min-w-[280px]"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.cantidad}
                              onChange={(e) => updateItem(index, 'cantidad', Number(e.target.value))}
                              min="1"
                              className="w-full"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.uom}
                              onChange={(e) => updateItem(index, 'uom', e.target.value)}
                              placeholder="Unid."
                              className="w-full"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.precioUnitario}
                              onChange={(e) => updateItem(index, 'precioUnitario', Number(e.target.value))}
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              className="w-full text-right"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.descuentoPorcentaje}
                              onChange={(e) => updateItem(index, 'descuentoPorcentaje', Number(e.target.value))}
                              min="0"
                              max="100"
                              placeholder="0"
                              className="w-full text-right"
                            />
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ${item.subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItem(index)}
                              className="h-8 w-8"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {formItems.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay ítems agregados. Haga clic en "Agregar Ítem" para comenzar.
                  </div>
                )}

                {formItems.length > 0 && (
                  <div className="border-t pt-6 bg-muted/30 -mx-6 px-6 py-4">
                    <div className="flex justify-end">
                      <div className="w-[400px] space-y-3 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Subtotal:</span>
                          <span className="font-semibold text-base">${calculateTotals().subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Descuento:</span>
                          <span className="font-semibold text-base text-orange-600">-${calculateTotals().descuento.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">IVA (21%):</span>
                          <span className="font-semibold text-base">${calculateTotals().impuestos.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between items-center text-lg font-bold border-t pt-3 mt-2">
                          <span>Total:</span>
                          <span className="text-primary">${calculateTotals().total.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Términos y Condiciones */}
            {wizardStep === 3 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="metodoEnvio">Método de Envío</Label>
                  <Input
                    id="metodoEnvio"
                    value={formData.metodoEnvio || ''}
                    onChange={(e) => setFormData({ ...formData, metodoEnvio: e.target.value })}
                    placeholder="Ej: Transporte propio, Correo privado, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="direccionEntrega">Dirección de Entrega</Label>
                  <Textarea
                    id="direccionEntrega"
                    value={formData.direccionEntrega || ''}
                    onChange={(e) => setFormData({ ...formData, direccionEntrega: e.target.value })}
                    rows={2}
                    placeholder="Dirección completa de entrega"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="terminosPago">Términos de Pago Detallados</Label>
                  <Textarea
                    id="terminosPago"
                    value={formData.terminosPago || ''}
                    onChange={(e) => setFormData({ ...formData, terminosPago: e.target.value })}
                    rows={3}
                    placeholder="Descripción detallada de los términos de pago"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notasEspeciales">Notas Especiales para el Proveedor</Label>
                  <Textarea
                    id="notasEspeciales"
                    value={formData.notasEspeciales || ''}
                    onChange={(e) => setFormData({ ...formData, notasEspeciales: e.target.value })}
                    rows={4}
                    placeholder="Instrucciones especiales, requisitos, etc."
                  />
                </div>
              </div>
            )}

            {/* Step 4: Revisión y Confirmación */}
            {wizardStep === 4 && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Orden de Compra - {formData.codigo}</CardTitle>
                    <CardDescription>Revise la información antes de confirmar</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Info General */}
                    <div>
                      <h4 className="font-semibold mb-3">Información General</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Proveedor:</span>
                          <p className="font-medium">{getSupplierName(formData.proveedorId || '')}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Almacén:</span>
                          <p className="font-medium">{getWarehouseName(formData.almacenId || '')}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Fecha Emisión:</span>
                          <p className="font-medium">{formData.fechaEmision ? new Date(formData.fechaEmision).toLocaleDateString('es-AR') : '-'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Fecha Entrega:</span>
                          <p className="font-medium">{formData.fechaEntregaEsperada ? new Date(formData.fechaEntregaEsperada).toLocaleDateString('es-AR') : '-'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Prioridad:</span>
                          <Badge variant="outline">{formData.prioridad}</Badge>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Divisa:</span>
                          <p className="font-medium">{formData.divisa}</p>
                        </div>
                      </div>
                    </div>

                    {/* Items */}
                    <div>
                      <h4 className="font-semibold mb-3">Productos</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Descripción</TableHead>
                            <TableHead>Cantidad</TableHead>
                            <TableHead>UOM</TableHead>
                            <TableHead>Precio Unit.</TableHead>
                            <TableHead className="text-right">Subtotal</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {formItems.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>{item.descripcion}</TableCell>
                              <TableCell>{item.cantidad}</TableCell>
                              <TableCell>{item.uom}</TableCell>
                              <TableCell>${item.precioUnitario.toLocaleString('es-AR')}</TableCell>
                              <TableCell className="text-right font-medium">
                                ${item.subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Totales */}
                    <div className="border-t pt-4">
                      <div className="flex justify-end">
                        <div className="w-[300px] space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span className="font-medium">${calculateTotals().subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>IVA (21%):</span>
                            <span className="font-medium">${calculateTotals().impuestos.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between text-lg font-bold border-t pt-2">
                            <span>Total:</span>
                            <span>${calculateTotals().total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          <DialogFooter className="flex justify-between">
            <div>
              {wizardStep > 1 && (
                <Button variant="outline" onClick={prevStep}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Atrás
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsWizardOpen(false)}>
                Cancelar
              </Button>
              {wizardStep < 4 ? (
                <Button onClick={nextStep}>
                  Siguiente
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleSaveOrder}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirmar Orden
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              Detalle de Orden de Compra
              <Badge variant={detailOrder ? estadoBadgeVariant[detailOrder.estado] as any : "secondary"}>
                {detailOrder?.estado.replace('_', ' ')}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              {detailOrder?.codigo} - {detailOrder && getSupplierName(detailOrder.proveedorId)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Información General */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Información General</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground block mb-1">Proveedor</span>
                    <p className="font-medium">{detailOrder && getSupplierName(detailOrder.proveedorId)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1">Almacén</span>
                    <p className="font-medium">{detailOrder && getWarehouseName(detailOrder.almacenId)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1">Divisa</span>
                    <p className="font-medium">{detailOrder?.divisa}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1">Fecha Emisión</span>
                    <p className="font-medium">
                      {detailOrder ? new Date(detailOrder.fechaEmision).toLocaleDateString('es-AR') : '-'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1">Fecha Entrega Esperada</span>
                    <p className="font-medium">
                      {detailOrder ? new Date(detailOrder.fechaEntregaEsperada).toLocaleDateString('es-AR') : '-'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1">Prioridad</span>
                    <Badge variant="outline" className={
                      detailOrder?.prioridad === 'critica' ? 'border-red-500 text-red-600' :
                      detailOrder?.prioridad === 'urgente' ? 'border-orange-500 text-orange-600' :
                      'border-blue-500 text-blue-600'
                    }>
                      {detailOrder?.prioridad}
                    </Badge>
                  </div>
                  {detailOrder?.referencia && (
                    <div className="col-span-3">
                      <span className="text-muted-foreground block mb-1">Referencia / Cotización</span>
                      <p className="font-medium">{detailOrder.referencia}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Productos */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Productos ({detailOrder?.items.length || 0} ítems)</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Recibido</TableHead>
                      <TableHead>Pendiente</TableHead>
                      <TableHead>Precio Unit.</TableHead>
                      <TableHead>Desc. %</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailOrder?.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.descripcion}</TableCell>
                        <TableCell>{item.cantidad} {item.uom}</TableCell>
                        <TableCell className="text-green-600 font-medium">
                          {item.cantidadRecibida} {item.uom}
                        </TableCell>
                        <TableCell className="text-orange-600 font-medium">
                          {item.cantidad - item.cantidadRecibida - item.cantidadRechazada} {item.uom}
                        </TableCell>
                        <TableCell>${item.precioUnitario.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell>{item.descuentoPorcentaje}%</TableCell>
                        <TableCell className="text-right font-medium">
                          ${item.subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Notas */}
            {(detailOrder?.notasProveedor || detailOrder?.notasInternas) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Notas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {detailOrder.notasProveedor && (
                    <div>
                      <span className="text-muted-foreground text-sm block mb-1">Notas para el Proveedor:</span>
                      <p className="text-sm">{detailOrder.notasProveedor}</p>
                    </div>
                  )}
                  {detailOrder.notasInternas && (
                    <div>
                      <span className="text-muted-foreground text-sm block mb-1">Notas Internas:</span>
                      <p className="text-sm">{detailOrder.notasInternas}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Totales */}
            <div className="border-t pt-4 bg-muted/30 -mx-6 px-6 py-4">
              <div className="flex justify-end">
                <div className="w-[400px] space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-semibold text-base">${detailOrder?.subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Descuento:</span>
                    <span className="font-semibold text-base text-orange-600">-${detailOrder?.descuento.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">IVA (21%):</span>
                    <span className="font-semibold text-base">${detailOrder?.impuestos.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center text-lg font-bold border-t pt-3 mt-2">
                    <span>Total:</span>
                    <span className="text-primary">${detailOrder?.total.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              Cerrar
            </Button>
            <Button variant="outline">
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
            {detailOrder?.estado === 'borrador' && (
              <>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setIsDetailOpen(false)
                    detailOrder && handleEdit(detailOrder)
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
                <Button>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar a Proveedor
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
