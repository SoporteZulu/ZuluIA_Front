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
import { warehouses, wmsMetrics, wmsAlerts, receiptOrders, shippingOrders } from '@/lib/wms-data'

export default function AlmacenesPage() {
  const [selectedAlert, setSelectedAlert] = useState(null)

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
            <CardTitle className="text-sm font-medium">Ocupación Almacenes</CardTitle>
            <Boxes className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{wmsMetrics.occupancyPercentage}%</div>
            <Progress value={wmsMetrics.occupancyPercentage} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {warehouses.length} almacenes activos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total Inventario</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(wmsMetrics.totalInventoryValue / 1000000).toFixed(2)}M
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Método: Promedio
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Órdenes Activas</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {wmsMetrics.activeOrders.receptions + 
               wmsMetrics.activeOrders.shipments + 
               wmsMetrics.activeOrders.picking}
            </div>
            <div className="text-xs text-muted-foreground mt-2 space-y-1">
              <p>Rec: {wmsMetrics.activeOrders.receptions} | Sal: {wmsMetrics.activeOrders.shipments} | Pick: {wmsMetrics.activeOrders.picking}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas Críticas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{wmsMetrics.criticalAlerts}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {wmsAlerts.filter(a => !a.resolved).length} sin resolver
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Métricas Secundarias */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Exactitud Inventario</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{wmsMetrics.inventoryAccuracy}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Último conteo: {wmsMetrics.lastCountDate.toLocaleDateString('es-AR')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Lead Time Promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{wmsMetrics.averageLeadTime}h</div>
            <p className="text-xs text-muted-foreground mt-1">
              Tiempo de despacho (7 días)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Rotación Inventario</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{wmsMetrics.inventoryTurnover}x</div>
            <p className="text-xs text-muted-foreground mt-1">
              Mensual
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas Activas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Alertas Activas</CardTitle>
            <CardDescription>Ordenadas por prioridad</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {wmsAlerts.filter(a => !a.resolved).map((alert) => (
              <div
                key={alert.id}
                className={`border-l-4 p-3 rounded cursor-pointer transition-colors ${
                  alert.severity === 'critico'
                    ? 'border-l-red-500 bg-red-50 hover:bg-red-100'
                    : 'border-l-orange-500 bg-orange-50 hover:bg-orange-100'
                }`}
                onClick={() => setSelectedAlert(alert)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 text-orange-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{alert.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{alert.details}</p>
                    </div>
                  </div>
                  <Badge variant={getAlertBadgeVariant(alert.severity)} className="whitespace-nowrap">
                    {alert.severity}
                  </Badge>
                </div>
              </div>
            ))}
            {wmsAlerts.filter(a => !a.resolved).length === 0 && (
              <div className="text-center py-6">
                <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Sin alertas activas</p>
              </div>
            )}
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
                {receiptOrders.filter(o => o.status !== 'completada').slice(0, 3).map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.code}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{order.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={(order.receivedItems / order.totalItems) * 100} 
                          className="w-16" 
                        />
                        <span className="text-xs text-muted-foreground">
                          {order.receivedItems}/{order.totalItems}
                        </span>
                      </div>
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
              {shippingOrders.slice(0, 3).map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.code}</TableCell>
                  <TableCell>{order.client}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{order.destination}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={order.priority === 'urgente' ? 'destructive' : 'outline'}
                    >
                      {order.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{order.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={(order.pickedItems / order.totalItems) * 100} 
                        className="w-16" 
                      />
                      <span className="text-xs text-muted-foreground">
                        {order.pickedItems}/{order.totalItems}
                      </span>
                    </div>
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
