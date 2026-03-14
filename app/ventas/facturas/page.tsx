'use client'

import React, { useState, useMemo } from 'react'
import {
  Plus, Search, Eye, Download, CheckCircle2, Clock, X,
  AlertTriangle, FileText, Printer, Send, Ban, ChevronRight,
  Zap, Shield,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { useComprobantes } from '@/lib/hooks/useComprobantes'
import type { Comprobante } from '@/lib/types/comprobantes'
import type { Invoice } from '@/lib/sales-types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtARS(n: number) {
  return n.toLocaleString('es-AR', { minimumFractionDigits: 2 })
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getCustomer(_id: string) { return undefined }

function mapEstadoFactura(estado: string): Invoice['estado'] {
  const e = estado.toUpperCase()
  if (e === 'BORRADOR') return 'borrador'
  if (e === 'EMITIDO') return 'emitida'
  if (e === 'PAGADO' || e === 'PAGADO_PARCIAL') return 'pagada'
  return 'cancelada'
}

function comprobanteToInvoice(c: Comprobante): Invoice {
  return {
    id: String(c.id),
    codigo: c.nroComprobante ?? String(c.id),
    tipo: 'factura_a' as Invoice['tipo'],
    clienteId: String(c.terceroId),
    fecha: c.fecha,
    fechaVencimiento: c.fechaVto ?? c.fecha,
    estado: mapEstadoFactura(c.estado),
    total: c.total,
    cae: c.cae ?? undefined,
    vencimientoCae: c.caeFechaVto ?? undefined,
    puntoVenta: '0001',
    numero: c.nroComprobante ?? String(c.id),
    items: [],
    subtotal: c.netoGravado,
    iva21: c.ivaRi,
    iva105: 0,
    iva27: 0,
    percepciones: 0,
    saldo: c.saldo,
  } as unknown as Invoice
}

function moraDays(invoice: Invoice) {
  if (invoice.estado === 'pagada' || invoice.estado === 'cancelada') return 0
  const days = Math.floor((Date.now() - new Date(invoice.fechaVencimiento).getTime()) / 86400000)
  return days > 0 ? days : 0
}

const estadoCfg: Record<Invoice['estado'], { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; cls: string }> = {
  borrador:  { label: 'Borrador',  variant: 'secondary',   cls: '' },
  emitida:   { label: 'Emitida',   variant: 'outline',     cls: 'border-blue-300 text-blue-700' },
  pagada:    { label: 'Pagada',    variant: 'default',     cls: 'bg-green-100 text-green-800 border-green-300' },
  cancelada: { label: 'Cancelada', variant: 'destructive', cls: '' },
}

// ─── AFIP Simulation ──────────────────────────────────────────────────────────

function AfipPanel({ invoice }: { invoice: Invoice }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const simulate = () => {
    setStatus('loading')
    setTimeout(() => setStatus('success'), 1800)
  }

  if (invoice.cae) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 rounded-lg border border-green-300 bg-green-50">
          <Shield className="h-8 w-8 text-green-600 shrink-0" />
          <div>
            <p className="font-semibold text-green-800 text-sm">Comprobante autorizado por AFIP</p>
            <p className="text-xs text-green-700 mt-0.5">CAE generado y vigente</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="p-3 rounded-lg bg-muted/50">
            <span className="text-xs text-muted-foreground block mb-0.5">CAE</span>
            <p className="font-mono font-bold text-sm">{invoice.cae}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <span className="text-xs text-muted-foreground block mb-0.5">Vencimiento CAE</span>
            <p className="font-medium">{invoice.vencimientoCae ? new Date(invoice.vencimientoCae).toLocaleDateString('es-AR') : '-'}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <span className="text-xs text-muted-foreground block mb-0.5">Punto de Venta</span>
            <p className="font-mono font-bold">{invoice.puntoVenta}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <span className="text-xs text-muted-foreground block mb-0.5">Número</span>
            <p className="font-mono font-bold">{invoice.numero}</p>
          </div>
        </div>
        {invoice.codigoBarras && (
          <div className="p-3 rounded-lg bg-muted/50">
            <span className="text-xs text-muted-foreground block mb-1">Código de Barras AFIP</span>
            <p className="font-mono text-xs break-all">{invoice.codigoBarras}</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-4 rounded-lg border border-orange-300 bg-orange-50">
        <AlertTriangle className="h-8 w-8 text-orange-600 shrink-0" />
        <div>
          <p className="font-semibold text-orange-800 text-sm">Comprobante no autorizado</p>
          <p className="text-xs text-orange-700 mt-0.5">Este comprobante aún no tiene CAE asignado.</p>
        </div>
      </div>

      {status === 'idle' && (
        <Button className="w-full" onClick={simulate}>
          <Zap className="h-4 w-4 mr-2" />
          Solicitar autorización AFIP (CAE)
        </Button>
      )}

      {status === 'loading' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
            Conectando con AFIP WSFEv1...
          </div>
          <Progress value={65} className="h-1.5" />
          <p className="text-xs text-muted-foreground">Enviando comprobante electrónico...</p>
        </div>
      )}

      {status === 'success' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-4 rounded-lg border border-green-300 bg-green-50">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
            <div>
              <p className="font-semibold text-green-800 text-sm">CAE obtenido correctamente</p>
              <p className="font-mono text-xs text-green-700 mt-0.5">72841652139847 — Vence: {new Date(Date.now() + 10 * 86400000).toLocaleDateString('es-AR')}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">El comprobante fue autorizado. Recargue la página para ver los datos actualizados.</p>
        </div>
      )}

      {status === 'error' && (
        <div className="p-4 rounded-lg border border-red-300 bg-red-50">
          <p className="font-semibold text-red-800 text-sm">Error de comunicación AFIP</p>
          <p className="text-xs text-red-700 mt-1">Servicio no disponible. Intente nuevamente.</p>
          <Button size="sm" variant="outline" className="mt-3" onClick={() => setStatus('idle')}>Reintentar</Button>
        </div>
      )}
    </div>
  )
}

