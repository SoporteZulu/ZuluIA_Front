'use client'

import React, { useState, useMemo } from 'react'
import {
  Plus, Search, Eye, Edit, FileText, ArrowDownLeft, ArrowUpRight,
  X, Save, RotateCcw, AlertCircle, CheckCircle2,
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
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { creditNotes, customers, invoices, products } from '@/lib/sales-data'
import type { CreditNote } from '@/lib/sales-types'

function fmtARS(n: number) {
  return n.toLocaleString('es-AR', { minimumFractionDigits: 2 })
}

function getCustomer(id: string) {
  return customers.find(c => c.id === id)
}

function getInvoice(id: string) {
  return invoices.find(i => i.id === id)
}

function getProductName(id: string) {
  return products.find(p => p.id === id)?.nombre ?? id
}

const motivoLabel: Record<CreditNote['motivo'], string> = {
  devolucion: 'Devolución',
  descuento:  'Descuento',
  error:      'Error de facturación',
  anulacion:  'Anulación',
}

const estadoCfg: Record<CreditNote['estado'], { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  borrador:  { label: 'Borrador',  variant: 'secondary' },
  emitida:   { label: 'Emitida',   variant: 'default' },
  cancelada: { label: 'Cancelada', variant: 'destructive' },
}

// ─── Note Detail ──────────────────────────────────────────────────────────────

function NoteDetail({ note }: { note: CreditNote }) {
  const customer = getCustomer(note.clienteId)
  const facturaOrig = getInvoice(note.facturaOriginal)
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 text-sm">
        {[
          ['Código', note.codigo],
          ['Tipo', note.tipo === 'nota_credito' ? 'Nota de Crédito' : 'Nota de Débito'],
          ['Cliente', customer?.razonSocial ?? note.clienteId],
          ['CUIT', customer?.cuitCuil ?? '-'],
          ['Factura Original', facturaOrig?.codigo ?? note.facturaOriginal],
          ['Motivo', motivoLabel[note.motivo]],
          ['Alcance', note.alcance === 'total' ? 'Total' : 'Parcial'],
          ['Estado', estadoCfg[note.estado].label],
        ].map(([k, v]) => (
          <div key={k} className="p-3 rounded-lg bg-muted/50">
            <span className="text-xs text-muted-foreground block mb-0.5">{k}</span>
            <p className="font-medium">{v}</p>
          </div>
        ))}
      </div>
      <Separator />
      <h4 className="text-sm font-semibold">Items</h4>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Producto</TableHead>
            <TableHead className="text-right">Cantidad</TableHead>
            <TableHead className="text-right">P.Unitario</TableHead>
            <TableHead className="text-right">Subtotal</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {note.items.map(item => (
            <TableRow key={item.id}>
              <TableCell>{getProductName(item.productoId)}</TableCell>
              <TableCell className="text-right">{item.cantidad}</TableCell>
              <TableCell className="text-right">${fmtARS(item.precioUnitario)}</TableCell>
              <TableCell className="text-right font-medium">${fmtARS(item.cantidad * item.precioUnitario)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="max-w-sm ml-auto space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>${fmtARS(note.subtotal)}</span></div>
        <div className="flex justify-between text-purple-600"><span>IVA</span><span>${fmtARS(note.iva)}</span></div>
        <Separator />
        <div className="flex justify-between font-bold text-base">
          <span>Total {note.tipo === 'nota_credito' ? 'Acreditado' : 'Debitado'}</span>
          <span className={note.tipo === 'nota_credito' ? 'text-green-600' : 'text-red-600'}>${fmtARS(note.total)}</span>
        </div>
      </div>
      {note.observaciones && (
        <div className="p-3 rounded-lg bg-muted/50 text-sm">
          <span className="text-xs text-muted-foreground block mb-0.5">Observaciones</span>
          <p>{note.observaciones}</p>
        </div>
      )}
    </div>
  )
}

// ─── New Note Form ─────────────────────────────────────────────────────────────

function NuevaNoteForm({ tipo }: { tipo: 'nota_credito' | 'nota_debito' }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Factura Original <span className="text-red-500">*</span></Label>
          <Select>
            <SelectTrigger><SelectValue placeholder="Seleccionar factura..." /></SelectTrigger>
            <SelectContent>
              {invoices.filter(i => i.estado === 'emitida' || i.estado === 'pagada').map(i => (
                <SelectItem key={i.id} value={i.id}>
                  {i.codigo} — {getCustomer(i.clienteId)?.razonSocial}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Motivo <span className="text-red-500">*</span></Label>
          <Select>
            <SelectTrigger><SelectValue placeholder="Seleccionar motivo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="devolucion">Devolución de mercadería</SelectItem>
              <SelectItem value="descuento">Descuento comercial</SelectItem>
              <SelectItem value="error">Error de facturación</SelectItem>
              <SelectItem value="anulacion">Anulación de factura</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Alcance</Label>
          <Select defaultValue="parcial">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="total">Total (toda la factura)</SelectItem>
              <SelectItem value="parcial">Parcial (items seleccionados)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Observaciones</Label>
        <Textarea placeholder="Descripción detallada del motivo..." className="resize-none h-20" />
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

const NotasCreditoPage = () => {
  const [mainTab, setMainTab]         = useState('notas_credito')
  const [searchTerm, setSearchTerm]   = useState('')
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [detailNote, setDetailNote]   = useState<CreditNote | null>(null)
  const [isNewOpen, setIsNewOpen]     = useState(false)
  const [newType, setNewType]         = useState<'nota_credito' | 'nota_debito'>('nota_credito')

  const nc = useMemo(() => creditNotes.filter(n => n.tipo === 'nota_credito'), [])
  const nd = useMemo(() => creditNotes.filter(n => n.tipo === 'nota_debito'), [])

  const filteredNC = useMemo(() => nc.filter(n =>
    n.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (getCustomer(n.clienteId)?.razonSocial ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  ), [nc, searchTerm])

  const filteredND = useMemo(() => nd.filter(n =>
    n.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (getCustomer(n.clienteId)?.razonSocial ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  ), [nd, searchTerm])

  const kpis = {
    totalNC:       nc.length,
    totalND:       nd.length,
    montoNC:       nc.reduce((s, n) => s + n.total, 0),
    montoND:       nd.reduce((s, n) => s + n.total, 0),
    emitidasNC:    nc.filter(n => n.estado === 'emitida').length,
  }

  const openDetail = (note: CreditNote) => { setDetailNote(note); setIsDetailOpen(true) }

  const NoteTable = ({ notes }: { notes: CreditNote[] }) => (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Factura Orig.</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Alcance</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {notes.map(note => {
              const customer = getCustomer(note.clienteId)
              const cfg = estadoCfg[note.estado]
              return (
                <TableRow key={note.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openDetail(note)}>
                  <TableCell className="font-mono font-semibold text-primary">{note.codigo}</TableCell>
                  <TableCell>
                    <p className="font-medium text-sm">{customer?.razonSocial ?? note.clienteId}</p>
                    <p className="text-xs text-muted-foreground">{customer?.cuitCuil}</p>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{getInvoice(note.facturaOriginal)?.codigo ?? note.facturaOriginal}</TableCell>
                  <TableCell className="text-sm">{motivoLabel[note.motivo]}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize text-xs">{note.alcance}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={cfg.variant} className="text-xs">{cfg.label}</Badge>
                  </TableCell>
                  <TableCell className={`text-right font-semibold ${note.tipo === 'nota_credito' ? 'text-green-600' : 'text-red-600'}`}>
                    {note.tipo === 'nota_credito' ? '+' : '-'}${fmtARS(note.total)}
                  </TableCell>
                  <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" onClick={() => openDetail(note)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
            {notes.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground text-sm">
                  No se encontraron comprobantes.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notas de Crédito / Débito</h1>
          <p className="text-muted-foreground">Ajustes, devoluciones y correcciones de facturas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setNewType('nota_debito'); setIsNewOpen(true) }}>
            <ArrowUpRight className="h-4 w-4 mr-2" />
            Nota de Débito
          </Button>
          <Button onClick={() => { setNewType('nota_credito'); setIsNewOpen(true) }}>
            <Plus className="h-4 w-4 mr-2" />
            Nota de Crédito
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-5">
        {[
          { label: 'Notas de Crédito', value: kpis.totalNC,  color: 'text-green-600' },
          { label: 'Notas de Débito',  value: kpis.totalND,  color: 'text-red-600' },
          { label: 'Emitidas (NC)',    value: kpis.emitidasNC, color: 'text-blue-600' },
          { label: 'Monto NC Total',   value: `$${(kpis.montoNC / 1000).toFixed(1)}K`, color: 'text-green-600' },
          { label: 'Monto ND Total',   value: `$${(kpis.montoND / 1000).toFixed(1)}K`, color: 'text-red-600' },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por código o cliente..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={mainTab} onValueChange={setMainTab}>
        <TabsList>
          <TabsTrigger value="notas_credito" className="flex items-center gap-2">
            <ArrowDownLeft className="h-4 w-4 text-green-600" />
            Notas de Crédito ({kpis.totalNC})
          </TabsTrigger>
          <TabsTrigger value="notas_debito" className="flex items-center gap-2">
            <ArrowUpRight className="h-4 w-4 text-red-600" />
            Notas de Débito ({kpis.totalND})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="notas_credito" className="mt-4">
          <NoteTable notes={filteredNC} />
        </TabsContent>
        <TabsContent value="notas_debito" className="mt-4">
          <NoteTable notes={filteredND} />
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {detailNote?.tipo === 'nota_credito'
                ? <ArrowDownLeft className="h-5 w-5 text-green-600" />
                : <ArrowUpRight className="h-5 w-5 text-red-600" />
              }
              {detailNote?.codigo}
              {detailNote && <Badge variant={estadoCfg[detailNote.estado].variant}>{estadoCfg[detailNote.estado].label}</Badge>}
            </DialogTitle>
          </DialogHeader>
          {detailNote && <NoteDetail note={detailNote} />}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>Cerrar</Button>
            {detailNote?.estado === 'borrador' && (
              <Button>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Emitir Nota
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Note Dialog */}
      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {newType === 'nota_credito'
                ? <><ArrowDownLeft className="h-5 w-5 text-green-600" /> Nueva Nota de Crédito</>
                : <><ArrowUpRight className="h-5 w-5 text-red-600" /> Nueva Nota de Débito</>
              }
            </DialogTitle>
          </DialogHeader>
          <NuevaNoteForm tipo={newType} />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsNewOpen(false)}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button variant="outline">
              <Save className="h-4 w-4 mr-2" />
              Guardar Borrador
            </Button>
            <Button>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Emitir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default NotasCreditoPage
