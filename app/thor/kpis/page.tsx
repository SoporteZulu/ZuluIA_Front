'use client'

import React, { useState, useMemo } from 'react'
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { historicoVentas, calcularKPIsMensuales } from '@/lib/thor-data'
import { TrendingUp, TrendingDown, Zap } from 'lucide-react'

const KPIsModule = () => {
  const [granularidad, setGranularidad] = useState('mensual')
  const [cambioPrecios, setCambioPrecios] = useState(0)
  const [cambioTrafico, setCambioTrafico] = useState(0)
  const [nuevosProductos, setNuevosProductos] = useState(0)

  const kpis = calcularKPIsMensuales()

  // Datos históricos
  const dataHistorica = historicoVentas.map(h => ({
    fecha: h.fecha.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' }),
    ventas: Math.round(h.ventas),
    transacciones: h.transacciones,
    ticket: Math.round(h.ticketPromedio),
  }))

  // Predicción IA para próximos 6 meses
  const ultimasVentas = historicoVentas.slice(-3).map(h => h.ventas)
  const tendencia = (ultimasVentas[2] - ultimasVentas[0]) / ultimasVentas[0]
  const ventasPromedio = ultimasVentas.reduce((a, b) => a + b) / ultimasVentas.length

  const predicciones = Array.from({ length: 6 }, (_, i) => {
    const ventaBase = ventasPromedio * (1 + tendencia * (i / 6))
    const estacionalidad = Math.sin((new Date().getMonth() + i) * Math.PI / 6) * ventasPromedio * 0.15
    const intervaloConfianza = ventaBase * 0.1
    
    const fecha = new Date()
    fecha.setMonth(fecha.getMonth() + i + 1)
    
    return {
      fecha: fecha.toLocaleDateString('es-AR', { month: 'short' }),
      ventasPredicho: Math.round(ventaBase + estacionalidad),
      intervaloAlto: Math.round(ventaBase + estacionalidad + intervaloConfianza),
      intervaloBajo: Math.round(ventaBase + estacionalidad - intervaloConfianza),
      confianza: 85 - (i * 3),
    }
  })

  // Simulación con cambios
  const ventasSimulada = useMemo(() => {
    const baseVentas = kpis.ventasTotales
    const impactoPrecio = baseVentas * (cambioPrecios / 100) * -0.8 // -80% del cambio de precio
    const impactoTrafico = baseVentas * (cambioTrafico / 100) * 0.9 // 90% del cambio de tráfico
    const impactoProductos = baseVentas * (nuevosProductos / 100) * 0.5 // 50% por cada nuevo producto

    return {
      ventaBase: Math.round(baseVentas),
      ventaSimulada: Math.round(baseVentas + impactoPrecio + impactoTrafico + impactoProductos),
      impactoPrecio: Math.round(impactoPrecio),
      impactoTrafico: Math.round(impactoTrafico),
      impactoProductos: Math.round(impactoProductos),
    }
  }, [cambioPrecios, cambioTrafico, nuevosProductos, kpis.ventasTotales])

  const combatedSimulacionData = [...dataHistorica, ...predicciones]

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">KPIs y Predicciones con IA</h1>
        <p className="text-muted-foreground">Análisis histórico con predicción inteligente y simulaciones</p>
      </div>

      {/* KPIs Principales */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Ventas Totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">${(kpis.ventasTotales / 1000).toFixed(0)}K</div>
            <p className={`text-xs mt-1 flex items-center gap-1 ${kpis.cambioMes > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {kpis.cambioMes > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(kpis.cambioMes).toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Margen Promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-orange-600">{kpis.margenPromedio.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">De margen bruto</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Ticket Promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">${kpis.ticketPromedio.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Por transacción</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Transacciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{kpis.numeroTransacciones}</div>
            <p className="text-xs text-muted-foreground mt-1">En el período</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Rotación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{kpis.rotacionPromedio.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground mt-1">Días promedio</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Predicción IA</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-purple-600">{predicciones[0].confianza}%</div>
            <p className="text-xs text-muted-foreground mt-1">Confianza</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="historico" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="historico">Histórico y Predicción</TabsTrigger>
          <TabsTrigger value="simulacion">Simulaciones</TabsTrigger>
          <TabsTrigger value="estrategia">Estrategias IA</TabsTrigger>
        </TabsList>

        {/* Tab 1: Histórico */}
        <TabsContent value="historico" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-base">Ventas Históricas y Predicción</CardTitle>
                  <CardDescription>Últimos 24 meses + predicción para próximos 6 meses</CardDescription>
                </div>
                <Badge variant="secondary">Confianza: 85%</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={combatedSimulacionData}>
                  <defs>
                    <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="fecha" />
                  <YAxis />
                  <Tooltip formatter={(value) => `$${value.toLocaleString('es-AR')}`} />
                  <Area 
                    type="monotone" 
                    dataKey="ventas" 
                    stroke="#3b82f6" 
                    fillOpacity={1} 
                    fill="url(#colorVentas)"
                    name="Ventas"
                  />
                  <Area
                    type="monotone"
                    dataKey="ventasPredicho"
                    stroke="#a855f7"
                    strokeDasharray="5 5"
                    fill="none"
                    name="Predicción"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Intervalo de Confianza</CardTitle>
              <CardDescription>Rango proyectado con margen de error</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {predicciones.map((pred, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium">{pred.fecha}</span>
                      <span className="text-muted-foreground">Confianza: {pred.confianza}%</span>
                    </div>
                    <div className="h-8 bg-muted rounded relative overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-200 to-purple-400 absolute"
                        style={{
                          left: `${(pred.intervaloBajo / 600000) * 100}%`,
                          right: `${100 - (pred.intervaloAlto / 600000) * 100}%`,
                        }}
                      >
                        <div className="h-full flex items-center justify-center text-xs font-bold text-purple-900">
                          ${(pred.ventasPredicho / 1000).toFixed(0)}K
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>${(pred.intervaloBajo / 1000).toFixed(0)}K</span>
                      <span>${(pred.intervaloAlto / 1000).toFixed(0)}K</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Simulación */}
        <TabsContent value="simulacion" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Simulador de Escenarios</CardTitle>
              <CardDescription>Ajusta variables y ve el impacto proyectado</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Controles de Simulación */}
              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-3">
                  <Label>Cambio de Precios (%)</Label>
                  <Input 
                    type="number" 
                    value={cambioPrecios}
                    onChange={(e) => setCambioPrecios(Number(e.target.value))}
                    placeholder="Ej: 10 para aumentar 10%"
                  />
                  <p className="text-xs text-muted-foreground">
                    Impacto: ${ventasSimulada.impactoPrecio.toLocaleString('es-AR')}
                  </p>
                </div>

                <div className="space-y-3">
                  <Label>Aumento de Tráfico (%)</Label>
                  <Input 
                    type="number" 
                    value={cambioTrafico}
                    onChange={(e) => setCambioTrafico(Number(e.target.value))}
                    placeholder="Ej: 5 para aumentar 5%"
                  />
                  <p className="text-xs text-muted-foreground">
                    Impacto: ${ventasSimulada.impactoTrafico.toLocaleString('es-AR')}
                  </p>
                </div>

                <div className="space-y-3">
                  <Label>Nuevos Productos (%)</Label>
                  <Input 
                    type="number" 
                    value={nuevosProductos}
                    onChange={(e) => setNuevosProductos(Number(e.target.value))}
                    placeholder="Ej: 3 para 3% del catálogo"
                  />
                  <p className="text-xs text-muted-foreground">
                    Impacto: ${ventasSimulada.impactoProductos.toLocaleString('es-AR')}
                  </p>
                </div>
              </div>

              {/* Resultado de Simulación */}
              <div className="grid gap-4 md:grid-cols-3 pt-4 border-t">
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-6">
                    <p className="text-xs text-muted-foreground mb-1">Ventas Base</p>
                    <p className="text-2xl font-bold text-blue-600">
                      ${(ventasSimulada.ventaBase / 1000).toFixed(0)}K
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-purple-50 border-purple-200">
                  <CardContent className="pt-6">
                    <p className="text-xs text-muted-foreground mb-1">Ventas Simulada</p>
                    <p className="text-2xl font-bold text-purple-600">
                      ${(ventasSimulada.ventaSimulada / 1000).toFixed(0)}K
                    </p>
                  </CardContent>
                </Card>

                <Card className={ventasSimulada.ventaSimulada > ventasSimulada.ventaBase ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
                  <CardContent className="pt-6">
                    <p className="text-xs text-muted-foreground mb-1">Impacto Neto</p>
                    <p className={`text-2xl font-bold ${ventasSimulada.ventaSimulada > ventasSimulada.ventaBase ? 'text-green-600' : 'text-red-600'}`}>
                      {ventasSimulada.ventaSimulada > ventasSimulada.ventaBase ? '+' : ''}${((ventasSimulada.ventaSimulada - ventasSimulada.ventaBase) / 1000).toFixed(0)}K
                    </p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Estrategias IA */}
        <TabsContent value="estrategia" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  Estrategia Agresiva
                </CardTitle>
                <CardDescription>Maximizar ingresos (alto riesgo)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                  <p className="text-sm font-semibold mb-2">Recomendaciones:</p>
                  <ul className="text-sm space-y-1 text-foreground">
                    <li>• Aumentar precios 8-12% en productos top margin</li>
                    <li>• Promociones agresivas en productos de baja rotación</li>
                    <li>• Lanzar 5-7 nuevos SKUs con alto margen potencial</li>
                    <li>• Incrementar inversión en marketing 25%</li>
                  </ul>
                </div>
                <div className="text-xs">
                  <p className="text-muted-foreground">Proyección: <span className="font-bold text-green-600">+18-22%</span></p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  Estrategia Balanceada
                </CardTitle>
                <CardDescription>Crecimiento sostenible (riesgo moderado)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                  <p className="text-sm font-semibold mb-2">Recomendaciones:</p>
                  <ul className="text-sm space-y-1 text-foreground">
                    <li>• Ajustes de precio selectivos 3-5%</li>
                    <li>• Optimizar mezcla de productos</li>
                    <li>• Lanzar 2-3 nuevos productos estratégicos</li>
                    <li>• Marketing enfocado en retención</li>
                  </ul>
                </div>
                <div className="text-xs">
                  <p className="text-muted-foreground">Proyección: <span className="font-bold text-green-600">+8-12%</span></p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Factores de Riesgo Detectados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="p-3 rounded-lg bg-orange-50 border border-orange-200 flex gap-2">
                  <TrendingDown className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-orange-900">Stock crítico en 2 productos</p>
                    <p className="text-xs text-orange-700">LACT-001 y PAN-001 requieren reabastecimiento urgente</p>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 flex gap-2">
                  <TrendingDown className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-yellow-900">Estacionalidad en descenso</p>
                    <p className="text-xs text-yellow-700">Proyección de baja estacional en próximas 8 semanas</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default KPIsModule
