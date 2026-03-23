"use client"

import React, { useMemo, useState } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Download, TrendingDown, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useComprobantes } from "@/lib/hooks/useComprobantes"
import { useItems } from "@/lib/hooks/useItems"
import { useTerceros } from "@/lib/hooks/useTerceros"
import type { Comprobante } from "@/lib/types/comprobantes"

function formatCurrency(value: number) {
  return value.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  })
}

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)
}

function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function endOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(23, 59, 59, 999)
  return next
}

function getPeriodRange(period: string) {
  const now = new Date()
  const end = endOfDay(now)
  const start = startOfDay(now)

  if (period === "semana") {
    start.setDate(now.getDate() - 6)
    return { start, end, label: "Últimos 7 días", mode: "daily" as const }
  }

  if (period === "trimestre") {
    start.setMonth(now.getMonth() - 2, 1)
    return { start, end, label: "Trimestre actual", mode: "monthly" as const }
  }

  if (period === "anual") {
    start.setMonth(now.getMonth() - 11, 1)
    return { start, end, label: "Últimos 12 meses", mode: "monthly" as const }
  }

  start.setDate(1)
  return { start, end, label: "Mes actual", mode: "weekly" as const }
}

function buildTrendData(
  comprobantes: Comprobante[],
  start: Date,
  end: Date,
  mode: "daily" | "weekly" | "monthly"
) {
  if (mode === "daily") {
    const buckets = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start)
      date.setDate(start.getDate() + index)
      return {
        key: date.toISOString().slice(0, 10),
        label: date.toLocaleDateString("es-AR", { weekday: "short" }),
        ventas: 0,
        margen: 0,
      }
    })
    const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]))

    comprobantes.forEach((comprobante) => {
      const fecha = new Date(comprobante.fecha)
      const key = fecha.toISOString().slice(0, 10)
      const bucket = bucketMap.get(key)
      if (!bucket) return
      const costo = comprobante.netoGravado * 0.65
      bucket.ventas += comprobante.total
      bucket.margen += comprobante.total - costo
    })

    return buckets
  }

  if (mode === "weekly") {
    const durationDays = Math.max(
      1,
      Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    )
    const bucketCount = Math.min(5, Math.max(4, Math.ceil(durationDays / 7)))
    const buckets = Array.from({ length: bucketCount }, (_, index) => {
      const bucketStart = new Date(start)
      bucketStart.setDate(start.getDate() + index * 7)
      return {
        key: bucketStart.toISOString().slice(0, 10),
        label: `Sem ${index + 1}`,
        ventas: 0,
        margen: 0,
      }
    })

    comprobantes.forEach((comprobante) => {
      const fecha = new Date(comprobante.fecha)
      const bucketIndex = Math.min(
        buckets.length - 1,
        Math.floor((fecha.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7))
      )
      const bucket = buckets[bucketIndex]
      if (!bucket) return
      const costo = comprobante.netoGravado * 0.65
      bucket.ventas += comprobante.total
      bucket.margen += comprobante.total - costo
    })

    return buckets
  }

  const monthCount = Math.max(
    1,
    (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth() + 1
  )
  const buckets = Array.from({ length: monthCount }, (_, index) => {
    const bucketDate = new Date(start.getFullYear(), start.getMonth() + index, 1)
    return {
      key: `${bucketDate.getFullYear()}-${bucketDate.getMonth()}`,
      label: bucketDate.toLocaleDateString("es-AR", { month: "short" }),
      ventas: 0,
      margen: 0,
    }
  })
  const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]))

  comprobantes.forEach((comprobante) => {
    const fecha = new Date(comprobante.fecha)
    const key = `${fecha.getFullYear()}-${fecha.getMonth()}`
    const bucket = bucketMap.get(key)
    if (!bucket) return
    const costo = comprobante.netoGravado * 0.65
    bucket.ventas += comprobante.total
    bucket.margen += comprobante.total - costo
  })

  return buckets
}

function buildPeriodoLabel(start: Date, end: Date) {
  return `${start.toLocaleDateString("es-AR")} - ${end.toLocaleDateString("es-AR")}`
}

