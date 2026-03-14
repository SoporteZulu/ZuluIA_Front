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
import { useComprobantes } from '@/lib/hooks/useComprobantes'
import { useTerceros } from '@/lib/hooks/useTerceros'
import type { Comprobante } from '@/lib/types/comprobantes'

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('es-AR')
}

const estadoCfg: Record<string, { label: string; icon: React.ReactNode; variant: 'default' | 'secondary' | 'outline' | 'destructive'; cls: string }> = {
  BORRADOR:        { label: 'Borrador',     icon: <Clock className="h-3 w-3" />,        variant: 'secondary',   cls: '' },
  EMITIDO:         { label: 'Emitido',      icon: <Truck className="h-3 w-3" />,        variant: 'outline',     cls: 'border-orange-300 text-orange-700 bg-orange-50' },
  PAGADO_PARCIAL:  { label: 'Pago Parcial', icon: <Truck className="h-3 w-3" />,        variant: 'outline',     cls: 'border-blue-300 text-blue-700 bg-blue-50' },
  PAGADO:          { label: 'Pagado',       icon: <CheckCircle2 className="h-3 w-3" />, variant: 'default',     cls: 'bg-green-100 text-green-800 border-green-300' },
  ANULADO:         { label: 'Anulado',      icon: <AlertTriangle className="h-3 w-3" />, variant: 'destructive', cls: '' },
}

// ─── Detail View ──────────────────────────────────────────────────────────────

