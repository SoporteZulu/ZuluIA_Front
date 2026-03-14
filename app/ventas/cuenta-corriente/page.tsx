'use client'

import React, { useState, useMemo } from 'react'
import {
  Search, Wallet, AlertTriangle, ArrowUpRight, ArrowDownLeft, Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useDeudores, useMovimientosCuentaCorriente } from '@/lib/hooks/useCuentaCorriente'
import type { Deudor, MovimientoCuentaCorriente } from '@/lib/types/cuenta-corriente'

function fmtARS(n: number) {
  return n.toLocaleString('es-AR', { minimumFractionDigits: 2 })
}

function CCDetailModal({ deudor, onClose }: { deudor: Deudor; onClose: () => void }) {
  const { movimientos, loading } = useMovimientosCuentaCorriente(deudor.terceroId)

  const tipoIcon = (tipo: string) => {
    const t = tipo.toLowerCase()
    if (t.includes('factura') || t.includes('debito')) return <ArrowDownLeft className="h-3.5 w-3.5 text-red-500" />
    return <ArrowUpRight className="h-3.5 w-3.5 text-green-500" />
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg border bg-card space-y-1">
          <p className="text-xs text-muted-foreground">Saldo Actual</p>
          <p className={`text-xl font-bold ${deudor.saldo > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {deudor.monedaSimbolo}${fmtARS(Math.abs(deudor.saldo))}
          </p>
          <p className="text-xs text-muted-foreground">{deudor.saldo > 0 ? 'Deuda del cliente' : 'A favor del cliente'}</p>
        </div>
        <div className="p-3 rounded-lg border bg-card space-y-1">
          <p className="text-xs text-muted-foreground">Moneda</p>
          <p className="text-xl font-bold">{deudor.monedaSimbolo}</p>
          <p className="text-xs text-muted-foreground">Tercero ID: {deudor.terceroId}</p>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold mb-2">Movimientos de Cuenta Corriente</h4>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descripcion</TableHead>
                  <TableHead className="text-right">Debe</TableHead>
                  <TableHead className="text-right">Haber</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movimientos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-sm">
                      Sin movimientos registrados.
                    </TableCell>
                  </TableRow>
                ) : movimientos.map((m: MovimientoCuentaCorriente) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-sm">{new Date(m.fecha).toLocaleDateString('es-AR')}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm">
                        {tipoIcon(m.tipoMovimiento)}
                        <span className="capitalize">{m.tipoMovimiento.replace(/_/g, ' ')}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{m.descripcion}</TableCell>
                    <TableCell className="text-right text-sm">
                      {m.debe > 0 ? <span className="text-red-600 font-medium">{fmtARS(m.debe)}</span> : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {m.haber > 0 ? <span className="text-green-600 font-medium">{fmtARS(m.haber)}</span> : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-sm">
                      <span className={m.saldo > 0 ? 'text-red-600' : 'text-green-600'}>{fmtARS(Math.abs(m.saldo))}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <div className="flex justify-end pt-2">
        <Button variant="outline" onClick={onClose}>Cerrar</Button>
      </div>
    </div>
  )
}

const CuentaCorrientePage = () => {
  const { deudores, loading, error } = useDeudores()
  const [searchTerm, setSearchTerm] = useState('')
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [selectedDeudor, setSelectedDeudor] = useState<Deudor | null>(null)

  const filtered = useMemo(() => deudores.filter(d =>
    d.terceroRazonSocial.toLowerCase().includes(searchTerm.toLowerCase())
  ), [deudores, searchTerm])

  const kpis = useMemo(() => ({
    clientesConDeuda: deudores.filter(d => d.saldo > 0).length,
    totalAcobrar:     deudores.filter(d => d.saldo > 0).reduce((s, d) => s + d.saldo, 0),
    totalAPagar:      deudores.filter(d => d.saldo < 0).reduce((s, d) => s + Math.abs(d.saldo), 0),
    total:            deudores.length,
  }), [deudores])

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
    </div>
  )

  if (error) return (
    <div className="p-6 text-red-600 text-sm">
      Error al cargar cuenta corriente: {error}. Verificá que el backend esté disponible.
    </div>
  )

  return (
    <div className="space-y-6 pb-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cuenta Corriente</h1>
          <p className="text-muted-foreground">Saldos y movimientos por cliente</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Total terceros',     value: kpis.total,            color: 'text-foreground',  icon: <Users className="h-4 w-4" /> },
          { label: 'Clientes con deuda', value: kpis.clientesConDeuda, color: 'text-red-600',     icon: <AlertTriangle className="h-4 w-4" /> },
          { label: 'Total a cobrar',     value: `$${(kpis.totalAcobrar / 1000).toFixed(0)}K`, color: 'text-primary', icon: <Wallet className="h-4 w-4" /> },
          { label: 'Total a pagar',      value: `$${(kpis.totalAPagar / 1000).toFixed(0)}K`,  color: 'text-green-600', icon: <Wallet className="h-4 w-4" /> },
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

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Razon Social</TableHead>
                <TableHead>Moneda</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(d => (
                <TableRow
                  key={`${d.terceroId}-${d.monedaId}`}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => { setSelectedDeudor(d); setIsDetailOpen(true) }}
                >
                  <TableCell>
                    <p className="font-semibold text-sm">{d.terceroRazonSocial}</p>
                    <p className="text-xs text-muted-foreground">ID: {d.terceroId}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">{d.monedaSimbolo}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={`font-bold text-sm ${d.saldo > 0 ? 'text-red-600' : d.saldo < 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {d.saldo > 0 ? '+' : ''}{fmtARS(d.saldo)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {d.saldo > 0
                      ? <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">Deudor</Badge>
                      : d.saldo < 0
                        ? <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">Acreedor</Badge>
                        : <Badge variant="outline" className="text-xs">Saldo cero</Badge>
                    }
                  </TableCell>
                  <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => { setSelectedDeudor(d); setIsDetailOpen(true) }}
                    >
                      Ver CC
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    No se encontraron registros.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Wallet className="h-5 w-5" />
              <span className="font-bold">{selectedDeudor?.terceroRazonSocial}</span>
            </DialogTitle>
          </DialogHeader>
          {selectedDeudor && (
            <CCDetailModal deudor={selectedDeudor} onClose={() => setIsDetailOpen(false)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default CuentaCorrientePage
