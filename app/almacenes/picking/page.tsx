'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Plus,
  Eye,
  Package,
  Check,
  Clock,
  Truck,
} from 'lucide-react'
import { useComprobantes } from '@/lib/hooks/useComprobantes'
import { useTerceros } from '@/lib/hooks/useTerceros'
import type { Comprobante } from '@/lib/types/comprobantes'

const estadoBadgeVariant: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  BORRADOR:       'secondary',
  EMITIDO:        'default',
  PAGADO_PARCIAL: 'outline',
  PAGADO:         'outline',
  ANULADO:        'destructive',
}

export default function PickingPage() {
  const { comprobantes: orders, loading } = useComprobantes({ esVenta: true })
  const { terceros } = useTerceros()
  const [selectedOrder, setSelectedOrder] = useState<Comprobante | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [filterEstado, setFilterEstado] = useState('todos')

  const filteredOrders = React.useMemo(
    () => filterEstado === 'todos' ? orders : orders.filter(o => o.estado === filterEstado),
    [orders, filterEstado]
  )

  const getTerceroName = (id: number) =>
    terceros.find(t => t.id === id)?.razonSocial ?? String(id)

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
              {orders.filter(o => o.estado === 'BORRADOR').length}
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
              {orders.filter(o => o.estado === 'EMITIDO').length}
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
        <Select value={filterEstado} onValueChange={setFilterEstado}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="BORRADOR">Borrador</SelectItem>
            <SelectItem value="EMITIDO">Emitido</SelectItem>
            <SelectItem value="PAGADO_PARCIAL">Pagado Parcial</SelectItem>
            <SelectItem value="PAGADO">Pagado</SelectItem>
            <SelectItem value="ANULADO">Anulado</SelectItem>
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
                <TableHead>Nro. Comprobante</TableHead>
                <TableHead>Tercero</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.nroComprobante ?? order.id}</TableCell>
                  <TableCell>{getTerceroName(order.terceroId)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {order.tipoComprobanteDescripcion ?? order.tipoComprobanteId}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={estadoBadgeVariant[order.estado] ?? 'outline'}>
                      {order.estado}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm font-semibold">
                    ${order.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-sm">
                    {order.fecha ? new Date(order.fecha).toLocaleDateString('es-AR') : '-'}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => { setSelectedOrder(order); setIsDetailOpen(true) }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>



      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Comprobante #{selectedOrder?.nroComprobante ?? selectedOrder?.id}
            </DialogTitle>
            <DialogDescription>
              {selectedOrder ? getTerceroName(selectedOrder.terceroId) : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 text-sm py-4">
            {[
              ['Nro. Comprobante', selectedOrder?.nroComprobante ?? '-'],
              ['Tipo',            selectedOrder?.tipoComprobanteDescripcion ?? '-'],
              ['Estado',          selectedOrder?.estado ?? '-'],
              ['Tercero ID',      String(selectedOrder?.terceroId ?? '-')],
              ['Fecha',           selectedOrder?.fecha ? new Date(selectedOrder.fecha).toLocaleDateString('es-AR') : '-'],
              ['Vencimiento',     selectedOrder?.fechaVto ?? '-'],
              ['Neto Gravado',    selectedOrder ? `$${selectedOrder.netoGravado.toLocaleString('es-AR')}` : '-'],
              ['IVA',             selectedOrder ? `$${selectedOrder.ivaRi.toLocaleString('es-AR')}` : '-'],
              ['Total',           selectedOrder ? `$${selectedOrder.total.toLocaleString('es-AR')}` : '-'],
              ['Saldo',           selectedOrder ? `$${selectedOrder.saldo.toLocaleString('es-AR')}` : '-'],
            ].map(([k, v]) => (
              <div key={k as string}>
                <span className="text-muted-foreground block mb-1">{k}</span>
                <p className="font-semibold">{v}</p>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
