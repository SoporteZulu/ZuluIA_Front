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
  Edit,
  Eye,
  Truck,
  CheckCircle,
  AlertCircle,
  Clock,
  Package,
  Trash2,
  Play,
} from 'lucide-react'
import { receiptOrders, warehouses } from '@/lib/wms-data'

const estadoBadgeVariant = {
  planificada: 'outline',
  abierta: 'secondary',
  enproceso: 'default',
  parcial: 'secondary',
  completada: 'outline',
  cerrada: 'outline',
}

export default function RecepcionesPage() {
  const [orders, setOrders] = useState(receiptOrders)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState('todos')
  const [filterType, setFilterType] = useState('todos')

  const filteredOrders = orders.filter(o => {
    const statusMatch = filterStatus === 'todos' || o.status === filterStatus
    const typeMatch = filterType === 'todos' || o.type === filterType
    return statusMatch && typeMatch
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completada':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'enproceso':
        return <Clock className="h-4 w-4 text-blue-600" />
      case 'planificada':
        return <Package className="h-4 w-4 text-gray-600" />
      default:
        return <AlertCircle className="h-4 w-4 text-orange-600" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recepciones de Mercancía</h1>
          <p className="text-muted-foreground mt-1">Gestión de órdenes de entrada</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Recepción
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-4">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="planificada">Planificada</SelectItem>
            <SelectItem value="abierta">Abierta</SelectItem>
            <SelectItem value="enproceso">En Proceso</SelectItem>
            <SelectItem value="parcial">Parcial</SelectItem>
            <SelectItem value="completada">Completada</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los tipos</SelectItem>
            <SelectItem value="compra">Compra</SelectItem>
            <SelectItem value="devolucion">Devolución</SelectItem>
            <SelectItem value="traslado">Traslado</SelectItem>
            <SelectItem value="produccion">Producción</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabla de Recepciones */}
      <Card>
        <CardHeader>
          <CardTitle>Órdenes de Recepción</CardTitle>
          <CardDescription>{filteredOrders.length} órdenes encontradas</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código OR</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Proveedor/Origen</TableHead>
                <TableHead>Almacén</TableHead>
                <TableHead>Programada</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Progreso</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.code}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{order.type}</Badge>
                  </TableCell>
                  <TableCell>{order.provider || 'N/A'}</TableCell>
                  <TableCell>{order.warehouse.code}</TableCell>
                  <TableCell className="text-sm">
                    {order.scheduledDate.toLocaleDateString('es-AR')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(order.status)}
                      <Badge variant={estadoBadgeVariant[order.status]}>
                        {order.status}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 w-24">
                      <Progress value={(order.receivedItems / order.totalItems) * 100} />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {order.receivedItems}/{order.totalItems}
                      </span>
                    </div>
                  </TableCell>
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
                      {order.status === 'planificada' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-blue-600 hover:text-blue-700"
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

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              {selectedOrder?.code}
            </DialogTitle>
            <DialogDescription>{selectedOrder?.provider}</DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="items">Ítems</TabsTrigger>
              <TabsTrigger value="incidencias">Incidencias</TabsTrigger>
            </TabsList>

            {/* General Tab */}
            <TabsContent value="general" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground block mb-1">Código</span>
                  <p className="font-semibold">{selectedOrder?.code}</p>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Estado</span>
                  <Badge>{selectedOrder?.status}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Tipo de Entrada</span>
                  <p className="font-semibold capitalize">{selectedOrder?.type}</p>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Proveedor</span>
                  <p className="font-semibold">{selectedOrder?.provider || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Almacén Destino</span>
                  <p className="font-semibold">{selectedOrder?.warehouse.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Fecha Programada</span>
                  <p className="font-semibold">
                    {selectedOrder?.scheduledDate.toLocaleDateString('es-AR')}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Transportista</span>
                  <p className="font-semibold">{selectedOrder?.carrier || 'No especificado'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Documento Origen</span>
                  <p className="font-semibold">{selectedOrder?.documentReference || 'N/A'}</p>
                </div>
              </div>

              {/* Progreso */}
              <div className="space-y-2 border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Ítems recibidos:</span>
                  <span className="font-semibold">
                    {selectedOrder?.receivedItems} / {selectedOrder?.totalItems}
                  </span>
                </div>
                <Progress value={(selectedOrder?.receivedItems / selectedOrder?.totalItems) * 100} />
              </div>
            </TabsContent>

            {/* Items Tab */}
            <TabsContent value="items" className="space-y-4 mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Esperado</TableHead>
                    <TableHead>Recibido</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedOrder?.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                      <TableCell>{item.productName}</TableCell>
                      <TableCell>{item.expectedQuantity} {item.uom}</TableCell>
                      <TableCell className="font-semibold text-green-600">
                        {item.receivedQuantity} {item.uom}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={item.qualityInspection === 'ok' ? 'default' : 'secondary'}
                        >
                          {item.qualityInspection}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            {/* Incidencias Tab */}
            <TabsContent value="incidencias" className="space-y-4 mt-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Sin incidencias registradas
                </AlertDescription>
              </Alert>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              Cerrar
            </Button>
            <Button>Editar Recepción</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nueva Orden de Recepción</DialogTitle>
            <DialogDescription>
              Completa los datos para crear una nueva entrada de mercancía
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="info">Información</TabsTrigger>
              <TabsTrigger value="items">Ítems</TabsTrigger>
              <TabsTrigger value="revision">Revisión</TabsTrigger>
            </TabsList>

            {/* Info Tab */}
            <TabsContent value="info" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Tipo de Entrada</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compra">Compra</SelectItem>
                    <SelectItem value="devolucion">Devolución</SelectItem>
                    <SelectItem value="traslado">Traslado</SelectItem>
                    <SelectItem value="produccion">Producción</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Proveedor/Origen</Label>
                <Input placeholder="Nombre del proveedor" />
              </div>

              <div className="space-y-2">
                <Label>Almacén Destino</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona almacén" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Fecha Programada</Label>
                <Input type="date" />
              </div>

              <div className="space-y-2">
                <Label>Transportista</Label>
                <Input placeholder="Nombre de la transportista" />
              </div>
            </TabsContent>

            {/* Items Tab */}
            <TabsContent value="items" className="space-y-4 mt-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Agregar ítems a la orden de recepción
                </AlertDescription>
              </Alert>
              <Button variant="outline" className="w-full bg-transparent">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Ítem
              </Button>
            </TabsContent>

            {/* Revision Tab */}
            <TabsContent value="revision" className="space-y-4 mt-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Revisa la información antes de crear la orden
                </AlertDescription>
              </Alert>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancelar
            </Button>
            <Button>Crear Orden</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
