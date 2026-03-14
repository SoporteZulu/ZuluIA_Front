'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  Boxes, 
  CheckCircle, 
  Clock,
  AlertCircle,
  Eye,
  Plus
} from 'lucide-react'
import { useDepositos } from '@/lib/hooks/useDepositos'
import { useOrdenesCompra } from '@/lib/hooks/useOrdenesCompra'
import { useComprobantes } from '@/lib/hooks/useComprobantes'
import { useStockResumen } from '@/lib/hooks/useStock'
import { useDefaultSucursalId } from '@/lib/hooks/useSucursales'

export default function AlmacenesPage() {
  const defaultSucursalId = useDefaultSucursalId()
  const { resumen, bajoMinimo, loading } = useStockResumen(defaultSucursalId)
  const { depositos } = useDepositos()
  const { ordenes } = useOrdenesCompra()
  const { comprobantes } = useComprobantes({ esVenta: true })
  const [selectedAlert, setSelectedAlert] = useState(null)

  const kpis = {
    totalItemsConStock: resumen?.totalItemsConStock ?? 0,
    itemsBajoMinimo:    resumen?.itemsBajoMinimo ?? 0,
    itemsSinStock:      resumen?.itemsSinStock ?? 0,
    totalDepositos:     resumen?.totalDepositos ?? depositos.length,
  }

  const getAlertSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critico':
        return 'bg-red-50 border-red-200'
      case 'advertencia':
        return 'bg-orange-50 border-orange-200'
      default:
        return 'bg-blue-50 border-blue-200'
    }
  }

  const getAlertBadgeVariant = (severity: string) => {
    switch (severity) {
      case 'critico':
        return 'destructive'
      case 'advertencia':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  return (
    <div className="space-y-8">
      {/* KPIs Principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Items con Stock</CardTitle>
            <Boxes className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalItemsConStock}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {kpis.totalDepositos} depositos activos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sin Stock</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {kpis.itemsSinStock}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Items agotados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ordenes Activas</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {ordenes.filter(o => o.estadoOc !== 'RECIBIDA').length + comprobantes.filter(c => c.estado === 'BORRADOR').length}
            </div>
            <div className="text-xs text-muted-foreground mt-2 space-y-1">
              <p>Rec: {ordenes.filter(o => o.estadoOc !== 'RECIBIDA').length} | Sal: {comprobantes.filter(c => c.estado === 'BORRADOR').length}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas de Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{kpis.itemsBajoMinimo}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Items bajo minimo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Items Bajo Minimo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{kpis.itemsBajoMinimo}</div>
            <p className="text-xs text-muted-foreground mt-1">Requieren reposicion</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Items Sin Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{kpis.itemsSinStock}</div>
            <p className="text-xs text-muted-foreground mt-1">Agotados actualmente</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Depositos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalDepositos}</div>
            <p className="text-xs text-muted-foreground mt-1">Habilitados en el sistema</p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas Activas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Items Bajo Minimo</CardTitle>
            <CardDescription>Requieren reposicion urgente</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : bajoMinimo.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Sin alertas de stock</p>
              </div>
            ) : bajoMinimo.slice(0, 6).map((item) => (
              <div
                key={`${item.itemId}-${item.depositoId}`}
                className="border-l-4 border-l-orange-500 bg-orange-50 p-3 rounded"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium">{item.descripcion}</p>
                    <p className="text-xs text-muted-foreground">{item.depositoDescripcion} · Cod: {item.codigo}</p>
                  </div>
                  <Badge variant="secondary" className="bg-orange-100 text-orange-800 text-xs whitespace-nowrap">
                    {item.stockActual}/{item.stockMinimo}
                  </Badge>
                </div>
                <div className="mt-1.5">
                  <Progress value={(item.stockActual / item.stockMinimo) * 100} className="h-1.5" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recepciones Abiertas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recepciones Abiertas</CardTitle>
              <CardDescription>Órdenes en proceso</CardDescription>
            </div>
            <Button size="icon" variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Progreso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordenes.filter(o => o.estadoOc !== 'RECIBIDA').slice(0, 3).map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.id}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{order.estadoOc}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">{order.fechaEntregaReq ?? '-'}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button variant="link" className="w-full mt-4">
              Ver todas las recepciones
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Órdenes de Salida Activas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Órdenes de Salida Activas</CardTitle>
            <CardDescription>Preparación y despacho</CardDescription>
          </div>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Orden
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código OS</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Prioridad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Progreso</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comprobantes.filter(c => c.estado === 'BORRADOR').slice(0, 3).map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.nroComprobante ?? '-'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{order.tipoComprobanteDescripcion ?? '-'}</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{order.estado}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">${order.total.toLocaleString('es-AR')}</span>
                  </TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
