"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Filter, ArrowDownLeft, ArrowUpRight, RefreshCw, ArrowLeftRight } from "lucide-react"
import { Suspense } from "react"
import { useStockMovimientos } from "@/lib/hooks/useStock"

function getTypeBadge(type: string) {
  const t = type.toLowerCase()
  if (t.includes('entrada') || t === 'compra') return (
    <Badge variant="secondary" className="bg-green-500/10 text-green-500">
      <ArrowDownLeft className="mr-1 h-3 w-3" />
      Entrada
    </Badge>
  )
  if (t.includes('salida') || t === 'venta') return (
    <Badge variant="secondary" className="bg-red-500/10 text-red-500">
      <ArrowUpRight className="mr-1 h-3 w-3" />
      Salida
    </Badge>
  )
  if (t.includes('transfer')) return (
    <Badge variant="secondary" className="bg-blue-500/10 text-blue-500">
      <ArrowLeftRight className="mr-1 h-3 w-3" />
      Transferencia
    </Badge>
  )
  return (
    <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500">
      <RefreshCw className="mr-1 h-3 w-3" />
      {type}
    </Badge>
  )
}

function Loading() {
  return null
}

function MovimientosContent() {
  const { movimientos, loading, error } = useStockMovimientos()
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => movimientos.filter(m =>
    String(m.itemId).includes(search) ||
    m.tipoMovimiento.toLowerCase().includes(search.toLowerCase()) ||
    (m.observacion ?? '').toLowerCase().includes(search.toLowerCase())
  ), [movimientos, search])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Movimientos de Stock</h1>
          <p className="text-muted-foreground">
            Historial de entradas, salidas y ajustes de inventario.
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Movimiento
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar movimientos..."
                className="pl-8"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : error ? (
            <p className="text-center py-8 text-red-600 text-sm">{error}</p>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Deposito</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Saldo Result.</TableHead>
                <TableHead>Observacion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Sin movimientos registrados.</TableCell></TableRow>
              ) : filtered.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="text-muted-foreground">{new Date(m.fecha).toLocaleDateString('es-AR')}</TableCell>
                  <TableCell>{getTypeBadge(m.tipoMovimiento)}</TableCell>
                  <TableCell className="font-medium">Item #{m.itemId}</TableCell>
                  <TableCell>Dep. #{m.depositoId}</TableCell>
                  <TableCell className={`text-right font-mono ${m.cantidad >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {m.cantidad >= 0 ? `+${m.cantidad}` : m.cantidad}
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">{m.saldoResultante}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{m.observacion ?? '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function MovimientosPage() {
  return (
    <Suspense fallback={<Loading />}>
      <MovimientosContent />
    </Suspense>
  )
}
