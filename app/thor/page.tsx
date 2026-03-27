"use client"

import React from "react"
import Link from "next/link"
import {
  AlertCircle,
  Boxes,
  Brain,
  ShieldAlert,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  useThorCajeros,
  useThorKpis,
  useThorProductos,
  useThorSugerencias,
  useThorVendedores,
} from "@/lib/hooks/useThor"
import type { AIRecommendation, KPI, ThorProduct } from "@/lib/thor-types"

function formatCurrency(value: number | null) {
  if (value === null) return "Pendiente"

  return value.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  })
}

function formatCompact(value: number | null) {
  if (value === null) return "Pendiente"

  return new Intl.NumberFormat("es-AR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)
}

function formatPercent(value: number | null) {
  if (value === null) return "Pendiente"
  return `${value.toFixed(1)}%`
}

function formatDays(value: number | null) {
  if (value === null) return "Pendiente"
  return `${value.toFixed(1)} días`
}

function formatDate(value?: Date) {
  return value ? new Date(value).toLocaleDateString("es-AR") : "-"
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

function findKpiByAliases(kpis: KPI[], aliases: string[]) {
  return (
    kpis.find((kpi) => {
      const normalized = normalizeText(kpi.nombre)
      return aliases.some((alias) => normalized.includes(alias))
    }) ?? null
  )
}

function buildMetricState(kpi: KPI | null, fallbackValue: number | null, fallbackSource: string) {
  if (kpi) {
    return {
      value: Number(kpi.valor ?? 0),
      source: `KPI THOR: ${kpi.nombre}`,
    }
  }

  if (fallbackValue !== null) {
    return {
      value: fallbackValue,
      source: fallbackSource,
    }
  }

  return {
    value: null,
    source: "Sin cobertura visible en el contrato actual",
  }
}

function SummaryCard({
  title,
  value,
  description,
  tone = "default",
}: {
  title: string
  value: string
  description: string
  tone?: "default" | "positive" | "warning" | "destructive"
}) {
  const toneClass =
    tone === "positive"
      ? "text-green-600"
      : tone === "warning"
        ? "text-orange-600"
        : tone === "destructive"
          ? "text-red-600"
          : ""

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${toneClass}`}>{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

export default function ThorDashboard() {
  const { kpis: kpisData, historico, loading: loadingKpis, error: errorKpis } = useThorKpis()
  const {
    metricas: vendedoresMetricas,
    loading: loadingVendedores,
    error: errorVendedores,
  } = useThorVendedores()
  const {
    metricas: cajerosMetricas,
    loading: loadingCajeros,
    error: errorCajeros,
  } = useThorCajeros()
  const { productos, loading: loadingProductos, error: errorProductos } = useThorProductos()
  const { sugerencias, loading: loadingSugerencias, error: errorSugerencias } = useThorSugerencias()

  const orderedHistory = React.useMemo(
    () =>
      [...historico].sort(
        (left, right) => new Date(left.fecha).getTime() - new Date(right.fecha).getTime()
      ),
    [historico]
  )

  const latestHistory = orderedHistory.at(-1) ?? null
  const previousHistory = orderedHistory.at(-2) ?? null

  const marginKpi = React.useMemo(() => findKpiByAliases(kpisData, ["margen"]), [kpisData])
  const rotationKpi = React.useMemo(
    () => findKpiByAliases(kpisData, ["rotacion", "rotaci"]),
    [kpisData]
  )

  const averageCatalogRotation = React.useMemo(() => {
    if (productos.length === 0) return null

    return (
      productos.reduce((total, producto) => total + Number(producto.rotacionDias ?? 0), 0) /
      productos.length
    )
  }, [productos])

  const averageCatalogMargin = React.useMemo(() => {
    if (productos.length === 0) return null

    return (
      productos.reduce((total, producto) => total + Number(producto.margenPorcentaje ?? 0), 0) /
      productos.length
    )
  }, [productos])

  const marginState = React.useMemo(
    () =>
      buildMetricState(
        marginKpi,
        averageCatalogMargin,
        "Fallback explícito: promedio del catálogo THOR visible"
      ),
    [averageCatalogMargin, marginKpi]
  )

  const rotationState = React.useMemo(
    () =>
      buildMetricState(
        rotationKpi,
        averageCatalogRotation,
        "Fallback explícito: rotación promedio del catálogo THOR visible"
      ),
    [averageCatalogRotation, rotationKpi]
  )

  const topVendedor = React.useMemo(
    () =>
      [...vendedoresMetricas].sort(
        (left, right) => Number(right.totalVendido ?? 0) - Number(left.totalVendido ?? 0)
      )[0] ?? null,
    [vendedoresMetricas]
  )

  const topCajero = React.useMemo(
    () =>
      [...cajerosMetricas].sort(
        (left, right) =>
          Number(left.tiempoPromedioAtension ?? 0) - Number(right.tiempoPromedioAtension ?? 0)
      )[0] ?? null,
    [cajerosMetricas]
  )

  const actionCounts = React.useMemo(
    () => ({
      reabastecer: sugerencias.filter((sugerencia) => sugerencia.sugerenciaAccion === "reabastecer")
        .length,
      promocionar: sugerencias.filter((sugerencia) => sugerencia.sugerenciaAccion === "promocionar")
        .length,
      evaluar: sugerencias.filter((sugerencia) => sugerencia.sugerenciaAccion === "evaluar").length,
      alAlza: sugerencias.filter((sugerencia) => sugerencia.tendencia === "al_alza").length,
    }),
    [sugerencias]
  )

  const highlightedRecommendation = React.useMemo(
    () =>
      [...sugerencias].sort(
        (left, right) =>
          Number(right.puntuacionConfianza ?? 0) - Number(left.puntuacionConfianza ?? 0) ||
          Number(right.impactoEstimado ?? 0) - Number(left.impactoEstimado ?? 0)
      )[0] ?? null,
    [sugerencias]
  )

  const productAlerts = React.useMemo(() => {
    return [...productos]
      .filter((producto) => {
        const stock = Number(producto.stock ?? 0)
        const ventasRecientes = Number(producto.ventasUltimos3Meses ?? 0)
        const rotacion = Number(producto.rotacionDias ?? 0)

        return stock <= 0 || (stock <= 10 && ventasRecientes > 0) || rotacion > 60
      })
      .sort(
        (left, right) =>
          Number(right.ventasUltimos3Meses ?? 0) - Number(left.ventasUltimos3Meses ?? 0) ||
          Number(right.rotacionDias ?? 0) - Number(left.rotacionDias ?? 0)
      )
      .slice(0, 6)
  }, [productos])

  const marginWinners = React.useMemo(
    () =>
      [...productos]
        .sort((left, right) => Number(right.margenDolar ?? 0) - Number(left.margenDolar ?? 0))
        .slice(0, 5),
    [productos]
  )

  const coreCoverage = React.useMemo(() => {
    const checks = [
      Boolean(latestHistory),
      Boolean(marginState.value !== null),
      Boolean(rotationState.value !== null),
      vendedoresMetricas.length > 0,
      cajerosMetricas.length > 0,
      sugerencias.length > 0,
    ]

    const covered = checks.filter(Boolean).length
    return Math.round((covered / checks.length) * 100)
  }, [
    cajerosMetricas.length,
    latestHistory,
    marginState.value,
    rotationState.value,
    sugerencias.length,
    vendedoresMetricas.length,
  ])

  const coverageGaps = React.useMemo(() => {
    const gaps: string[] = []

    if (!latestHistory) {
      gaps.push("No hay histórico de ventas visible para leer el último período.")
    }
    if (!marginKpi) {
      gaps.push(
        "El KPI de margen no llegó por nombre explícito; se usa fallback del catálogo si existe."
      )
    }
    if (!rotationKpi) {
      gaps.push(
        "La rotación promedio no llegó por KPI explícito; se usa fallback del catálogo si existe."
      )
    }
    if (vendedoresMetricas.length === 0) {
      gaps.push("No hay ranking visible de vendedores en el contrato actual.")
    }
    if (cajerosMetricas.length === 0) {
      gaps.push("No hay ranking visible de cajeros en el contrato actual.")
    }

    return gaps
  }, [cajerosMetricas.length, latestHistory, marginKpi, rotationKpi, vendedoresMetricas.length])

  const moduleRadar = React.useMemo(
    () => [
      {
        title: "Sugerencias IA",
        href: "/thor/sugerencias",
        description: `${sugerencias.length} visibles; ${actionCounts.reabastecer} de reposición y ${actionCounts.promocionar} promocionales.`,
        state: sugerencias.length > 0 ? "Activo" : "Pendiente",
      },
      {
        title: "Márgenes",
        href: "/thor/margenes",
        description: `${marginWinners.length} productos destacados con margen dólar positivo visible.`,
        state: marginWinners.length > 0 ? "Cubierto" : "Sin datos",
      },
      {
        title: "KPIs",
        href: "/thor/kpis",
        description: `${kpisData.length} KPIs y ${historico.length} puntos históricos cargados.`,
        state: latestHistory ? "Cubierto" : "Pendiente",
      },
      {
        title: "Vendedores",
        href: "/thor/vendedores",
        description: `${vendedoresMetricas.length} métricas visibles; ${topVendedor ? "hay liderazgo comercial" : "sin podio visible"}.`,
        state: topVendedor ? "Activo" : "Sin datos",
      },
      {
        title: "Cajeros",
        href: "/thor/cajeros",
        description: `${cajerosMetricas.length} métricas visibles; ${topCajero ? "hay eficiencia comparada" : "sin frente destacado"}.`,
        state: topCajero ? "Activo" : "Sin datos",
      },
      {
        title: "Competencia",
        href: "/thor/competencia",
        description: `${actionCounts.promocionar} sugerencias promocionales pueden cruzarse con pricing y competencia.`,
        state: actionCounts.promocionar > 0 ? "Oportunidad" : "Normal",
      },
    ],
    [
      actionCounts.promocionar,
      actionCounts.reabastecer,
      cajerosMetricas.length,
      historico.length,
      kpisData.length,
      latestHistory,
      marginWinners.length,
      sugerencias.length,
      topCajero,
      topVendedor,
      vendedoresMetricas.length,
    ]
  )

  const loading =
    loadingKpis || loadingVendedores || loadingCajeros || loadingProductos || loadingSugerencias
  const hasError =
    errorKpis || errorVendedores || errorCajeros || errorProductos || errorSugerencias

  return (
    <div className="space-y-6 pb-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">THOR</h1>
        <p className="text-muted-foreground">
          Consola comercial y operativa para leer tracción, pricing, eficiencia de piso y señales de
          surtido desde los contratos reales de inteligencia comercial.
        </p>
      </div>

      {hasError && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Parte de las métricas THOR no pudo cargarse por completo. El tablero mantiene sólo la
            lectura que hoy devuelven los hooks visibles y deriva el resto a las consolas
            específicas del módulo.
          </AlertDescription>
        </Alert>
      )}

      {coverageGaps.length > 0 && (
        <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>{coverageGaps.join(" ")}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <SummaryCard
          title="Ventas visibles"
          value={formatCurrency(latestHistory ? Number(latestHistory.ventas ?? 0) : null)}
          description={
            latestHistory
              ? `${formatDate(latestHistory.fecha)} · ${previousHistory ? `${Math.abs(((Number(latestHistory.ventas ?? 0) - Number(previousHistory.ventas ?? 0)) / Math.max(Number(previousHistory.ventas ?? 0), 1)) * 100).toFixed(1)}% vs período previo` : "primer período visible"}`
              : "Sin histórico cargado para medir el último cierre visible"
          }
          tone={
            latestHistory &&
            previousHistory &&
            Number(latestHistory.ventas ?? 0) < Number(previousHistory.ventas ?? 0)
              ? "warning"
              : "default"
          }
        />
        <SummaryCard
          title="Margen visible"
          value={formatPercent(marginState.value)}
          description={marginState.source}
          tone={marginState.value !== null && marginState.value < 20 ? "warning" : "positive"}
        />
        <SummaryCard
          title="Ticket promedio"
          value={formatCurrency(latestHistory ? Number(latestHistory.ticketPromedio ?? 0) : null)}
          description={
            latestHistory
              ? "Derivado del último histórico visible de ventas THOR"
              : "Pendiente hasta que el histórico devuelva ticket promedio"
          }
        />
        <SummaryCard
          title="Transacciones"
          value={formatCompact(latestHistory ? Number(latestHistory.transacciones ?? 0) : null)}
          description={
            latestHistory
              ? "Operaciones visibles en el último período informado"
              : "Sin volumen transaccional cargado todavía"
          }
        />
        <SummaryCard
          title="Rotación visible"
          value={formatDays(rotationState.value)}
          description={rotationState.source}
          tone={rotationState.value !== null && rotationState.value > 60 ? "warning" : "default"}
        />
        <SummaryCard
          title="Cobertura módulo"
          value={`${coreCoverage}%`}
          description={`${kpisData.length} KPIs, ${historico.length} períodos, ${sugerencias.length} sugerencias y ${productos.length} productos visibles`}
          tone={coreCoverage >= 80 ? "positive" : coreCoverage >= 50 ? "warning" : "destructive"}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {moduleRadar.map((module) => (
          <Link key={module.title} href={module.href}>
            <Card className="h-full cursor-pointer transition-colors hover:bg-accent/50">
              <CardHeader>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{module.title}</CardTitle>
                  <Badge
                    variant={
                      module.state === "Activo" ||
                      module.state === "Cubierto" ||
                      module.state === "Normal"
                        ? "secondary"
                        : module.state === "Oportunidad"
                          ? "outline"
                          : "destructive"
                    }
                  >
                    {module.state}
                  </Badge>
                </div>
                <CardDescription>{module.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recomendación destacada</CardTitle>
              <CardDescription>
                Prioridad comercial o de reposición con mayor confianza visible en THOR.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {highlightedRecommendation ? (
                <>
                  <div>
                    <p className="font-semibold">{highlightedRecommendation.producto.nombre}</p>
                    <p className="text-sm text-muted-foreground">
                      {highlightedRecommendation.producto.categoria} •{" "}
                      {highlightedRecommendation.producto.marca}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="default">{highlightedRecommendation.sugerenciaAccion}</Badge>
                    <Badge variant="outline">{highlightedRecommendation.tendencia}</Badge>
                    <Badge variant="secondary">
                      {Number(highlightedRecommendation.puntuacionConfianza ?? 0).toFixed(0)}%
                      confianza
                    </Badge>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>{highlightedRecommendation.razon}</p>
                    <p>
                      Impacto estimado:{" "}
                      {formatCurrency(Number(highlightedRecommendation.impactoEstimado ?? 0))}
                    </p>
                    <p>
                      Correlacionados:{" "}
                      {highlightedRecommendation.correlacionados.length > 0
                        ? highlightedRecommendation.correlacionados.join(", ")
                        : "Sin correlacionados visibles"}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No hay sugerencias visibles para destacar todavía.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Frente comercial</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Users className="h-4 w-4 text-blue-600" /> Vendedor destacado
                </div>
                {topVendedor ? (
                  <>
                    <p className="font-semibold">
                      {topVendedor.vendedor.nombre} {topVendedor.vendedor.apellido}
                    </p>
                    <p className="text-sm text-muted-foreground">{topVendedor.vendedor.email}</p>
                    <div className="grid gap-1 text-xs text-muted-foreground">
                      <p>Total vendido: {formatCurrency(Number(topVendedor.totalVendido ?? 0))}</p>
                      <p>Transacciones: {topVendedor.numeroTransacciones}</p>
                      <p>Conversión: {formatPercent(Number(topVendedor.tasaConversion ?? 0))}</p>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Sin ranking visible de vendedores.
                  </p>
                )}
              </div>

              <div className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Wallet className="h-4 w-4 text-orange-600" /> Frente de caja destacado
                </div>
                {topCajero ? (
                  <>
                    <p className="font-semibold">
                      {topCajero.cajero.nombre} {topCajero.cajero.apellido}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Caja {topCajero.cajero.numCaja} • {topCajero.cajero.estado}
                    </p>
                    <div className="grid gap-1 text-xs text-muted-foreground">
                      <p>
                        Atención promedio:{" "}
                        {Number(topCajero.tiempoPromedioAtension ?? 0).toFixed(0)} s
                      </p>
                      <p>Clientes atendidos: {topCajero.numeroClientesAtendidos}</p>
                      <p>Facturado: {formatCurrency(Number(topCajero.totalFacturado ?? 0))}</p>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin ranking visible de cajeros.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Señales del módulo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <Brain className="mt-0.5 h-4 w-4 text-blue-600" />
                <div>
                  <p className="font-medium">{actionCounts.reabastecer} acciones de reposición</p>
                  <p className="text-xs text-muted-foreground">
                    Sugerencias con acción explícita de reabastecer dentro del contrato de IA
                    actual.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <TrendingUp className="mt-0.5 h-4 w-4 text-green-600" />
                <div>
                  <p className="font-medium">{actionCounts.alAlza} señales al alza</p>
                  <p className="text-xs text-muted-foreground">
                    Productos que THOR marca con tracción positiva y posible oportunidad comercial.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <TrendingDown className="mt-0.5 h-4 w-4 text-orange-600" />
                <div>
                  <p className="font-medium">
                    {productos.filter((producto) => Number(producto.rotacionDias ?? 0) > 60).length}{" "}
                    productos de rotación lenta
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Piden revisar pricing, surtido o estrategia promocional sin salir del catálogo
                    visible.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <ShoppingCart className="mt-0.5 h-4 w-4 text-red-600" />
                <div>
                  <p className="font-medium">
                    {productAlerts.filter((producto) => Number(producto.stock ?? 0) <= 0).length}{" "}
                    quiebres de stock
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Productos agotados con demanda o tensión de catálogo detectable desde THOR.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Radar de sugerencias</CardTitle>
              <CardDescription>
                Lectura operativa de las recomendaciones visibles, sin simular forecast ni
                automatizaciones.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Acción</TableHead>
                    <TableHead>Tendencia</TableHead>
                    <TableHead>Confianza</TableHead>
                    <TableHead className="text-right">Impacto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sugerencias.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                        {loading
                          ? "Cargando sugerencias THOR..."
                          : "No hay sugerencias visibles para el radar actual."}
                      </TableCell>
                    </TableRow>
                  )}
                  {sugerencias.slice(0, 6).map((sugerencia: AIRecommendation) => (
                    <TableRow key={sugerencia.id}>
                      <TableCell>
                        <div className="font-medium">{sugerencia.producto.nombre}</div>
                        <div className="text-xs text-muted-foreground">
                          {sugerencia.producto.sku} • {sugerencia.producto.categoria}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{sugerencia.sugerenciaAccion}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={sugerencia.tendencia === "baja" ? "destructive" : "secondary"}
                        >
                          {sugerencia.tendencia}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {Number(sugerencia.puntuacionConfianza ?? 0).toFixed(0)}%
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(Number(sugerencia.impactoEstimado ?? 0))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Radar de productos</CardTitle>
              <CardDescription>
                Prioridades de surtido y rotación sobre el catálogo THOR visible.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Rotación</TableHead>
                    <TableHead>Señal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productAlerts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                        {loading
                          ? "Cargando radar de productos..."
                          : "No hay alertas comerciales visibles en el catálogo THOR."}
                      </TableCell>
                    </TableRow>
                  )}
                  {productAlerts.map((producto: ThorProduct) => {
                    const stock = Number(producto.stock ?? 0)
                    const rotacion = Number(producto.rotacionDias ?? 0)
                    const signal =
                      stock <= 0
                        ? "Sin stock"
                        : rotacion > 60
                          ? "Rotación lenta"
                          : "Revisar reposición"

                    return (
                      <TableRow key={producto.id}>
                        <TableCell className="font-mono text-xs">{producto.sku}</TableCell>
                        <TableCell>
                          <div className="font-medium">{producto.nombre}</div>
                          <div className="text-xs text-muted-foreground">
                            {producto.categoria} • {producto.marca}
                          </div>
                        </TableCell>
                        <TableCell>{stock}</TableCell>
                        <TableCell>{formatDays(rotacion)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              stock <= 0
                                ? "destructive"
                                : signal === "Rotación lenta"
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {signal}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Productos ganadores en margen</CardTitle>
              <CardDescription>
                Lectura corta del catálogo con mayor contribución de margen dólar visible.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                {marginWinners.length === 0 && (
                  <p className="text-sm text-muted-foreground xl:col-span-5">
                    No hay productos con margen visible para destacar todavía.
                  </p>
                )}
                {marginWinners.map((producto) => (
                  <div key={producto.id} className="rounded-lg border p-3">
                    <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <Boxes className="h-3.5 w-3.5" />
                      {producto.sku}
                    </div>
                    <p className="text-sm font-medium">{producto.nombre}</p>
                    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                      <p>Margen dólar: {formatCurrency(Number(producto.margenDolar ?? 0))}</p>
                      <p>Margen %: {formatPercent(Number(producto.margenPorcentaje ?? 0))}</p>
                      <p>Ventas 3M: {formatCompact(Number(producto.ventasUltimos3Meses ?? 0))}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
