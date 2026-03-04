'use client'

import React, { useState, useMemo } from 'react'
import {
  Search, TrendingUp, TrendingDown, Wallet, AlertTriangle,
  ArrowUpRight, ArrowDownLeft, ChevronDown, Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { customers, movimientosCC, invoices } from '@/lib/sales-data'
import type { Customer, MovimientoCC } from '@/lib/sales-types'

function fmtARS(n: number) {
  return n.toLocaleString('es-AR', { minimumFractionDigits: 2 })
}

function creditPct(c: Customer) {
  if (!c.creditoLimite) return 0
  return Math.min(Math.round((c.creditoUtilizado / c.creditoLimite) * 100), 100)
}

function AntiguedadBar({ dias0, dias31, dias61, dias90 }: { dias0: number; dias31: number; dias61: number; dias90: number }) {
  const total = dias0 + dias31 + dias61 + dias90 || 1
  return (
    <div className="flex h-3 rounded-full overflow-hidden gap-px w-full">
      {dias0 > 0   && <div className="bg-green-400"  style={{ width: `${(dias0  / total) * 100}%` }} title={`0-30d: $${fmtARS(dias0)}`} />}
      {dias31 > 0  && <div className="bg-yellow-400" style={{ width: `${(dias31 / total) * 100}%` }} title={`31-60d: $${fmtARS(dias31)}`} />}
      {dias61 > 0  && <div className="bg-orange-400" style={{ width: `${(dias61 / total) * 100}%` }} title={`61-90d: $${fmtARS(dias61)}`} />}
      {dias90 > 0  && <div className="bg-red-500"    style={{ width: `${(dias90 / total) * 100}%` }} title={`+90d: $${fmtARS(dias90)}`} />}
    </div>
  )
}

// ─── Customer CC Detail ────────────────────────────────────────────────────────

function CustomerCCDetail({ customer }: { customer: Customer }) {
  const movs = useMemo(
    () => movimientosCC.filter(m => m.clienteId === customer.id).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()),
    [customer.id]
  )

  const balance = customer.balanceCliente
  const pct = creditPct(customer)

  const tipoIcon = (tipo: MovimientoCC['tipo']) => {
    const map: Record<MovimientoCC['tipo'], React.ReactNode> = {
      factura:     <ArrowDownLeft className="h-3.5 w-3.5 text-red-500" />,
      pago:        <ArrowUpRight className="h-3.5 w-3.5 text-green-500" />,
      nota_credito:<ArrowUpRight className="h-3.5 w-3.5 text-blue-500" />,
      nota_debito: <ArrowDownLeft className="h-3.5 w-3.5 text-orange-500" />,
    }
    return map[tipo]
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-lg border bg-card space-y-1">
          <p className="text-xs text-muted-foreground">Saldo Actual</p>
          <p className={`text-xl font-bold ${customer.saldoCuentaCorriente > 0 ? 'text-red-600' : 'text-green-600'}`}>
            ${fmtARS(Math.abs(customer.saldoCuentaCorriente))}
          </p>
          <p className="text-xs text-muted-foreground">{customer.saldoCuentaCorriente > 0 ? 'A cobrar' : 'A favor del cliente'}</p>
        </div>
        <div className="p-3 rounded-lg border bg-card space-y-1">
          <p className="text-xs text-muted-foreground">Compras Totales</p>
          <p className="text-xl font-bold">${fmtARS(balance?.totalComprado ?? 0)}</p>
          <p className="text-xs text-muted-foreground">{customer.facturasPendientes ?? 0} facturas pendientes</p>
        </div>
        <div className="p-3 rounded-lg border bg-card space-y-1">
          <p className="text-xs text-muted-foreground">Crédito Disponible</p>
          <p className="text-xl font-bold text-primary">${fmtARS(customer.creditoLimite - customer.creditoUtilizado)}</p>
          <Progress value={pct} className="h-1.5 mt-1" />
        </div>
      </div>

      {/* Aging */}
      {balance && (
        <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
          <h4 className="text-sm font-semibold">Antigüedad de Deuda</h4>
          <AntiguedadBar
            dias0={balance.antiguedadDeuda.dias0_30}
            dias31={balance.antiguedadDeuda.dias31_60}
            dias61={balance.antiguedadDeuda.dias61_90}
            dias90={balance.antiguedadDeuda.dias90_mas}
          />
          <div className="grid grid-cols-4 gap-2 text-xs">
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-green-400" /><span>0-30d: ${fmtARS(balance.antiguedadDeuda.dias0_30)}</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-yellow-400" /><span>31-60d: ${fmtARS(balance.antiguedadDeuda.dias31_60)}</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-orange-400" /><span>61-90d: ${fmtARS(balance.antiguedadDeuda.dias61_90)}</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500" /><span>+90d: ${fmtARS(balance.antiguedadDeuda.dias90_mas)}</span></div>
          </div>
        </div>
      )}

      {/* Movements */}
      <div>
        <h4 className="text-sm font-semibold mb-2">Movimientos de Cuenta Corriente</h4>
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Comprobante</TableHead>
                <TableHead className="text-right">Debe</TableHead>
                <TableHead className="text-right">Haber</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-sm">
                    Sin movimientos registrados.
                  </TableCell>
                </TableRow>
              ) : movs.map(m => (
                <TableRow key={m.id}>
                  <TableCell className="text-sm">{new Date(m.fecha).toLocaleDateString('es-AR')}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm">
                      {tipoIcon(m.tipo)}
                      <span className="capitalize">{m.tipo.replace('_', ' ')}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{m.comprobante}</TableCell>
                  <TableCell className="text-right text-sm">
                    {m.debe > 0 ? <span className="text-red-600 font-medium">${fmtARS(m.debe)}</span> : <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {m.haber > 0 ? <span className="text-green-600 font-medium">${fmtARS(m.haber)}</span> : <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-sm">
                    <span className={m.saldo > 0 ? 'text-red-600' : 'text-green-600'}>${fmtARS(Math.abs(m.saldo))}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

const CuentaCorrientePage = () => {
  const [searchTerm, setSearchTerm]         = useState('')
  const [estadoFilter, setEstadoFilter]     = useState('todos')
  const [isDetailOpen, setIsDetailOpen]     = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  const filtered = useMemo(() => customers.filter(c => {
    const matchSearch = c.razonSocial.toLowerCase().includes(searchTerm.toLowerCase()) || c.cuitCuil.includes(searchTerm)
    const matchEstado = estadoFilter === 'todos' || c.estado === estadoFilter
    const hasSaldo    = c.saldoCuentaCorriente !== 0
    return matchSearch && matchEstado && (estadoFilter === 'cero' ? !hasSaldo : estadoFilter === 'todos' ? true : hasSaldo || matchSearch)
  }), [searchTerm, estadoFilter])

  const kpis = useMemo(() => ({
    clientesConDeuda:  customers.filter(c => c.saldoCuentaCorriente > 0).length,
    totalAcobrar:      customers.reduce((s, c) => s + Math.max(c.saldoCuentaCorriente, 0), 0),
    morosos:           customers.filter(c => c.estado === 'moroso').length,
    bloqueados:        customers.filter(c => c.estado === 'bloqueado').length,
    creditoTotalUsado: customers.reduce((s, c) => s + c.creditoUtilizado, 0),
  }), [])

  const estadoConfig: Record<Customer['estado'], { label: string; cls: string }> = {
    activo:    { label: 'Activo',    cls: 'bg-green-100 text-green-800' },
    inactivo:  { label: 'Inactivo',  cls: 'bg-gray-100 text-gray-600' },
    moroso:    { label: 'Moroso',    cls: 'bg-orange-100 text-orange-800' },
    bloqueado: { label: 'Bloqueado', cls: 'bg-red-100 text-red-800' },
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cuenta Corriente</h1>
          <p className="text-muted-foreground">Saldos, antigüedad de deuda y movimientos por cliente</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-5">
        {[
          { label: 'Clientes con Deuda',   value: kpis.clientesConDeuda,  color: 'text-red-600', icon: <Users className="h-4 w-4" /> },
          { label: 'Total a Cobrar',        value: `$${(kpis.totalAcobrar / 1000).toFixed(0)}K`, color: 'text-primary', icon: <Wallet className="h-4 w-4" /> },
          { label: 'Clientes Morosos',      value: kpis.morosos,           color: 'text-orange-600', icon: <AlertTriangle className="h-4 w-4" /> },
          { label: 'Clientes Bloqueados',   value: kpis.bloqueados,        color: 'text-red-700',    icon: <AlertTriangle className="h-4 w-4" /> },
          { label: 'Crédito Utilizado',     value: `$${(kpis.creditoTotalUsado / 1000).toFixed(0)}K`, color: 'text-foreground', icon: <TrendingUp className="h-4 w-4" /> },
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
            placeholder="Buscar cliente por nombre o CUIT..."
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
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="activo">Activo</SelectItem>
            <SelectItem value="moroso">Moroso</SelectItem>
            <SelectItem value="bloqueado">Bloqueado</SelectItem>
            <SelectItem value="inactivo">Inactivo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Lista</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead>Crédito Utilizado</TableHead>
                <TableHead className="text-right">Saldo CC</TableHead>
                <TableHead className="text-right">Antigüedad</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(customer => {
                const pct = creditPct(customer)
                const cfg = estadoConfig[customer.estado]
                const balance = customer.balanceCliente
                return (
                  <TableRow key={customer.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSelectedCustomer(customer); setIsDetailOpen(true) }}>
                    <TableCell>
                      <p className="font-semibold text-sm">{customer.razonSocial}</p>
                      <p className="text-xs text-muted-foreground font-mono">{customer.cuitCuil}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${cfg.cls}`}>{cfg.label}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{customer.listaAsignada ?? '-'}</TableCell>
                    <TableCell className="text-sm">{customer.condicionesPago?.plazo ?? 30} días</TableCell>
                    <TableCell>
                      <div className="space-y-1 min-w-[120px]">
                        <div className="flex justify-between text-xs">
                          <span>${fmtARS(customer.creditoUtilizado)}</span>
                          <span className="text-muted-foreground">{pct}%</span>
                        </div>
                        <Progress
                          value={pct}
                          className={`h-1.5 ${pct >= 100 ? '[&>div]:bg-red-500' : pct >= 80 ? '[&>div]:bg-orange-500' : ''}`}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`font-bold ${customer.saldoCuentaCorriente > 0 ? 'text-red-600' : customer.saldoCuentaCorriente < 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                        ${fmtARS(Math.abs(customer.saldoCuentaCorriente))}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {balance ? (
                        <div className="flex justify-end">
                          <div className="w-24">
                            <AntiguedadBar
                              dias0={balance.antiguedadDeuda.dias0_30}
                              dias31={balance.antiguedadDeuda.dias31_60}
                              dias61={balance.antiguedadDeuda.dias61_90}
                              dias90={balance.antiguedadDeuda.dias90_mas}
                            />
                          </div>
                        </div>
                      ) : <span className="text-muted-foreground text-xs">-</span>}
                    </TableCell>
                    <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => { setSelectedCustomer(customer); setIsDetailOpen(true) }}
                      >
                        Ver CC
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    No se encontraron clientes.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Wallet className="h-5 w-5" />
              <div>
                <span className="font-bold">{selectedCustomer?.razonSocial}</span>
                <span className="text-sm text-muted-foreground ml-2 font-normal">{selectedCustomer?.cuitCuil}</span>
              </div>
            </DialogTitle>
          </DialogHeader>
          {selectedCustomer && <CustomerCCDetail customer={selectedCustomer} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default CuentaCorrientePage