// ─── Invoice Detail ───────────────────────────────────────────────────────────

function InvoiceDetail({ invoice }: { invoice: Invoice }) {
  const customer = getCustomer(invoice.clienteId)
  const mora = moraDays(invoice)

  return (
    <Tabs defaultValue="general">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="items">Items ({invoice.items.length})</TabsTrigger>
        <TabsTrigger value="impuestos">Impuestos</TabsTrigger>
        <TabsTrigger value="afip">AFIP / CAE</TabsTrigger>
      </TabsList>

      <TabsContent value="general" className="mt-4 space-y-3">
        {mora > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-lg border border-red-300 bg-red-50 text-sm">
            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
            <p className="text-red-700 font-medium">Vencida hace <strong>{mora} días</strong></p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            ['Tipo Factura', invoice.tipo.replace('_', ' ').toUpperCase()],
            ['N° Comprobante', `${invoice.puntoVenta}-${invoice.numero}`],
            ['Cliente', customer?.razonSocial ?? invoice.clienteId],
            ['CUIT', customer?.cuitCuil ?? '-'],
            ['Condición IVA', customer?.condicionImpositiva?.replace('_', ' ') ?? '-'],
            ['Fecha Emisión', new Date(invoice.fecha).toLocaleDateString('es-AR')],
            ['Fecha Vencimiento', new Date(invoice.fechaVencimiento).toLocaleDateString('es-AR')],
            ['Estado', estadoCfg[invoice.estado].label],
          ].map(([k, v]) => (
            <div key={k} className="p-3 rounded-lg bg-muted/50">
              <span className="text-xs text-muted-foreground block mb-0.5">{k}</span>
              <p className="font-medium capitalize">{v}</p>
            </div>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="items" className="mt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descripción</TableHead>
              <TableHead className="text-right">Cant.</TableHead>
              <TableHead className="text-right">P.Unitario</TableHead>
              <TableHead className="text-right">IVA %</TableHead>
              <TableHead className="text-right">IVA $</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoice.items.map(item => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.descripcion}</TableCell>
                <TableCell className="text-right">{item.cantidad}</TableCell>
                <TableCell className="text-right">${fmtARS(item.precioUnitario)}</TableCell>
                <TableCell className="text-right">{item.alicuotaIva}%</TableCell>
                <TableCell className="text-right text-purple-600">${fmtARS(item.iva)}</TableCell>
                <TableCell className="text-right font-semibold">${fmtARS(item.total)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TabsContent>

      <TabsContent value="impuestos" className="mt-4">
        <div className="max-w-sm ml-auto space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Neto Gravado</span><span>${fmtARS(invoice.subtotal)}</span></div>
          {invoice.iva21 > 0 && <div className="flex justify-between text-purple-600"><span>IVA 21%</span><span>${fmtARS(invoice.iva21)}</span></div>}
          {invoice.iva105 > 0 && <div className="flex justify-between text-purple-600"><span>IVA 10.5%</span><span>${fmtARS(invoice.iva105)}</span></div>}
          {invoice.iva27 > 0 && <div className="flex justify-between text-purple-600"><span>IVA 27%</span><span>${fmtARS(invoice.iva27)}</span></div>}
          {(invoice.percepciones ?? 0) > 0 && <div className="flex justify-between text-orange-600"><span>Percepciones</span><span>${fmtARS(invoice.percepciones ?? 0)}</span></div>}
          <Separator />
          <div className="flex justify-between font-bold text-base"><span>Total</span><span className="text-primary">${fmtARS(invoice.total)}</span></div>
        </div>
      </TabsContent>

      <TabsContent value="afip" className="mt-4">
        <AfipPanel invoice={invoice} />
      </TabsContent>
    </Tabs>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

const FacturasPage = () => {
  const { comprobantes, loading, error, refetch } = useComprobantes({ esVenta: true })
  const [searchTerm, setSearchTerm]   = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [tipoFilter, setTipoFilter]   = useState('todos')
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [detailInvoice, setDetailInvoice] = useState<Invoice | null>(null)

  const invoices = useMemo(() => comprobantes.map(comprobanteToInvoice), [comprobantes])

  const filtered = useMemo(() => invoices.filter(i => {
    const matchSearch =
      i.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (i.cae ?? '').includes(searchTerm)
    const matchStatus = statusFilter === 'todos' || i.estado === statusFilter
    const matchTipo   = tipoFilter === 'todos' || i.tipo === tipoFilter
    return matchSearch && matchStatus && matchTipo
  }), [invoices, searchTerm, statusFilter, tipoFilter])

  const kpis = useMemo(() => ({
    total:     invoices.length,
    emitidas:  invoices.filter(i => i.estado === 'emitida').length,
    pagadas:   invoices.filter(i => i.estado === 'pagada').length,
    vencidas:  invoices.filter(i => moraDays(i) > 0).length,
    montoTotal:    invoices.reduce((s, i) => s + i.total, 0),
    montoPendiente: invoices.filter(i => i.estado !== 'pagada' && i.estado !== 'cancelada').reduce((s, i) => s + i.total, 0),
    conCae:    invoices.filter(i => !!i.cae).length,
  }), [invoices])

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
    </div>
  )

  if (error) return (
    <div className="p-6 text-red-600 text-sm">
      Error al cargar facturas: {error}. Verificá que el backend esté disponible en{' '}
      <code className="font-mono bg-red-50 px-1">{process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5065'}</code>.
    </div>
  )

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Facturas de Venta</h1>
          <p className="text-muted-foreground">Facturación electrónica — AFIP WSFEv1</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Factura
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-7">
        {[
          { label: 'Total',         value: kpis.total,      color: 'text-foreground' },
          { label: 'Emitidas',      value: kpis.emitidas,   color: 'text-blue-600' },
          { label: 'Pagadas',       value: kpis.pagadas,    color: 'text-green-600' },
          { label: 'Vencidas',      value: kpis.vencidas,   color: 'text-red-600' },
          { label: 'Con CAE',       value: kpis.conCae,     color: 'text-primary' },
          { label: 'Total $K',      value: `$${(kpis.montoTotal / 1000).toFixed(0)}K`,     color: 'text-primary' },
          { label: 'Pendiente $K',  value: `$${(kpis.montoPendiente / 1000).toFixed(0)}K`, color: 'text-orange-600' },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código, cliente o CAE..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={tipoFilter} onValueChange={setTipoFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los tipos</SelectItem>
            <SelectItem value="factura_a">Factura A</SelectItem>
            <SelectItem value="factura_b">Factura B</SelectItem>
            <SelectItem value="factura_c">Factura C</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="borrador">Borrador</SelectItem>
            <SelectItem value="emitida">Emitida</SelectItem>
            <SelectItem value="pagada">Pagada</SelectItem>
            <SelectItem value="cancelada">Cancelada</SelectItem>
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
                <TableHead>Tipo</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Emisión</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead>CAE</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(invoice => {
                const cfg = estadoCfg[invoice.estado]
                const mora = moraDays(invoice)
                return (
                  <TableRow key={invoice.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setDetailInvoice(invoice); setIsDetailOpen(true) }}>
                    <TableCell className="font-mono font-semibold text-primary">{invoice.codigo}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs uppercase">
                        {invoice.tipo.replace('factura_', 'F. ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-sm">Cliente #{invoice.clienteId}</p>
                    </TableCell>
                    <TableCell className="text-sm">{new Date(invoice.fecha).toLocaleDateString('es-AR')}</TableCell>
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-1.5">
                        {new Date(invoice.fechaVencimiento).toLocaleDateString('es-AR')}
                        {mora > 0 && (
                          <Badge variant="destructive" className="text-xs px-1.5 py-0">{mora}d</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {invoice.cae ? (
                        <div className="flex items-center gap-1.5 text-green-700">
                          <Shield className="h-3.5 w-3.5" />
                          <span className="font-mono text-xs">{invoice.cae.slice(-6)}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Sin CAE</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={cfg.variant} className={`text-xs ${cfg.cls}`}>{cfg.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">${fmtARS(invoice.total)}</TableCell>
                    <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setDetailInvoice(invoice); setIsDetailOpen(true) }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon"><Printer className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                    No se encontraron facturas.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <FileText className="h-5 w-5" />
              <span className="font-mono">{detailInvoice?.codigo}</span>
              {detailInvoice && (
                <Badge variant={estadoCfg[detailInvoice.estado].variant} className={`text-xs ${estadoCfg[detailInvoice.estado].cls}`}>
                  {estadoCfg[detailInvoice.estado].label}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {detailInvoice && <InvoiceDetail invoice={detailInvoice} />}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>Cerrar</Button>
            {detailInvoice?.estado === 'emitida' && (
              <>
                <Button variant="outline">
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir
                </Button>
                <Button variant="outline">
                  <Send className="h-4 w-4 mr-2" />
                  Enviar por Email
                </Button>
                <Button>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Registrar Pago
                </Button>
              </>
            )}
            {detailInvoice?.estado === 'borrador' && (
              <Button>
                <Zap className="h-4 w-4 mr-2" />
                Emitir y Solicitar CAE
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default FacturasPage
