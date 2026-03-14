'use client'

import React, { useState, useMemo } from 'react'
import { Plus, TrendingUp, TrendingDown, Zap, Filter, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useThorSugerencias, useThorProductos } from '@/lib/hooks/useThor'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const SugerenciasModule = () => {
  const { sugerencias: aiRecommendations } = useThorSugerencias()
  const { productos: thorProducts } = useThorProductos()
  const [categoryFilter, setcategoryFilter] = useState('todos')
  const [periodFilter, setPeriodFilter] = useState('3')
  const [searchTerm, setSearchTerm] = useState('')

  const categorias = ['todos', ...new Set(thorProducts.map(p => p.categoria))]

  const filteredRecommendations = useMemo(() => {
    return aiRecommendations.filter(rec => {
      const matchesCategory = categoryFilter === 'todos' || rec.producto.categoria === categoryFilter
      const matchesSearch = rec.producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rec.producto.sku.toLowerCase().includes(searchTerm.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [categoryFilter, searchTerm, aiRecommendations])

  const getTrendIcon = (tendencia: string) => {
    return tendencia === 'al_alza' ? 
      <TrendingUp className="h-5 w-5 text-green-600" /> : 
      <TrendingDown className="h-5 w-5 text-red-600" />
  }

  const confidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'bg-green-100 text-green-800'
    if (confidence >= 70) return 'bg-blue-100 text-blue-800'
    return 'bg-yellow-100 text-yellow-800'
  }

  const actionBadgeVariant = {
    reabastecer: 'default',
    promocionar: 'secondary',
    evaluar: 'outline',
  } as const

  const correlationData = filteredRecommendations.map(rec => ({
    producto: rec.producto.sku,
    confianza: rec.puntuacionConfianza,
    impacto: rec.impactoEstimado,
  }))

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Sugerencias IA</h1>
            <p className="text-muted-foreground">Artículos más vendidos recomendados por inteligencia artificial</p>
          </div>
          <Button>
            <RefreshCw className="h-4 w-4 mr-2" />
            Regenerar Análisis
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Categoría</Label>
              <Select value={categoryFilter} onValueChange={setcategoryFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat === 'todos' ? 'Todas las categorías' : cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Período</Label>
              <Select value={periodFilter} onValueChange={setPeriodFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">Últimos 3 meses</SelectItem>
                  <SelectItem value="6">Últimos 6 meses</SelectItem>
                  <SelectItem value="12">Últimos 12 meses</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Búsqueda</Label>
              <Input 
                placeholder="SKU o nombre..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">&nbsp;</Label>
              <Button variant="outline" className="w-full bg-transparent">
                <Filter className="h-4 w-4 mr-2" />
                Más Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="recomendaciones" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="recomendaciones">Recomendaciones</TabsTrigger>
          <TabsTrigger value="analisis">Análisis Detallado</TabsTrigger>
          <TabsTrigger value="correlacion">Correlaciones</TabsTrigger>
        </TabsList>

        {/* Tab 1: Recomendaciones */}
        <TabsContent value="recomendaciones" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredRecommendations.map((rec, idx) => (
              <Card key={rec.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl">🏆</span>
                        <Badge variant="outline">#{idx + 1}</Badge>
                      </div>
                      <CardTitle className="text-base line-clamp-2">{rec.producto.nombre}</CardTitle>
                      <CardDescription className="text-xs font-mono">{rec.producto.sku}</CardDescription>
                    </div>
                    {getTrendIcon(rec.tendencia)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Confianza */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-muted-foreground">Confianza IA</span>
                      <Badge className={confidenceColor(rec.puntuacionConfianza)}>
                        {rec.puntuacionConfianza}%
                      </Badge>
                    </div>
                    <Progress value={rec.puntuacionConfianza} className="h-2" />
                  </div>

                  {/* Métricas */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded bg-muted">
                      <span className="text-muted-foreground block">Ventas (últimos 3m)</span>
                      <p className="font-semibold">{rec.producto.ventasUltimos3Meses.toLocaleString('es-AR')}</p>
                    </div>
                    <div className="p-2 rounded bg-muted">
                      <span className="text-muted-foreground block">Rotación</span>
                      <p className="font-semibold">{rec.producto.rotacionDias} días</p>
                    </div>
                  </div>

                  {/* Razón */}
                  <div className="p-2 rounded bg-blue-50 border border-blue-200">
                    <p className="text-xs text-muted-foreground mb-1 font-semibold">Razón de recomendación</p>
                    <p className="text-xs text-foreground">{rec.razon}</p>
                  </div>

                  {/* Impacto y Acción */}
                  <div className="flex justify-between items-center pt-2 border-t">
                    <div>
                      <span className="text-xs text-muted-foreground">Impacto Est.</span>
                      <p className="text-sm font-semibold text-green-600">+{rec.impactoEstimado}%</p>
                    </div>
                    <Badge variant={actionBadgeVariant[rec.sugerenciaAccion]}>
                      {rec.sugerenciaAccion === 'reabastecer' && 'Reabastecer'}
                      {rec.sugerenciaAccion === 'promocionar' && 'Promocionar'}
                      {rec.sugerenciaAccion === 'evaluar' && 'Evaluar'}
                    </Badge>
                  </div>

                  {/* Botones de acción */}
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" className="flex-1">
                      <Plus className="h-3 w-3 mr-1" />
                      {rec.sugerenciaAccion === 'reabastecer' ? 'Reabastecer' : 'Acción'}
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 bg-transparent">
                      Ver Detalles
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredRecommendations.length === 0 && (
            <Card>
              <CardContent className="pt-12 text-center pb-12">
                <p className="text-muted-foreground">No hay recomendaciones que coincidan con los filtros</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab 2: Análisis Detallado */}
        <TabsContent value="analisis" className="space-y-4">
          <div className="space-y-4">
            {filteredRecommendations.map((rec) => (
              <Card key={rec.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{rec.producto.nombre}</CardTitle>
                      <CardDescription className="font-mono text-xs">{rec.producto.sku}</CardDescription>
                    </div>
                    <Badge className={confidenceColor(rec.puntuacionConfianza)}>
                      {rec.puntuacionConfianza}% Confianza
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 rounded-lg bg-muted">
                      <span className="text-xs text-muted-foreground block mb-1">Categoría</span>
                      <p className="font-semibold text-sm">{rec.producto.categoria}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted">
                      <span className="text-xs text-muted-foreground block mb-1">Proveedor</span>
                      <p className="font-semibold text-sm">{rec.producto.proveedor}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted">
                      <span className="text-xs text-muted-foreground block mb-1">Margen</span>
                      <p className="font-semibold text-sm text-orange-600">{rec.producto.margenPorcentaje.toFixed(1)}%</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted">
                      <span className="text-xs text-muted-foreground block mb-1">Stock Actual</span>
                      <p className="font-semibold text-sm">{rec.producto.stock} {rec.producto.unidadMedida}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                      <span className="text-xs text-muted-foreground block mb-1">Ventas 3m</span>
                      <p className="font-semibold">{rec.producto.ventasUltimos3Meses}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                      <span className="text-xs text-muted-foreground block mb-1">Ventas 6m</span>
                      <p className="font-semibold">{rec.producto.ventasUltimos6Meses}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
                      <span className="text-xs text-muted-foreground block mb-1">Ventas 12m</span>
                      <p className="font-semibold">{rec.producto.ventasUltimos12Meses}</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                    <span className="text-xs font-semibold text-muted-foreground block mb-2">Productos Correlacionados</span>
                    <div className="flex flex-wrap gap-2">
                      {rec.correlacionados.map((sku) => (
                        <Badge key={sku} variant="outline">{sku}</Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab 3: Correlaciones */}
        <TabsContent value="correlacion" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Impacto vs Confianza IA</CardTitle>
              <CardDescription>Visualización de scoring de recomendaciones</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={correlationData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="producto" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="confianza" fill="#3b82f6" name="Confianza (%)" />
                  <Bar dataKey="impacto" fill="#10b981" name="Impacto Estimado (%)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            {filteredRecommendations.map(rec => (
              <Card key={rec.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">{rec.producto.sku}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Confianza</span>
                      <span className="font-semibold">{rec.puntuacionConfianza}%</span>
                    </div>
                    <Progress value={rec.puntuacionConfianza} className="h-2" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Impacto</span>
                      <span className="font-semibold text-green-600">{rec.impactoEstimado}%</span>
                    </div>
                    <Progress value={rec.impactoEstimado} className="h-2" />
                  </div>
                  <div className="flex gap-1">
                    <Badge variant="secondary" className="text-xs">
                      {rec.tendencia === 'al_alza' ? 'Tendencia +' : 'Tendencia -'}
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

export default SugerenciasModule
