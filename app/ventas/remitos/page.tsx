'use client'

import React, { useState, useMemo } from 'react'
import {
  Plus, Search, Eye, Truck, CheckCircle2, Clock, Package,
  MapPin, User, FileText, AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { remitos, customers, salesOrders } from '@/lib/sales-data'
import type { Remito } from '@/lib/sales-types'

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString('es-AR')
}

function getCustomer(id: string) {
  return customers.find(c => c.id === id)
}

function getOrder(id: string) {
  return salesOrders.find(o => o.id === id)
}

const estadoCfg: Record<Remito['estado'], { label: string; icon: React.ReactNode; variant: 'default' | 'secondary' | 'outline' | 'destructive'; cls: string }> = {
  pendiente:   { label: 'Pendiente',    icon: <Clock className="h-3 w-3" />,        variant: 'secondary', cls: '' },
  en_transito: { label: 'En Tránsito',  icon: <Truck className="h-3 w-3" />,        variant: 'outline',   cls: 'border-orange-300 text-orange-700 bg-orange-50' },
  entregado:   { label: 'Entregado',    icon: <CheckCircle2 className="h-3 w-3" />, variant: 'default',   cls: 'bg-green-100 text-green-800 border-green-300' },
}

// ─── Detail View ──────────────────────────────────────────────────────────────