function RemitoDetail({ remito, terceros }: { remito: Comprobante; terceros: { id: number; razonSocial: string; nroDocumento: string }[] }) {
  const customer = terceros.find(t => t.id === remito.terceroId)

  return (
    <Tabs defaultValue="general">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="importes">Importes</TabsTrigger>
      </TabsList>

      <TabsContent value="general" className="mt-4 space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            ['Nro. Comprobante', remito.nroComprobante ?? '-'],
            ['Tipo',             remito.tipoComprobanteDescripcion ?? '-'],
            ['Cliente',          customer?.razonSocial ?? String(remito.terceroId)],
            ['CUIT / Doc.',      customer?.nroDocumento ?? '-'],
            ['Fecha',            fmtDate(remito.fecha)],
            ['Fecha Vto.',       fmtDate(remito.fechaVto)],
          ].map(([k, v]) => (
            <div key={k} className="p-3 rounded-lg bg-muted/50">
              <span className="text-xs text-muted-foreground block mb-0.5">{k}</span>
              <p className="font-medium">{v}</p>
            </div>
          ))}
        </div>
        {remito.observacion && (
          <div className="p-3 rounded-lg bg-muted/50 text-sm">
            <span className="text-xs text-muted-foreground block mb-0.5">Observaciones</span>
            <p>{remito.observacion}</p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="importes" className="mt-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            ['Neto Gravado',    `$${remito.netoGravado.toLocaleString('es-AR')}`],
            ['Neto No Gravado', `$${remito.netoNoGravado.toLocaleString('es-AR')}`],
            ['IVA RI',          `$${remito.ivaRi.toLocaleString('es-AR')}`],
            ['IVA RNI',         `$${remito.ivaRni.toLocaleString('es-AR')}`],
            ['Total',           `$${remito.total.toLocaleString('es-AR')}`],
            ['Saldo',           `$${remito.saldo.toLocaleString('es-AR')}`],
          ].map(([k, v]) => (
            <div key={k} className="p-3 rounded-lg bg-muted/50">
              <span className="text-xs text-muted-foreground block mb-0.5">{k}</span>
              <p className="font-semibold">{v}</p>
            </div>
          ))}
        </div>
        {remito.estado === 'EMITIDO' && (
          <div className="flex items-center gap-3 p-4 mt-3 rounded-lg border border-orange-200 bg-orange-50">
            <Truck className="h-6 w-6 text-orange-600 shrink-0 animate-pulse" />
            <div>
              <p className="font-semibold text-orange-800 text-sm">Comprobante emitido</p>
              <p className="text-xs text-orange-700 mt-0.5">Pendiente de pago / confirmación</p>
            </div>
          </div>
        )}
        {remito.estado === 'PAGADO' && (
          <div className="flex items-center gap-3 p-4 mt-3 rounded-lg border border-green-200 bg-green-50">
            <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0" />
            <div>
              <p className="font-semibold text-green-800 text-sm">Completado</p>
              <p className="text-xs text-green-700 mt-0.5">El comprobante ha sido pagado</p>
            </div>
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

const RemitosPage = () => {
  const { comprobantes: remitos, loading } = useComprobantes()
  const { terceros } = useTerceros()
  const [searchTerm, setSearchTerm]     = useState('')
  const [estadoFilter, setEstadoFilter] = useState('todos')
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [detailRemito, setDetailRemito] = useState<Comprobante | null>(null)

  const filtered = useMemo(() => remitos.filter(r => {
    const customer = terceros.find(t => t.id === r.terceroId)
    const matchSearch =
      (r.nroComprobante ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer?.razonSocial ?? '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchEstado = estadoFilter === 'todos' || r.estado === estadoFilter
    return matchSearch && matchEstado
  }), [searchTerm, estadoFilter, remitos, terceros])

  const kpis = useMemo(() => ({
    total:    remitos.length,
    borrador: remitos.filter(r => r.estado === 'BORRADOR').length,
    emitido:  remitos.filter(r => r.estado === 'EMITIDO').length,
    pagado:   remitos.filter(r => r.estado === 'PAGADO').length,
  }), [remitos])

  const openDetail = (r: Comprobante) => { setDetailRemito(r); setIsDetailOpen(true) }

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
          { label: 'Total Remitos', value: kpis.total,    icon: <FileText className="h-4 w-4" />,     color: 'text-foreground' },
          { label: 'Borrador',      value: kpis.borrador, icon: <Clock className="h-4 w-4" />,        color: 'text-slate-600' },
          { label: 'Emitidos',      value: kpis.emitido,  icon: <Truck className="h-4 w-4" />,        color: 'text-orange-600' },
          { label: 'Pagados',       value: kpis.pagado,   icon: <CheckCircle2 className="h-4 w-4" />, color: 'text-green-600' },
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
            <SelectItem value="BORRADOR">Borrador</SelectItem>
            <SelectItem value="EMITIDO">Emitido</SelectItem>
            <SelectItem value="PAGADO">Pagado</SelectItem>
            <SelectItem value="ANULADO">Anulado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nro. Comprobante</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(remito => {
                const customer = terceros.find(t => t.id === remito.terceroId)
                const cfg      = estadoCfg[remito.estado] ?? estadoCfg.EMITIDO
                return (
                  <TableRow key={remito.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openDetail(remito)}>
                    <TableCell className="font-mono font-semibold text-primary">{remito.nroComprobante ?? '-'}</TableCell>
                    <TableCell>
                      <p className="font-medium text-sm">{customer?.razonSocial ?? String(remito.terceroId)}</p>
                      <p className="text-xs text-muted-foreground">{customer?.nroDocumento}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {remito.tipoComprobanteDescripcion ?? '-'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{fmtDate(remito.fecha)}</TableCell>
                    <TableCell className="text-right text-sm font-medium">${remito.total.toLocaleString('es-AR')}</TableCell>
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
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    {loading ? 'Cargando remitos...' : 'No se encontraron remitos.'}
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
              {detailRemito?.nroComprobante ?? 'Remito'}
              {detailRemito && (
                <Badge variant={(estadoCfg[detailRemito.estado] ?? estadoCfg.EMITIDO).variant} className={`text-xs ${(estadoCfg[detailRemito.estado] ?? estadoCfg.EMITIDO).cls}`}>
                  {(estadoCfg[detailRemito.estado] ?? estadoCfg.EMITIDO).label}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {detailRemito && <RemitoDetail remito={detailRemito} terceros={terceros} />}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>Cerrar</Button>
            {detailRemito?.estado === 'EMITIDO' && (
              <Button>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Confirmar Entrega
              </Button>
            )}
            {detailRemito?.estado === 'BORRADOR' && (
              <Button>
                <Truck className="h-4 w-4 mr-2" />
                Emitir
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default RemitosPage
