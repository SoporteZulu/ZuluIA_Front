'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Percent, CheckCircle, XCircle, Eye } from 'lucide-react'
import { useRetencionesTipos } from '@/lib/hooks/useRetenciones'
import type { RetencionesTipo } from '@/lib/types/retenciones'

export default function RetencionesPage() {
  const [soloActivos, setSoloActivos] = useState(true)
  const { tipos, loading, error } = useRetencionesTipos(soloActivos)
  const [selected, setSelected] = useState<RetencionesTipo | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const activos   = tipos.filter(t => t.activo).length
  const inactivos = tipos.filter(t => !t.activo).length
  const promedio  = tipos.length > 0
    ? (tipos.reduce((sum, t) => sum + t.porcentaje, 0) / tipos.length).toFixed(2)
    : '0.00'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tipos de Retención</h1>
        <p className="text-muted-foreground mt-1">Configuración de retenciones impositivas</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tipos.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Tipos registrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activos</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activos}</div>
            <p className="text-xs text-muted-foreground mt-1">En vigencia</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">% Promedio</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{promedio}%</div>
            <p className="text-xs text-muted-foreground mt-1">{inactivos} inactivos</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtro */}
      <div className="flex items-center gap-3">
        <Switch
          id="solo-activos"
          checked={soloActivos}
          onCheckedChange={setSoloActivos}
        />
        <Label htmlFor="solo-activos">Solo activos</Label>
      </div>

      {/* Tabla */}
      <Card>
        <CardHeader>
          <CardTitle>Tipos de Retención</CardTitle>
          <CardDescription>{tipos.length} tipos {soloActivos ? 'activos' : 'en total'}</CardDescription>
        </CardHeader>
        <CardContent>
          {error && <p className="text-destructive text-sm mb-4">{error}</p>}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right">Porcentaje</TableHead>
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
              ) : tipos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No hay tipos de retención para mostrar
                  </TableCell>
                </TableRow>
              ) : tipos.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono font-medium">{t.codigo}</TableCell>
                  <TableCell>{t.descripcion}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {t.porcentaje.toLocaleString('es-AR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}%
                  </TableCell>
                  <TableCell>
                    <Badge variant={t.activo ? 'default' : 'secondary'}>
                      {t.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => { setSelected(t); setIsDetailOpen(true) }}>
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
              <Percent className="h-5 w-5" />
              {selected?.descripcion}
            </DialogTitle>
            <DialogDescription>Código: {selected?.codigo}</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 text-sm py-4">
            {[
              ['ID',          String(selected?.id ?? '-')],
              ['Código',      selected?.codigo ?? '-'],
              ['Descripción', selected?.descripcion ?? '-'],
              ['Porcentaje',  selected ? `${selected.porcentaje.toLocaleString('es-AR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}%` : '-'],
              ['Estado',      selected ? (selected.activo ? 'Activo' : 'Inactivo') : '-'],
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
