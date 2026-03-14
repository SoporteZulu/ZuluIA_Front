'use client'

import React, { useState } from 'react'
import { Medal, TrendingUp, Users, DollarSign, ShoppingCart, Percent } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { useThorVendedores } from '@/lib/hooks/useThor'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const VendedoresModule = () => {
  const { metricas: vendedoresMetricas } = useThorVendedores()
  const [selectedVendedor, setSelectedVendedor] = useState<typeof vendedoresMetricas[0] | undefined>(undefined)
  const [periodFilter, setPeriodFilter] = useState('mes')

  React.useEffect(() => {
    if (vendedoresMetricas.length > 0 && !selectedVendedor) {
      setSelectedVendedor(vendedoresMetricas[0])
    }
  }, [vendedoresMetricas, selectedVendedor])

  const sorted = [...vendedoresMetricas].sort((a, b) => b.totalVendido - a.totalVendido)
  const top3 = sorted.slice(0, 3)
  const medalColors = ['gold', 'silver', '#CD7F32']

  const radarData = [
    {
      metric: 'Ventas',
      vendedor: selectedVendedor ? (selectedVendedor.totalVendido / 189000) * 100 : 0,
      promedio: 66,
    },
    {
      metric: 'Transacciones',
      vendedor: selectedVendedor ? (selectedVendedor.numeroTransacciones / 562) * 100 : 0,
      promedio: 64,
    },
    {
      metric: 'Ticket Promedio',
      vendedor: selectedVendedor ? (selectedVendedor.ticketPromedio / 337) * 100 : 0,
      promedio: 63,
    },
    {
      metric: 'Conversión',
      vendedor: selectedVendedor?.tasaConversion ?? 0,
      promedio: 42,
    },
  ]

  const productosData = (selectedVendedor?.productosTopVendidos ?? []).map(p => ({
    nombre: p.sku,
    monto: p.monto,
  }))

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Ranking de Vendedores</h1>
        <p className="text-muted-foreground">Performance y métricas del equipo de ventas</p>
      </div>

      {/* Podio Visual */}
      <div className="grid gap-4 md:grid-cols-3">
        {top3.map((vm, idx) => (
          <Card 
            key={vm.vendedorId}
            className={idx === 0 ? 'border-yellow-300 shadow-lg' : idx === 1 ? 'border-gray-400 shadow-md' : 'border-orange-300'}
          >
            <CardContent className="pt-6 text-center">
              <div className="mb-4">
                <span className="text-6xl">
                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                </span>
              </div>
              <h3 className="text-lg font-bold">{vm.vendedor.nombre} {vm.vendedor.apellido}</h3>
              <p className="text-2xl font-bold text-green-600 my-2">
                ${vm.totalVendido.toLocaleString('es-AR')}
              </p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>{vm.numeroTransacciones} transacciones</p>
                <p>Ticket: ${vm.ticketPromedio.toFixed(0)}</p>
              </div>
              <Badge className="mt-3" variant={vm.cambioVsPeriodoAnterior > 0 ? 'default' : 'secondary'}>
                {vm.cambioVsPeriodoAnterior > 0 ? '↑' : '↓'} {Math.abs(vm.cambioVsPeriodoAnterior).toFixed(1)}%
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* KPIs Equipo */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ventas Totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${vendedoresMetricas.reduce((sum, vm) => sum + vm.totalVendido, 0).toLocaleString('es-AR')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Promedio por Vendedor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(vendedoresMetricas.reduce((sum, vm) => sum + vm.totalVendido, 0) / vendedoresMetricas.length).toLocaleString('es-AR')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Conversión Promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(vendedoresMetricas.reduce((sum, vm) => sum + vm.tasaConversion, 0) / vendedoresMetricas.length).toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ticket Promedio Equipo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(vendedoresMetricas.reduce((sum, vm) => sum + vm.ticketPromedio, 0) / vendedoresMetricas.length).toFixed(0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="tabla" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tabla">Tabla Completa</TabsTrigger>
          <TabsTrigger value="analisis">Análisis Detallado</TabsTrigger>
          <TabsTrigger value="comparacion">Comparación</TabsTrigger>
        </TabsList>

        {/* Tab 1: Tabla */}
        <TabsContent value="tabla" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Vendedor</TableHead>
                      <TableHead className="text-right">Total Vendido</TableHead>
                      <TableHead className="text-right">Transacciones</TableHead>
                      <TableHead className="text-right">Ticket Promedio</TableHead>
                      <TableHead className="text-right">Conversión</TableHead>
                      <TableHead className="text-right">Cambio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sorted.map((vm, idx) => (
                      <TableRow 
                        key={vm.vendedorId}
                        onClick={() => setSelectedVendedor(vm)}
                        className="cursor-pointer hover:bg-muted/50"
                      >
                        <TableCell>
                          <Badge variant="outline">#{idx + 1}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{vm.vendedor.nombre} {vm.vendedor.apellido}</TableCell>
                        <TableCell className="text-right font-bold text-green-600">
                          ${vm.totalVendido.toLocaleString('es-AR')}
                        </TableCell>
                        <TableCell className="text-right">{vm.numeroTransacciones}</TableCell>
                        <TableCell className="text-right">${vm.ticketPromedio.toFixed(0)}</TableCell>
                        <TableCell className="text-right">{vm.tasaConversion.toFixed(1)}%</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={vm.cambioVsPeriodoAnterior > 0 ? 'default' : 'secondary'} className="text-xs">
                            {vm.cambioVsPeriodoAnterior > 0 ? '↑' : '↓'} {Math.abs(vm.cambioVsPeriodoAnterior).toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Análisis Detallado */}
        <TabsContent value="analisis" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Top 3 Productos - {selectedVendedor?.vendedor.nombre}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={productosData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nombre" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="monto" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Detalle del Período</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(selectedVendedor?.productosTopVendidos ?? []).map((prod, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-muted">
                    <p className="text-xs font-semibold">{prod.nombre}</p>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-muted-foreground">{prod.unidades} unid</span>
                      <span className="text-xs font-bold">${prod.monto.toLocaleString('es-AR')}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Información de Contacto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Email:</span>
                <p className="font-mono">{selectedVendedor?.vendedor.email}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Teléfono:</span>
                <p className="font-mono">{selectedVendedor?.vendedor.telefono}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Estado:</span>
                <Badge className="mt-1" variant={selectedVendedor?.vendedor.estado === 'activo' ? 'default' : 'secondary'}>
                  {selectedVendedor?.vendedor.estado}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Comparación */}
        <TabsContent value="comparacion" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {selectedVendedor?.vendedor.nombre} vs Promedio del Equipo
              </CardTitle>
              <CardDescription>Comparación de métricas clave</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" />
                  <PolarRadiusAxis />
                  <Radar name={selectedVendedor?.vendedor.nombre} dataKey="vendedor" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                  <Radar name="Promedio Equipo" dataKey="promedio" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {sorted.map((vm, idx) => (
              <Card key={vm.vendedorId} onClick={() => setSelectedVendedor(vm)} className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Badge variant="outline">#{idx + 1}</Badge>
                    {vm.vendedor.nombre} {vm.vendedor.apellido}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Vendido</span>
                    <span className="font-bold">${vm.totalVendido.toLocaleString('es-AR')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Conversión</span>
                    <span className="font-bold">{vm.tasaConversion.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ticket Promedio</span>
                    <span className="font-bold">${vm.ticketPromedio.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span>Cambio vs Anterior</span>
                    <Badge variant={vm.cambioVsPeriodoAnterior > 0 ? 'default' : 'secondary'} className="text-xs">
                      {vm.cambioVsPeriodoAnterior > 0 ? '↑' : '↓'} {Math.abs(vm.cambioVsPeriodoAnterior).toFixed(1)}%
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default VendedoresModule
