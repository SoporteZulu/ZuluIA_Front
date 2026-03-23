"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Truck,
  FileText,
  PackageCheck,
  ClipboardList,
  Receipt,
  CreditCard,
  DollarSign,
  BarChart3,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  Package,
  Boxes,
  Wallet,
  CircleDollarSign,
} from "lucide-react"
import Link from "next/link"
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import { useComprobantes } from "@/lib/hooks/useComprobantes"
import { useOrdenesCompra } from "@/lib/hooks/useOrdenesCompra"
import { useProveedores } from "@/lib/hooks/useTerceros"
import { useDefaultSucursalId } from "@/lib/hooks/useSucursales"
import { useStockResumen } from "@/lib/hooks/useStock"

function formatMoney(value: number) {
  return value.toLocaleString("es-AR", { style: "currency", currency: "ARS" })
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
}

function buildComprasPorMes(totalsByMonth: Map<string, number>) {
  const now = new Date()
  return Array.from({ length: 7 }, (_, index) => {
    const month = new Date(now.getFullYear(), now.getMonth() - (6 - index), 1)
    const key = `${month.getFullYear()}-${month.getMonth()}`
    return {
      mes: month.toLocaleDateString("es-AR", { month: "short", year: "2-digit" }),
      monto: totalsByMonth.get(key) ?? 0,
    }
  })
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function formatDate(value?: string | Date | null) {
  if (!value) return "Sin fecha"
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value))
}

