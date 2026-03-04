'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Plus,
  Eye,
  Package,
  Check,
  Clock,
  AlertCircle,
  Truck,
  BoxesIcon,
  QrCode,
  Play,
  Pause,
} from 'lucide-react'
import { shippingOrders, warehouses } from '@/lib/wms-data'

const estadoBadgeVariant = {
  planificada: 'outline',
  asignada: 'secondary',
  enpreparacion: 'default',
  lista: 'default',
  despachada: 'outline',
  entregada: 'outline',
  cancelada: 'secondary',
}

export default function PickingPage() {
  const [orders, setOrders] = useState(shippingOrders)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isPicking, setIsPicking] = useState(false)
  const [currentItemIndex, setCurrentItemIndex] = useState(0)
  const [filterPriority, setFilterPriority] = useState('todos')

  const filteredOrders = orders.filter(o => 
    filterPriority === 'todos' || o.priority === filterPriority
  )

  const handleStartPicking = (order) => {
    setSelectedOrder(order)
    setIsPicking(true)
    setCurrentItemIndex(0)
  }

  const currentItem = selectedOrder?.items[currentItemIndex]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Picking y Preparación</h1>
          <p className="text-muted-foreground mt-1">Gestión de órdenes de salida</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Orden Salida
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Picking</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {orders.filter(o => o.status === 'enpreparacion').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Órdenes activas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Listas para Despacho</CardTitle>
            <Check className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {orders.filter(o => o.status === 'lista').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Esperando embalaje</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tiempo Promedio</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4.2h</div>
            <p className="text-xs text-muted-foreground mt-1">Picking</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eficiencia</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">95%</div>
            <p className="text-xs text-muted-foreground mt-1">Órdenes completas</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex gap-4">
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrar por prioridad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas las prioridades</SelectItem>
            <SelectItem value="urgente">Urgente</SelectItem>
            <SelectItem value="alta">Alta</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabla de Órdenes */}
      <Card>
        <CardHeader>
          <CardTitle>Órdenes de Salida</CardTitle>
          <CardDescription>{filteredOrders.length} órdenes encontradas</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código OS</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Prioridad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Ítems</TableHead>
                <TableHead>Progreso</TableHead>
                <TableHead>Operario</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.code}</TableCell>
                  <TableCell>{order.client}</TableCell>
                  <TableCell>
                    <Badge
                      variant={order.priority === 'urgente' ? 'destructive' : 'outline'}
                    >
                      {order.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={estadoBadgeVariant[order.status]}>
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {order.pickedItems}/{order.totalItems}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 w-32">
                      <Progress value={(order.pickedItems / order.totalItems) * 100} />
                      <span className="text-xs text-muted-foreground">
                        {Math.round((order.pickedItems / order.totalItems) * 100)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{order.operario || '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedOrder(order)
                          setIsDetailOpen(true)
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {order.status === 'asignada' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-blue-600"
                          onClick={() => handleStartPicking(order)}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Interfaz de Picking (Modal) */}
      {isPicking && selectedOrder && (
        <Dialog open={isPicking} onOpenChange={setIsPicking}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Picking - {selectedOrder.code}
              </DialogTitle>
              <DialogDescription className="flex items-center justify-between mt-2">
                <span>{selectedOrder.client}</span>
                <Badge variant={selectedOrder.priority === 'urgente' ? 'destructive' : 'outline'}>
                  {selectedOrder.priority}
                </Badge>
              </DialogDescription>
            </DialogHeader>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progreso:</span>
                <span className="font-semibold">
                  {currentItemIndex + 1}/{selectedOrder.items.length} ítems
                </span>
              </div>
              <Progress value={((currentItemIndex + 1) / selectedOrder.items.length) * 100} />
            </div>

            {/* Current Item Card */}
            {currentItem && (
              <Card className="border-2 border-primary">
                <CardContent className="pt-6">
                  <div className="space-y-6">
                    {/* Item Info */}
                    <div>
                      <div className="text-sm text-muted-foreground mb-2">Ítem {currentItemIndex + 1}</div>
                      <div className="space-y-3">
                        <div>
                          <span className="text-muted-foreground block mb-1">SKU</span>
                          <p className="text-2xl font-bold font-mono">{currentItem.sku}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground block mb-1">Descripción</span>
                          <p className="text-lg">{currentItem.productName}</p>
                        </div>
                      </div>
                    </div>

                    {/* Ubicación */}
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <span className="text-muted-foreground block text-xs mb-1">Ubicación esperada:</span>
                        <p className="font-mono font-bold text-lg">A01-R1-N1</p>
                      </AlertDescription>
                    </Alert>

                    {/* Cantidad */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-muted-foreground mb-2">Cantidad a pickear:</p>
                      <p className="text-3xl font-bold text-blue-600">{currentItem.quantity} {currentItem.uom}</p>
                    </div>

                    {/* Scanner */}
                    <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
                      <Label>Escanear Ubicación</Label>
                      <Input
                        placeholder="Escanea código de ubicación..."
                        className="text-lg"
                        autoFocus
                      />
                      <Button variant="outline" className="w-full bg-transparent">
                        <QrCode className="h-4 w-4 mr-2" />
                        Escanear Ubicación
                      </Button>
                    </div>

                    <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
                      <Label>Escanear Producto</Label>
                      <Input
                        placeholder="Escanea código de producto..."
                        className="text-lg"
                      />
                      <Button variant="outline" className="w-full bg-transparent">
                        <QrCode className="h-4 w-4 mr-2" />
                        Escanear Producto
                      </Button>
                    </div>

                    {/* Cantidad a confirmar */}
                    <div className="space-y-2">
                      <Label>Cantidad Pickeada</Label>
                      <Input
                        type="number"
                        defaultValue={currentItem.quantity}
                        className="text-lg"
                      />
                    </div>

                    {/* Botones de Acción */}
                    <div className="flex gap-2 pt-4">
                      <Button variant="outline" className="flex-1 bg-transparent">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Reportar Problema
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Navegación */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setCurrentItemIndex(Math.max(0, currentItemIndex - 1))}
                disabled={currentItemIndex === 0}
              >
                Anterior
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  if (currentItemIndex < selectedOrder.items.length - 1) {
                    setCurrentItemIndex(currentItemIndex + 1)
                  } else {
                    setIsPicking(false)
                  }
                }}
              >
                {currentItemIndex === selectedOrder.items.length - 1
                  ? 'Completar Picking'
                  : 'Siguiente'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsPicking(false)}
              >
                <Pause className="h-4 w-4 mr-2" />
                Pausar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen && !isPicking} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              {selectedOrder?.code}
            </DialogTitle>
            <DialogDescription>{selectedOrder?.client}</DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="info">Información</TabsTrigger>
              <TabsTrigger value="items">Ítems</TabsTrigger>
            </TabsList>

            {/* Info Tab */}
            <TabsContent value="info" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground block mb-1">Cliente</span>
                  <p className="font-semibold">{selectedOrder?.client}</p>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Destino</span>
                  <p className="font-semibold">{selectedOrder?.destination}</p>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Fecha Envío</span>
                  <p className="font-semibold">
                    {selectedOrder?.scheduledDate.toLocaleDateString('es-AR')}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Prioridad</span>
                  <Badge variant={selectedOrder?.priority === 'urgente' ? 'destructive' : 'outline'}>
                    {selectedOrder?.priority}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Operario</span>
                  <p className="font-semibold">{selectedOrder?.operario || 'No asignado'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Estado</span>
                  <Badge>{selectedOrder?.status}</Badge>
                </div>
              </div>
            </TabsContent>

            {/* Items Tab */}
            <TabsContent value="items" className="space-y-4 mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Pickeado</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedOrder?.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono">{item.sku}</TableCell>
                      <TableCell>{item.productName}</TableCell>
                      <TableCell>{item.quantity} {item.uom}</TableCell>
                      <TableCell className="text-green-600 font-semibold">
                        {item.pickedQuantity} {item.uom}
                      </TableCell>
                      <TableCell>
                        <Badge>{item.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>Cerrar</Button>
            <Button>Editar Orden</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
