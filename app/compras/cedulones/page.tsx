'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FileText, AlertTriangle, CheckCircle, Clock, Eye, ChevronLeft, ChevronRight } from 'lucide-react'
import { useCedulones } from '@/lib/hooks/useCedulones'
import { useTerceros } from '@/lib/hooks/useTerceros'
import type { Cedulon } from '@/lib/types/cedulones'

const estadoBadgeVariant: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  PENDIENTE: 'secondary',
  PAGADO:    'default',
  VENCIDO:   'destructive',
  ANULADO:   'outline',
}

export default function CedulonesPage() {
  const [filterEstado, setFilterEstado] = useState('')
  const [searchText, setSearchText] = useState('')
  const { cedulones, loading, error, page, setPage, totalCount, totalPages } =
    useCedulones({ estado: filterEstado || undefined })
  const { terceros } = useTerceros()
  const [selected, setSelected] = useState<Cedulon | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const getTerceroName = (id: number) =>
    terceros.find(t => t.id === id)?.razonSocial ?? String(id)

  const visible = searchText.trim()
    ? cedulones.filter(c =>
        (c.numero ?? '').toLowerCase().includes(searchText.toLowerCase()) ||
        getTerceroName(c.terceroId).toLowerCase().includes(searchText.toLowerCase())
      )
    : cedulones

  const pendientes = cedulones.filter(c => c.estado === 'PENDIENTE').length
  const pagados    = cedulones.filter(c => c.estado === 'PAGADO').length
  const vencidos   = cedulones.filter(c => c.estado === 'VENCIDO').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cedulones</h1>
        <p className="text-muted-foreground mt-1">Gestión de cédulas de pago a proveedores</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Cedulones registrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendientes}</div>
            <p className="text-xs text-muted-foreground mt-1">Sin pagar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagados</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pagados}</div>
            <p className="text-xs text-muted-foreground mt-1">Cancelados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencidos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vencidos}</div>
            <p className="text-xs text-muted-foreground mt-1">Fecha superada</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex gap-4 flex-wrap">
        <Input
          placeholder="Buscar por número o proveedor..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          className="w-[280px]"
        />
        <Select value={filterEstado || 'todos'} onValueChange={v => { setFilterEstado(v === 'todos' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="PENDIENTE">Pendiente</SelectItem>
            <SelectItem value="PAGADO">Pagado</SelectItem>
            <SelectItem value="VENCIDO">Vencido</SelectItem>
            <SelectItem value="ANULADO">Anulado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabla */}
      <Card>
        <CardHeader>
          <CardTitle>Listado de Cedulones</CardTitle>
          <CardDescription>{totalCount} cedulones en total</CardDescription>
        </CardHeader>
        <CardContent>
          {error && <p className="text-destructive text-sm mb-4">{error}</p>}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Importe</TableHead>
                <TableHead>Saldo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : visible.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No hay cedulones para mostrar
                  </TableCell>
                </TableRow>
              ) : visible.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.numero ?? `#${c.id}`}</TableCell>
                  <TableCell>{getTerceroName(c.terceroId)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.descripcion ?? '-'}</TableCell>
                  <TableCell className="font-semibold">
                    ${c.importe.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="font-semibold">
                    ${c.saldo.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <Badge variant={estadoBadgeVariant[c.estado] ?? 'outline'}>{c.estado}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {c.fechaVencimiento ? new Date(c.fechaVencimiento).toLocaleDateString('es-AR') : '-'}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => { setSelected(c); setIsDetailOpen(true) }}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Página {page} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Cedulón {selected?.numero ?? `#${selected?.id}`}
            </DialogTitle>
            <DialogDescription>
              {selected ? getTerceroName(selected.terceroId) : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 text-sm py-4">
            {[
              ['Número',       selected?.numero ?? '-'],
              ['Estado',       selected?.estado ?? '-'],
              ['Proveedor',    selected ? getTerceroName(selected.terceroId) : '-'],
              ['Descripción',  selected?.descripcion ?? '-'],
              ['Importe',      selected ? `$${selected.importe.toLocaleString('es-AR', { minimumFractionDigits: 2 })}` : '-'],
              ['Saldo',        selected ? `$${selected.saldo.toLocaleString('es-AR', { minimumFractionDigits: 2 })}` : '-'],
              ['Emisión',      selected?.fechaEmision ? new Date(selected.fechaEmision).toLocaleDateString('es-AR') : '-'],
              ['Vencimiento',  selected?.fechaVencimiento ? new Date(selected.fechaVencimiento).toLocaleDateString('es-AR') : '-'],
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