function RemitoDetail({ remito }: { remito: Remito }) {
  const customer = getCustomer(remito.clienteId)
  const order    = getOrder(remito.ordenId)
  const cfg      = estadoCfg[remito.estado]

  return (
    <Tabs defaultValue="general">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="items">Items ({remito.items.length})</TabsTrigger>
        <TabsTrigger value="transporte">Transporte</TabsTrigger>
      </TabsList>

      <TabsContent value="general" className="mt-4 space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            ['Código',         remito.codigo],
            ['Tipo Despacho',  remito.tipoDespacho.replace('_', ' ')],
            ['Orden de Venta', order?.codigo ?? remito.ordenId],
            ['Cliente',        customer?.razonSocial ?? remito.clienteId],
            ['CUIT',           customer?.cuitCuil ?? '-'],
            ['Fecha Despacho', fmtDate(remito.fechaDespacho)],
          ].map(([k, v]) => (
            <div key={k} className="p-3 rounded-lg bg-muted/50">
              <span className="text-xs text-muted-foreground block mb-0.5">{k}</span>
              <p className="font-medium capitalize">{v}</p>
            </div>
          ))}
        </div>
        {remito.observaciones && (
          <div className="p-3 rounded-lg bg-muted/50 text-sm">
            <span className="text-xs text-muted-foreground block mb-0.5">Observaciones</span>
            <p>{remito.observaciones}</p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="items" className="mt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descripción</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead>Unidad</TableHead>
              <TableHead>Lote</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {remito.items.map(item => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.descripcion}</TableCell>
                <TableCell className="text-right font-semibold">{item.cantidad}</TableCell>
                <TableCell className="text-muted-foreground">{item.uom}</TableCell>
                <TableCell className="font-mono text-xs">{item.lote ?? '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TabsContent>

      <TabsContent value="transporte" className="mt-4 space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            ['Empresa Transporte', remito.transporte ?? 'Sin asignar'],
            ['Chofer',             remito.chofer ?? '-'],
            ['Patente',            remito.patente ?? '-'],
            ['Dirección Entrega',  remito.direccionEntrega ?? '-'],
          ].map(([k, v]) => (
            <div key={k} className="p-3 rounded-lg bg-muted/50">
              <span className="text-xs text-muted-foreground block mb-0.5">{k}</span>
              <p className="font-medium">{v}</p>
            </div>
          ))}
        </div>

        {remito.estado === 'en_transito' && (
          <div className="flex items-center gap-3 p-4 rounded-lg border border-orange-200 bg-orange-50">
            <Truck className="h-6 w-6 text-orange-600 shrink-0 animate-pulse" />
            <div>
              <p className="font-semibold text-orange-800 text-sm">Envío en tránsito</p>
              <p className="text-xs text-orange-700 mt-0.5">Pendiente de confirmación de entrega</p>
            </div>
          </div>
        )}
        {remito.estado === 'entregado' && (
          <div className="flex items-center gap-3 p-4 rounded-lg border border-green-200 bg-green-50">
            <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0" />
            <div>
              <p className="font-semibold text-green-800 text-sm">Entregado correctamente</p>
              <p className="text-xs text-green-700 mt-0.5">El receptor confirmó la recepción</p>
            </div>
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

const RemitosPage = () => {
  const [searchTerm, setSearchTerm]     = useState('')
  const [estadoFilter, setEstadoFilter] = useState('todos')
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [detailRemito, setDetailRemito] = useState<Remito | null>(null)

  const filtered = useMemo(() => remitos.filter(r => {
    const customer = getCustomer(r.clienteId)
    const matchSearch =
      r.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer?.razonSocial ?? '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchEstado = estadoFilter === 'todos' || r.estado === estadoFilter
    return matchSearch && matchEstado
  }), [searchTerm, estadoFilter])

  const kpis = {
    total:       remitos.length,
    pendiente:   remitos.filter(r => r.estado === 'pendiente').length,
    en_transito: remitos.filter(r => r.estado === 'en_transito').length,
    entregado:   remitos.filter(r => r.estado === 'entregado').length,
  }

  const openDetail = (r: Remito) => { setDetailRemito(r); setIsDetailOpen(true) }

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Remitos de Entrega</h1>
          <p className="text-muted-foreground">Gestión de despachos, transporte y confirmación de entrega</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Remito
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Total Remitos',  value: kpis.total,       icon: <FileText className="h-4 w-4" />,     color: 'text-foreground' },
          { label: 'Pendientes',     value: kpis.pendiente,   icon: <Clock className="h-4 w-4" />,        color: 'text-slate-600' },
          { label: 'En Tránsito',    value: kpis.en_transito, icon: <Truck className="h-4 w-4" />,        color: 'text-orange-600' },
          { label: 'Entregados',     value: kpis.entregado,   icon: <CheckCircle2 className="h-4 w-4" />, color: 'text-green-600' },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value}</p>
                </div>
                <div className={`${k.color} opacity-60`}>{k.icon}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código o cliente..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={estadoFilter} onValueChange={setEstadoFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="en_transito">En Tránsito</SelectItem>
            <SelectItem value="entregado">Entregado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Orden</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Despacho</TableHead>
                <TableHead>Transporte</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(remito => {
                const customer = getCustomer(remito.clienteId)
                const order    = getOrder(remito.ordenId)
                const cfg      = estadoCfg[remito.estado]
                return (
                  <TableRow key={remito.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openDetail(remito)}>
                    <TableCell className="font-mono font-semibold text-primary">{remito.codigo}</TableCell>
                    <TableCell>
                      <p className="font-medium text-sm">{customer?.razonSocial ?? remito.clienteId}</p>
                      <p className="text-xs text-muted-foreground">{customer?.cuitCuil}</p>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{order?.codigo ?? remito.ordenId}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">
                        {remito.tipoDespacho.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{fmtDate(remito.fechaDespacho)}</TableCell>
                    <TableCell>
                      {remito.transporte ? (
                        <div className="flex items-center gap-1.5 text-sm">
                          <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                          {remito.transporte}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Sin asignar</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={cfg.variant} className={`flex items-center gap-1 w-fit text-xs ${cfg.cls}`}>
                        {cfg.icon}
                        {cfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" onClick={() => openDetail(remito)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    No se encontraron remitos.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Truck className="h-5 w-5" />
              {detailRemito?.codigo}
              {detailRemito && (
                <Badge variant={estadoCfg[detailRemito.estado].variant} className={`text-xs ${estadoCfg[detailRemito.estado].cls}`}>
                  {estadoCfg[detailRemito.estado].label}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {detailRemito && <RemitoDetail remito={detailRemito} />}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>Cerrar</Button>
            {detailRemito?.estado === 'en_transito' && (
              <Button>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Confirmar Entrega
              </Button>
            )}
            {detailRemito?.estado === 'pendiente' && (
              <Button>
                <Truck className="h-4 w-4 mr-2" />
                Despachar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default RemitosPage
