"use client"

import { useMemo, useState } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { AlertCircle, Download, TrendingDown, TrendingUp } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useThorKpis, useThorMargenes } from "@/lib/hooks/useThor"
import type { KPI, ThorProduct } from "@/lib/thor-types"

type TimeRange = "6" | "12" | "24"

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value)
}

function formatCompactCurrency(value: number) {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(0)}K`
  return value.toFixed(0)
}

function getKpiVariant(
  tendencia: KPI["tendencia"]
): "default" | "secondary" | "outline" | "destructive" {
  if (tendencia === "al_alza") return "default"
  if (tendencia === "baja") return "destructive"
  return "secondary"
}

function getProductCircuit(producto: ThorProduct) {
  if (producto.stock <= 20 && producto.rotacionDias <= 7) {
    return {
      label: "Reposicion urgente",
      detail: "Stock corto para una rotacion alta.",
      variant: "destructive" as const,
    }
  }

  if (producto.rotacionDias > 20 && producto.margenPorcentaje < 35) {
    return {
      label: "Revisar mezcla",
      detail: "Gira lento y sostiene poco margen.",
      variant: "outline" as const,
    }
  }

  return {
    label: "Estrella",
    detail: "Combina margen y velocidad comercial.",
    variant: "default" as const,
  }
}

function SummaryCard({
  title,
  value,
  description,
}: {
  title: string
  value: string
  description: string
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-xl font-bold">{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

export default function KPIsModule() {
  const [timeRange, setTimeRange] = useState<TimeRange>("12")
  const { kpis: kpisData, historico, loading: loadingKpis, error: errorKpis } = useThorKpis()
  const { productos, loading: loadingProductos, error: errorProductos } = useThorMargenes()

  const loading = loadingKpis || loadingProductos
  const error = errorKpis ?? errorProductos

  const historicoFiltrado = useMemo(() => {
    const take = Number(timeRange)
    return historico.slice(-take)
  }, [historico, timeRange])

  const resumen = useMemo(() => {
    const ultimo = historicoFiltrado[historicoFiltrado.length - 1]
    const anterior = historicoFiltrado[historicoFiltrado.length - 2]
    const promedio6 =
      historico.slice(-6).reduce((acc, item) => acc + item.ventas, 0) /
      Math.max(Math.min(historico.length, 6), 1)
    const margenPromedio = productos.length
      ? productos.reduce((acc, producto) => acc + producto.margenPorcentaje, 0) / productos.length
      : (kpisData.find((kpi) => kpi.nombre.toLowerCase().includes("margen"))?.valor ?? 0)
    const rotacionPromedio = productos.length
      ? productos.reduce((acc, producto) => acc + producto.rotacionDias, 0) / productos.length
      : (kpisData.find((kpi) => kpi.nombre.toLowerCase().includes("rotaci"))?.valor ?? 0)

    return {
      ventasTotales: ultimo?.ventas ?? 0,
      cambioMes: anterior?.ventas ? ((ultimo.ventas - anterior.ventas) / anterior.ventas) * 100 : 0,
      ticketPromedio: ultimo?.ticketPromedio ?? 0,
      transacciones: ultimo?.transacciones ?? 0,
      promedio6,
      margenPromedio,
      rotacionPromedio,
    }
  }, [historico, historicoFiltrado, kpisData, productos])

  const evolucion = useMemo(
    () =>
      historicoFiltrado.map((item) => ({
        fecha: new Date(item.fecha).toLocaleDateString("es-AR", {
          month: "short",
          year: "2-digit",
        }),
        ventas: Math.round(item.ventas),
        transacciones: item.transacciones,
        ticket: Math.round(item.ticketPromedio),
      })),
    [historicoFiltrado]
  )

  const indicadoresBackend = useMemo(
    () =>
      [...kpisData].sort((left, right) => {
        const diffMeta = Number(right.metaProyectada ?? 0) - Number(left.metaProyectada ?? 0)
        if (diffMeta !== 0) return diffMeta
        return right.valor - left.valor
      }),
    [kpisData]
  )

  const productosClave = useMemo(
    () =>
      [...productos]
        .sort((left, right) => right.margenDolar - left.margenDolar)
        .slice(0, 8)
        .map((producto) => ({
          ...producto,
          circuito: getProductCircuit(producto),
        })),
    [productos]
  )

  const categorias = useMemo(() => {
    const map = new Map<
      string,
      { categoria: string; margen: number; ventas: number; stock: number }
    >()

    productos.forEach((producto) => {
      const current = map.get(producto.categoria) ?? {
        categoria: producto.categoria,
        margen: 0,
        ventas: 0,
        stock: 0,
      }

      current.margen += producto.margenDolar
      current.ventas += producto.ventasUltimos3Meses
      current.stock += producto.stock
      map.set(producto.categoria, current)
    })

    return Array.from(map.values())
      .sort((left, right) => right.ventas - left.ventas)
      .slice(0, 6)
  }, [productos])

  const alertas = useMemo(() => {
    const reposicion = productos.filter(
      (producto) => producto.stock <= 20 && producto.rotacionDias <= 7
    )
    const margenDebil = productos.filter(
      (producto) => producto.rotacionDias > 20 && producto.margenPorcentaje < 35
    )
    const ticketDebil =
      resumen.ticketPromedio > 0 &&
      resumen.ticketPromedio < resumen.promedio6 / Math.max(resumen.transacciones, 1)

    const items = [] as Array<{ title: string; detail: string; level: "high" | "medium" | "info" }>

    if (reposicion.length) {
      items.push({
        title: `${reposicion.length} productos piden reposicion`,
        detail: "La rotacion es alta y el stock visible del ranking ya quedo corto.",
        level: "high",
      })
    }

    if (margenDebil.length) {
      items.push({
        title: `${margenDebil.length} productos requieren revision comercial`,
        detail: "Rotan lento y muestran un margen bajo frente al resto del surtido.",
        level: "medium",
      })
    }

    if (ticketDebil) {
      items.push({
        title: "Ticket promedio por debajo del promedio reciente",
        detail: "Conviene revisar mezcla de venta, combos y productos de margen alto.",
        level: "info",
      })
    }

    if (!items.length) {
      items.push({
        title: "Tablero comercial estable",
        detail: "No se detectan alertas inmediatas con los contratos THOR visibles.",
        level: "info",
      })
    }

    return items
  }, [productos, resumen])

  return (
    <div className="space-y-6 pb-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">KPIs comerciales THOR</h1>
          <p className="text-muted-foreground">
            Evolucion de ventas, metas backend y lectura comercial del surtido con datos reales.
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6">Ultimos 6 meses</SelectItem>
              <SelectItem value="12">Ultimos 12 meses</SelectItem>
              <SelectItem value="24">Ultimos 24 meses</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>KPIs THOR</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <SummaryCard
          title="Ventas del mes"
          value={loading ? "..." : formatCurrency(resumen.ventasTotales)}
          description="Facturacion visible en el ultimo periodo del historico."
        />
        <SummaryCard
          title="Cambio mensual"
          value={
            loading ? "..." : `${resumen.cambioMes >= 0 ? "+" : ""}${resumen.cambioMes.toFixed(1)}%`
          }
          description="Comparacion directa contra el mes anterior."
        />
        <SummaryCard
          title="Ticket promedio"
          value={loading ? "..." : formatCurrency(resumen.ticketPromedio)}
          description="Valor promedio por operacion registrada."
        />
        <SummaryCard
          title="Transacciones"
          value={loading ? "..." : resumen.transacciones.toLocaleString("es-AR")}
          description="Cantidad de comprobantes en el ultimo cierre."
        />
        <SummaryCard
          title="Margen promedio"
          value={loading ? "..." : `${resumen.margenPromedio.toFixed(1)}%`}
          description="Promedio del surtido con datos de margenes reales."
        />
        <SummaryCard
          title="Rotacion promedio"
          value={loading ? "..." : `${resumen.rotacionPromedio.toFixed(1)} dias`}
          description="Velocidad media del surtido monitoreado."
        />
      </div>

      <Tabs defaultValue="historico" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="historico">Historico</TabsTrigger>
          <TabsTrigger value="kpis">KPIs backend</TabsTrigger>
          <TabsTrigger value="productos">Productos clave</TabsTrigger>
        </TabsList>

        <TabsContent value="historico" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ventas y transacciones</CardTitle>
                <CardDescription>
                  Evolucion real del historico comercial segun el rango seleccionado.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={evolucion}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="fecha" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip formatter={(value: number) => formatCurrency(Number(value))} />
                    <Legend />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="ventas"
                      fill="#3b82f6"
                      stroke="#3b82f6"
                      name="Ventas"
                    />
                    <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey="transacciones"
                      fill="#10b981"
                      stroke="#10b981"
                      name="Transacciones"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ticket promedio por periodo</CardTitle>
                <CardDescription>
                  Lectura del valor por operacion para detectar compresion o mejora comercial.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={evolucion}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="fecha" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(Number(value))} />
                    <Bar dataKey="ticket" fill="#f59e0b" name="Ticket" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Alertas del tablero</CardTitle>
              <CardDescription>
                Observaciones derivadas del historico y del surtido monitoreado por THOR.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {alertas.map((alerta) => (
                <div
                  key={alerta.title}
                  className="flex items-start gap-3 rounded-lg border bg-muted/30 p-4"
                >
                  {alerta.level === "high" ? (
                    <TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                  ) : (
                    <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  )}
                  <div>
                    <p className="font-medium">{alerta.title}</p>
                    <p className="text-sm text-muted-foreground">{alerta.detail}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kpis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Semaforo de KPIs</CardTitle>
              <CardDescription>
                Lectura directa de indicadores expuestos por backend con sus variaciones y metas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Indicador</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Vs. mes</TableHead>
                    <TableHead className="text-right">Vs. año</TableHead>
                    <TableHead className="text-right">Meta</TableHead>
                    <TableHead>Circuito</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {indicadoresBackend.map((kpi) => (
                    <TableRow key={kpi.nombre}>
                      <TableCell className="font-medium">{kpi.nombre}</TableCell>
                      <TableCell className="text-right">
                        {kpi.valor.toLocaleString("es-AR")} {kpi.unidad}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            kpi.cambioMesAnterior >= 0 ? "text-emerald-600" : "text-red-600"
                          }
                        >
                          {kpi.cambioMesAnterior >= 0 ? "+" : ""}
                          {kpi.cambioMesAnterior.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            kpi.cambioAnoAnterior >= 0 ? "text-emerald-600" : "text-red-600"
                          }
                        >
                          {kpi.cambioAnoAnterior >= 0 ? "+" : ""}
                          {kpi.cambioAnoAnterior.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {kpi.metaProyectada
                          ? `${kpi.metaProyectada.toLocaleString("es-AR")} ${kpi.unidad}`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getKpiVariant(kpi.tendencia)}>
                          {kpi.tendencia === "al_alza"
                            ? "En mejora"
                            : kpi.tendencia === "baja"
                              ? "En baja"
                              : "Estable"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!indicadoresBackend.length && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        Sin indicadores backend disponibles.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="productos" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Radar de productos clave</CardTitle>
                <CardDescription>
                  Productos con mayor aporte de margen y su circuito comercial visible.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead className="text-right">Margen</TableHead>
                      <TableHead className="text-right">Ventas 3m</TableHead>
                      <TableHead>Circuito</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productosClave.map((producto) => (
                      <TableRow key={producto.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{producto.nombre}</div>
                            <div className="text-xs text-muted-foreground">
                              {producto.sku} · {producto.categoria}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{producto.proveedor}</TableCell>
                        <TableCell className="text-right">
                          <div className="font-medium">{formatCurrency(producto.margenDolar)}</div>
                          <div className="text-xs text-muted-foreground">
                            {producto.margenPorcentaje.toFixed(1)}%
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {producto.ventasUltimos3Meses.toLocaleString("es-AR")}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge variant={producto.circuito.variant}>
                              {producto.circuito.label}
                            </Badge>
                            <p className="text-xs text-muted-foreground">
                              {producto.circuito.detail}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!productosClave.length && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          Sin productos THOR disponibles.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Categorias con mayor traccion</CardTitle>
                <CardDescription>
                  Ventas trimestrales visibles frente al margen acumulado por categoria.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={categorias}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="categoria" angle={-35} textAnchor="end" height={84} />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip formatter={(value: number) => formatCompactCurrency(Number(value))} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="ventas" fill="#3b82f6" name="Ventas 3m" />
                    <Bar yAxisId="right" dataKey="margen" fill="#10b981" name="Margen $" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
