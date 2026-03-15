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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useOrdenesPreparacion } from '@/lib/hooks/useOrdenesPreparacion'
import { useTerceros } from '@/lib/hooks/useTerceros'
import type { OrdenPreparacion } from '@/lib/types/ordenes-preparacion'

const estadoBadgeVariant: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  PENDIENTE:   'secondary',
  EN_PROCESO:  'default',
  COMPLETADA:  'outline',
  CANCELADA:   'destructive',
}

export default function PickingPage() {
  const [filterEstado, setFilterEstado] = useState('')
  const { ordenes, loading, error, page, setPage, totalCount, totalPages } =
    useOrdenesPreparacion({ estado: filterEstado || undefined })
  const { terceros } = useTerceros()
  const [selectedOrden, setSelectedOrden] = useState<OrdenPreparacion | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const getTerceroName = (id?: number) =>
    id ? (terceros.find(t => t.id === id)?.razonSocial ?? String(id)) : '-'

  const pendientes  = ordenes.filter(o => o.estado === 'PENDIENTE').length
  const enProceso   = ordenes.filter(o => o.estado === 'EN_PROCESO').length
  const completadas = ordenes.filter(o => o.estado === 'COMPLETADA').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Picking y Preparación</h1>
          <p className="text-muted-foreground mt-1">Gestión de órdenes de preparación</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Orden
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Órdenes registradas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendientes}</div>
            <p className="text-xs text-muted-foreground mt-1">Sin iniciar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Proceso</CardTitle>
            <Truck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{enProceso}</div>
            <p className="text-xs text-muted-foreground mt-1">En preparación</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completadas</CardTitle>
            <Check className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completadas}</div>
            <p className="text-xs text-muted-foreground mt-1">Listas para despacho</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex gap-4">
        <Select value={filterEstado || 'todos'} onValueChange={v => { setFilterEstado(v === 'todos' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="PENDIENTE">Pendiente</SelectItem>
            <SelectItem value="EN_PROCESO">En Proceso</SelectItem>
            <SelectItem value="COMPLETADA">Completada</SelectItem>
            <SelectItem value="CANCELADA">Cancelada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabla */}
      <Card>
        <CardHeader>
          <CardTitle>Órdenes de Preparación</CardTitle>
          <CardDescription>{totalCount} órdenes encontradas</CardDescription>
        </CardHeader>
        <CardContent>
          {error && <p className="text-destructive text-sm mb-4">{error}</p>}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Tercero</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Observación</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : ordenes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No hay órdenes de preparación
                  </TableCell>
                </TableRow>
              ) : ordenes.map((orden) => (
                <TableRow key={orden.id}>
                  <TableCell className="font-medium">{orden.id}</TableCell>
                  <TableCell>{getTerceroName(orden.terceroId)}</TableCell>
                  <TableCell>
                    <Badge variant={estadoBadgeVariant[orden.estado] ?? 'outline'}>
                      {orden.estado}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {orden.fecha ? new Date(orden.fecha).toLocaleDateString('es-AR') : '-'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {orden.observacion ?? '-'}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => { setSelectedOrden(orden); setIsDetailOpen(true) }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Página {page} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Orden de Preparación #{selectedOrden?.id}
            </DialogTitle>
            <DialogDescription>
              {selectedOrden ? getTerceroName(selectedOrden.terceroId) : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 text-sm py-4">
            {[
              ['ID',          String(selectedOrden?.id ?? '-')],
              ['Estado',      selectedOrden?.estado ?? '-'],
              ['Tercero',     selectedOrden ? getTerceroName(selectedOrden.terceroId) : '-'],
              ['Sucursal ID', String(selectedOrden?.sucursalId ?? '-')],
              ['Fecha',       selectedOrden?.fecha ? new Date(selectedOrden.fecha).toLocaleDateString('es-AR') : '-'],
              ['Observación', selectedOrden?.observacion ?? '-'],
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
