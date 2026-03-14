"use client"

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, ArrowDownLeft, ArrowUpRight } from "lucide-react"
import { Suspense } from "react"
import { usePagos } from '@/lib/hooks/usePagos'
import { useCobros } from '@/lib/hooks/useCobros'
import type { Pago } from '@/lib/types/pagos'
import type { Cobro } from '@/lib/types/cobros'
import Loading from "./loading"

function getEstadoBadge(estado: string) {
  switch (estado?.toUpperCase()) {
    case 'REGISTRADO':  return <Badge variant="default">Registrado</Badge>
    case 'ANULADO':     return <Badge variant="destructive">Anulado</Badge>
    case 'PENDIENTE':   return <Badge variant="secondary">Pendiente</Badge>
    default:            return <Badge variant="outline">{estado}</Badge>
  }
}

function PagosContent() {
  const { pagos,  loading: loadingPagos,  error: errorPagos }  = usePagos()
  const { cobros, loading: loadingCobros, error: errorCobros } = useCobros()
  const [search, setSearch] = useState('')

  const filteredPagos = useMemo(() =>
    pagos.filter(p =>
      p.terceroRazonSocial?.toLowerCase().includes(search.toLowerCase()) ||
      String(p.id).includes(search)
    ), [pagos, search])

  const filteredCobros = useMemo(() =>
    cobros.filter(c =>
      String(c.terceroId).includes(search) ||
      String(c.id).includes(search)
    ), [cobros, search])

  const totalPagar  = pagos.filter(p => p.estado !== 'ANULADO').reduce((s, p) => s + p.total, 0)
  const totalCobrar = cobros.filter(c => c.estado !== 'ANULADO').reduce((s, c) => s + c.total, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pagos y Cobros</h1>
          <p className="text-muted-foreground">Gestiona pagos a proveedores y cobros de clientes.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <ArrowUpRight className="mr-2 h-4 w-4" />
            Nuevo Pago
          </Button>
          <Button>
            <ArrowDownLeft className="mr-2 h-4 w-4" />
            Nuevo Cobro
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Pagado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              ${totalPagar.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">{pagos.filter(p => p.estado !== 'ANULADO').length} pagos registrados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Cobrado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              ${totalCobrar.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">{cobros.filter(c => c.estado !== 'ANULADO').length} cobros registrados</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar transacciones..."
              className="pl-8"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="cobros" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="cobros">Cobros ({cobros.length})</TabsTrigger>
              <TabsTrigger value="pagos">Pagos ({pagos.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="cobros">
              {loadingCobros && <p className="text-center py-6 text-muted-foreground">Cargando cobros...</p>}
              {errorCobros && <p className="text-center py-6 text-destructive">{errorCobros}</p>}
              {!loadingCobros && !errorCobros && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nº</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Moneda</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCobros.map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono text-sm">COB-{String(c.id).padStart(4, '0')}</TableCell>
                        <TableCell className="text-muted-foreground">{new Date(c.fecha).toLocaleDateString('es-AR')}</TableCell>
                        <TableCell className="font-medium">Cliente #{c.terceroId}</TableCell>
                        <TableCell className="text-sm">{c.monedaSimbolo ?? '-'}</TableCell>
                        <TableCell className="text-right font-medium">${c.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell>{getEstadoBadge(c.estado)}</TableCell>
                      </TableRow>
                    ))}
                    {filteredCobros.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No hay cobros registrados.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="pagos">
              {loadingPagos && <p className="text-center py-6 text-muted-foreground">Cargando pagos...</p>}
              {errorPagos && <p className="text-center py-6 text-destructive">{errorPagos}</p>}
              {!loadingPagos && !errorPagos && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nº</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead>Moneda</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPagos.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-sm">PAG-{String(p.id).padStart(4, '0')}</TableCell>
                        <TableCell className="text-muted-foreground">{new Date(p.fecha).toLocaleDateString('es-AR')}</TableCell>
                        <TableCell className="font-medium">{p.terceroRazonSocial ?? `Prov. #${p.terceroId}`}</TableCell>
                        <TableCell className="text-sm">{p.monedaSimbolo}</TableCell>
                        <TableCell className="text-right font-medium">${p.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell>{getEstadoBadge(p.estado)}</TableCell>
                      </TableRow>
                    ))}
                    {filteredPagos.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No hay pagos registrados.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

export default function PagosPage() {
  return (
    <Suspense fallback={<Loading />}>
      <PagosContent />
    </Suspense>
  )
}
