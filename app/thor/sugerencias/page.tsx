"use client"

import React from "react"
import { AlertCircle, Filter, RefreshCw, TrendingDown, TrendingUp, Zap } from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
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
import { useThorSugerencias, useThorProductos } from "@/lib/hooks/useThor"

function formatCurrency(value: number) {
  return value.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  })
}

export default function SugerenciasModule() {
  const { sugerencias: aiRecommendations, loading, error, refetch } = useThorSugerencias()
  const { productos: thorProducts } = useThorProductos()
  const [categoryFilter, setCategoryFilter] = React.useState("todos")
  const [periodFilter, setPeriodFilter] = React.useState<"3" | "6" | "12">("3")
  const [searchTerm, setSearchTerm] = React.useState("")

  const categorias = React.useMemo(
    () => ["todos", ...new Set(thorProducts.map((product) => product.categoria))],
    [thorProducts]
  )

  const filteredRecommendations = React.useMemo(() => {
    return aiRecommendations.filter((recommendation) => {
      const matchesCategory =
        categoryFilter === "todos" || recommendation.producto.categoria === categoryFilter
      const matchesSearch =
        recommendation.producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        recommendation.producto.sku.toLowerCase().includes(searchTerm.toLowerCase())

      return matchesCategory && matchesSearch
    })
  }, [aiRecommendations, categoryFilter, searchTerm])

  const getPeriodSales = React.useCallback(
    (period: "3" | "6" | "12", recommendation: (typeof filteredRecommendations)[number]) => {
      if (period === "3") return recommendation.producto.ventasUltimos3Meses
      if (period === "6") return recommendation.producto.ventasUltimos6Meses
      return recommendation.producto.ventasUltimos12Meses
    },
    []
  )

  const prioritizedRecommendations = React.useMemo(
    () =>
      [...filteredRecommendations].sort((left, right) => {
        const leftScore = left.puntuacionConfianza * 0.6 + left.impactoEstimado * 0.4
        const rightScore = right.puntuacionConfianza * 0.6 + right.impactoEstimado * 0.4
        return rightScore - leftScore
      }),
    [filteredRecommendations]
  )

  const recommendationSummary = React.useMemo(() => {
    const totalImpact = prioritizedRecommendations.reduce(
      (sum, item) => sum + item.impactoEstimado,
      0
    )
    const averageConfidence =
      prioritizedRecommendations.reduce((sum, item) => sum + item.puntuacionConfianza, 0) /
      Math.max(prioritizedRecommendations.length, 1)
    const reabastecer = prioritizedRecommendations.filter(
      (item) => item.sugerenciaAccion === "reabastecer"
    ).length
    const promocionar = prioritizedRecommendations.filter(
      (item) => item.sugerenciaAccion === "promocionar"
    ).length

    return {
      totalImpact,
      averageConfidence,
      reabastecer,
      promocionar,
    }
  }, [prioritizedRecommendations])

  const correlationData = prioritizedRecommendations.map((recommendation) => ({
    producto: recommendation.producto.sku,
    confianza: recommendation.puntuacionConfianza,
    impacto: recommendation.impactoEstimado,
    ventas: getPeriodSales(periodFilter, recommendation),
  }))

  const categoryCoverage = React.useMemo(() => {
    return categorias
      .filter((category) => category !== "todos")
      .map((category) => {
        const items = prioritizedRecommendations.filter(
          (recommendation) => recommendation.producto.categoria === category
        )
        const avgConfidence =
          items.reduce((sum, item) => sum + item.puntuacionConfianza, 0) / Math.max(items.length, 1)
        return {
          category,
          items,
          avgConfidence,
        }
      })
      .filter((entry) => entry.items.length > 0)
      .sort((left, right) => right.items.length - left.items.length)
  }, [categorias, prioritizedRecommendations])

  const confidenceColor = (confidence: number) => {
    if (confidence >= 90) return "bg-green-100 text-green-800"
    if (confidence >= 70) return "bg-blue-100 text-blue-800"
    return "bg-yellow-100 text-yellow-800"
  }

  const getTrendIcon = (trend: string) => {
    if (trend === "al_alza") return <TrendingUp className="h-4 w-4 text-green-600" />
    if (trend === "baja") return <TrendingDown className="h-4 w-4 text-red-600" />
    return <Zap className="h-4 w-4 text-amber-600" />
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Sugerencias IA</h1>
            <p className="text-muted-foreground">
              Prioridad comercial y cobertura de surtido sobre el set visible de sugerencias del
              motor analítico.
            </p>
          </div>
          <Button onClick={() => void refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refrescar lectura
          </Button>
        </div>
      </div>

      {error && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            El backend no pudo devolver todas las sugerencias. La pantalla muestra sólo el recorte
            disponible.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Categoría</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category === "todos" ? "Todas las categorías" : category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Período</Label>
              <Select
                value={periodFilter}
                onValueChange={(value) => setPeriodFilter(value as "3" | "6" | "12")}
              >
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
              <Button variant="outline" className="w-full bg-transparent" disabled>
                <Filter className="h-4 w-4 mr-2" />
                Filtros sobre contrato actual
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sugerencias Visibles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{prioritizedRecommendations.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">Luego de filtros operativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Confianza Promedio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {recommendationSummary.averageConfidence.toFixed(1)}%
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Calidad media del ranking</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Reabastecer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {recommendationSummary.reabastecer}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Sugerencias con tensión de surtido</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Impacto Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {recommendationSummary.totalImpact.toFixed(1)}%
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Suma del potencial visible</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="recomendaciones" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="recomendaciones">Recomendaciones</TabsTrigger>
          <TabsTrigger value="analisis">Análisis Detallado</TabsTrigger>
          <TabsTrigger value="correlacion">Correlaciones</TabsTrigger>
        </TabsList>

        <TabsContent value="recomendaciones" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {prioritizedRecommendations.map((rec, idx) => (
              <Card key={rec.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">#{idx + 1}</Badge>
                        <Badge variant="secondary">{rec.sugerenciaAccion}</Badge>
                      </div>
                      <CardTitle className="text-base line-clamp-2">
                        {rec.producto.nombre}
                      </CardTitle>
                      <CardDescription className="text-xs font-mono">
                        {rec.producto.sku}
                      </CardDescription>
                    </div>
                    {getTrendIcon(rec.tendencia)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-muted-foreground">
                        Confianza IA
                      </span>
                      <Badge className={confidenceColor(rec.puntuacionConfianza)}>
                        {rec.puntuacionConfianza}%
                      </Badge>
                    </div>
                    <Progress value={rec.puntuacionConfianza} className="h-2" />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded bg-muted">
                      <span className="text-muted-foreground block">Ventas visibles</span>
                      <p className="font-semibold">
                        {getPeriodSales(periodFilter, rec).toLocaleString("es-AR")}
                      </p>
                    </div>
                    <div className="p-2 rounded bg-muted">
                      <span className="text-muted-foreground block">Rotación</span>
                      <p className="font-semibold">{rec.producto.rotacionDias} días</p>
                    </div>
                  </div>

                  <div className="p-2 rounded bg-blue-50 border border-blue-200">
                    <p className="text-xs text-muted-foreground mb-1 font-semibold">
                      Lectura operativa
                    </p>
                    <p className="text-xs text-foreground">{rec.razon}</p>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t">
                    <div>
                      <span className="text-xs text-muted-foreground">Impacto Est.</span>
                      <p className="text-sm font-semibold text-green-600">
                        +{rec.impactoEstimado}%
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Stock {rec.producto.stock} {rec.producto.unidadMedida}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {prioritizedRecommendations.length === 0 && (
            <Card>
              <CardContent className="pt-12 text-center pb-12">
                <p className="text-muted-foreground">
                  {loading
                    ? "Cargando sugerencias..."
                    : "No hay sugerencias que coincidan con los filtros."}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analisis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Radar de Cobertura por Categoría</CardTitle>
              <CardDescription>
                Concentración de sugerencias y confianza media por familia comercial
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-right">Sugerencias</TableHead>
                    <TableHead className="text-right">Confianza Media</TableHead>
                    <TableHead className="text-right">Reabastecer</TableHead>
                    <TableHead>SKUs Prioritarios</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoryCoverage.map((entry) => (
                    <TableRow key={entry.category}>
                      <TableCell className="font-medium">{entry.category}</TableCell>
                      <TableCell className="text-right">{entry.items.length}</TableCell>
                      <TableCell className="text-right">
                        {entry.avgConfidence.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right">
                        {
                          entry.items.filter((item) => item.sugerenciaAccion === "reabastecer")
                            .length
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {entry.items.slice(0, 4).map((item) => (
                            <Badge key={item.id} variant="outline">
                              {item.producto.sku}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {prioritizedRecommendations.slice(0, 6).map((rec) => (
              <Card key={rec.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{rec.producto.nombre}</CardTitle>
                      <CardDescription className="font-mono text-xs">
                        {rec.producto.sku}
                      </CardDescription>
                    </div>
                    <Badge className={confidenceColor(rec.puntuacionConfianza)}>
                      {rec.puntuacionConfianza}% Confianza
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="rounded-lg bg-muted p-3">
                      <span className="mb-1 block text-xs text-muted-foreground">Categoría</span>
                      <p className="text-sm font-semibold">{rec.producto.categoria}</p>
                    </div>
                    <div className="rounded-lg bg-muted p-3">
                      <span className="mb-1 block text-xs text-muted-foreground">Proveedor</span>
                      <p className="text-sm font-semibold">{rec.producto.proveedor}</p>
                    </div>
                    <div className="rounded-lg bg-muted p-3">
                      <span className="mb-1 block text-xs text-muted-foreground">Margen</span>
                      <p className="text-sm font-semibold text-orange-600">
                        {rec.producto.margenPorcentaje.toFixed(1)}%
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted p-3">
                      <span className="mb-1 block text-xs text-muted-foreground">
                        Precio / costo
                      </span>
                      <p className="text-sm font-semibold">
                        {formatCurrency(rec.producto.precioVenta)} /{" "}
                        {formatCurrency(rec.producto.costoProm)}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                      <span className="mb-1 block text-xs text-muted-foreground">Ventas 3m</span>
                      <p className="font-semibold">
                        {rec.producto.ventasUltimos3Meses.toLocaleString("es-AR")}
                      </p>
                    </div>
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                      <span className="mb-1 block text-xs text-muted-foreground">Ventas 6m</span>
                      <p className="font-semibold">
                        {rec.producto.ventasUltimos6Meses.toLocaleString("es-AR")}
                      </p>
                    </div>
                    <div className="rounded-lg border border-purple-200 bg-purple-50 p-3">
                      <span className="mb-1 block text-xs text-muted-foreground">Ventas 12m</span>
                      <p className="font-semibold">
                        {rec.producto.ventasUltimos12Meses.toLocaleString("es-AR")}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                    <span className="mb-2 block text-xs font-semibold text-muted-foreground">
                      Productos correlacionados
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {rec.correlacionados.length > 0 ? (
                        rec.correlacionados.map((sku) => (
                          <Badge key={sku} variant="outline">
                            {sku}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Sin correlaciones visibles.
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="correlacion" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Impacto, Confianza y Ventas</CardTitle>
              <CardDescription>
                Scoring comercial con el período elegido como base de lectura
              </CardDescription>
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
                  <Bar dataKey="ventas" fill="#f97316" name={`Ventas ${periodFilter}m`} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            {prioritizedRecommendations.map((rec) => (
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
                  <div className="flex items-center gap-2">
                    {getTrendIcon(rec.tendencia)}
                    <Badge variant="secondary" className="text-xs">
                      {rec.tendencia === "al_alza"
                        ? "Tendencia al alza"
                        : rec.tendencia === "baja"
                          ? "Tendencia en baja"
                          : "Tendencia estable"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {rec.producto.stock} {rec.producto.unidadMedida} en stock
                    </span>
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
