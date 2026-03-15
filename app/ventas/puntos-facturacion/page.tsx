'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { MapPin, Eye, CheckCircle, XCircle } from 'lucide-react'
import { usePuntosFacturacion, useTiposPuntoFacturacion } from '@/lib/hooks/usePuntosFacturacion'
import { useSucursales } from '@/lib/hooks/useSucursales'
import type { PuntoFacturacion } from '@/lib/types/puntos-facturacion'

export default function PuntosFacturacionPage() {
  const { sucursales } = useSucursales()
  const [sucursalId, setSucursalId] = useState<number | undefined>()
  const { puntos, loading, error } = usePuntosFacturacion(sucursalId)
  const { tipos } = useTiposPuntoFacturacion()
  const [selected, setSelected] = useState<PuntoFacturacion | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const getTipoDescripcion = (id?: number) =>
    id ? (tipos.find(t => t.id === id)?.descripcion ?? String(id)) : '-'

  const activos   = puntos.filter(p => p.activo).length
  const inactivos = puntos.filter(p => !p.activo).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Puntos de Facturación</h1>
        <p className="text-muted-foreground mt-1">Configuración de puntos de venta por sucursal</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{puntos.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Puntos configurados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activos</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activos}</div>
            <p className="text-xs text-muted-foreground mt-1">En uso</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactivos</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inactivos}</div>
            <p className="text-xs text-muted-foreground mt-1">Deshabilitados</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtro por Sucursal */}
      <div className="flex gap-4">
        <Select
          value={sucursalId ? String(sucursalId) : 'todas'}
          onValueChange={v => setSucursalId(v === 'todas' ? undefined : Number(v))}
        >
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Seleccionar sucursal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las sucursales</SelectItem>
            {sucursales.map(s => (
              <SelectItem key={s.id} value={String(s.id)}>{s.descripcion}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabla */}
      <Card>
        <CardHeader>
          <CardTitle>Puntos de Facturación</CardTitle>
          <CardDescription>
            {sucursalId
              ? `${puntos.length} puntos en la sucursal seleccionada`
              : 'Seleccione una sucursal para ver sus puntos de facturación'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && <p className="text-destructive text-sm mb-4">{error}</p>}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : !sucursalId ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Seleccione una sucursal para ver los puntos de facturación
                  </TableCell>
                </TableRow>
              ) : puntos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No hay puntos de facturación para esta sucursal
                  </TableCell>
                </TableRow>
              ) : puntos.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{String(p.numero).padStart(4, '0')}</TableCell>
                  <TableCell>{p.descripcion}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {getTipoDescripcion(p.tipoPuntoFacturacionId)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.activo ? 'default' : 'secondary'}>
                      {p.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => { setSelected(p); setIsDetailOpen(true) }}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Punto {selected ? String(selected.numero).padStart(4, '0') : ''}
            </DialogTitle>
            <DialogDescription>{selected?.descripcion}</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 text-sm py-4">
            {[
              ['Número',     selected ? String(selected.numero).padStart(4, '0') : '-'],
              ['Descripción', selected?.descripcion ?? '-'],
              ['Tipo',       getTipoDescripcion(selected?.tipoPuntoFacturacionId)],
              ['Sucursal ID', String(selected?.sucursalId ?? '-')],
              ['Estado',     selected ? (selected.activo ? 'Activo' : 'Inactivo') : '-'],
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
