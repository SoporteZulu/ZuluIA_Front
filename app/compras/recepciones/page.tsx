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
import { Checkbox } from "@/components/ui/checkbox"
import {
  Plus,
  Search,
  Eye,
  CheckCircle,
  AlertTriangle,
  PackageCheck,
  Truck,
} from "lucide-react"
import type { MerchandiseReceipt, MerchandiseReceiptItem, PurchaseOrderItem } from "@/lib/compras-types"
import {
  merchandiseReceipts as initialReceipts,
  purchaseOrders,
  suppliers,
  warehouses,
} from "@/lib/compras-data"

export default function RecepcionesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [receipts, setReceipts] = useState<MerchandiseReceipt[]>(initialReceipts)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterEstado, setFilterEstado] = useState<string>("todos")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [detailReceipt, setDetailReceipt] = useState<MerchandiseReceipt | null>(null)

  // Form state
  const [selectedOrderId, setSelectedOrderId] = useState("")
  const [formData, setFormData] = useState({
    fechaRecepcion: new Date(),
    almacenId: warehouses[0]?.id || "",
    observaciones: "",
  })
  const [receiptItems, setReceiptItems] = useState<MerchandiseReceiptItem[]>([])

  const filteredReceipts = receipts.filter((receipt) => {
    const matchesSearch =
      receipt.codigo.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesEstado = filterEstado === "todos" || receipt.estado === filterEstado
    return matchesSearch && matchesEstado
  })

  const handleNew = () => {
    setSelectedOrderId("")
    setFormData({
      fechaRecepcion: new Date(),
      almacenId: warehouses[0]?.id || "",
      observaciones: "",
    })
    setReceiptItems([])
    setIsFormOpen(true)
  }

  const handleOrderSelect = (orderId: string) => {
    setSelectedOrderId(orderId)
    const order = purchaseOrders.find(o => o.id === orderId)
    if (order) {
      // Initialize receipt items from order items
      const items: MerchandiseReceiptItem[] = order.items.map(item => ({
        id: `rec-item-${item.id}`,
        ordenRecepcionId: "",
        itemOcId: item.id,
        productoId: item.productoId,
        cantidadRecibida: item.cantidad - item.cantidadRecibida,
        cantidadRechazada: 0,
        motivoRechazo: "",
        conforme: true,
      }))
      setReceiptItems(items)
      setFormData({ ...formData, almacenId: order.almacenId })
    }
  }

  const updateReceiptItem = (index: number, field: keyof MerchandiseReceiptItem, value: any) => {
    const updated = [...receiptItems]
    updated[index] = { ...updated[index], [field]: value }
    setReceiptItems(updated)
  }

  const handleSaveReceipt = () => {
    const newReceipt: MerchandiseReceipt = {
      id: `rec-${Date.now()}`,
      codigo: `REC-2024-${String(receipts.length + 1).padStart(3, '0')}`,
      ordenCompraId: selectedOrderId,
      fechaRecepcion: formData.fechaRecepcion,
      almacenId: formData.almacenId,
      usuarioReceptorId: "user-001",
      estado: receiptItems.some(i => i.cantidadRechazada > 0) ? "con_rechazos" : "completa",
      observaciones: formData.observaciones,
      items: receiptItems,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    setReceipts([...receipts, newReceipt])
    setIsFormOpen(false)
  }

  const handleViewDetail = (receipt: MerchandiseReceipt) => {
    setDetailReceipt(receipt)
    setIsDetailOpen(true)
  }

  const getOrderCode = (orderId: string) => {
    return purchaseOrders.find(o => o.id === orderId)?.codigo || "N/A"
  }

  const getSupplierName = (orderId: string) => {
    const order = purchaseOrders.find(o => o.id === orderId)
    if (!order) return "N/A"
    return suppliers.find(s => s.id === order.proveedorId)?.razonSocial || "N/A"
  }

  const getWarehouseName = (warehouseId: string) => {
    return warehouses.find(w => w.id === warehouseId)?.nombre || "N/A"
  }

  const getOrderItemDescription = (itemOcId: string) => {
    for (const order of purchaseOrders) {
      const item = order.items.find(i => i.id === itemOcId)
      if (item) return item.descripcion
    }
    return "N/A"
  }

  const getOrderItemQuantity = (itemOcId: string) => {
    for (const order of purchaseOrders) {
      const item = order.items.find(i => i.id === itemOcId)
      if (item) return item.cantidad
    }
    return 0
  }

  const pendingOrders = purchaseOrders.filter(o => 
    o.estado === 'confirmada' || o.estado === 'en_transito' || o.estado === 'recibida_parcial'
  )

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recepciones de Mercadería</h1>
          <p className="text-muted-foreground">
            Registro de recepciones de órdenes de compra
          </p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Recepción
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
                  placeholder="Buscar por código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={filterEstado} onValueChange={setFilterEstado}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="completa">Completa</SelectItem>
                <SelectItem value="con_rechazos">Con Rechazos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Receipts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Recepciones ({filteredReceipts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Orden de Compra</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Fecha Recepción</TableHead>
                <TableHead>Almacén</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Ítems</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReceipts.map((receipt) => (
                <TableRow
                  key={receipt.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleViewDetail(receipt)}
                >
                  <TableCell className="font-medium">{receipt.codigo}</TableCell>
                  <TableCell>{getOrderCode(receipt.ordenCompraId)}</TableCell>
                  <TableCell>{getSupplierName(receipt.ordenCompraId)}</TableCell>
                  <TableCell>{new Date(receipt.fechaRecepcion).toLocaleDateString('es-AR')}</TableCell>
                  <TableCell>{getWarehouseName(receipt.almacenId)}</TableCell>
                  <TableCell>
                    <Badge variant={receipt.estado === "completa" ? "default" : "destructive"}>
                      {receipt.estado === "completa" ? "Completa" : "Con Rechazos"}
                    </Badge>
                  </TableCell>
                  <TableCell>{receipt.items.length}</TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Recepción de Mercadería</DialogTitle>
            <DialogDescription>
              Complete la información de los productos recibidos
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Paso 1: Seleccionar Orden */}
            {!selectedOrderId && (
              <Card>
                <CardHeader>
                  <CardTitle>Seleccione la Orden de Compra</CardTitle>
                  <CardDescription>
                    Órdenes con recepciones pendientes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {pendingOrders.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-muted/50"
                        onClick={() => handleOrderSelect(order.id)}
                      >
                        <div>
                          <p className="font-medium">{order.codigo}</p>
                          <p className="text-sm text-muted-foreground">
                            {suppliers.find(s => s.id === order.proveedorId)?.razonSocial}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">{order.estado.replace('_', ' ')}</Badge>
                          <p className="text-sm text-muted-foreground mt-1">
                            {order.items.length} ítems
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Paso 2: Datos de Recepción */}
            {selectedOrderId && (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fechaRecepcion">Fecha de Recepción</Label>
                    <Input
                      id="fechaRecepcion"
                      type="date"
                      value={formData.fechaRecepcion.toISOString().split('T')[0]}
                      onChange={(e) => setFormData({ ...formData, fechaRecepcion: new Date(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="almacen">Almacén de Recepción</Label>
                    <Select
                      value={formData.almacenId}
                      onValueChange={(value) => setFormData({ ...formData, almacenId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses.map((warehouse) => (
                          <SelectItem key={warehouse.id} value={warehouse.id}>
                            {warehouse.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Orden de Compra</Label>
                    <div className="flex h-10 items-center rounded-md border border-input bg-muted px-3 text-sm">
                      {getOrderCode(selectedOrderId)}
                    </div>
                  </div>
                </div>

                {/* Items */}
                <Card>
                  <CardHeader>
                    <CardTitle>Productos a Recibir</CardTitle>
                    <CardDescription>
                      Indique las cantidades recibidas y rechazadas
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[250px]">Producto</TableHead>
                          <TableHead>Cant. Solicitada</TableHead>
                          <TableHead>Cant. Recibida</TableHead>
                          <TableHead>Cant. Rechazada</TableHead>
                          <TableHead>Motivo Rechazo</TableHead>
                          <TableHead>Conforme</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {receiptItems.map((item, index) => (
                          <TableRow key={item.id}>
                            <TableCell>{getOrderItemDescription(item.itemOcId)}</TableCell>
                            <TableCell>{getOrderItemQuantity(item.itemOcId)}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={item.cantidadRecibida}
                                onChange={(e) => updateReceiptItem(index, 'cantidadRecibida', Number(e.target.value))}
                                min="0"
                                className="w-24"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={item.cantidadRechazada}
                                onChange={(e) => updateReceiptItem(index, 'cantidadRechazada', Number(e.target.value))}
                                min="0"
                                className="w-24"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={item.motivoRechazo || ''}
                                onChange={(e) => updateReceiptItem(index, 'motivoRechazo', e.target.value)}
                                placeholder="Motivo..."
                                disabled={item.cantidadRechazada === 0}
                                className="min-w-[200px]"
                              />
                            </TableCell>
                            <TableCell>
                              <Checkbox
                                checked={item.conforme}
                                onCheckedChange={(checked) => updateReceiptItem(index, 'conforme', checked as boolean)}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <div className="space-y-2">
                  <Label htmlFor="observaciones">Observaciones Generales</Label>
                  <Textarea
                    id="observaciones"
                    value={formData.observaciones}
                    onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                    rows={3}
                    placeholder="Comentarios adicionales sobre la recepción..."
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancelar
            </Button>
            {selectedOrderId && (
              <Button onClick={handleSaveReceipt}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirmar Recepción
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Detalle de Recepción</DialogTitle>
            <DialogDescription>
              {detailReceipt?.codigo} - OC: {detailReceipt && getOrderCode(detailReceipt.ordenCompraId)}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Proveedor:</span>
                <p className="font-medium">
                  {detailReceipt && getSupplierName(detailReceipt.ordenCompraId)}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Fecha Recepción:</span>
                <p className="font-medium">
                  {detailReceipt ? new Date(detailReceipt.fechaRecepcion).toLocaleDateString('es-AR') : '-'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Almacén:</span>
                <p className="font-medium">
                  {detailReceipt && getWarehouseName(detailReceipt.almacenId)}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Estado:</span>
                <Badge variant={detailReceipt?.estado === "completa" ? "default" : "destructive"} className="ml-2">
                  {detailReceipt?.estado === "completa" ? "Completa" : "Con Rechazos"}
                </Badge>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Productos Recibidos</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Cant. Recibida</TableHead>
                    <TableHead>Cant. Rechazada</TableHead>
                    <TableHead>Motivo Rechazo</TableHead>
                    <TableHead>Conforme</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailReceipt?.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{getOrderItemDescription(item.itemOcId)}</TableCell>
                      <TableCell>{item.cantidadRecibida}</TableCell>
                      <TableCell className={item.cantidadRechazada > 0 ? "text-destructive font-medium" : ""}>
                        {item.cantidadRechazada}
                      </TableCell>
                      <TableCell>{item.motivoRechazo || "-"}</TableCell>
                      <TableCell>
                        {item.conforme ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-orange-600" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {detailReceipt?.observaciones && (
              <div>
                <h4 className="font-semibold mb-2">Observaciones</h4>
                <p className="text-sm text-muted-foreground">{detailReceipt.observaciones}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
