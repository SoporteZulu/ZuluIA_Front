'use client'

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts'
import { preciosCompetencia, competidores, thorProducts } from '@/lib/thor-data'
import { TrendingUp, TrendingDown, Plus, Upload, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

const CompetenciaModule = () => {
  const [urlInput, setUrlInput] = useState('')
  const [precioManual, setPrecioManual] = useState({ producto: '', competidor: '', precio: '' })
  const [selectedProducto, setSelectedProducto] = useState(thorProducts[0])

  // Análisis de posición de precios
  const preciosAnalizados = useMemo(() => {
    const analisis: Record<string, any> = {}
    
    thorProducts.forEach(prod => {
      const competenciaDelProducto = preciosCompetencia.filter(pc => pc.productoSku === prod.sku)
      
      if (competenciaDelProducto.length > 0) {
        const precios = competenciaDelProducto.map(pc => pc.precioCompetidor)
        const precioPromedio = precios.reduce((a, b) => a + b) / precios.length
        const diferenciaPromedio = ((prod.precioVenta - precioPromedio) / precioPromedio) * 100
        
        analisis[prod.sku] = {
          producto: prod,
          precioNuestro: prod.precioVenta,
          precioPromedio: precioPromedio,
          diferencia: diferenciaPromedio,
          posicion: diferenciaPromedio < -5 ? 'mas_barato' : diferenciaPromedio > 5 ? 'mas_caro' : 'competitivo',
          competencia: competenciaDelProducto,
        }
      }
    })
    
    return Object.values(analisis)
  }, [])

  const productosOportunidad = preciosAnalizados.filter(a => 
    a.posicion === 'mas_caro' && a.producto.margenPorcentaje > 35
  )

  const scatterData = preciosAnalizados.map(a => ({
    precioNuestro: a.precioNuestro,
    precioPromedio: a.precioPromedio,
    margen: a.producto.margenPorcentaje,
    sku: a.producto.sku,
  }))

  const historicoPrecios = [
    { mes: 'Ago 24', nuestro: 85, comp1: 88, comp2: 92, comp3: 90 },
    { mes: 'Sep 24', nuestro: 85, comp1: 87, comp2: 94, comp3: 88 },
    { mes: 'Oct 24', nuestro: 87, comp1: 89, comp2: 95, comp3: 92 },
    { mes: 'Nov 24', nuestro: 89, comp1: 92, comp2: 96, comp3: 94 },
    { mes: 'Dic 24', nuestro: 89, comp1: 91, comp2: 95, comp3: 95 },
    { mes: 'Ene 25', nuestro: 91, comp1: 93, comp2: 97, comp3: 96 },
  ]

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Análisis de Competencia con IA</h1>
        <p className="text-muted-foreground">Comparación de precios y posicionamiento estratégico</p>
      </div>

      {/* Resumen */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Productos Analizados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{preciosAnalizados.length}</div>
            <p className="text-xs text-muted-foreground mt-1">En competencia</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Más Baratos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {preciosAnalizados.filter(a => a.posicion === 'mas_barato').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Ventaja competitiva</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Más Caros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {preciosAnalizados.filter(a => a.posicion === 'mas_caro').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Requiere ajuste</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Oportunidades IA</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{productosOportunidad.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Detectadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="tabla" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tabla">Tabla Comparativa</TabsTrigger>
          <TabsTrigger value="grafico">Gráficos</TabsTrigger>
          <TabsTrigger value="oportunidades">Oportunidades</TabsTrigger>
          <TabsTrigger value="carga">Cargar Datos</TabsTrigger>
        </TabsList>

        {/* Tab 1: Tabla */}
        <TabsContent value="tabla" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Nuestro Precio</TableHead>
                      <TableHead className="text-right">Comp A</TableHead>
                      <TableHead className="text-right">Comp B</TableHead>
                      <TableHead className="text-right">Comp C</TableHead>
                      <TableHead className="text-right">Promedio</TableHead>
                      <TableHead>Posición</TableHead>
                      <TableHead className="text-right">Diferencia %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preciosAnalizados.map((a) => {
                      const competencia = a.competencia
                      return (
                        <TableRow 
                          key={a.producto.sku}
                          onClick={() => setSelectedProducto(a.producto)}
                          className="cursor-pointer hover:bg-muted/50"
                        >
                          <TableCell className="font-medium">{a.producto.nombre}</TableCell>
                          <TableCell className="text-right font-bold">${a.precioNuestro}</TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            ${competencia[0]?.precioCompetidor || '-'}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            ${competencia[1]?.precioCompetidor || '-'}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            ${competencia[2]?.precioCompetidor || '-'}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            ${a.precioPromedio.toFixed(0)}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                a.posicion === 'mas_barato' ? 'default' :
                                a.posicion === 'mas_caro' ? 'secondary' :
                                'outline'
                              }
                            >
                              {a.posicion === 'mas_barato' ? 'Más barato' : 
                               a.posicion === 'mas_caro' ? 'Más caro' : 'Competitivo'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={a.diferencia < 0 ? 'text-green-600' : 'text-red-600'}>
                              {a.diferencia > 0 ? '+' : ''}{a.diferencia.toFixed(1)}%
                            </span>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Gráficos */}
        <TabsContent value="grafico" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Nuestro Precio vs Promedio Competencia</CardTitle>
              <CardDescription>Posicionamiento por producto y margen</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart data={scatterData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="precioNuestro" name="Precio Nuestro" />
                  <YAxis dataKey="precioPromedio" name="Precio Promedio" />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter name="Productos" data={scatterData} fill="#3b82f6" />
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico de Precios - LACT-001</CardTitle>
              <CardDescription>Últimos 6 meses vs competencia</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={historicoPrecios}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="nuestro" stroke="#3b82f6" name="Nosotros" strokeWidth={2} />
                  <Line type="monotone" dataKey="comp1" stroke="#ef4444" name="Competidor A" strokeDasharray="5 5" />
                  <Line type="monotone" dataKey="comp2" stroke="#f59e0b" name="Competidor B" strokeDasharray="5 5" />
                  <Line type="monotone" dataKey="comp3" stroke="#8b5cf6" name="Competidor C" strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Oportunidades */}
        <TabsContent value="oportunidades" className="space-y-4">
          {productosOportunidad.length > 0 ? (
            <div className="space-y-4">
              {productosOportunidad.map((opp) => (
                <Card key={opp.producto.sku} className="border-purple-200 bg-purple-50/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{opp.producto.nombre}</CardTitle>
                        <CardDescription className="font-mono text-xs">{opp.producto.sku}</CardDescription>
                      </div>
                      <Badge className="bg-purple-600">Oportunidad</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-4 gap-3">
                      <div className="p-2 rounded bg-white border border-purple-200">
                        <p className="text-xs text-muted-foreground">Precio Actual</p>
                        <p className="text-lg font-bold">${opp.precioNuestro}</p>
                      </div>
                      <div className="p-2 rounded bg-white border border-purple-200">
                        <p className="text-xs text-muted-foreground">Promedio Competencia</p>
                        <p className="text-lg font-bold">${opp.precioPromedio.toFixed(0)}</p>
                      </div>
                      <div className="p-2 rounded bg-white border border-purple-200">
                        <p className="text-xs text-muted-foreground">Margen Actual</p>
                        <p className="text-lg font-bold text-orange-600">{opp.producto.margenPorcentaje.toFixed(1)}%</p>
                      </div>
                      <div className="p-2 rounded bg-white border border-purple-200">
                        <p className="text-xs text-muted-foreground">Diferencia</p>
                        <p className={`text-lg font-bold ${opp.diferencia < 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {opp.diferencia.toFixed(1)}%
                        </p>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-white border border-purple-200">
                      <p className="text-sm font-semibold mb-2">Recomendación de IA:</p>
                      <p className="text-sm text-foreground">
                        Reducir precio a ${(opp.precioPromedio * 0.95).toFixed(0)} para ganar competitividad sin sacrificar margen.
                        Impacto estimado: +12-15% en volumen de ventas.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-12 text-center pb-12">
                <p className="text-muted-foreground">No hay oportunidades detectadas actualmente</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab 4: Cargar Datos */}
        <TabsContent value="carga" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* URL Scraping */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cargar por URL</CardTitle>
                <CardDescription>Análisis automático de precios de competencia</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-sm">URL del sitio competidor</Label>
                  <Input 
                    placeholder="https://competidor.com"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                  />
                </div>
                <Button className="w-full">
                  <Upload className="h-4 w-4 mr-2" />
                  Analizar URL (Simulado)
                </Button>
                <Alert className="border-blue-200 bg-blue-50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    En versión real, realizaría web scraping de precios automáticamente.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Carga Manual */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Entrada Manual</CardTitle>
                <CardDescription>Carga rápida de datos individuales</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-sm">Producto</Label>
                  <Input placeholder="Nombre del producto" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Competidor</Label>
                  <Input placeholder="Nombre competidor" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Precio</Label>
                  <Input type="number" placeholder="$0.00" />
                </div>
                <Button className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Precio
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Upload Imagen OCR */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Carga de Imágenes (OCR)</CardTitle>
              <CardDescription>La IA extrae precios de fotos de productos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-muted/50 transition-colors cursor-pointer">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-semibold">Arrastra imágenes aquí</p>
                <p className="text-xs text-muted-foreground">o haz clic para seleccionar</p>
              </div>
              <Alert className="border-blue-200 bg-blue-50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  El sistema utilizará OCR para extraer precios, nombres de productos y datos de las imágenes.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Histórico de Cambios */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico de Cambios Detectados</CardTitle>
              <CardDescription>Últimos cambios de precios en competencia</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded-lg bg-red-50 border border-red-200">
                  <div>
                    <p className="text-sm font-semibold">Competidor A - BEBI-001</p>
                    <p className="text-xs text-muted-foreground">Cambio hace 2 días</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">$155 → $158</p>
                    <p className="text-xs text-red-600">↑ +1.9%</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-green-50 border border-green-200">
                  <div>
                    <p className="text-sm font-semibold">Competidor C - PAN-001</p>
                    <p className="text-xs text-muted-foreground">Cambio hace 5 días</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">$92 → $85</p>
                    <p className="text-xs text-green-600">↓ -7.6%</p>
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

export default CompetenciaModule