export default function ReportesPage() {
  const { comprobantes } = useComprobantes({ esVenta: true })
  const { terceros } = useTerceros({ soloActivos: false })
  const { items } = useItems()
  const [periodoFilter, setPeriodoFilter] = useState("mes")
  const [tab, setTab] = useState("ejecutivo")
  const [today] = useState(() => new Date())

  const {
    start,
    end,
    label: periodoLabel,
    mode,
  } = useMemo(() => getPeriodRange(periodoFilter), [periodoFilter])

  const salesComprobantes = useMemo(
    () => comprobantes.filter((comprobante) => comprobante.estado !== "ANULADO"),
    [comprobantes]
  )

  const filteredComprobantes = useMemo(
    () =>
      salesComprobantes.filter((comprobante) => {
        const fecha = new Date(comprobante.fecha)
        return fecha >= start && fecha <= end
      }),
    [end, salesComprobantes, start]
  )

  const previousPeriodComprobantes = useMemo(() => {
    const duration = end.getTime() - start.getTime()
    const prevEnd = new Date(start.getTime() - 1)
    const prevStart = new Date(prevEnd.getTime() - duration)

    return salesComprobantes.filter((comprobante) => {
      const fecha = new Date(comprobante.fecha)
      return fecha >= prevStart && fecha <= prevEnd
    })
  }, [end, salesComprobantes, start])

  const trendData = useMemo(
    () => buildTrendData(filteredComprobantes, start, end, mode),
    [end, filteredComprobantes, mode, start]
  )

  const topClientes = useMemo(() => {
    const totals = new Map<number, { total: number; saldo: number; comprobantes: number }>()

    filteredComprobantes.forEach((comprobante) => {
      const current = totals.get(comprobante.terceroId) ?? { total: 0, saldo: 0, comprobantes: 0 }
      current.total += comprobante.total
      current.saldo += comprobante.saldo
      current.comprobantes += 1
      totals.set(comprobante.terceroId, current)
    })

    return Array.from(totals.entries())
      .map(([terceroId, values]) => {
        const tercero = terceros.find((item) => item.id === terceroId)
        return {
          id: terceroId,
          razonSocial: tercero?.razonSocial ?? `Cliente #${terceroId}`,
          nroDocumento: tercero?.nroDocumento ?? "-",
          activo: tercero?.activo ?? false,
          condicionIva: tercero?.condicionIvaDescripcion ?? "Sin condición",
          total: values.total,
          saldo: values.saldo,
          comprobantes: values.comprobantes,
        }
      })
      .sort((left, right) => right.total - left.total)
      .slice(0, 10)
  }, [filteredComprobantes, terceros])

  const libroIVA = useMemo(
    () =>
      filteredComprobantes.map((comprobante) => {
        const tercero = terceros.find((item) => item.id === comprobante.terceroId)
        return {
          id: comprobante.id,
          fecha: comprobante.fecha,
          nroComprobante: comprobante.nroComprobante ?? "-",
          tipo: comprobante.tipoComprobanteDescripcion ?? "-",
          razonSocial: tercero?.razonSocial ?? String(comprobante.terceroId),
          cuit: tercero?.nroDocumento ?? "-",
          condicionIva: tercero?.condicionIvaDescripcion ?? "-",
          subtotal: comprobante.netoGravado,
          iva21: comprobante.ivaRi,
          iva105: comprobante.ivaRni,
          total: comprobante.total,
        }
      }),
    [filteredComprobantes, terceros]
  )

  const libroIVATotals = useMemo(
    () =>
      libroIVA.reduce(
        (acc, item) => ({
          neto: acc.neto + item.subtotal,
          iva21: acc.iva21 + item.iva21,
          iva105: acc.iva105 + item.iva105,
          total: acc.total + item.total,
        }),
        { neto: 0, iva21: 0, iva105: 0, total: 0 }
      ),
    [libroIVA]
  )

  const carteraPorCondicionIva = useMemo(() => {
    const groups = new Map<string, number>()
    terceros
      .filter((tercero) => tercero.esCliente)
      .forEach((tercero) => {
        const key = tercero.condicionIvaDescripcion ?? "Sin condición"
        groups.set(key, (groups.get(key) ?? 0) + 1)
      })

    return Array.from(groups.entries()).map(([name, value]) => ({ name, value }))
  }, [terceros])

  const estadosComprobantes = useMemo(
    () =>
      ["BORRADOR", "EMITIDO", "PAGADO_PARCIAL", "PAGADO"]
        .map((estado) => ({
          name:
            estado === "PAGADO_PARCIAL"
              ? "Pago Parc."
              : estado.charAt(0) + estado.slice(1).toLowerCase(),
          value: filteredComprobantes.filter((comprobante) => comprobante.estado === estado).length,
        }))
        .filter((row) => row.value > 0),
    [filteredComprobantes]
  )

  const margenPorProducto = useMemo(
    () =>
      items
        .map((item) => ({
          sku: item.codigo,
          nombre: item.descripcion,
          costo: item.precioCosto,
          precio: item.precioVenta,
          margen:
            item.precioVenta > 0
              ? ((item.precioVenta - item.precioCosto) / item.precioVenta) * 100
              : 0,
          margenAbs: item.precioVenta - item.precioCosto,
          categoria: item.categoriaDescripcion ?? "General",
          stock: item.stock ?? 0,
          stockMinimo: item.stockMinimo,
        }))
        .sort((left, right) => right.margen - left.margen),
    [items]
  )

  const customerHealth = useMemo(() => {
    const clientes = terceros.filter((tercero) => tercero.esCliente)
    const activos = clientes.filter((tercero) => tercero.activo).length
    const inactivos = clientes.length - activos
    const facturables = clientes.filter((tercero) => tercero.facturable).length
    const conLimite = clientes.filter((tercero) => (tercero.limiteCredito ?? 0) > 0).length
    const conEmail = clientes.filter((tercero) => Boolean(tercero.email)).length
    const conTelefono = clientes.filter((tercero) =>
      Boolean(tercero.telefono || tercero.celular)
    ).length

    return {
      total: clientes.length,
      activos,
      inactivos,
      facturables,
      conLimite,
      conEmail,
      conTelefono,
      limiteTotal: clientes.reduce((sum, tercero) => sum + (tercero.limiteCredito ?? 0), 0),
    }
  }, [terceros])

  const cobranzasRadar = useMemo(() => {
    const pendientes = filteredComprobantes.filter((comprobante) => comprobante.saldo > 0)

    return pendientes
      .map((comprobante) => {
        const tercero = terceros.find((item) => item.id === comprobante.terceroId)
        const dueDate = comprobante.fechaVto
          ? new Date(comprobante.fechaVto)
          : new Date(comprobante.fecha)
        const overdueDays = Math.max(
          0,
          Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
        )

        return {
          id: comprobante.id,
          razonSocial: tercero?.razonSocial ?? `Cliente #${comprobante.terceroId}`,
          comprobante: comprobante.nroComprobante ?? String(comprobante.id),
          saldo: comprobante.saldo,
          overdueDays,
          fechaVto: comprobante.fechaVto,
          estado: comprobante.estado,
        }
      })
      .sort((left, right) => right.saldo - left.saldo)
      .slice(0, 8)
  }, [filteredComprobantes, terceros, today])

  const cobranzasSummary = useMemo(() => {
    const pendientes = filteredComprobantes.filter((comprobante) => comprobante.saldo > 0)
    const saldoPendiente = pendientes.reduce((sum, comprobante) => sum + comprobante.saldo, 0)
    const vencidos = pendientes.filter((comprobante) => {
      if (!comprobante.fechaVto) return false
      return new Date(comprobante.fechaVto).getTime() < today.getTime()
    })

    return {
      saldoPendiente,
      comprobantesPendientes: pendientes.length,
      vencidos: vencidos.length,
      saldoVencido: vencidos.reduce((sum, comprobante) => sum + comprobante.saldo, 0),
    }
  }, [filteredComprobantes, today])

  const portfolioAlerts = useMemo(
    () => [
      {
        label: "Clientes sin email",
        value: customerHealth.total - customerHealth.conEmail,
        detail: "La ficha comercial queda corta para seguimiento digital.",
      },
      {
        label: "Clientes sin límite",
        value: customerHealth.total - customerHealth.conLimite,
        detail: "No tienen marco crediticio visible para ventas financiadas.",
      },
      {
        label: "Items bajo margen",
        value: margenPorProducto.filter((item) => item.margen < 20).length,
        detail: "Piden revisión de lista o costos de reposición.",
      },
      {
        label: "Items bajo mínimo",
        value: margenPorProducto.filter((item) => item.stock <= item.stockMinimo).length,
        detail: "Hay tensión de surtido sobre artículos vendibles.",
      },
    ],
    [customerHealth, margenPorProducto]
  )

  const ingresosPeriodo = filteredComprobantes.reduce(
    (sum, comprobante) => sum + comprobante.total,
    0
  )
  const ingresosPeriodoAnterior = previousPeriodComprobantes.reduce(
    (sum, comprobante) => sum + comprobante.total,
    0
  )
  const variacion =
    ingresosPeriodoAnterior > 0
      ? ((ingresosPeriodo - ingresosPeriodoAnterior) / ingresosPeriodoAnterior) * 100
      : 0

  const executiveKpis = useMemo(
    () => ({
      ingresos: ingresosPeriodo,
      variacion,
      ticketPromedio: ingresosPeriodo / Math.max(filteredComprobantes.length, 1),
      conversion:
        filteredComprobantes.length > 0
          ? (filteredComprobantes.filter((comprobante) => comprobante.estado === "PAGADO").length /
              filteredComprobantes.length) *
            100
          : 0,
      clientesActivos: customerHealth.activos,
      margenPromedio:
        margenPorProducto.length > 0
          ? margenPorProducto.reduce((sum, item) => sum + item.margen, 0) / margenPorProducto.length
          : 0,
      totalComprobantes: filteredComprobantes.length,
    }),
    [customerHealth.activos, filteredComprobantes, ingresosPeriodo, margenPorProducto, variacion]
  )

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reportes de Ventas</h1>
          <p className="text-muted-foreground">
            Lectura ejecutiva, fiscal, márgenes y cobranzas sobre comprobantes, clientes e ítems
            visibles.
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={periodoFilter} onValueChange={setPeriodoFilter}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semana">Esta semana</SelectItem>
              <SelectItem value="mes">Este mes</SelectItem>
              <SelectItem value="trimestre">Trimestre</SelectItem>
              <SelectItem value="anual">Anual</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        {[
          {
            label: "Ingresos período",
            value: formatCompactCurrency(executiveKpis.ingresos),
            delta: `${executiveKpis.variacion >= 0 ? "+" : ""}${executiveKpis.variacion.toFixed(1)}%`,
            deltaUp: executiveKpis.variacion >= 0,
          },
          {
            label: "Ticket promedio",
            value: formatCompactCurrency(executiveKpis.ticketPromedio),
          },
          {
            label: "Conversión cobrada",
            value: `${executiveKpis.conversion.toFixed(1)}%`,
          },
          {
            label: "Clientes activos",
            value: String(executiveKpis.clientesActivos),
          },
          {
            label: "Margen promedio",
            value: `${executiveKpis.margenPromedio.toFixed(1)}%`,
          },
          {
            label: "Comprobantes",
            value: String(executiveKpis.totalComprobantes),
          },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pb-4 pt-4">
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p className="mt-1 text-2xl font-bold text-primary">{kpi.value}</p>
              {kpi.delta && (
                <p
                  className={`mt-1 flex items-center gap-1 text-xs ${kpi.deltaUp ? "text-green-600" : "text-red-600"}`}
                >
                  {kpi.deltaUp ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {kpi.delta}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="ejecutivo">Ejecutivo</TabsTrigger>
          <TabsTrigger value="libros">Libro IVA</TabsTrigger>
          <TabsTrigger value="margenes">Márgenes</TabsTrigger>
          <TabsTrigger value="cobranzas">Cobranzas</TabsTrigger>
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
        </TabsList>

        <TabsContent value="ejecutivo" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Evolución de ventas y margen</CardTitle>
                <CardDescription>{periodoLabel} con buckets consistentes al filtro</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="ventasGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="margenGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#16a34a" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(value) => formatCompactCurrency(value)}
                    />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="ventas"
                      stroke="#2563eb"
                      fill="url(#ventasGradient)"
                      strokeWidth={2}
                      name="Ventas"
                    />
                    <Area
                      type="monotone"
                      dataKey="margen"
                      stroke="#16a34a"
                      fill="url(#margenGradient)"
                      strokeWidth={2}
                      name="Margen"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Comprobantes por estado</CardTitle>
                <CardDescription>{periodoLabel}</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={estadosComprobantes}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} name="Comprobantes" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Cartera por condición IVA</CardTitle>
                <CardDescription>Composición fiscal visible de clientes</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={carteraPorCondicionIva}
                      cx="50%"
                      cy="50%"
                      outerRadius={92}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {carteraPorCondicionIva.map((_, index) => (
                        <Cell
                          key={index}
                          fill={["#2563eb", "#16a34a", "#f59e0b", "#ef4444", "#7c3aed"][index % 5]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Top clientes del período</CardTitle>
                <CardDescription>Facturación y saldo abierto por cuenta</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topClientes.slice(0, 8).map((cliente, index) => (
                    <div key={cliente.id} className="flex items-center gap-3">
                      <span className="w-5 text-xs font-mono text-muted-foreground">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{cliente.razonSocial}</p>
                        <p className="text-xs text-muted-foreground">
                          {cliente.condicionIva} · {cliente.comprobantes} comprobantes
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">
                          {formatCompactCurrency(cliente.total)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Saldo {formatCompactCurrency(cliente.saldo)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Alertas comerciales</CardTitle>
              <CardDescription>
                Lecturas operativas del padrón y del surtido visible
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {portfolioAlerts.map((alert) => (
                  <div key={alert.label} className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">{alert.label}</p>
                    <p className="mt-1 text-2xl font-bold">{alert.value}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{alert.detail}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="libros" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Libro IVA Ventas</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Período: {buildPeriodoLabel(start, end)} · comprobantes de venta no anulados
              </p>
            </div>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Exportar a Excel
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-5">
            {[
              { label: "Neto gravado", value: libroIVATotals.neto, color: "text-primary" },
              { label: "IVA 21%", value: libroIVATotals.iva21, color: "text-purple-600" },
              { label: "IVA 10.5%", value: libroIVATotals.iva105, color: "text-purple-400" },
              { label: "Total", value: libroIVATotals.total, color: "text-green-600" },
              { label: "Comprobantes", value: libroIVA.length, color: "text-slate-700" },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className={`mt-1 text-lg font-bold ${item.color}`}>
                  {typeof item.value === "number" && item.label !== "Comprobantes"
                    ? formatCurrency(item.value)
                    : item.value}
                </p>
              </div>
            ))}
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Comprobante</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Razón social</TableHead>
                    <TableHead>CUIT</TableHead>
                    <TableHead>Condición IVA</TableHead>
                    <TableHead className="text-right">Neto</TableHead>
                    <TableHead className="text-right">IVA 21%</TableHead>
                    <TableHead className="text-right">IVA 10.5%</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {libroIVA.map((item) => (
                    <TableRow key={item.id} className="text-sm">
                      <TableCell>{new Date(item.fecha).toLocaleDateString("es-AR")}</TableCell>
                      <TableCell className="font-mono">{item.nroComprobante}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs uppercase">
                          {item.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{item.razonSocial}</TableCell>
                      <TableCell className="font-mono text-xs">{item.cuit}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {item.condicionIva}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(item.subtotal)}</TableCell>
                      <TableCell className="text-right text-purple-600">
                        {item.iva21 > 0 ? formatCurrency(item.iva21) : "-"}
                      </TableCell>
                      <TableCell className="text-right text-purple-400">
                        {item.iva105 > 0 ? formatCurrency(item.iva105) : "-"}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(item.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell colSpan={6} className="text-right text-sm">
                      Totales
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {formatCurrency(libroIVATotals.neto)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-purple-600">
                      {formatCurrency(libroIVATotals.iva21)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-purple-400">
                      {formatCurrency(libroIVATotals.iva105)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-green-600">
                      {formatCurrency(libroIVATotals.total)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="margenes" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Margen por producto</CardTitle>
                <CardDescription>Top 10 por margen porcentual visible</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={margenPorProducto.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      type="number"
                      domain={[0, 80]}
                      tickFormatter={(value) => `${value}%`}
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis type="category" dataKey="sku" tick={{ fontSize: 10 }} width={70} />
                    <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                    <Bar dataKey="margen" fill="#16a34a" radius={[0, 4, 4, 0]} name="Margen %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Radar de margen y surtido</CardTitle>
                <CardDescription>Rentabilidad absoluta con tensión de stock</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Costo</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                      <TableHead className="text-right">Margen $</TableHead>
                      <TableHead className="text-right">Margen %</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {margenPorProducto.slice(0, 12).map((item) => (
                      <TableRow key={item.sku}>
                        <TableCell>
                          <p className="text-xs font-medium">{item.nombre}</p>
                          <p className="font-mono text-xs text-muted-foreground">{item.sku}</p>
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {formatCurrency(item.costo)}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {formatCurrency(item.precio)}
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          {formatCurrency(item.margenAbs)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={`text-sm font-bold ${item.margen >= 40 ? "text-green-600" : item.margen >= 20 ? "text-orange-600" : "text-red-600"}`}
                          >
                            {item.margen.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={item.stock <= item.stockMinimo ? "destructive" : "outline"}
                          >
                            {item.stock}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cobranzas" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Saldo pendiente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">
                  {formatCompactCurrency(cobranzasSummary.saldoPendiente)}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Sobre comprobantes del período</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Pendientes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{cobranzasSummary.comprobantesPendientes}</div>
                <p className="mt-1 text-xs text-muted-foreground">Comprobantes con saldo abierto</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Vencidos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{cobranzasSummary.vencidos}</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Ya superaron fecha de vencimiento
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Saldo vencido</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCompactCurrency(cobranzasSummary.saldoVencido)}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Parte crítica a seguir</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Radar de cobranzas</CardTitle>
              <CardDescription>
                Clientes y comprobantes con mayor exposición abierta
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Comprobante</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead className="text-right">Días vencido</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cobranzasRadar.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.razonSocial}</TableCell>
                      <TableCell className="font-mono text-xs">{item.comprobante}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.estado}</Badge>
                      </TableCell>
                      <TableCell>
                        {item.fechaVto
                          ? new Date(item.fechaVto).toLocaleDateString("es-AR")
                          : "Sin vencimiento"}
                      </TableCell>
                      <TableCell className="text-right">{item.overdueDays}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(item.saldo)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clientes" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Estado de la cartera</CardTitle>
                <CardDescription>Cobertura de datos y condiciones comerciales</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 pt-2">
                  {[
                    {
                      label: "Activos",
                      count: customerHealth.activos,
                      total: customerHealth.total,
                      color: "bg-green-500",
                    },
                    {
                      label: "Facturables",
                      count: customerHealth.facturables,
                      total: customerHealth.total,
                      color: "bg-blue-500",
                    },
                    {
                      label: "Con email",
                      count: customerHealth.conEmail,
                      total: customerHealth.total,
                      color: "bg-amber-500",
                    },
                    {
                      label: "Con límite",
                      count: customerHealth.conLimite,
                      total: customerHealth.total,
                      color: "bg-purple-500",
                    },
                  ].map((entry) => {
                    const pct = entry.total > 0 ? Math.round((entry.count / entry.total) * 100) : 0
                    return (
                      <div key={entry.label} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{entry.label}</span>
                          <span className="font-semibold">
                            {entry.count} ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full ${entry.color}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Ranking de clientes</CardTitle>
                <CardDescription>Facturación acumulada y saldo del período</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Condición IVA</TableHead>
                      <TableHead className="text-right">Facturado</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topClientes.map((cliente, index) => (
                      <TableRow key={cliente.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-medium">{cliente.razonSocial}</p>
                          <p className="font-mono text-xs text-muted-foreground">
                            {cliente.nroDocumento}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {cliente.condicionIva}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold text-primary">
                          {formatCurrency(cliente.total)}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {formatCurrency(cliente.saldo)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Potencial crediticio visible</CardTitle>
              <CardDescription>Capacidad declarada en las fichas de terceros</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">Límite total declarado</p>
                  <p className="mt-1 text-2xl font-bold text-primary">
                    {formatCompactCurrency(customerHealth.limiteTotal)}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">Clientes con teléfono</p>
                  <p className="mt-1 text-2xl font-bold">{customerHealth.conTelefono}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">Clientes inactivos</p>
                  <p className="mt-1 text-2xl font-bold text-slate-600">
                    {customerHealth.inactivos}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
