"use client"

import React from "react"
import { AlertCircle, TrendingDown, TrendingUp } from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { useThorCompetencia, useThorProductos } from "@/lib/hooks/useThor"

function formatCurrency(value: number) {
  return value.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  })
}

function formatDate(value?: Date | string) {
  return value ? new Date(value).toLocaleDateString("es-AR") : "-"
}

export default function CompetenciaModule() {
  const {
    analisis,
    competidores,
    precios: preciosCompetencia,
    loading,
    error,
  } = useThorCompetencia()
  const { productos: thorProducts } = useThorProductos()
  const [selectedSku, setSelectedSku] = React.useState<string>("")

  const fallbackAnalisis = React.useMemo(() => {
    const bySku = new Map<
      string,
      { producto: (typeof thorProducts)[number]; precios: typeof preciosCompetencia }
    >()

    thorProducts.forEach((producto) => {
      const precios = preciosCompetencia.filter((price) => price.productoSku === producto.sku)
      if (precios.length > 0) {
        bySku.set(producto.sku, { producto, precios })
      }
    })

    return Array.from(bySku.values()).map(({ producto, precios }) => {
      const precioPromedio =
        precios.reduce((sum, item) => sum + Number(item.precioCompetidor ?? 0), 0) /
        Math.max(precios.length, 1)
      const posicionMercado =
        producto.precioVenta < precioPromedio * 0.95
          ? "mas_barato"
          : producto.precioVenta > precioPromedio * 1.05
            ? "mas_caro"
            : "competitivo"

      return {
        productId: producto.id,
        producto,
        preciosCompetencia: precios,
        precioPromedio,
        posicionMercado,
        oportunidadDetectada:
          posicionMercado === "mas_caro" && Number(producto.margenPorcentaje ?? 0) > 35,
        sugerenciaPrecio: posicionMercado === "mas_caro" ? precioPromedio : undefined,
        impactoEstimado:
          posicionMercado === "mas_caro"
            ? "Revisar posicionamiento para sostener competitividad."
            : "Cobertura de precio dentro del rango del mercado visible.",
      }
    })
  }, [thorProducts, preciosCompetencia])

  const competitionData = analisis.length > 0 ? analisis : fallbackAnalisis

  React.useEffect(() => {
    if (!selectedSku && competitionData.length > 0) {
      setSelectedSku(competitionData[0].producto.sku)
    }
  }, [competitionData, selectedSku])

  const selectedAnalysis = React.useMemo(
    () => competitionData.find((item) => item.producto.sku === selectedSku) ?? competitionData[0],
    [competitionData, selectedSku]
  )

  const competitorMap = React.useMemo(
    () => new Map(competidores.map((competidor) => [competidor.id, competidor.nombre])),
    [competidores]
  )

  const productsOpportunity = competitionData.filter((item) => item.oportunidadDetectada)
  const scatterData = competitionData.map((item) => ({
    precioNuestro: Number(item.producto.precioVenta ?? 0),
    precioPromedio: Number(item.precioPromedio ?? 0),
    margen: Number(item.producto.margenPorcentaje ?? 0),
    sku: item.producto.sku,
  }))

  const selectedPriceBars = React.useMemo(() => {
    if (!selectedAnalysis) return []

    return [
      { nombre: "Nosotros", precio: Number(selectedAnalysis.producto.precioVenta ?? 0) },
      ...selectedAnalysis.preciosCompetencia.map((price) => ({
        nombre: competitorMap.get(price.competidorId) ?? "Competidor",
        precio: Number(price.precioCompetidor ?? 0),
      })),
    ]
  }, [selectedAnalysis, competitorMap])

  const latestUpdates = React.useMemo(
    () =>
      [...preciosCompetencia]
        .sort(
          (left, right) =>
            new Date(right.ultimaActualizacion).getTime() -
            new Date(left.ultimaActualizacion).getTime()
        )
        .slice(0, 8),
    [preciosCompetencia]
  )

  return (
    <div className="space-y-6 pb-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Análisis de Competencia con IA</h1>
        <p className="text-muted-foreground">
          Comparación de precios, posicionamiento y capturas visibles de competencia sin
          simulaciones de carga.
        </p>
      </div>

      {error && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Parte del bloque de competencia no pudo cargarse por completo. La lectura usa sólo las
            capturas y análisis visibles del backend actual.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedSku} onValueChange={setSelectedSku}>
          <SelectTrigger className="w-72">
            <SelectValue placeholder="Seleccionar producto" />
          </SelectTrigger>
          <SelectContent>
            {competitionData.map((item) => (
              <SelectItem key={item.producto.sku} value={item.producto.sku}>
                {item.producto.sku} · {item.producto.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Productos Analizados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{competitionData.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">Con captura de competencia visible</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Más Baratos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {competitionData.filter((item) => item.posicionMercado === "mas_barato").length}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Por debajo del promedio visible</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Más Caros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {competitionData.filter((item) => item.posicionMercado === "mas_caro").length}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Quedan por encima del rango visible
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Oportunidades IA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{productsOpportunity.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Productos con margen y ajuste posible
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tabla" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tabla">Tabla Comparativa</TabsTrigger>
          <TabsTrigger value="grafico">Gráficos</TabsTrigger>
          <TabsTrigger value="oportunidades">Oportunidades</TabsTrigger>
          <TabsTrigger value="capturas">Capturas</TabsTrigger>
        </TabsList>

        <TabsContent value="tabla" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Nuestro Precio</TableHead>
                    <TableHead className="text-right">Promedio Mercado</TableHead>
                    <TableHead>Posición</TableHead>
                    <TableHead className="text-right">Margen</TableHead>
                    <TableHead className="text-right">Competidores</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {competitionData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                        {loading
                          ? "Cargando análisis de competencia..."
                          : "No hay capturas visibles para comparar productos."}
                      </TableCell>
                    </TableRow>
                  )}
                  {competitionData.map((item) => (
                    <TableRow
                      key={item.producto.sku}
                      onClick={() => setSelectedSku(item.producto.sku)}
                      className="cursor-pointer hover:bg-muted/50"
                    >
                      <TableCell>
                        <div className="font-medium">{item.producto.nombre}</div>
                        <div className="text-xs text-muted-foreground">{item.producto.sku}</div>
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(Number(item.producto.precioVenta ?? 0))}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Number(item.precioPromedio ?? 0))}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            item.posicionMercado === "mas_barato"
                              ? "secondary"
                              : item.posicionMercado === "mas_caro"
                                ? "outline"
                                : "default"
                          }
                        >
                          {item.posicionMercado === "mas_barato"
                            ? "Más barato"
                            : item.posicionMercado === "mas_caro"
                              ? "Más caro"
                              : "Competitivo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(item.producto.margenPorcentaje ?? 0).toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right">{item.preciosCompetencia.length}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

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
                  <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                  <Scatter name="Productos" data={scatterData} fill="#3b82f6" />
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Comparativo del Producto Seleccionado</CardTitle>
              <CardDescription>
                Nosotros contra cada competidor capturado para{" "}
                {selectedAnalysis?.producto.sku ?? "el SKU activo"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={selectedPriceBars}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="nombre" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="precio" name="Precio" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="oportunidades" className="space-y-4">
          {productsOpportunity.length > 0 ? (
            <div className="space-y-4">
              {productsOpportunity.map((opp) => (
                <Card key={opp.producto.sku} className="border-purple-200 bg-purple-50/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{opp.producto.nombre}</CardTitle>
                        <CardDescription className="font-mono text-xs">
                          {opp.producto.sku}
                        </CardDescription>
                      </div>
                      <Badge className="bg-purple-600">Oportunidad</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-4 gap-3">
                      <div className="p-2 rounded bg-white border border-purple-200">
                        <p className="text-xs text-muted-foreground">Precio Actual</p>
                        <p className="text-lg font-bold">
                          {formatCurrency(Number(opp.producto.precioVenta ?? 0))}
                        </p>
                      </div>
                      <div className="p-2 rounded bg-white border border-purple-200">
                        <p className="text-xs text-muted-foreground">Promedio Competencia</p>
                        <p className="text-lg font-bold">
                          {formatCurrency(Number(opp.precioPromedio ?? 0))}
                        </p>
                      </div>
                      <div className="p-2 rounded bg-white border border-purple-200">
                        <p className="text-xs text-muted-foreground">Margen Actual</p>
                        <p className="text-lg font-bold text-orange-600">
                          {Number(opp.producto.margenPorcentaje ?? 0).toFixed(1)}%
                        </p>
                      </div>
                      <div className="p-2 rounded bg-white border border-purple-200">
                        <p className="text-xs text-muted-foreground">Diferencia</p>
                        <p
                          className={`text-lg font-bold ${opp.posicionMercado === "mas_barato" ? "text-green-600" : "text-red-600"}`}
                        >
                          {(
                            ((Number(opp.producto.precioVenta ?? 0) -
                              Number(opp.precioPromedio ?? 0)) /
                              Math.max(Number(opp.precioPromedio ?? 1), 1)) *
                            100
                          ).toFixed(1)}
                          %
                        </p>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-white border border-purple-200">
                      <p className="text-sm font-semibold mb-2">Recomendación de IA:</p>
                      <p className="text-sm text-foreground">
                        {opp.sugerenciaPrecio
                          ? `Revisar el precio objetivo hacia ${formatCurrency(Number(opp.sugerenciaPrecio))} para acercarse al mercado visible sin perder el margen actual.`
                          : "Mantener seguimiento activo del posicionamiento visible."}{" "}
                        Impacto estimado: {opp.impactoEstimado}
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

        <TabsContent value="capturas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detalle del Producto Seleccionado</CardTitle>
              <CardDescription>
                Precios capturados, fuente y última actualización por competidor
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Competidor</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead>Fuente</TableHead>
                    <TableHead>Última actualización</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(selectedAnalysis?.preciosCompetencia ?? []).map((price) => (
                    <TableRow key={price.id}>
                      <TableCell>{competitorMap.get(price.competidorId) ?? "Competidor"}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Number(price.precioCompetidor ?? 0))}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{price.fuente}</Badge>
                      </TableCell>
                      <TableCell>{formatDate(price.ultimaActualizacion)}</TableCell>
                    </TableRow>
                  ))}
                  {(selectedAnalysis?.preciosCompetencia ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                        No hay capturas visibles para el producto seleccionado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Últimas Capturas del Mercado</CardTitle>
              <CardDescription>
                Actividad reciente registrada en la capa de competencia
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {latestUpdates.map((price) => (
                  <div
                    key={price.id}
                    className={`flex items-center justify-between rounded-lg border p-2 ${Number(price.diferenciaProcentaje ?? 0) > 0 ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}`}
                  >
                    <div>
                      <p className="text-sm font-semibold">
                        {competitorMap.get(price.competidorId) ?? "Competidor"} -{" "}
                        {price.productoSku}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Actualizado {formatDate(price.ultimaActualizacion)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">
                        {formatCurrency(Number(price.precioCompetidor ?? 0))}
                      </p>
                      <p
                        className={`text-xs ${Number(price.diferenciaProcentaje ?? 0) > 0 ? "text-red-600" : "text-green-600"}`}
                      >
                        {Number(price.diferenciaProcentaje ?? 0) > 0 ? (
                          <TrendingUp className="mr-1 inline h-3 w-3" />
                        ) : (
                          <TrendingDown className="mr-1 inline h-3 w-3" />
                        )}
                        {Number(price.diferenciaProcentaje ?? 0).toFixed(1)}% vs nuestro precio
                      </p>
                    </div>
                  </div>
                ))}
                {latestUpdates.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No hay capturas recientes visibles.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default CompetenciaModule
