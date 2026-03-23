"use client"

import React from "react"
import {
  AlertCircle,
  DollarSign,
  Medal,
  Percent,
  ShoppingCart,
  TrendingUp,
  Users,
} from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
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
import { useThorVendedores } from "@/lib/hooks/useThor"

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

function formatPeriod(value?: Date | string) {
  if (!value) return "Sin período"
  return new Date(value).toLocaleDateString("es-AR", { month: "long", year: "numeric" })
}

const podiumLabels = ["1° puesto", "2° puesto", "3° puesto"]

export default function VendedoresModule() {
  const { metricas: vendedoresMetricas, loading, error } = useThorVendedores()
  const [selectedVendedorId, setSelectedVendedorId] = React.useState<string>("")
  const [selectedPeriod, setSelectedPeriod] = React.useState<string>("")

  const periodOptions = React.useMemo(() => {
    const uniquePeriods = Array.from(
      new Set(vendedoresMetricas.map((metrica) => new Date(metrica.periodo).toISOString()))
    ).sort((left, right) => new Date(right).getTime() - new Date(left).getTime())

    return uniquePeriods.map((period) => ({ value: period, label: formatPeriod(period) }))
  }, [vendedoresMetricas])

  React.useEffect(() => {
    if (!selectedPeriod && periodOptions.length > 0) {
      setSelectedPeriod(periodOptions[0].value)
    }
  }, [periodOptions, selectedPeriod])

  const metricsForPeriod = React.useMemo(() => {
    if (!selectedPeriod) return vendedoresMetricas
    return vendedoresMetricas.filter(
      (metrica) => new Date(metrica.periodo).toISOString() === selectedPeriod
    )
  }, [vendedoresMetricas, selectedPeriod])

  const sorted = React.useMemo(
    () =>
      [...metricsForPeriod].sort(
        (left, right) => Number(right.totalVendido) - Number(left.totalVendido)
      ),
    [metricsForPeriod]
  )

  React.useEffect(() => {
    if (sorted.length === 0) {
      setSelectedVendedorId("")
      return
    }

    if (!selectedVendedorId || !sorted.some((item) => item.vendedorId === selectedVendedorId)) {
      setSelectedVendedorId(sorted[0].vendedorId)
    }
  }, [sorted, selectedVendedorId])

  const selectedVendedor = React.useMemo(
    () => sorted.find((item) => item.vendedorId === selectedVendedorId) ?? sorted[0],
    [sorted, selectedVendedorId]
  )

  const teamTotals = React.useMemo(() => {
    const totalVentas = sorted.reduce((sum, item) => sum + Number(item.totalVendido ?? 0), 0)
    const totalTransacciones = sorted.reduce(
      (sum, item) => sum + Number(item.numeroTransacciones ?? 0),
      0
    )
    const avgConversion = sorted.length
      ? sorted.reduce((sum, item) => sum + Number(item.tasaConversion ?? 0), 0) / sorted.length
      : 0
    const avgTicket = sorted.length
      ? sorted.reduce((sum, item) => sum + Number(item.ticketPromedio ?? 0), 0) / sorted.length
      : 0

    return { totalVentas, totalTransacciones, avgConversion, avgTicket }
  }, [sorted])

  const radarData = React.useMemo(() => {
    if (!selectedVendedor || sorted.length === 0) return []

    const maxSales = Math.max(...sorted.map((item) => Number(item.totalVendido ?? 0)), 1)
    const maxTransactions = Math.max(
      ...sorted.map((item) => Number(item.numeroTransacciones ?? 0)),
      1
    )
    const maxTicket = Math.max(...sorted.map((item) => Number(item.ticketPromedio ?? 0)), 1)
    const maxConversion = Math.max(...sorted.map((item) => Number(item.tasaConversion ?? 0)), 1)

    return [
      {
        metric: "Ventas",
        vendedor: (Number(selectedVendedor.totalVendido ?? 0) / maxSales) * 100,
        promedio: (teamTotals.totalVentas / Math.max(sorted.length, 1) / maxSales) * 100,
      },
      {
        metric: "Transacciones",
        vendedor: (Number(selectedVendedor.numeroTransacciones ?? 0) / maxTransactions) * 100,
        promedio:
          (teamTotals.totalTransacciones / Math.max(sorted.length, 1) / maxTransactions) * 100,
      },
      {
        metric: "Ticket",
        vendedor: (Number(selectedVendedor.ticketPromedio ?? 0) / maxTicket) * 100,
        promedio: (teamTotals.avgTicket / maxTicket) * 100,
      },
      {
        metric: "Conversión",
        vendedor: (Number(selectedVendedor.tasaConversion ?? 0) / maxConversion) * 100,
        promedio: (teamTotals.avgConversion / maxConversion) * 100,
      },
    ]
  }, [selectedVendedor, sorted, teamTotals])

  const productsData = React.useMemo(
    () =>
      (selectedVendedor?.productosTopVendidos ?? []).map((product) => ({
        nombre: product.sku,
        monto: Number(product.monto ?? 0),
        unidades: Number(product.unidades ?? 0),
      })),
    [selectedVendedor]
  )

  const performanceAlerts = React.useMemo(() => {
    return sorted
      .map((item) => ({
        vendedor: `${item.vendedor.nombre} ${item.vendedor.apellido}`,
        estado:
          Number(item.tasaConversion ?? 0) < teamTotals.avgConversion
            ? "Conversión baja"
            : Number(item.cambioVsPeriodoAnterior ?? 0) < 0
              ? "Caída vs período anterior"
              : "Ritmo sostenido",
        detalle:
          Number(item.tasaConversion ?? 0) < teamTotals.avgConversion
            ? `${Number(item.tasaConversion ?? 0).toFixed(1)}% vs ${teamTotals.avgConversion.toFixed(1)}% del equipo.`
            : Number(item.cambioVsPeriodoAnterior ?? 0) < 0
              ? `${Math.abs(Number(item.cambioVsPeriodoAnterior ?? 0)).toFixed(1)}% de retroceso respecto del período anterior.`
              : `${Number(item.numeroTransacciones ?? 0)} transacciones con variación positiva o estable.`,
      }))
      .slice(0, 4)
  }, [sorted, teamTotals.avgConversion])

  const top3 = sorted.slice(0, 3)

  return (
    <div className="space-y-6 pb-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Ranking de Vendedores</h1>
        <p className="text-muted-foreground">
          Consola comercial con ranking, benchmark del equipo y lectura operativa del período
          visible.
        </p>
      </div>

      {error && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Parte de las métricas de vendedores no pudo cargarse por completo. El ranking visible se
            limita a los datos que respondió el backend.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Seleccionar período" />
          </SelectTrigger>
          <SelectContent>
            {periodOptions.map((period) => (
              <SelectItem key={period.value} value={period.value}>
                {period.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedVendedorId} onValueChange={setSelectedVendedorId}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Seleccionar vendedor" />
          </SelectTrigger>
          <SelectContent>
            {sorted.map((item) => (
              <SelectItem key={item.vendedorId} value={item.vendedorId}>
                {item.vendedor.nombre} {item.vendedor.apellido}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ventas Totales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(teamTotals.totalVentas)}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Equipo visible en{" "}
              {periodOptions.find((period) => period.value === selectedPeriod)?.label ??
                "el período actual"}
              .
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Promedio por Vendedor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(sorted.length ? teamTotals.totalVentas / sorted.length : 0)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Base calculada sobre {sorted.length} vendedores con métrica visible.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Conversión Promedio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamTotals.avgConversion.toFixed(1)}%</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Sirve como benchmark real para comparar al vendedor seleccionado.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ticket Promedio Equipo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(teamTotals.avgTicket)}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Con {teamTotals.totalTransacciones} transacciones visibles.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {top3.map((metric, index) => (
          <Card
            key={metric.vendedorId}
            className={
              index === 0
                ? "border-primary/50 shadow-md"
                : index === 1
                  ? "border-muted-foreground/40"
                  : "border-orange-300/50"
            }
          >
            <CardContent className="pt-6 text-center">
              <div className="mb-3 flex items-center justify-center gap-2">
                <Medal
                  className={`h-6 w-6 ${index === 0 ? "text-yellow-500" : index === 1 ? "text-slate-400" : "text-orange-500"}`}
                />
                <span className="text-sm font-medium text-muted-foreground">
                  {podiumLabels[index]}
                </span>
              </div>
              <h3 className="text-lg font-bold">
                {metric.vendedor.nombre} {metric.vendedor.apellido}
              </h3>
              <p className="my-2 text-2xl font-bold text-green-600">
                {formatCurrency(Number(metric.totalVendido ?? 0))}
              </p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>{metric.numeroTransacciones} transacciones</p>
                <p>Ticket: {formatCurrency(Number(metric.ticketPromedio ?? 0))}</p>
                <p>Conversión: {Number(metric.tasaConversion ?? 0).toFixed(1)}%</p>
              </div>
              <Badge
                className="mt-3"
                variant={Number(metric.cambioVsPeriodoAnterior ?? 0) >= 0 ? "secondary" : "outline"}
              >
                {Number(metric.cambioVsPeriodoAnterior ?? 0) >= 0 ? "Sube" : "Baja"}{" "}
                {Math.abs(Number(metric.cambioVsPeriodoAnterior ?? 0)).toFixed(1)}%
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Radar del Vendedor</CardTitle>
            <CardDescription>
              {selectedVendedor
                ? `${selectedVendedor.vendedor.nombre} ${selectedVendedor.vendedor.apellido} vs promedio del equipo`
                : "Seleccioná un vendedor para comparar."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" />
                <PolarRadiusAxis tick={false} axisLine={false} />
                <Radar
                  name={selectedVendedor?.vendedor.nombre ?? "Vendedor"}
                  dataKey="vendedor"
                  stroke="#2563eb"
                  fill="#2563eb"
                  fillOpacity={0.35}
                />
                <Radar
                  name="Promedio equipo"
                  dataKey="promedio"
                  stroke="#f97316"
                  fill="#f97316"
                  fillOpacity={0.2}
                />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Señales del Equipo</CardTitle>
            <CardDescription>
              Lectura rápida de vendedores que exigen seguimiento comercial
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {performanceAlerts.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {loading ? "Cargando señales..." : "No hay alertas visibles para el equipo."}
              </p>
            )}
            {performanceAlerts.map((alert) => (
              <div key={alert.vendedor} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium">{alert.vendedor}</p>
                  <Badge variant={alert.estado === "Ritmo sostenido" ? "secondary" : "outline"}>
                    {alert.estado}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{alert.detalle}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tabla" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tabla">Tabla Completa</TabsTrigger>
          <TabsTrigger value="analisis">Análisis Detallado</TabsTrigger>
          <TabsTrigger value="comparacion">Comparación</TabsTrigger>
        </TabsList>

        <TabsContent value="tabla" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
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
                  {sorted.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                        {loading
                          ? "Cargando ranking de vendedores..."
                          : "No hay métricas visibles para el período seleccionado."}
                      </TableCell>
                    </TableRow>
                  )}
                  {sorted.map((metric, index) => (
                    <TableRow
                      key={`${metric.vendedorId}-${new Date(metric.periodo).toISOString()}`}
                      onClick={() => setSelectedVendedorId(metric.vendedorId)}
                      className="cursor-pointer hover:bg-muted/50"
                    >
                      <TableCell>
                        <Badge variant="outline">#{index + 1}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {metric.vendedor.nombre} {metric.vendedor.apellido}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Alta {formatDate(metric.vendedor.fechaAlta)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold text-green-600">
                        {formatCurrency(Number(metric.totalVendido ?? 0))}
                      </TableCell>
                      <TableCell className="text-right">{metric.numeroTransacciones}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Number(metric.ticketPromedio ?? 0))}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={
                            Number(metric.tasaConversion ?? 0) >= teamTotals.avgConversion
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {Number(metric.tasaConversion ?? 0).toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={
                            Number(metric.cambioVsPeriodoAnterior ?? 0) >= 0
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {Number(metric.cambioVsPeriodoAnterior ?? 0) >= 0 ? "↑" : "↓"}{" "}
                          {Math.abs(Number(metric.cambioVsPeriodoAnterior ?? 0)).toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analisis" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Top Productos del Vendedor</CardTitle>
                <CardDescription>
                  {selectedVendedor
                    ? `${selectedVendedor.vendedor.nombre} ${selectedVendedor.vendedor.apellido} • ${formatPeriod(selectedVendedor.periodo)}`
                    : "Sin vendedor seleccionado"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={productsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nombre" />
                    <YAxis tickFormatter={(value) => Number(value).toLocaleString("es-AR")} />
                    <Tooltip formatter={(value: number) => formatCurrency(Number(value))} />
                    <Legend />
                    <Bar dataKey="monto" name="Monto" fill="#2563eb" />
                    <Bar dataKey="unidades" name="Unidades" fill="#22c55e" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ficha Comercial</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Email</span>
                  <p className="font-mono">{selectedVendedor?.vendedor.email ?? "-"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Teléfono</span>
                  <p className="font-mono">{selectedVendedor?.vendedor.telefono ?? "-"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Estado</span>
                  <div className="mt-1">
                    <Badge
                      variant={
                        selectedVendedor?.vendedor.estado === "activo" ? "secondary" : "outline"
                      }
                    >
                      {selectedVendedor?.vendedor.estado ?? "Sin dato"}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Cambio período anterior</span>
                  <p className="font-medium">
                    {selectedVendedor
                      ? `${Number(selectedVendedor.cambioVsPeriodoAnterior ?? 0).toFixed(1)}%`
                      : "-"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detalle de Productos Top</CardTitle>
              <CardDescription>Mix comercial del vendedor seleccionado</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {(selectedVendedor?.productosTopVendidos ?? []).map((product) => (
                <div
                  key={`${selectedVendedor?.vendedorId}-${product.sku}`}
                  className="rounded-lg border p-3"
                >
                  <p className="font-medium">{product.nombre}</p>
                  <p className="text-xs text-muted-foreground">SKU {product.sku}</p>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Unidades</span>
                    <span>{product.unidades}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Monto</span>
                    <span className="font-medium">
                      {formatCurrency(Number(product.monto ?? 0))}
                    </span>
                  </div>
                </div>
              ))}
              {(selectedVendedor?.productosTopVendidos ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No hay productos top visibles para este vendedor en el período seleccionado.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparacion" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Benchmark Comercial</CardTitle>
              <CardDescription>
                Comparación de desempeño individual contra el promedio real del equipo
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="h-4 w-4" /> Ventas
                </div>
                <p className="mt-2 text-2xl font-bold">
                  {formatCurrency(Number(selectedVendedor?.totalVendido ?? 0))}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Promedio equipo:{" "}
                  {formatCurrency(sorted.length ? teamTotals.totalVentas / sorted.length : 0)}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ShoppingCart className="h-4 w-4" /> Transacciones
                </div>
                <p className="mt-2 text-2xl font-bold">
                  {selectedVendedor?.numeroTransacciones ?? 0}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Promedio equipo:{" "}
                  {(sorted.length ? teamTotals.totalTransacciones / sorted.length : 0).toFixed(1)}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Percent className="h-4 w-4" /> Conversión
                </div>
                <p className="mt-2 text-2xl font-bold">
                  {Number(selectedVendedor?.tasaConversion ?? 0).toFixed(1)}%
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Promedio equipo: {teamTotals.avgConversion.toFixed(1)}%
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <TrendingUp className="h-4 w-4" /> Cambio
                </div>
                <p className="mt-2 text-2xl font-bold">
                  {Number(selectedVendedor?.cambioVsPeriodoAnterior ?? 0).toFixed(1)}%
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Variación visible vs período anterior informado.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {sorted.map((metric, index) => (
              <Card
                key={metric.vendedorId}
                onClick={() => setSelectedVendedorId(metric.vendedorId)}
                className="cursor-pointer transition-shadow hover:shadow-lg"
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Badge variant="outline">#{index + 1}</Badge>
                    {metric.vendedor.nombre} {metric.vendedor.apellido}
                  </CardTitle>
                  <CardDescription>{formatPeriod(metric.periodo)}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total vendido</span>
                    <span className="font-bold">
                      {formatCurrency(Number(metric.totalVendido ?? 0))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Conversión</span>
                    <span className="font-bold">
                      {Number(metric.tasaConversion ?? 0).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ticket promedio</span>
                    <span className="font-bold">
                      {formatCurrency(Number(metric.ticketPromedio ?? 0))}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span>Estado comercial</span>
                    <Badge
                      variant={
                        Number(metric.tasaConversion ?? 0) >= teamTotals.avgConversion
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {Number(metric.tasaConversion ?? 0) >= teamTotals.avgConversion
                        ? "Sobre promedio"
                        : "Bajo promedio"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumen Operativo del Equipo</CardTitle>
          <CardDescription>Prioridades detectadas en la tanda comercial visible</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" /> Equipo activo
            </div>
            <p className="mt-2 text-2xl font-bold">
              {sorted.filter((item) => item.vendedor.estado === "activo").length}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Vendedores con métrica visible y estado activo.
            </p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="h-4 w-4" /> En crecimiento
            </div>
            <p className="mt-2 text-2xl font-bold">
              {sorted.filter((item) => Number(item.cambioVsPeriodoAnterior ?? 0) > 0).length}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Responsables con mejora respecto al período anterior informado.
            </p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Percent className="h-4 w-4" /> Bajo benchmark
            </div>
            <p className="mt-2 text-2xl font-bold">
              {
                sorted.filter((item) => Number(item.tasaConversion ?? 0) < teamTotals.avgConversion)
                  .length
              }
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Exigen revisión comercial o coaching sobre conversión visible.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
