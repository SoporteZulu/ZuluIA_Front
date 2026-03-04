'use client'

import React, { useState, useMemo } from 'react'
import { Download, Filter, TrendingUp, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { obtenerTopProductosPorMargen, thorProducts } from '@/lib/thor-data'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LineChart, Line } from 'recharts'

const MargeneModule = () => {
  const [sortBy, setSortBy] = useState('margenDolar')
  const [categoryFilter, setCategoryFilter] = useState('todos')
  const [searchTerm, setSearchTerm] = useState('')

  const topProducts = useMemo(() => {
    let filtered = obtenerTopProductosPorMargen()
    
    if (categoryFilter !== 'todos') {
      filtered = filtered.filter(p => p.categoria === categoryFilter)
    }
    
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    return filtered
  }, [categoryFilter, searchTerm])

  const categorias = ['todos', ...new Set(thorProducts.map(p => p.categoria))]

  const margenColor = (margen: number) => {
    if (margen > 50) return 'bg-green-100 text-green-800'
    if (margen > 30) return 'bg-blue-100 text-blue-800'
    return 'bg-yellow-100 text-yellow-800'
  }

  const chartData = topProducts.slice(0, 10).map(p => ({
    sku: p.sku,
    margen: p.margenPorcentaje,
    margenDolar: p.margenDolar,
    ventasMes: p.ventasUltimos3Meses / 3,
  }))

  const margenPromedio = (topProducts.reduce((sum, p) => sum + p.margenPorcentaje, 0) / topProducts.length)

  const exportToCSV = () => {
    const headers = ['Posición', 'SKU', 'Producto', 'Categoría', 'Costo', 'Venta', 'Margen %', 'Margen $', 'Ventas Mes']
    const rows = topProducts.map((p, idx) => [
      idx + 1,
      p.sku,
      p.nombre,
      p.categoria,
      p.costoProm,
      p.precioVenta,
      p.margenPorcentaje.toFixed(1),
      p.margenDolar,
      (p.ventasUltimos3Meses / 3).toFixed(0),
    ])
    
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `margenes-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Top 10 Mejores Márgenes</h1>
            <p className="text-muted-foreground">Ranking de productos por ganancia y rentabilidad</p>
          </div>
          <Button onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Margen Promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{margenPromedio.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">De los 10 mejores</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Margen Total ($)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${topProducts.reduce((sum, p) => sum + p.margenDolar, 0).toLocaleString('es-AR')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Acumulado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Prod. &gt;50% Margen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{topProducts.filter(p => p.margenPorcentaje > 50).length}</div>
            <p className="text-xs text-muted-foreground mt-1">Alta rentabilidad</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rotación Promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(topProducts.reduce((sum, p) => sum + p.rotacionDias, 0) / topProducts.length).toFixed(1)}</div>
            <p className="text-xs text-muted-foreground mt-1">Días promedio</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Categoría</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat === 'todos' ? 'Todas' : cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label className="text-xs text-muted-foreground">Búsqueda</Label>
              <Input 
                placeholder="SKU o producto..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="tabla" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tabla">Tabla Comparativa</TabsTrigger>
          <TabsTrigger value="graficos">Gráficos</TabsTrigger>
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
                      <TableHead>SKU</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead className="text-right">Costo</TableHead>
                      <TableHead className="text-right">Venta</TableHead>
                      <TableHead className="text-right">Margen %</TableHead>
                      <TableHead className="text-right">Margen $</TableHead>
                      <TableHead className="text-right">Ventas/Mes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topProducts.map((product, idx) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <Badge variant="outline" className="font-bold">
                            {idx + 1}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                        <TableCell className="font-medium">{product.nombre}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{product.categoria}</Badge>
                        </TableCell>
                        <TableCell className="text-right">${product.costoProm}</TableCell>
                        <TableCell className="text-right font-semibold">${product.precioVenta}</TableCell>
                        <TableCell className="text-right">
                          <Badge className={margenColor(product.margenPorcentaje)}>
                            {product.margenPorcentaje.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-green-600">
                          ${product.margenDolar}
                        </TableCell>
                        <TableCell className="text-right">
                          {(product.ventasUltimos3Meses / 3).toFixed(0)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Gráficos */}
        <TabsContent value="graficos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Comparación de Márgenes (%)</CardTitle>
              <CardDescription>Top 10 productos por margen porcentual</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="sku" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                  <Bar dataKey="margen" fill="#f97316" name="Margen %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Margen $ vs Ventas Mensuales</CardTitle>
              <CardDescription>Rentabilidad absoluta vs volumen</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="sku" angle={-45} textAnchor="end" height={80} />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="margenDolar" fill="#10b981" name="Margen ($)" />
                  <Bar yAxisId="right" dataKey="ventasMes" fill="#3b82f6" name="Ventas/Mes (unid)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Desglose por Categoría */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Análisis por Categoría</CardTitle>
          <CardDescription>Margen promedio y productos destacados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {categorias.filter(c => c !== 'todos').map(cat => {
              const catProducts = topProducts.filter(p => p.categoria === cat)
              const avgMargen = catProducts.length > 0 
                ? catProducts.reduce((sum, p) => sum + p.margenPorcentaje, 0) / catProducts.length
                : 0
              
              return (
                <Card key={cat} className="bg-muted/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">{cat}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs text-muted-foreground">Margen Promedio</span>
                        <span className="text-sm font-semibold text-orange-600">{avgMargen.toFixed(1)}%</span>
                      </div>
                      <Progress value={avgMargen} className="h-2" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {catProducts.length} producto(s) en ranking
                    </p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default MargeneModule
