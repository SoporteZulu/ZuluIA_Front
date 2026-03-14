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
import { useComprobantes } from '@/lib/hooks/useComprobantes'
import type { Comprobante } from '@/lib/types/comprobantes'

function fmtARS(n: number) {
  return n.toLocaleString('es-AR', { minimumFractionDigits: 2 })
}

const estadoCfg: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  BORRADOR:  { label: 'Borrador',  variant: 'secondary' },
  EMITIDO:   { label: 'Emitido',   variant: 'default' },
  PAGADO:    { label: 'Pagado',    variant: 'default' },
  ANULADO:   { label: 'Anulado',   variant: 'destructive' },
  CANCELADO: { label: 'Cancelado', variant: 'destructive' },
  VENCIDO:   { label: 'Vencido',   variant: 'outline' },
}

// ─── Note Detail ──────────────────────────────────────────────────────────────

function NoteDetail({ note }: { note: Comprobante }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 text-sm">
        {[
          ['Comprobante', note.nroComprobante ?? note.id],
          ['Tipo', `Tipo ${note.tipoComprobanteId}`],
          ['Cliente/Proveedor', `#${note.terceroId}`],
          ['Fecha', new Date(note.fecha).toLocaleDateString('es-AR')],
          ['Vencimiento', note.fechaVto ? new Date(note.fechaVto).toLocaleDateString('es-AR') : '-'],
          ['Estado', (estadoCfg[note.estado] ?? { label: note.estado }).label],
          ['CAE', note.cae ?? '-'],
          ['Saldo', `$${fmtARS(note.saldo ?? 0)}`],
        ].map(([k, v]) => (
          <div key={String(k)} className="p-3 rounded-lg bg-muted/50">
            <span className="text-xs text-muted-foreground block mb-0.5">{k}</span>
            <p className="font-medium">{String(v)}</p>
          </div>
        ))}
      </div>
      <Separator />
      <div className="max-w-sm ml-auto space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Neto Gravado</span><span>${fmtARS(note.netoGravado ?? 0)}</span></div>
        <div className="flex justify-between text-purple-600"><span>IVA RI</span><span>${fmtARS(note.ivaRi ?? 0)}</span></div>
        <Separator />
        <div className="flex justify-between font-bold text-base">
          <span>Total</span>
          <span className="text-primary">${fmtARS(note.total)}</span>
        </div>
      </div>
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
              <SelectItem value="placeholder" disabled>Cargando facturas...</SelectItem>
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
  const { comprobantes, loading, error } = useComprobantes({ esVenta: true })
  const [mainTab, setMainTab]           = useState('todos')
  const [searchTerm, setSearchTerm]     = useState('')
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [detailNote, setDetailNote]     = useState<Comprobante | null>(null)
  const [isNewOpen, setIsNewOpen]       = useState(false)
  const [newType, setNewType]           = useState<'nota_credito' | 'nota_debito'>('nota_credito')

  const filtered = useMemo(() => comprobantes.filter(c =>
    String(c.nroComprobante ?? c.id).includes(searchTerm) ||
    String(c.terceroId).includes(searchTerm)
  ), [comprobantes, searchTerm])

  const kpis = useMemo(() => ({
    total:    comprobantes.length,
    emitidos: comprobantes.filter(c => c.estado === 'EMITIDO').length,
    pagados:  comprobantes.filter(c => c.estado === 'PAGADO').length,
    anulados: comprobantes.filter(c => c.estado === 'ANULADO').length,
    montoTotal: comprobantes.reduce((s, c) => s + c.total, 0),
  }), [comprobantes])

  const openDetail = (note: Comprobante) => { setDetailNote(note); setIsDetailOpen(true) }

  const NoteTable = ({ notes }: { notes: Comprobante[] }) => (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Comprobante</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Cargando comprobantes...</TableCell></TableRow>
            )}
            {error && (
              <TableRow><TableCell colSpan={7} className="text-center py-10 text-destructive">{error}</TableCell></TableRow>
            )}
            {!loading && !error && notes.map(note => {
              const cfg = estadoCfg[note.estado] ?? { label: note.estado, variant: 'secondary' as const }
              return (
                <TableRow key={note.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openDetail(note)}>
                  <TableCell className="font-mono font-semibold text-primary">{note.nroComprobante ?? `#${note.id}`}</TableCell>
                  <TableCell>
                    <p className="font-medium text-sm">Cliente #{note.terceroId}</p>
                  </TableCell>
                  <TableCell className="text-sm">{new Date(note.fecha).toLocaleDateString('es-AR')}</TableCell>
                  <TableCell className="text-sm">{note.fechaVto ? new Date(note.fechaVto).toLocaleDateString('es-AR') : '-'}</TableCell>
                  <TableCell>
                    <Badge variant={cfg.variant} className="text-xs">{cfg.label}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">${fmtARS(note.total)}</TableCell>
                  <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" onClick={() => openDetail(note)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
            {!loading && !error && notes.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-sm">
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
          { label: 'Total Comprobantes', value: kpis.total,    color: 'text-foreground' },
          { label: 'Emitidos',           value: kpis.emitidos,  color: 'text-green-600' },
          { label: 'Pagados',            value: kpis.pagados,   color: 'text-blue-600' },
          { label: 'Anulados',           value: kpis.anulados,  color: 'text-destructive' },
          { label: 'Monto Total', value: `$${(kpis.montoTotal / 1000).toFixed(1)}K`, color: 'text-primary' },
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
          <TabsTrigger value="todos" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Todos los comprobantes ({kpis.total})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="todos" className="mt-4">
          <NoteTable notes={filtered} />
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <FileText className="h-5 w-5" />
              {detailNote?.nroComprobante ?? `#${detailNote?.id}`}
              {detailNote && (() => {
                const cfg = estadoCfg[detailNote.estado] ?? { label: detailNote.estado, variant: 'secondary' as const }
                return <Badge variant={cfg.variant}>{cfg.label}</Badge>
              })()}
            </DialogTitle>
          </DialogHeader>
          {detailNote && <NoteDetail note={detailNote} />}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>Cerrar</Button>
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
