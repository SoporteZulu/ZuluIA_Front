'use client'

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ScatterChart, Scatter } from 'recharts'
import { cajerosMetricas, cajeros } from '@/lib/thor-data'
import { Star, Clock, TrendingDown } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

const CajerosModule = () => {
  const [selectedCajero, setSelectedCajero] = useState(cajerosMetricas[0])

  const activeCajeros = cajerosMetricas.filter(c => c.cajero.estado === 'activo')
  const sortedByEfficiency = [...activeCajeros].sort((a, b) => a.tiempoPromedioAtension - b.tiempoPromedioAtension)
  const sortedBySatisfaction = [...activeCajeros].sort((a, b) => (b.satisfaccionCliente || 0) - (a.satisfaccionCliente || 0))

  const tiempoPromedio = activeCajeros.reduce((sum, c) => sum + c.tiempoPromedioAtension, 0) / activeCajeros.length
  const clientesTotal = activeCajeros.reduce((sum, c) => sum + c.numeroClientesAtendidos, 0)
  const satisfaccionPromedio = activeCajeros.reduce((sum, c) => sum + (c.satisfaccionCliente || 0), 0) / activeCajeros.length
  const facturaTotal = activeCajeros.reduce((sum, c) => sum + c.totalFacturado, 0)

  // Heatmap: Ocupación de cajas por hora
  const ocupacionData = [
    { hora: '08:00', caja1: 20, caja2: 15, caja3: 25, caja4: 18, caja5: 0 },
    { hora: '10:00', caja1: 45, caja2: 52, caja3: 48, caja4: 42, caja5: 0 },
    { hora: '12:00', caja1: 92, caja2: 95, caja3: 88, caja4: 90, caja5: 0 },
    { hora: '14:00', caja1: 78, caja2: 82, caja3: 75, caja4: 80, caja5: 0 },
    { hora: '16:00', caja1: 65, caja2: 68, caja3: 62, caja4: 70, caja5: 0 },
    { hora: '18:00', caja1: 88, caja2: 85, caja3: 90, caja4: 87, caja5: 0 },
    { hora: '20:00', caja1: 55, caja2: 48, caja3: 52, caja4: 50, caja5: 0 },
  ]

  // Relación tiempo vs satisfacción
  const scatterData = activeCajeros.map(c => ({
    tiempoAtension: c.tiempoPromedioAtension,
    satisfaccion: c.satisfaccionCliente || 0,
    nombre: c.cajero.nombre,
  }))

  const getRankingColor = (idx: number) => {
    if (idx === 0) return 'bg-green-100 text-green-800'
    if (idx === 1) return 'bg-blue-100 text-blue-800'
    if (idx === 2) return 'bg-purple-100 text-purple-800'
    return 'bg-gray-100 text-gray-800'
  }

  const getSatisfactionStars = (satisfaction: number) => {
    return '★'.repeat(Math.round(satisfaction)) + '☆'.repeat(5 - Math.round(satisfaction))
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Ranking de Cajeros - Punto de Venta</h1>
        <p className="text-muted-foreground">Performance, eficiencia y satisfacción del cliente</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tiempo Promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{tiempoPromedio.toFixed(0)}s</div>
            <p className="text-xs text-muted-foreground mt-1">Por cliente</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Clientes Atendidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clientesTotal}</div>
            <p className="text-xs text-muted-foreground mt-1">Total hoy</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Facturación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${(facturaTotal / 1000).toFixed(0)}K</div>
            <p className="text-xs text-muted-foreground mt-1">Acumulado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Satisfacción</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{satisfaccionPromedio.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground mt-1">De 5.0</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cajas Activas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCajeros.length}</div>
            <p className="text-xs text-muted-foreground mt-1">De 5 cajas</p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas */}
      {cajerosMetricas.some(c => c.cajero.estado === 'ausente') && (
        <Alert className="border-orange-200 bg-orange-50">
          <TrendingDown className="h-4 w-4" />
          <AlertDescription>
            Caja 5 ausente. Se recomienda redistribuir carga entre otras cajas o llamar vendedor de refuerzo.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs defaultValue="ranking" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="ranking">Ranking</TabsTrigger>
          <TabsTrigger value="analisis">Análisis Detallado</TabsTrigger>
          <TabsTrigger value="ocupacion">Ocupación de Cajas</TabsTrigger>
          <TabsTrigger value="relaciones">Relaciones</TabsTrigger>
        </TabsList>

        {/* Tab 1: Ranking */}
        <TabsContent value="ranking" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Por Eficiencia */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top por Eficiencia</CardTitle>
                <CardDescription>Menor tiempo de atención</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {sortedByEfficiency.slice(0, 3).map((cm, idx) => (
                  <div 
                    key={cm.cajeroId}
                    onClick={() => setSelectedCajero(cm)}
                    className={`p-3 rounded-lg cursor-pointer hover:shadow-md transition-shadow ${getRankingColor(idx)}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold">#{idx + 1}</span>
                        <div>
                          <p className="font-semibold text-sm">{cm.cajero.nombre} {cm.cajero.apellido}</p>
                          <p className="text-xs opacity-75">Caja {cm.cajero.numCaja}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm">{cm.tiempoPromedioAtension}s</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Por Satisfacción */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top por Satisfacción</CardTitle>
                <CardDescription>Mayor puntuación de clientes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {sortedBySatisfaction.slice(0, 3).map((cm, idx) => (
                  <div 
                    key={cm.cajeroId}
                    onClick={() => setSelectedCajero(cm)}
                    className={`p-3 rounded-lg cursor-pointer hover:shadow-md transition-shadow ${getRankingColor(idx)}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold">#{idx + 1}</span>
                        <div>
                          <p className="font-semibold text-sm">{cm.cajero.nombre} {cm.cajero.apellido}</p>
                          <p className="text-xs opacity-75">Caja {cm.cajero.numCaja}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-yellow-500">{getSatisfactionStars(cm.satisfaccionCliente || 0)}</p>
                        <p className="text-xs opacity-75 font-semibold">{cm.satisfaccionCliente?.toFixed(1)}/5</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Tabla completa */}
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Caja</TableHead>
                      <TableHead>Cajero</TableHead>
                      <TableHead className="text-right">Tiempo Prom.</TableHead>
                      <TableHead className="text-right">Clientes</TableHead>
                      <TableHead className="text-right">Facturado</TableHead>
                      <TableHead className="text-right">Errores</TableHead>
                      <TableHead className="text-right">Satisfacción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeCajeros.map((cm) => (
                      <TableRow 
                        key={cm.cajeroId}
                        onClick={() => setSelectedCajero(cm)}
                        className="cursor-pointer hover:bg-muted/50"
                      >
                        <TableCell>
                          <Badge variant="outline">Caja {cm.cajero.numCaja}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{cm.cajero.nombre} {cm.cajero.apellido}</TableCell>
                        <TableCell className="text-right font-semibold">{cm.tiempoPromedioAtension}s</TableCell>
                        <TableCell className="text-right">{cm.numeroClientesAtendidos}</TableCell>
                        <TableCell className="text-right font-bold">${cm.totalFacturado.toLocaleString('es-AR')}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={cm.tasaErrores < 1 ? 'default' : 'secondary'} className="text-xs">
                            {cm.tasaErrores.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-yellow-500">{getSatisfactionStars(cm.satisfaccionCliente || 0)}</span>
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
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{selectedCajero.cajero.nombre} - Detalle</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <p className="text-xs text-muted-foreground">Tiempo Promedio</p>
                    <p className="text-xl font-bold text-blue-600">{selectedCajero.tiempoPromedioAtension}s</p>
                  </div>
                  <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                    <p className="text-xs text-muted-foreground">Clientes Hoy</p>
                    <p className="text-xl font-bold text-green-600">{selectedCajero.numeroClientesAtendidos}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
                    <p className="text-xs text-muted-foreground">Facturación</p>
                    <p className="text-xl font-bold text-orange-600">${(selectedCajero.totalFacturado / 1000).toFixed(1)}K</p>
                  </div>
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                    <p className="text-xs text-muted-foreground">Tasa de Errores</p>
                    <p className="text-xl font-bold text-red-600">{selectedCajero.tasaErrores.toFixed(1)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Satisfacción del Cliente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-6xl text-yellow-500 mb-2">
                    {getSatisfactionStars(selectedCajero.satisfaccionCliente || 0)}
                  </div>
                  <p className="text-3xl font-bold">{selectedCajero.satisfaccionCliente?.toFixed(1)}</p>
                  <p className="text-sm text-muted-foreground">De 5.0 estrellas</p>
                </div>
                <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                  <p className="text-xs font-semibold text-green-900">
                    {selectedCajero.satisfaccionCliente! >= 4.7 && 'Excelente performance ✓'}
                    {selectedCajero.satisfaccionCliente! >= 4.5 && selectedCajero.satisfaccionCliente! < 4.7 && 'Muy buen desempeño'}
                    {selectedCajero.satisfaccionCliente! < 4.5 && 'Requiere mejora'}
                  </p>
                </div>
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
                <p className="font-mono">{selectedCajero.cajero.email}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Estado:</span>
                <Badge className="ml-2" variant={selectedCajero.cajero.estado === 'activo' ? 'default' : 'secondary'}>
                  {selectedCajero.cajero.estado}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Ocupación de Cajas */}
        <TabsContent value="ocupacion" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ocupación de Cajas por Hora</CardTitle>
              <CardDescription>Intensidad de uso durante el día (%)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={ocupacionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hora" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="caja1" fill="#3b82f6" name="Caja 1" />
                  <Bar dataKey="caja2" fill="#10b981" name="Caja 2" />
                  <Bar dataKey="caja3" fill="#f59e0b" name="Caja 3" />
                  <Bar dataKey="caja4" fill="#8b5cf6" name="Caja 4" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recomendaciones de Distribución</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                <p className="text-sm font-semibold text-yellow-900">Horario 12:00-14:00: Pico máximo</p>
                <p className="text-xs text-yellow-700">Se recomienda activar Caja 5 y personal adicional</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-sm font-semibold text-blue-900">Horario 08:00-10:00: Ocupación baja</p>
                <p className="text-xs text-blue-700">Posibilidad de optimizar personal. Rotación de descansos</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Relaciones */}
        <TabsContent value="relaciones" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tiempo de Atención vs Satisfacción</CardTitle>
              <CardDescription>Análisis de relación entre eficiencia y satisfacción</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart data={scatterData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="tiempoAtension" name="Tiempo (segundos)" />
                  <YAxis dataKey="satisfaccion" name="Satisfacción (0-5)" />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter name="Cajeros" data={scatterData} fill="#3b82f6" />
                </ScatterChart>
              </ResponsiveContainer>
              <p className="text-xs text-muted-foreground mt-4 text-center">
                Observación: Mayor tiempo de atención no siempre correlaciona con menor satisfacción. La calidad prevalece.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default CajerosModule
