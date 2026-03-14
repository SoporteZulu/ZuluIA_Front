"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
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
  Eye, 
  Edit, 
  Trash2, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock,
  Upload,
  Download,
  Printer,
  AlertCircle
} from "lucide-react"
import type { PurchaseDocument, PurchaseDocumentItem } from "@/lib/compras-types"
import { useComprobantes } from "@/lib/hooks/useComprobantes"
import { useProveedores } from "@/lib/hooks/useTerceros"
import { useOrdenesCompra } from "@/lib/hooks/useOrdenesCompra"
import type { Comprobante } from "@/lib/types/comprobantes"

export default function FacturasPage() {
  const searchParams = useSearchParams()
  const { comprobantes, loading, error, anular } = useComprobantes({ esCompra: true })
  const { terceros: proveedores } = useProveedores()
  const { ordenes: ordenesCompra } = useOrdenesCompra()
  const [facturas, setFacturas] = useState<PurchaseDocument[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterEstado, setFilterEstado] = useState<string>("todos")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [editingFactura, setEditingFactura] = useState<PurchaseDocument | null>(null)
  const [detailFactura, setDetailFactura] = useState<Comprobante | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    tipo: "factura" as const,
    numero: "",
    puntoVenta: "",
    letra: "A" as "A" | "B" | "C",
    fecha: new Date().toISOString().split('T')[0],
    fechaVencimiento: "",
    proveedorId: "",
    ordenCompraId: "",
    estado: "borrador" as const,
    divisa: "ARS" as "ARS" | "USD" | "EUR",
    tipoCambio: 1,
    observaciones: "",
  })

  const [formItems, setFormItems] = useState<PurchaseDocumentItem[]>([])

  const estadoBadgeVariant: Record<string, string> = {
    borrador: "secondary",
    pendiente: "default",
    aprobada: "outline",
    pagada: "default",
    anulada: "destructive",
  }

  const getSupplierName = (id: string | number) => {
    const numId = Number(id)
    return proveedores.find(p => p.id === numId)?.razonSocial || `Proveedor #${id}`
  }

  const getOCNumber = (id?: string) => {
    if (!id) return "N/A"
    return ordenesCompra.find(o => String(o.id) === id)?.id ? `OC #${id}` : `OC #${id}`
  }

  const filteredFacturas = comprobantes.filter(c => {
    const matchesSearch =
      String(c.nroComprobante ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(c.terceroId).includes(searchTerm)
    const matchesEstado = filterEstado === "todos" || c.estado.toLowerCase() === filterEstado.toLowerCase()
    return matchesSearch && matchesEstado
  })

  const handleOpenForm = (factura?: PurchaseDocument) => {
    if (factura) {
      setEditingFactura(factura)
      setFormData({
        tipo: factura.tipo,
        numero: factura.numero,
        puntoVenta: factura.puntoVenta,
        letra: factura.letra,
        fecha: new Date(factura.fecha).toISOString().split('T')[0],
        fechaVencimiento: factura.fechaVencimiento ? new Date(factura.fechaVencimiento).toISOString().split('T')[0] : "",
        proveedorId: factura.proveedorId,
        ordenCompraId: factura.ordenCompraId || "",
        estado: factura.estado,
        divisa: factura.divisa,
        tipoCambio: factura.tipoCambio,
        observaciones: factura.observaciones || "",
      })
      setFormItems(factura.items)
    } else {
      setEditingFactura(null)
      setFormData({
        tipo: "factura",
        numero: "",
        puntoVenta: "",
        letra: "A",
        fecha: new Date().toISOString().split('T')[0],
        fechaVencimiento: "",
        proveedorId: "",
        ordenCompraId: "",
        estado: "borrador",
        divisa: "ARS",
        tipoCambio: 1,
        observaciones: "",
      })
      setFormItems([])
    }
    setIsFormOpen(true)
  }

  const handleViewDetail = (factura: Comprobante) => {
    setDetailFactura(factura)
    setIsDetailOpen(true)
  }

  const addFormItem = () => {
    const newItem: PurchaseDocumentItem = {
      id: `item-${Date.now()}`,
      descripcion: "",
      cantidad: 1,
      uom: "unid",
      precioUnitario: 0,
      descuentoPorcentaje: 0,
      alicuotaIva: 21,
      subtotal: 0,
      iva: 0,
      total: 0,
    }
    setFormItems([...formItems, newItem])
  }

  const removeFormItem = (index: number) => {
    setFormItems(formItems.filter((_, i) => i !== index))
  }

  const updateFormItem = (index: number, field: keyof PurchaseDocumentItem, value: any) => {
    const updated = [...formItems]
    updated[index] = { ...updated[index], [field]: value }

    // Recalculate totals
    const cantidad = updated[index].cantidad
    const precioUnitario = updated[index].precioUnitario
    const descuento = updated[index].descuentoPorcentaje
    const alicuota = updated[index].alicuotaIva

    const subtotalSinDesc = cantidad * precioUnitario
    const montoDescuento = subtotalSinDesc * (descuento / 100)
    const subtotal = subtotalSinDesc - montoDescuento
    const iva = subtotal * (alicuota / 100)
    const total = subtotal + iva

    updated[index].subtotal = subtotal
    updated[index].iva = iva
    updated[index].total = total

    setFormItems(updated)
  }

  const calculateTotals = () => {
    const subtotal = formItems.reduce((sum, item) => sum + item.subtotal, 0)
    const descuento = formItems.reduce((sum, item) => {
      const montoDesc = (item.cantidad * item.precioUnitario) * (item.descuentoPorcentaje / 100)
      return sum + montoDesc
    }, 0)
    const iva21 = formItems.filter(i => i.alicuotaIva === 21).reduce((sum, item) => sum + item.iva, 0)
    const iva105 = formItems.filter(i => i.alicuotaIva === 10.5).reduce((sum, item) => sum + item.iva, 0)
    const iva27 = formItems.filter(i => i.alicuotaIva === 27).reduce((sum, item) => sum + item.iva, 0)
    const total = formItems.reduce((sum, item) => sum + item.total, 0)

    return { subtotal, descuento, iva21, iva105, iva27, total }
  }

  const handleSaveFactura = () => {
    const totals = calculateTotals()
    const newFactura: PurchaseDocument = {
      id: editingFactura?.id || `inv-${Date.now()}`,
      tipo: formData.tipo,
      numero: formData.numero,
      puntoVenta: formData.puntoVenta,
      letra: formData.letra,
      fecha: new Date(formData.fecha),
      fechaVencimiento: formData.fechaVencimiento ? new Date(formData.fechaVencimiento) : undefined,
      proveedorId: formData.proveedorId,
      ordenCompraId: formData.ordenCompraId || undefined,
      estado: formData.estado,
      divisa: formData.divisa,
      tipoCambio: formData.tipoCambio,
      items: formItems,
      subtotal: totals.subtotal,
      descuento: totals.descuento,
      iva21: totals.iva21,
      iva105: totals.iva105,
      iva27: totals.iva27,
      otrosImpuestos: 0,
      total: totals.total,
      observaciones: formData.observaciones,
      createdAt: editingFactura?.createdAt || new Date(),
      updatedAt: new Date(),
    }

    if (editingFactura) {
      setFacturas(facturas.map(f => f.id === editingFactura.id ? newFactura : f))
    } else {
      setFacturas([newFactura, ...facturas])
    }

    setIsFormOpen(false)
    setEditingFactura(null)
  }

  const handleAprobar = (factura: PurchaseDocument) => {
    setFacturas(facturas.map(f => 
      f.id === factura.id 
        ? { ...f, estado: "aprobada" as const, updatedAt: new Date() }
        : f
    ))
  }

  const handleRechazar = (factura: PurchaseDocument) => {
    setFacturas(facturas.map(f => 
      f.id === factura.id 
        ? { ...f, estado: "anulada" as const, updatedAt: new Date() }
        : f
    ))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Facturas de Compra</h1>
          <p className="text-muted-foreground">Gestión de facturas recibidas de proveedores</p>
        </div>
        <Button onClick={() => handleOpenForm()}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Factura
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Facturas</CardDescription>
            <CardTitle className="text-2xl">{comprobantes.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Emitidas</CardDescription>
            <CardTitle className="text-2xl text-orange-600">
              {comprobantes.filter(c => c.estado === 'EMITIDO').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pagadas</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {comprobantes.filter(c => c.estado === 'PAGADO').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total a Pagar</CardDescription>
            <CardTitle className="text-2xl">
              ${comprobantes.filter(c => c.estado === 'EMITIDO').reduce((s, c) => s + c.saldo, 0).toLocaleString('es-AR')}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número o proveedor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterEstado} onValueChange={setFilterEstado}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="borrador">Borrador</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="aprobada">Aprobada</SelectItem>
                <SelectItem value="pagada">Pagada</SelectItem>
                <SelectItem value="anulada">Anulada</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
                <TableHead>Número</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFacturas.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Sin facturas de compra.</TableCell></TableRow>
              ) : filteredFacturas.map((factura) => (
                <TableRow
                  key={factura.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => { setDetailFactura(factura); setIsDetailOpen(true) }}
                >
                  <TableCell className="font-medium font-mono">
                    {factura.nroComprobante ?? `#${factura.id}`}
                  </TableCell>
                  <TableCell>{new Date(factura.fecha).toLocaleDateString('es-AR')}</TableCell>
                  <TableCell className="text-muted-foreground">Proveedor #{factura.terceroId}</TableCell>
                  <TableCell>
                    <Badge variant={factura.estado === 'ANULADO' ? 'destructive' : factura.estado === 'PAGADO' ? 'secondary' : 'default'}>
                      {factura.estado}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ${factura.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right">
                    ${factura.saldo.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => { setDetailFactura(factura); setIsDetailOpen(true) }} title="Ver detalle">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {factura.estado !== 'ANULADO' && (
                        <Button variant="ghost" size="icon" title="Anular" onClick={() => anular(factura.id)}>
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

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-[95vw] w-[1400px] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingFactura ? 'Editar' : 'Nueva'} Factura de Compra</DialogTitle>
            <DialogDescription>
              {editingFactura ? `Editando factura ${editingFactura.numero}` : 'Complete los datos para registrar una nueva factura'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Datos de la Factura */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Datos de la Factura</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <Label>Letra</Label>
                    <Select
                      value={formData.letra}
                      onValueChange={(value: "A" | "B" | "C") => setFormData({...formData, letra: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">A</SelectItem>
                        <SelectItem value="B">B</SelectItem>
                        <SelectItem value="C">C</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Punto de Venta</Label>
                    <Input
                      value={formData.puntoVenta}
                      onChange={(e) => setFormData({...formData, puntoVenta: e.target.value})}
                      placeholder="00001"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Número</Label>
                    <Input
                      value={formData.numero}
                      onChange={(e) => setFormData({...formData, numero: e.target.value})}
                      placeholder="00012345"
                    />
                  </div>
                  <div>
                    <Label>Fecha</Label>
                    <Input
                      type="date"
                      value={formData.fecha}
                      onChange={(e) => setFormData({...formData, fecha: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Fecha Vencimiento</Label>
                    <Input
                      type="date"
                      value={formData.fechaVencimiento}
                      onChange={(e) => setFormData({...formData, fechaVencimiento: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Divisa</Label>
                    <Select
                      value={formData.divisa}
                      onValueChange={(value: "ARS" | "USD" | "EUR") => setFormData({...formData, divisa: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione un proveedor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ARS">ARS</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Tipo de Cambio</Label>
                    <Input
                      type="number"
                      value={formData.tipoCambio}
                      onChange={(e) => setFormData({...formData, tipoCambio: Number(e.target.value)})}
                      step="0.01"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Proveedor</Label>
                    <Select
                      value={formData.proveedorId}
                      onValueChange={(value) => setFormData({...formData, proveedorId: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione un proveedor" />
                      </SelectTrigger>
                      <SelectContent>
                        {proveedores.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.razonSocial}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label>Orden de Compra (opcional)</Label>
                    <Select
                      value={formData.ordenCompraId || '__none__'}
                      onValueChange={(value) => setFormData({...formData, ordenCompraId: value !== '__none__' ? value : ''})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione una OC" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Sin OC</SelectItem>
                        {ordenesCompra.map((orden) => (
                          <SelectItem key={orden.id} value={String(orden.id)}>
                            OC #{orden.id} — Proveedor #{orden.proveedorId}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Items */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Items de la Factura</CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={addFormItem}>
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[300px]">Descripción</TableHead>
                        <TableHead className="w-[120px]">Cantidad</TableHead>
                        <TableHead className="w-[100px]">UOM</TableHead>
                        <TableHead className="w-[140px]">Precio Unit.</TableHead>
                        <TableHead className="w-[110px]">Desc. %</TableHead>
                        <TableHead className="w-[110px]">IVA</TableHead>
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
                              onChange={(e) => updateFormItem(index, 'descripcion', e.target.value)}
                              placeholder="Descripción del producto/servicio"
                              className="min-w-[280px]"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.cantidad}
                              onChange={(e) => updateFormItem(index, 'cantidad', Number(e.target.value))}
                              min="1"
                              className="w-full"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.uom}
                              onChange={(e) => updateFormItem(index, 'uom', e.target.value)}
                              placeholder="unid"
                              className="w-full"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.precioUnitario}
                              onChange={(e) => updateFormItem(index, 'precioUnitario', Number(e.target.value))}
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
                              onChange={(e) => updateFormItem(index, 'descuentoPorcentaje', Number(e.target.value))}
                              min="0"
                              max="100"
                              placeholder="0"
                              className="w-full text-right"
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={item.alicuotaIva.toString()}
                              onValueChange={(value) => updateFormItem(index, 'alicuotaIva', Number(value))}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">0%</SelectItem>
                                <SelectItem value="10.5">10.5%</SelectItem>
                                <SelectItem value="21">21%</SelectItem>
                                <SelectItem value="27">27%</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ${item.subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeFormItem(index)}
                              className="h-8 w-8"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {formItems.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            No hay items agregados. Haga clic en "Agregar Item" para comenzar.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Observaciones */}
            <div>
              <Label>Observaciones</Label>
              <Textarea
                value={formData.observaciones}
                onChange={(e) => setFormData({...formData, observaciones: e.target.value})}
                placeholder="Observaciones adicionales sobre la factura..."
                rows={3}
              />
            </div>

            {/* Totales */}
            <div className="border-t pt-6 bg-muted/30 -mx-6 px-6 py-4">
              <div className="flex justify-end">
                <div className="w-[400px] space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-semibold text-base">
                      ${calculateTotals().subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Descuento:</span>
                    <span className="font-semibold text-base text-orange-600">
                      -${calculateTotals().descuento.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  {calculateTotals().iva21 > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">IVA 21%:</span>
                      <span className="font-semibold text-base">
                        ${calculateTotals().iva21.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  {calculateTotals().iva105 > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">IVA 10.5%:</span>
                      <span className="font-semibold text-base">
                        ${calculateTotals().iva105.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  {calculateTotals().iva27 > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">IVA 27%:</span>
                      <span className="font-semibold text-base">
                        ${calculateTotals().iva27.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-lg font-bold border-t pt-3 mt-2">
                    <span>Total:</span>
                    <span className="text-primary">
                      ${calculateTotals().total.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveFactura} disabled={formItems.length === 0 || !formData.proveedorId || !formData.numero}>
              {editingFactura ? 'Guardar Cambios' : 'Crear Factura'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              Detalle de Factura
              <Badge variant={detailFactura ? estadoBadgeVariant[detailFactura.estado] as any : "secondary"}>
                {detailFactura?.estado}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              {detailFactura?.nroComprobante ?? `#${detailFactura?.id}`} — {detailFactura && getSupplierName(detailFactura.terceroId)}
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
                    <p className="font-medium">{detailFactura && getSupplierName(detailFactura.terceroId)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1">Nro. Comprobante</span>
                    <p className="font-medium font-mono">{detailFactura?.nroComprobante ?? `#${detailFactura?.id}`}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1">Tipo</span>
                    <p className="font-medium">{detailFactura?.tipoComprobanteDescripcion ?? '-'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1">Fecha Emisión</span>
                    <p className="font-medium">
                      {detailFactura ? new Date(detailFactura.fecha).toLocaleDateString('es-AR') : '-'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1">Fecha Vencimiento</span>
                    <p className="font-medium">
                      {detailFactura?.fechaVto 
                        ? new Date(detailFactura.fechaVto).toLocaleDateString('es-AR') 
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1">CAE</span>
                    <p className="font-medium font-mono text-xs">{detailFactura?.cae ?? '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Importes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Importes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    ['Neto Gravado',    detailFactura?.netoGravado],
                    ['Neto No Gravado', detailFactura?.netoNoGravado],
                    ['IVA RI',          detailFactura?.ivaRi],
                    ['IVA RNI',         detailFactura?.ivaRni],
                    ['Total',           detailFactura?.total],
                    ['Saldo',           detailFactura?.saldo],
                  ].map(([k, v]) => (
                    <div key={k as string} className="p-3 rounded-lg bg-muted/50">
                      <span className="text-xs text-muted-foreground block mb-0.5">{k}</span>
                      <p className="font-medium">${(v as number ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Observaciones */}
            {detailFactura?.observacion && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Observaciones</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{detailFactura.observacion}</p>
                </CardContent>
              </Card>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              Cerrar
            </Button>
            <Button variant="outline">
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Descargar PDF
            </Button>
            {detailFactura && detailFactura.estado !== 'ANULADO' && (
              <Button
                variant="destructive"
                onClick={async () => {
                  await anular(detailFactura.id)
                  setIsDetailOpen(false)
                }}
              >
                Anular
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
