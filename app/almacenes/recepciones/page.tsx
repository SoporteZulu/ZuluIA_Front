'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Plus,
  Eye,
  Truck,
  CheckCircle,
  AlertCircle,
  Clock,
  Play,
} from 'lucide-react'
import { useOrdenesCompra } from '@/lib/hooks/useOrdenesCompra'
import { useDepositos } from '@/lib/hooks/useDepositos'
import type { OrdenCompra } from '@/lib/types/configuracion'

const estadoBadgeVariant: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  PENDIENTE:  'secondary',
  RECIBIDA:   'default',
  CANCELADA:  'destructive',
}

export default function RecepcionesPage() {
  const { ordenes: orders, loading, recibir } = useOrdenesCompra()
  const { depositos } = useDepositos()
  const [selectedOrder, setSelectedOrder] = useState<OrdenCompra | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState('todos')

  const filteredOrders = orders.filter(o => {
    const statusMatch = filterStatus === 'todos' || o.estadoOc === filterStatus
    return statusMatch
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'RECIBIDA':  return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'PENDIENTE': return <Clock className="h-4 w-4 text-blue-600" />
      case 'CANCELADA': return <AlertCircle className="h-4 w-4 text-red-600" />
      default:           return <AlertCircle className="h-4 w-4 text-orange-600" />
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
            <SelectItem value="PENDIENTE">Pendiente</SelectItem>
            <SelectItem value="RECIBIDA">Recibida</SelectItem>
            <SelectItem value="CANCELADA">Cancelada</SelectItem>
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
                <TableHead>ID</TableHead>
                <TableHead>Proveedor ID</TableHead>
                <TableHead>Comprobante ID</TableHead>
                <TableHead>Entrega Req.</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Condiciones</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.id}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{order.proveedorId}</Badge>
                  </TableCell>
                  <TableCell>{order.comprobanteId}</TableCell>
                  <TableCell className="text-sm">
                    {order.fechaEntregaReq ? new Date(order.fechaEntregaReq).toLocaleDateString('es-AR') : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(order.estadoOc)}
                      <Badge variant={estadoBadgeVariant[order.estadoOc] ?? 'outline'}>
                        {order.estadoOc}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{order.condicionesEntrega ?? '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { setSelectedOrder(order); setIsDetailOpen(true) }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {order.estadoOc === 'PENDIENTE' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-blue-600 hover:text-blue-700"
                          onClick={async () => { await recibir(order.id) }}
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
              Orden de Recepción #{selectedOrder?.id}
            </DialogTitle>
            <DialogDescription>Proveedor ID: {selectedOrder?.proveedorId}</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 text-sm py-4">
            {[
              ['ID',               String(selectedOrder?.id ?? '-')],
              ['Estado',           selectedOrder?.estadoOc ?? '-'],
              ['Proveedor ID',     String(selectedOrder?.proveedorId ?? '-')],
              ['Comprobante ID',   String(selectedOrder?.comprobanteId ?? '-')],
              ['Fecha Entrega',    selectedOrder?.fechaEntregaReq ?? '-'],
              ['Condiciones',      selectedOrder?.condicionesEntrega ?? '-'],
            ].map(([k, v]) => (
              <div key={k}>
                <span className="text-muted-foreground block mb-1">{k}</span>
                <p className="font-semibold">{v}</p>
              </div>
            ))}
          </div>

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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva Orden de Recepción</DialogTitle>
            <DialogDescription>
              Completa los datos para crear una nueva orden de compra
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Proveedor ID</Label>
              <Input type="number" placeholder="ID del proveedor" />
            </div>
            <div className="space-y-2">
              <Label>Comprobante ID (opcional)</Label>
              <Input type="number" placeholder="ID del comprobante asociado" />
            </div>
            <div className="space-y-2">
              <Label>Fecha de Entrega Requerida</Label>
              <Input type="date" />
            </div>
            <div className="space-y-2">
              <Label>Condiciones de Entrega</Label>
              <Input placeholder="Ej: FOB, CIF, EXW..." />
            </div>
          </div>

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