function getDaysUntil(value?: string | Date | null) {
  if (!value) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(value)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

function buildSupplierScore(orderStats: {
  total: number
  retrasadas: number
  canceladas: number
  recibidas: number
}) {
  if (orderStats.total <= 0) return 0

  const deliveredRatio = orderStats.recibidas / orderStats.total
  const delayedRatio = orderStats.retrasadas / orderStats.total
  const cancelledRatio = orderStats.canceladas / orderStats.total

  return clamp(3 + deliveredRatio * 2 - delayedRatio * 1.5 - cancelledRatio, 1, 5)
}

export default function ComprasDashboard() {
  const { ordenes } = useOrdenesCompra()
  const { terceros } = useProveedores()
  const { comprobantes: facturasCompra } = useComprobantes({ esCompra: true })
  const defaultSucursalId = useDefaultSucursalId()
  const { resumen } = useStockResumen(defaultSucursalId)

  const comprasActivas = useMemo(
    () => facturasCompra.filter((c) => c.estado !== "ANULADO"),
    [facturasCompra]
  )

  const currentMonth = useMemo(() => {
    const now = new Date()
    return { start: startOfMonth(now), end: endOfMonth(now) }
  }, [])

  const previousMonth = useMemo(() => {
    const now = new Date()
    const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return { start: startOfMonth(previous), end: endOfMonth(previous) }
  }, [])

  const comprasMesActual = useMemo(
    () =>
      comprasActivas.filter((c) => {
        const fecha = new Date(c.fecha)
        return fecha >= currentMonth.start && fecha <= currentMonth.end
      }),
    [comprasActivas, currentMonth.end, currentMonth.start]
  )

  const comprasMesAnterior = useMemo(
    () =>
      comprasActivas.filter((c) => {
        const fecha = new Date(c.fecha)
        return fecha >= previousMonth.start && fecha <= previousMonth.end
      }),
    [comprasActivas, previousMonth.end, previousMonth.start]
  )

  const totalsByMonth = useMemo(() => {
    const map = new Map<string, number>()
    comprasActivas.forEach((c) => {
      const fecha = new Date(c.fecha)
      const key = `${fecha.getFullYear()}-${fecha.getMonth()}`
      map.set(key, (map.get(key) ?? 0) + c.total)
    })
    return map
  }, [comprasActivas])

  const comprasPorMes = useMemo(() => buildComprasPorMes(totalsByMonth), [totalsByMonth])

  const comprasPorEstado = useMemo(() => {
    const colores = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444"]
    const estados = ["BORRADOR", "EMITIDO", "PAGADO_PARCIAL", "PAGADO"]
    return estados
      .map((estado, i) => ({
        name: estado,
        valor: comprasActivas.filter((c) => c.estado === estado).length,
        color: colores[i] ?? "#94a3b8",
      }))
      .filter((row) => row.valor > 0)
  }, [comprasActivas])

  const topProveedores = useMemo(() => {
    const grouped = new Map<
      number,
      {
        ordenes: number
        volumen: number
        saldoAbierto: number
        retrasadas: number
        canceladas: number
        recibidas: number
      }
    >()

    ordenes.forEach((order) => {
      const current = grouped.get(order.proveedorId) ?? {
        ordenes: 0,
        volumen: 0,
        saldoAbierto: 0,
        retrasadas: 0,
        canceladas: 0,
        recibidas: 0,
      }
      current.ordenes += 1
      if (order.estadoOc === "CANCELADA") current.canceladas += 1
      if (order.estadoOc === "RECIBIDA") current.recibidas += 1
      if (
        order.fechaEntregaReq &&
        order.estadoOc === "PENDIENTE" &&
        new Date(order.fechaEntregaReq) < new Date()
      ) {
        current.retrasadas += 1
      }
      grouped.set(order.proveedorId, current)
    })

    comprasActivas.forEach((invoice) => {
      const current = grouped.get(invoice.terceroId) ?? {
        ordenes: 0,
        volumen: 0,
        saldoAbierto: 0,
        retrasadas: 0,
        canceladas: 0,
        recibidas: 0,
      }
      current.volumen += invoice.total
      current.saldoAbierto += invoice.saldo > 0 ? invoice.saldo : 0
      grouped.set(invoice.terceroId, current)
    })

    return Array.from(grouped.entries())
      .map(([proveedorId, stats]) => {
        const prov = terceros.find((t) => t.id === proveedorId)
        const score = buildSupplierScore({
          total: stats.ordenes,
          retrasadas: stats.retrasadas,
          canceladas: stats.canceladas,
          recibidas: stats.recibidas,
        })

        return {
          proveedorId,
          proveedor: prov?.razonSocial ?? `Proveedor #${proveedorId}`,
          ordenes: stats.ordenes,
          volumen: stats.volumen,
          saldoAbierto: stats.saldoAbierto,
          score,
          retrasadas: stats.retrasadas,
          recibidas: stats.recibidas,
        }
      })
      .sort((a, b) => b.volumen - a.volumen || b.score - a.score || b.ordenes - a.ordenes)
      .slice(0, 5)
  }, [comprasActivas, ordenes, terceros])

  const supplierRating = useMemo(() => {
    const withOrders = topProveedores.filter((provider) => provider.ordenes > 0)
    if (withOrders.length === 0) return 0
    return withOrders.reduce((sum, provider) => sum + provider.score, 0) / withOrders.length
  }, [topProveedores])

  const cumplimientoOrdenes = useMemo(() => {
    if (ordenes.length === 0) return 0
    const recibidas = ordenes.filter((order) => order.estadoOc === "RECIBIDA").length
    return (recibidas / ordenes.length) * 100
  }, [ordenes])

  const upcomingDueInvoices = useMemo(
    () =>
      comprasActivas.filter((invoice) => {
        if (!invoice.fechaVto || invoice.saldo <= 0) return false
        const diff = new Date(invoice.fechaVto).getTime() - Date.now()
        return diff > 0 && diff <= 7 * 24 * 60 * 60 * 1000
      }),
    [comprasActivas]
  )

  const overdueInvoices = useMemo(
    () =>
      comprasActivas.filter((invoice) => {
        if (!invoice.fechaVto || invoice.saldo <= 0) return false
        return new Date(invoice.fechaVto).getTime() < Date.now()
      }),
    [comprasActivas]
  )

  const proveedoresRadar = useMemo(
    () =>
      topProveedores.map((provider) => ({
        ...provider,
        circuito:
          provider.retrasadas > 0
            ? "Entrega comprometida"
            : provider.saldoAbierto > 0
              ? "Saldo abierto"
              : "Circuito controlado",
      })),
    [topProveedores]
  )

  const facturasSeguimiento = useMemo(
    () =>
      [...comprasActivas]
        .filter((invoice) => invoice.saldo > 0)
        .map((invoice) => {
          const proveedor = terceros.find((tercero) => tercero.id === invoice.terceroId)
          const daysToDue = getDaysUntil(invoice.fechaVto)

          return {
            id: invoice.id,
            numero: invoice.numero,
            proveedor: proveedor?.razonSocial ?? `Proveedor #${invoice.terceroId}`,
            fecha: invoice.fecha,
            fechaVto: invoice.fechaVto,
            saldo: invoice.saldo,
            total: invoice.total,
            estado: invoice.estado,
            daysToDue,
          }
        })
        .sort((left, right) => {
          const leftValue = left.daysToDue ?? 9999
          const rightValue = right.daysToDue ?? 9999
          return leftValue - rightValue
        })
        .slice(0, 6),
    [comprasActivas, terceros]
  )

  const valorComprasMes = useMemo(
    () => comprasMesActual.reduce((sum, invoice) => sum + invoice.total, 0),
    [comprasMesActual]
  )

  const valorComprasMesAnterior = useMemo(
    () => comprasMesAnterior.reduce((sum, invoice) => sum + invoice.total, 0),
    [comprasMesAnterior]
  )

  const variacionMensual = useMemo(() => {
    if (valorComprasMesAnterior <= 0) return 0
    return ((valorComprasMes - valorComprasMesAnterior) / valorComprasMesAnterior) * 100
  }, [valorComprasMes, valorComprasMesAnterior])

  const kpis = useMemo(() => {
    const ordenesActivas = ordenes.filter((o) => o.estadoOc === "PENDIENTE" && o.habilitada).length
    const recepcionesPendientes = ordenes.filter((o) => o.estadoOc === "PENDIENTE").length
    const solicitudesPendientes = resumen?.itemsBajoMinimo ?? 0
    const proximosVencimientos = upcomingDueInvoices.length
    const saldoAbierto = comprasActivas.reduce(
      (sum, invoice) => sum + (invoice.saldo > 0 ? invoice.saldo : 0),
      0
    )
    const ordenesRetrasadas = ordenes.filter((o) => {
      if (!o.fechaEntregaReq || o.estadoOc !== "PENDIENTE") return false
      return new Date(o.fechaEntregaReq) < new Date()
    }).length
    const productosStockBajo = resumen?.itemsBajoMinimo ?? 0
    const proveedoresConActividad = topProveedores.filter(
      (provider) => provider.ordenes > 0 || provider.volumen > 0
    ).length
    return {
      ordenesActivas,
      recepcionesPendientes,
      solicitudesPendientes,
      proximosVencimientos,
      saldoAbierto,
      ordenesRetrasadas,
      valorComprasMes,
      ratingPromedioProveedores: supplierRating,
      cumplimientoOrdenes,
      proveedoresConActividad,
      productosStockBajo,
    }
  }, [
    comprasActivas,
    ordenes,
    resumen,
    supplierRating,
    topProveedores,
    upcomingDueInvoices.length,
    valorComprasMes,
    cumplimientoOrdenes,
  ])

  const modules = [
    {
      title: "Proveedores",
      url: "/compras/proveedores",
      icon: Truck,
      count: `${terceros.length} activos`,
      color: "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20",
    },
    {
      title: "Órdenes de Compra",
      url: "/compras/ordenes",
      icon: FileText,
      count: `${kpis.ordenesActivas} activas`,
      color: "bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20",
    },
    {
      title: "Recepciones",
      url: "/compras/recepciones",
      icon: PackageCheck,
      count: `${kpis.recepcionesPendientes} pendientes`,
      color: "bg-green-500/10 text-green-600 hover:bg-green-500/20",
    },
    {
      title: "Requisiciones",
      url: "/compras/solicitudes",
      icon: ClipboardList,
      count: `${kpis.solicitudesPendientes} por revisar`,
      color: "bg-orange-500/10 text-orange-600 hover:bg-orange-500/20",
    },
    {
      title: "Facturas",
      url: "/compras/facturas",
      icon: Receipt,
      count: `${comprasActivas.length} comprobantes`,
      color: "bg-purple-500/10 text-purple-600 hover:bg-purple-500/20",
    },
    {
      title: "Cedulones",
      url: "/compras/cedulones",
      icon: CreditCard,
      count: "Circuito específico",
      color: "bg-pink-500/10 text-pink-600 hover:bg-pink-500/20",
    },
    {
      title: "Productos",
      url: "/inventario/productos",
      icon: Boxes,
      count: `${kpis.productosStockBajo} con alerta`,
      color: "bg-red-500/10 text-red-600 hover:bg-red-500/20",
    },
    {
      title: "Movimientos",
      url: "/inventario/movimientos",
      icon: BarChart3,
      count: "Stock y ajustes",
      color: "bg-cyan-500/10 text-cyan-600 hover:bg-cyan-500/20",
    },
  ]

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard de Compras</h1>
          <p className="text-muted-foreground">
            Gestión integral de compras, proveedores y reabastecimiento
          </p>
        </div>
      </div>

      {/* Navegación Rápida */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Acceso Rápido</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {modules.map((module) => {
            const Icon = module.icon
            return (
              <Link key={module.url} href={module.url}>
                <Card className={`transition-colors cursor-pointer ${module.color}`}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">{module.title}</CardTitle>
                    <Icon className="h-5 w-5" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs text-muted-foreground">{module.count}</div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>

      {/* KPIs Principales */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Indicadores Clave</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Compras del Mes */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Compras del Mes</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${kpis.valorComprasMes.toLocaleString("es-AR")}
              </div>
              <div
                className={`flex items-center text-xs mt-1 ${variacionMensual >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {variacionMensual >= 0 ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1" />
                )}
                <span>{`${variacionMensual >= 0 ? "+" : ""}${variacionMensual.toFixed(1)}% vs mes anterior`}</span>
              </div>
            </CardContent>
          </Card>

          {/* Saldo Abierto */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Saldo Abierto</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatMoney(kpis.saldoAbierto)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {upcomingDueInvoices.length} próximas a vencer, {overdueInvoices.length} ya vencidas
              </p>
            </CardContent>
          </Card>

          {/* Cumplimiento OC */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Cumplimiento OC</CardTitle>
              <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.cumplimientoOrdenes.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                Score promedio {kpis.ratingPromedioProveedores.toFixed(1)}/5 con{" "}
                {kpis.proveedoresConActividad} proveedores activos
              </p>
            </CardContent>
          </Card>

          {/* Productos Stock Bajo */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.productosStockBajo}</div>
              <p className="text-xs text-muted-foreground mt-1">Productos bajo punto de reorden</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Alertas Críticas */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Alertas y Notificaciones</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <CardTitle className="text-base">Órdenes Retrasadas</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-red-600">{kpis.ordenesRetrasadas}</span> órdenes
                de compra con fecha de entrega vencida
              </p>
              <Link
                href="/compras/ordenes?filtro=retrasadas"
                className="text-sm text-primary hover:underline mt-2 inline-block"
              >
                Ver detalles →
              </Link>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-500" />
                <CardTitle className="text-base">Próximos Vencimientos</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-orange-600">{kpis.proximosVencimientos}</span>{" "}
                facturas de compra vencen en los próximos 7 días
              </p>
              <Link
                href="/compras/facturas?filtro=proximos-vencimientos"
                className="text-sm text-primary hover:underline mt-2 inline-block"
              >
                Ver detalles →
              </Link>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-yellow-500">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-yellow-500" />
                <CardTitle className="text-base">Productos por Reabastecer</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-yellow-600">{kpis.productosStockBajo}</span>{" "}
                productos por debajo del punto de reorden
              </p>
              <Link
                href="/compras/solicitudes?tipo=automatico"
                className="text-sm text-primary hover:underline mt-2 inline-block"
              >
                Ver solicitudes →
              </Link>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-blue-500" />
                <CardTitle className="text-base">Solicitudes Pendientes</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-blue-600">{kpis.solicitudesPendientes}</span>{" "}
                necesidades de compra detectadas desde stock real
              </p>
              <Link
                href="/compras/solicitudes?estado=pendiente"
                className="text-sm text-primary hover:underline mt-2 inline-block"
              >
                Revisar →
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Compras por Mes */}
        <Card>
          <CardHeader>
            <CardTitle>Evolución de Compras</CardTitle>
            <CardDescription>Últimos 7 meses por facturas de compra reales</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={comprasPorMes}>
                <defs>
                  <linearGradient id="colorMonto" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="mes" className="text-xs" />
                <YAxis
                  className="text-xs"
                  tickFormatter={(value) => `$${Math.round(value / 1000)}k`}
                />
                <Tooltip formatter={(value: number) => formatMoney(value)} />
                <Area
                  type="monotone"
                  dataKey="monto"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorMonto)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Compras por Categoría */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Estado</CardTitle>
            <CardDescription>Participación actual por estado documental</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={comprasPorEstado}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="valor"
                  label
                >
                  {comprasPorEstado.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Proveedores */}
      <Card>
        <CardHeader>
          <CardTitle>Proveedores con Mayor Actividad</CardTitle>
          <CardDescription>
            Volumen, saldo abierto y cumplimiento estimado de órdenes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topProveedores.map((prov, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                    <span className="text-sm font-semibold text-primary">{index + 1}</span>
                  </div>
                  <div>
                    <p className="font-medium">{prov.proveedor}</p>
                    <p className="text-sm text-muted-foreground">
                      {prov.ordenes} órdenes, {prov.recibidas} recibidas, {prov.retrasadas}{" "}
                      retrasadas
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatMoney(prov.volumen)}</p>
                  <p className="text-sm text-muted-foreground">
                    Abierto {formatMoney(prov.saldoAbierto)}
                  </p>
                  <p className="text-xs text-muted-foreground">Score {prov.score.toFixed(1)}/5</p>
                </div>
              </div>
            ))}
            {topProveedores.length === 0 && (
              <div className="text-sm text-muted-foreground">
                No hay proveedores con compras registradas todavía.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Radar de Proveedores</CardTitle>
            <CardDescription>
              Volumen, saldo pendiente y circuito de entrega para los proveedores mas activos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proveedor</TableHead>
                  <TableHead className="text-right">Ordenes</TableHead>
                  <TableHead className="text-right">Volumen</TableHead>
                  <TableHead className="text-right">Abierto</TableHead>
                  <TableHead>Circuito</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proveedoresRadar.map((provider) => (
                  <TableRow key={provider.proveedorId}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{provider.proveedor}</div>
                        <div className="text-xs text-muted-foreground">
                          Score {provider.score.toFixed(1)}/5 · {provider.recibidas} recibidas
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{provider.ordenes}</TableCell>
                    <TableCell className="text-right">{formatMoney(provider.volumen)}</TableCell>
                    <TableCell className="text-right">
                      {formatMoney(provider.saldoAbierto)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          provider.retrasadas > 0
                            ? "destructive"
                            : provider.saldoAbierto > 0
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {provider.circuito}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {proveedoresRadar.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-4 text-center text-muted-foreground">
                      Sin proveedores para analizar.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Seguimiento de Facturas</CardTitle>
            <CardDescription>
              Documentos con saldo abierto, vencimiento y prioridad de pago visible.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Comprobante</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead>Circuito</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {facturasSeguimiento.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{invoice.numero}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(invoice.fecha)} · {formatMoney(invoice.total)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{invoice.proveedor}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div>{formatDate(invoice.fechaVto)}</div>
                        <div className="text-xs text-muted-foreground">
                          {invoice.daysToDue === null
                            ? "Sin vencimiento"
                            : invoice.daysToDue < 0
                              ? `${Math.abs(invoice.daysToDue)} dias vencida`
                              : `${invoice.daysToDue} dias restantes`}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{formatMoney(invoice.saldo)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          invoice.daysToDue !== null && invoice.daysToDue < 0
                            ? "destructive"
                            : invoice.daysToDue !== null && invoice.daysToDue <= 7
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {invoice.daysToDue !== null && invoice.daysToDue < 0
                          ? "Vencida"
                          : invoice.daysToDue !== null && invoice.daysToDue <= 7
                            ? "Prioridad alta"
                            : invoice.estado}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {facturasSeguimiento.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-4 text-center text-muted-foreground">
                      Sin facturas abiertas para seguimiento.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
