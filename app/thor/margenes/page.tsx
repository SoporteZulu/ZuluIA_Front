"use client"

import React from "react"
import { AlertCircle, Download, TrendingDown, TrendingUp } from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useThorMargenes } from "@/lib/hooks/useThor"

function formatCurrency(value: number) {
  return value.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  })
}

export default function MargeneModule() {
  const { productos: thorProducts, loading, error } = useThorMargenes()
  const [sortBy, setSortBy] = React.useState<
    "margenDolar" | "margenPorcentaje" | "ventas" | "rotacion"
  >("margenDolar")
  const [categoryFilter, setCategoryFilter] = React.useState("todos")
  const [searchTerm, setSearchTerm] = React.useState("")

  const categorias = React.useMemo(
    () => ["todos", ...new Set(thorProducts.map((product) => product.categoria))],
    [thorProducts]
  )

  const filteredProducts = React.useMemo(() => {
    const filtered = thorProducts.filter((product) => {
      const matchesCategory = categoryFilter === "todos" || product.categoria === categoryFilter
      const matchesSearch =
        product.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase())

      return matchesCategory && matchesSearch
    })

    return filtered.sort((left, right) => {
      if (sortBy === "margenPorcentaje") return right.margenPorcentaje - left.margenPorcentaje
      if (sortBy === "ventas") return right.ventasUltimos3Meses - left.ventasUltimos3Meses
      if (sortBy === "rotacion") return left.rotacionDias - right.rotacionDias
      return right.margenDolar - left.margenDolar
    })
  }, [categoryFilter, searchTerm, sortBy, thorProducts])

  const topProducts = filteredProducts.slice(0, 10)

  const margenColor = (margin: number) => {
    if (margin > 50) return "bg-green-100 text-green-800"
    if (margin > 30) return "bg-blue-100 text-blue-800"
    return "bg-yellow-100 text-yellow-800"
  }

  const chartData = topProducts.map((product) => ({
    sku: product.sku,
    margen: product.margenPorcentaje,
    margenDolar: product.margenDolar,
    ventasMes: product.ventasUltimos3Meses / 3,
    rotacion: product.rotacionDias,
  }))

  const marginSummary = React.useMemo(() => {
    const averageMargin =
      filteredProducts.reduce((sum, product) => sum + product.margenPorcentaje, 0) /
      Math.max(filteredProducts.length, 1)
    const averageRotation =
      filteredProducts.reduce((sum, product) => sum + product.rotacionDias, 0) /
      Math.max(filteredProducts.length, 1)
    const highMarginCount = filteredProducts.filter(
      (product) => product.margenPorcentaje > 50
    ).length
    const slowRotationCount = filteredProducts.filter((product) => product.rotacionDias > 60).length

    return {
      averageMargin,
      averageRotation,
      highMarginCount,
      slowRotationCount,
      marginTotal: filteredProducts.reduce((sum, product) => sum + product.margenDolar, 0),
    }
  }, [filteredProducts])

  const categoryBreakdown = React.useMemo(() => {
    return categorias
      .filter((category) => category !== "todos")
      .map((category) => {
        const products = filteredProducts.filter((product) => product.categoria === category)
        return {
          category,
          products,
          averageMargin:
            products.reduce((sum, product) => sum + product.margenPorcentaje, 0) /
            Math.max(products.length, 1),
          averageRotation:
            products.reduce((sum, product) => sum + product.rotacionDias, 0) /
            Math.max(products.length, 1),
        }
      })
      .filter((entry) => entry.products.length > 0)
      .sort((left, right) => right.averageMargin - left.averageMargin)
  }, [categorias, filteredProducts])

  const operationalAlerts = React.useMemo(() => {
    return filteredProducts
      .filter((product) => product.margenPorcentaje < 25 || product.rotacionDias > 75)
      .slice(0, 6)
      .map((product) => ({
        sku: product.sku,
        nombre: product.nombre,
        issue:
          product.margenPorcentaje < 25 && product.rotacionDias > 75
            ? "Margen corto y rotación lenta"
            : product.margenPorcentaje < 25
              ? "Margen corto"
              : "Rotación lenta",
        margin: product.margenPorcentaje,
        rotation: product.rotacionDias,
      }))
  }, [filteredProducts])

  const exportToCSV = () => {
    const headers = [
      "Posición",
      "SKU",
      "Producto",
      "Categoría",
      "Costo",
      "Venta",
      "Margen %",
      "Margen $",
      "Ventas 3m",
      "Rotación",
    ]
    const rows = filteredProducts.map((product, index) => [
      index + 1,
      product.sku,
      product.nombre,
      product.categoria,
      product.costoProm,
      product.precioVenta,
      product.margenPorcentaje.toFixed(1),
      product.margenDolar,
      product.ventasUltimos3Meses,
      product.rotacionDias,
    ])

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `margenes-${new Date().toISOString().split("T")[0]}.csv`
    link.click()
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Top 10 Mejores Márgenes</h1>
            <p className="text-muted-foreground">
              Rentabilidad visible por producto, con lectura de rotación y concentración por
              categoría.
            </p>
          </div>
          <Button onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {error && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            El tablero de márgenes no pudo cargar todo el universo. Se muestra sólo el recorte
            disponible.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Margen Promedio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {marginSummary.averageMargin.toFixed(1)}%
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Sobre el universo filtrado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Margen Total ($)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(marginSummary.marginTotal)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Acumulado del recorte activo</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Prod. &gt;50% Margen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{marginSummary.highMarginCount}</div>
            <p className="mt-1 text-xs text-muted-foreground">Alta rentabilidad</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Rotación Promedio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{marginSummary.averageRotation.toFixed(1)}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {marginSummary.slowRotationCount} con rotación lenta
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Ordenar por</Label>
              <Select
                value={sortBy}
                onValueChange={(value) =>
                  setSortBy(value as "margenDolar" | "margenPorcentaje" | "ventas" | "rotacion")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="margenDolar">Margen en pesos</SelectItem>
                  <SelectItem value="margenPorcentaje">Margen porcentual</SelectItem>
                  <SelectItem value="ventas">Ventas últimos 3 meses</SelectItem>
                  <SelectItem value="rotacion">Rotación</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Categoría</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat === "todos" ? "Todas" : cat}
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

      <Tabs defaultValue="tabla" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tabla">Tabla Comparativa</TabsTrigger>
          <TabsTrigger value="graficos">Gráficos</TabsTrigger>
        </TabsList>

        <TabsContent value="tabla" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
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
                    <TableHead className="text-right">Rotación</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProducts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
                        {loading
                          ? "Cargando márgenes..."
                          : "No hay productos para el filtro actual."}
                      </TableCell>
                    </TableRow>
                  )}
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
                      <TableCell className="text-right">
                        {formatCurrency(product.costoProm)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(product.precioVenta)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge className={margenColor(product.margenPorcentaje)}>
                          {product.margenPorcentaje.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        {formatCurrency(product.margenDolar)}
                      </TableCell>
                      <TableCell className="text-right">
                        {(product.ventasUltimos3Meses / 3).toFixed(0)}
                      </TableCell>
                      <TableCell className="text-right">{product.rotacionDias} días</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Señales de Rentabilidad</CardTitle>
              <CardDescription>
                Productos que piden revisión por margen corto o rotación lenta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {operationalAlerts.map((alertItem) => (
                  <div
                    key={alertItem.sku}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{alertItem.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        {alertItem.sku} · {alertItem.issue}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p>Margen {alertItem.margin.toFixed(1)}%</p>
                      <p className="text-muted-foreground">Rotación {alertItem.rotation} días</p>
                    </div>
                  </div>
                ))}
                {operationalAlerts.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No hay alertas relevantes para el filtro actual.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

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
              <CardTitle className="text-base">Margen $ vs Ventas Mensuales y Rotación</CardTitle>
              <CardDescription>
                Rentabilidad absoluta, volumen y velocidad del producto
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="sku" angle={-45} textAnchor="end" height={80} />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="margenDolar" fill="#10b981" name="Margen ($)" />
                  <Bar
                    yAxisId="right"
                    dataKey="ventasMes"
                    fill="#3b82f6"
                    name="Ventas/Mes (unid)"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="rotacion"
                    stroke="#ef4444"
                    name="Rotación (días)"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Análisis por Categoría</CardTitle>
          <CardDescription>Margen promedio y productos destacados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {categoryBreakdown.map((entry) => {
              const trendPositive = entry.averageMargin >= marginSummary.averageMargin
              return (
                <Card key={entry.category} className="bg-muted/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">{entry.category}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs text-muted-foreground">Margen Promedio</span>
                        <span className="text-sm font-semibold text-orange-600">
                          {entry.averageMargin.toFixed(1)}%
                        </span>
                      </div>
                      <Progress value={entry.averageMargin} className="h-2" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {entry.products.length} producto(s) visibles
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Rotación media {entry.averageRotation.toFixed(1)} días</span>
                      {trendPositive ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                    </div>
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
