"use client"

import React from "react"
import Link from "next/link"
import {
  Users,
  FileText,
  Truck,
  Receipt,
  Package,
  CreditCard,
  Landmark,
  ShoppingCart,
  ArrowRight,
  AlertTriangle,
  Clock,
  DollarSign,
  BarChart2,
  Tag,
  Percent,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  RotateCcw,
  Scale,
  MonitorCog,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts"
import { useComprobantes } from "@/lib/hooks/useComprobantes"
import { useTerceros } from "@/lib/hooks/useTerceros"
import { useComprobantesConfig } from "@/lib/hooks/useComprobantes"
import type { Comprobante, TipoComprobante } from "@/lib/types/comprobantes"

// ─── Workflow Document ─────────────────────────────────────────────────────────

const workflowSteps = [
  {
    icon: Users,
    label: "Lead/Oportunidad",
    sub: "CRM",
    href: "/crm/oportunidades",
    color: "border-blue-200 bg-blue-50 hover:bg-blue-100",
    iconColor: "text-blue-600",
  },
  {
    icon: FileText,
    label: "Presupuesto",
    sub: "Cotización",
    href: "/ventas/listas-precios",
    color: "border-violet-200 bg-violet-50 hover:bg-violet-100",
    iconColor: "text-violet-600",
  },
  {
    icon: ShoppingCart,
    label: "Pedido",
    sub: "Orden de Venta",
    href: "/ventas/pedidos",
    color: "border-green-200 bg-green-50 hover:bg-green-100",
    iconColor: "text-green-600",
  },
  {
    icon: Truck,
    label: "Remito",
    sub: "Despacho",
    href: "/ventas/remitos",
    color: "border-orange-200 bg-orange-50 hover:bg-orange-100",
    iconColor: "text-orange-600",
  },
  {
    icon: Receipt,
    label: "Factura",
    sub: "Comprobante AFIP",
    href: "/ventas/facturas",
    color: "border-red-200 bg-red-50 hover:bg-red-100",
    iconColor: "text-red-600",
  },
  {
    icon: CreditCard,
    label: "Cobro",
    sub: "Recibo de Pago",
    href: "/ventas/cobros",
    color: "border-teal-200 bg-teal-50 hover:bg-teal-100",
    iconColor: "text-teal-600",
  },
  {
    icon: Tag,
    label: "Nota de Crédito",
    sub: "Devolución/Ajuste",
    href: "/ventas/notas-credito",
    color: "border-pink-200 bg-pink-50 hover:bg-pink-100",
    iconColor: "text-pink-600",
  },
  {
    icon: Percent,
    label: "Nota de Débito",
    sub: "Cargo adicional",
    href: "/ventas/notas-debito",
    color: "border-amber-200 bg-amber-50 hover:bg-amber-100",
    iconColor: "text-amber-600",
  },
]

const comprobantesExpansionLinks = [
  {
    title: "Cobros",
    description: "Alta, detalle y anulación con backend real",
    href: "/ventas/cobros",
    icon: CreditCard,
    color: "border-teal-200 bg-teal-50 hover:bg-teal-100",
    iconColor: "text-teal-600",
  },
  {
    title: "Cheques",
    description: "Cartera, depósito, rechazo y entrega",
    href: "/ventas/cheques",
    icon: DollarSign,
    color: "border-cyan-200 bg-cyan-50 hover:bg-cyan-100",
    iconColor: "text-cyan-600",
  },
  {
    title: "Notas Débito",
    description: "Cargos y recálculos sobre comprobantes",
    href: "/ventas/notas-debito",
    icon: Percent,
    color: "border-amber-200 bg-amber-50 hover:bg-amber-100",
    iconColor: "text-amber-600",
  },
  {
    title: "Devoluciones",
    description: "Seguimiento visible de devoluciones y resolución",
    href: "/ventas/devoluciones",
    icon: RotateCcw,
    color: "border-rose-200 bg-rose-50 hover:bg-rose-100",
    iconColor: "text-rose-600",
  },
  {
    title: "Ajustes",
    description: "Débitos y créditos comerciales con workbench y notas reales",
    href: "/ventas/ajustes",
    icon: Scale,
    color: "border-slate-200 bg-slate-50 hover:bg-slate-100",
    iconColor: "text-slate-700",
  },
  {
    title: "Imputaciones",
    description: "Aplicación documental y contable visible",
    href: "/ventas/imputaciones",
    icon: Landmark,
    color: "border-indigo-200 bg-indigo-50 hover:bg-indigo-100",
    iconColor: "text-indigo-600",
  },
  {
    title: "Operaciones",
    description: "Monitor, ventanilla, batch e inicialización masiva honesta",
    href: "/ventas/operaciones",
    icon: MonitorCog,
    color: "border-fuchsia-200 bg-fuchsia-50 hover:bg-fuchsia-100",
    iconColor: "text-fuchsia-700",
  },
]

const ventasBaseLinks = [
  {
    title: "Clientes",
    description: "Maestro comercial, detalle fiscal y circuito heredado visible.",
    href: "/ventas/clientes",
    icon: Users,
    color: "border-violet-200 bg-violet-50 hover:bg-violet-100",
    iconColor: "text-violet-600",
  },
  {
    title: "Productos",
    description: "Catálogo, stock y alertas operativas del maestro de ventas.",
    href: "/ventas/productos",
    icon: Package,
    color: "border-sky-200 bg-sky-50 hover:bg-sky-100",
    iconColor: "text-sky-600",
  },
  {
    title: "Listas de Precios",
    description: "Vigencia, prioridad comercial y lectura destacada de listas.",
    href: "/ventas/listas-precios",
    icon: FileText,
    color: "border-blue-200 bg-blue-50 hover:bg-blue-100",
    iconColor: "text-blue-600",
  },
  {
    title: "Descuentos",
    description: "Reglas comerciales por cliente y producto con contexto real.",
    href: "/ventas/descuentos",
    icon: Percent,
    color: "border-amber-200 bg-amber-50 hover:bg-amber-100",
    iconColor: "text-amber-600",
  },
  {
    title: "Puntos de Facturación",
    description: "Cobertura operativa de tipos, sucursales y numeración visible.",
    href: "/ventas/puntos-facturacion",
    icon: Receipt,
    color: "border-rose-200 bg-rose-50 hover:bg-rose-100",
    iconColor: "text-rose-600",
  },
  {
    title: "Cuenta Corriente",
    description: "Saldos, movimientos y lectura de cartera por cliente.",
    href: "/ventas/cuenta-corriente",
    icon: Landmark,
    color: "border-emerald-200 bg-emerald-50 hover:bg-emerald-100",
    iconColor: "text-emerald-700",
  },
]

function normalizeText(value?: string | null) {
  return (value ?? "").toLowerCase()
}

function isOrderType(tipo: TipoComprobante) {
  const text = `${normalizeText(tipo.codigo)} ${normalizeText(tipo.descripcion)}`
  return text.includes("pedido") || /(^|\W)ped($|\W)/.test(text)
}

function isRemitoType(tipo: TipoComprobante) {
  const text = `${normalizeText(tipo.codigo)} ${normalizeText(tipo.descripcion)}`
  return text.includes("remito") || text.includes("rto")
}

function buildVentasMensuales(comprobantes: Comprobante[], referenceDate: Date) {
  const now = referenceDate
  const buckets = Array.from({ length: 12 }, (_, index) => {
    const month = new Date(now.getFullYear(), now.getMonth() - (11 - index), 1)
    return {
      key: `${month.getFullYear()}-${month.getMonth()}`,
      mes: month.toLocaleDateString("es-AR", { month: "short" }),
      ventas: 0,
      meta: 0,
    }
  })

  const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]))
  comprobantes.forEach((comprobante) => {
    const fecha = new Date(comprobante.fecha)
    const key = `${fecha.getFullYear()}-${fecha.getMonth()}`
    const bucket = bucketMap.get(key)
    if (!bucket) return
    bucket.ventas += comprobante.total
  })

  let lastMeta = 0
  buckets.forEach((bucket, index) => {
    const trailing = buckets.slice(Math.max(0, index - 2), index + 1)
    const avg = trailing.reduce((sum, current) => sum + current.ventas, 0) / (trailing.length || 1)
    lastMeta = Math.max(avg, lastMeta * 0.98)
    bucket.meta = Math.round(lastMeta)
  })

  return buckets
}

function buildAntiguedadDeuda(comprobantes: Comprobante[], referenceDate: Date) {
  const buckets = [
    { rango: "0-30 días", monto: 0, color: "#3b82f6" },
    { rango: "31-60 días", monto: 0, color: "#f59e0b" },
    { rango: "61-90 días", monto: 0, color: "#ef4444" },
    { rango: "+90 días", monto: 0, color: "#991b1b" },
  ]

  comprobantes.forEach((comprobante) => {
    if (!comprobante.fechaVto || comprobante.saldo <= 0) return
    const diffDays = Math.floor(
      (referenceDate.getTime() - new Date(comprobante.fechaVto).getTime()) / (1000 * 60 * 60 * 24)
    )
    if (diffDays < 0) return
    if (diffDays <= 30) buckets[0].monto += comprobante.saldo
    else if (diffDays <= 60) buckets[1].monto += comprobante.saldo
    else if (diffDays <= 90) buckets[2].monto += comprobante.saldo
    else buckets[3].monto += comprobante.saldo
  })

  return buckets
}

// ─── Main Component ────────────────────────────────────────────────────────────────────────────

export default function VentasDashboard() {
  const { comprobantes } = useComprobantes({ esVenta: true })
  const { terceros } = useTerceros({ soloActivos: false })
  const { tipos } = useComprobantesConfig()
  const [today] = React.useState(() => new Date())

  const salesComprobantes = React.useMemo(
    () => comprobantes.filter((c) => c.estado !== "ANULADO"),
    [comprobantes]
  )

  const currentMonthLabel = React.useMemo(
    () => today.toLocaleDateString("es-AR", { month: "long", year: "numeric" }),
    [today]
  )

  const orderTypeIds = React.useMemo(
    () => new Set(tipos.filter((tipo) => tipo.esVenta && isOrderType(tipo)).map((tipo) => tipo.id)),
    [tipos]
  )

  const remitoTypeIds = React.useMemo(
    () =>
      new Set(tipos.filter((tipo) => tipo.esVenta && isRemitoType(tipo)).map((tipo) => tipo.id)),
    [tipos]
  )

  const pedidos = React.useMemo(
    () => salesComprobantes.filter((c) => orderTypeIds.has(c.tipoComprobanteId)),
    [orderTypeIds, salesComprobantes]
  )

  const remitos = React.useMemo(
    () => salesComprobantes.filter((c) => remitoTypeIds.has(c.tipoComprobanteId)),
    [remitoTypeIds, salesComprobantes]
  )

  const ventasMensuales = React.useMemo(
    () => buildVentasMensuales(salesComprobantes, today),
    [salesComprobantes, today]
  )

  const topClientes = React.useMemo(() => {
    const totals = new Map<number, number>()
    salesComprobantes.forEach((c) => {
      totals.set(c.terceroId, (totals.get(c.terceroId) ?? 0) + c.saldo)
    })
    return Array.from(totals.entries())
      .map(([terceroId, monto]) => ({
        cliente: terceros.find((t) => t.id === terceroId)?.razonSocial ?? `Cliente #${terceroId}`,
        monto,
      }))
      .sort((a, b) => b.monto - a.monto)
      .slice(0, 8)
  }, [salesComprobantes, terceros])

  const antiguedadDeuda = React.useMemo(
    () => buildAntiguedadDeuda(salesComprobantes, today),
    [salesComprobantes, today]
  )

  const porCobrar = React.useMemo(
    () => salesComprobantes.filter((c) => c.saldo > 0).reduce((s, c) => s + c.saldo, 0),
    [salesComprobantes]
  )
  const facturasVencidas = React.useMemo(
    () =>
      salesComprobantes.filter((c) => c.saldo > 0 && c.fechaVto && new Date(c.fechaVto) < today),
    [salesComprobantes, today]
  )

  const carteraClientes = React.useMemo(() => {
    const clientes = terceros.filter((tercero) => tercero.esCliente)
    const activos = clientes.filter((cliente) => cliente.activo).length
    const facturables = clientes.filter((cliente) => cliente.facturable).length
    const conLimite = clientes.filter((cliente) => (cliente.limiteCredito ?? 0) > 0).length
    const conEmail = clientes.filter((cliente) => Boolean(cliente.email)).length

    const condicionIva = Array.from(
      clientes.reduce((acc, cliente) => {
        const key = cliente.condicionIvaDescripcion ?? "Sin condición"
        acc.set(key, (acc.get(key) ?? 0) + 1)
        return acc
      }, new Map<string, number>())
    )
      .map(([condicion, cantidad]) => ({ condicion, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 4)

    return {
      total: clientes.length,
      activos,
      inactivos: clientes.length - activos,
      facturables,
      conLimite,
      conEmail,
      condicionIva,
    }
  }, [terceros])

  const estadosPedidos = React.useMemo(
    () =>
      [
        {
          name: "Borrador",
          value: pedidos.filter((c) => c.estado === "BORRADOR").length,
          color: "#6b7280",
        },
        {
          name: "Emitido",
          value: pedidos.filter((c) => c.estado === "EMITIDO").length,
          color: "#3b82f6",
        },
        {
          name: "Pago Parc.",
          value: pedidos.filter((c) => c.estado === "PAGADO_PARCIAL").length,
          color: "#f59e0b",
        },
        {
          name: "Pagado",
          value: pedidos.filter((c) => c.estado === "PAGADO").length,
          color: "#10b981",
        },
        {
          name: "Anulado",
          value: pedidos.filter((c) => c.estado === "ANULADO").length,
          color: "#ef4444",
        },
      ].filter((row) => row.value > 0),
    [pedidos]
  )

  const alertas = React.useMemo(
    () => [
      {
        tipo: "error",
        icon: XCircle,
        texto: `${carteraClientes.inactivos} clientes inactivos en cartera`,
        href: "/ventas/clientes",
      },
      {
        tipo: "warning",
        icon: AlertTriangle,
        texto: `${facturasVencidas.length} facturas vencidas sin cobrar`,
        href: "/ventas/facturas",
      },
      {
        tipo: "warning",
        icon: Clock,
        texto: `${salesComprobantes.filter((c) => c.saldo > 0).length} comprobantes con saldo pendiente`,
        href: "/ventas/cuenta-corriente",
      },
      {
        tipo: "info",
        icon: CheckCircle2,
        texto: `${salesComprobantes.filter((c) => c.estado === "PAGADO").length} comprobantes cobrados`,
        href: "/ventas/reportes",
      },
    ],
    [carteraClientes.inactivos, facturasVencidas, salesComprobantes]
  )

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Ventas</h1>
          <p className="text-muted-foreground">
            Dashboard ejecutivo basado en comprobantes reales — {currentMonthLabel}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/ventas/clientes">
            <Button variant="outline" size="sm" className="bg-transparent">
              <Users className="h-4 w-4 mr-2" />
              Clientes
            </Button>
          </Link>
          <Link href="/ventas/pedidos">
            <Button size="sm">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Nuevo Pedido
            </Button>
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ventas del Mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${salesComprobantes.reduce((s, c) => s + c.total, 0).toLocaleString("es-AR")}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <ArrowUpRight className="h-3 w-3 text-green-600" />
              <p className="text-xs text-green-600 font-medium">Acumulado del período</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pedidos Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pedidos.filter((c) => c.estado === "BORRADOR").length}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <ArrowDownRight className="h-3 w-3 text-orange-500" />
              <p className="text-xs text-orange-500">
                {pedidos.filter((c) => c.estado === "EMITIDO").length} confirmados
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Por Cobrar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${porCobrar.toLocaleString("es-AR")}</div>
            <div className="flex items-center gap-1 mt-1">
              {facturasVencidas.length > 0 ? (
                <AlertTriangle className="h-3 w-3 text-red-500" />
              ) : (
                <CheckCircle2 className="h-3 w-3 text-green-500" />
              )}
              <p
                className={`text-xs font-medium ${facturasVencidas.length > 0 ? "text-red-500" : "text-green-500"}`}
              >
                {facturasVencidas.length} fact. vencidas
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-violet-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Clientes Activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{carteraClientes.activos}</div>
            <div className="flex items-center gap-1 mt-1">
              <ArrowUpRight className="h-3 w-3 text-green-600" />
              <p className="text-xs text-green-600">{carteraClientes.total} clientes en cartera</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Clientes Facturables
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{carteraClientes.facturables}</div>
            <p className="text-xs text-muted-foreground mt-1">Con circuito comercial habilitado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Clientes con Límite
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{carteraClientes.conLimite}</div>
            <p className="text-xs text-muted-foreground mt-1">Marco crediticio visible</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Clientes con Email
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{carteraClientes.conEmail}</div>
            <p className="text-xs text-muted-foreground mt-1">Base disponible para seguimiento</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Clientes Inactivos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-600">{carteraClientes.inactivos}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Requieren depuración o reactivación
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas */}
      <Card className="border-amber-200 bg-amber-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            Alertas Prioritarias
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-3">
            {alertas.map((alerta, i) => (
              <Link key={i} href={alerta.href}>
                <div
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                    alerta.tipo === "error"
                      ? "bg-red-50 border-red-200 hover:bg-red-100"
                      : alerta.tipo === "warning"
                        ? "bg-amber-50 border-amber-200 hover:bg-amber-100"
                        : "bg-blue-50 border-blue-200 hover:bg-blue-100"
                  }`}
                >
                  <alerta.icon
                    className={`h-4 w-4 shrink-0 ${
                      alerta.tipo === "error"
                        ? "text-red-600"
                        : alerta.tipo === "warning"
                          ? "text-amber-600"
                          : "text-blue-600"
                    }`}
                  />
                  <span className="text-sm font-medium">{alerta.texto}</span>
                  <ArrowRight className="h-3 w-3 ml-auto text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Workflow Visual */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workflow Comercial</CardTitle>
          <CardDescription>
            Haga clic en cada etapa para acceder a la gestión del documento correspondiente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-stretch gap-1 overflow-x-auto pb-2">
            {workflowSteps.map((step, idx) => (
              <React.Fragment key={idx}>
                <Link href={step.href} className="shrink-0">
                  <div
                    className={`flex flex-col items-center gap-2 px-3 py-4 rounded-lg border-2 cursor-pointer transition-all w-28 h-full ${step.color}`}
                  >
                    <step.icon className={`h-6 w-6 ${step.iconColor}`} />
                    <div className="text-xs font-semibold text-center leading-tight">
                      {step.label}
                    </div>
                    <div className="text-xs text-muted-foreground text-center leading-tight">
                      {step.sub}
                    </div>
                  </div>
                </Link>
                {idx < workflowSteps.length - 1 && (
                  <div className="flex items-center shrink-0">
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Circuito Comercial Base</CardTitle>
          <CardDescription>
            Accesos directos al Lote 2 para clientes, productos, listas, descuentos, puntos de
            facturación y cuenta corriente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {ventasBaseLinks.map((entry) => (
              <Link key={entry.href} href={entry.href}>
                <div className={`rounded-xl border p-4 transition-colors ${entry.color}`}>
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-white/80 p-2 shadow-sm">
                      <entry.icon className={`h-5 w-5 ${entry.iconColor}`} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">{entry.title}</p>
                      <p className="text-sm text-muted-foreground">{entry.description}</p>
                    </div>
                    <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Circuitos de Comprobantes</CardTitle>
          <CardDescription>
            Accesos directos al tramo ampliado del Lote 3 para cobros, cheques, devoluciones,
            ajustes, imputaciones y variantes operativas heredadas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {comprobantesExpansionLinks.map((entry) => (
              <Link key={entry.href} href={entry.href}>
                <div className={`rounded-xl border p-4 transition-colors ${entry.color}`}>
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-white/80 p-2 shadow-sm">
                      <entry.icon className={`h-5 w-5 ${entry.iconColor}`} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">{entry.title}</p>
                      <p className="text-sm text-muted-foreground">{entry.description}</p>
                    </div>
                    <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Gráficos fila 1 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evolución de Ventas (12 meses)</CardTitle>
            <CardDescription>Ventas mensuales reales y meta móvil estimada</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={ventasMensuales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis
                  tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip formatter={(value: number) => `$${value.toLocaleString("es-AR")}`} />
                <Area
                  type="monotone"
                  dataKey="ventas"
                  stroke="#6366f1"
                  fill="#e0e7ff"
                  strokeWidth={2}
                  name="Ventas"
                />
                <Line
                  type="monotone"
                  dataKey="meta"
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  name="Meta"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 8 Clientes por Saldo</CardTitle>
            <CardDescription>Saldo pendiente consolidado por cliente (ARS)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topClientes} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  type="number"
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 10 }}
                />
                <YAxis dataKey="cliente" type="category" tick={{ fontSize: 10 }} width={70} />
                <Tooltip formatter={(value: number) => `$${value.toLocaleString("es-AR")}`} />
                <Bar dataKey="monto" fill="#6366f1" radius={[0, 4, 4, 0]} name="Monto" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos fila 2 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estados de Pedidos</CardTitle>
            <CardDescription>
              Distribución real de pedidos detectados por tipo documental
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <ResponsiveContainer width="50%" height={180}>
              <PieChart>
                <Pie
                  data={estadosPedidos}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {estadosPedidos.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {estadosPedidos.map((e, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: e.color }}
                    />
                    <span className="text-muted-foreground">{e.name}</span>
                  </div>
                  <span className="font-semibold">{e.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Antigüedad de Deuda</CardTitle>
            <CardDescription>Saldos pendientes por rango de días</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            {antiguedadDeuda.map((item, i) => {
              const total = antiguedadDeuda.reduce((s, x) => s + x.monto, 0)
              const pct = total > 0 ? Math.round((item.monto / total) * 100) : 0
              return (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.rango}</span>
                    <span className="font-medium">${item.monto.toLocaleString("es-AR")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={pct} className="flex-1 h-1.5" />
                    <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                  </div>
                </div>
              )
            })}
            <div className="flex justify-between text-sm border-t pt-2 font-semibold">
              <span>Total deuda</span>
              <span>
                ${antiguedadDeuda.reduce((s, x) => s + x.monto, 0).toLocaleString("es-AR")}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Radar de Cartera</CardTitle>
            <CardDescription>
              Condiciones fiscales más presentes en la base de clientes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            {carteraClientes.condicionIva.map((row) => {
              const pct =
                carteraClientes.total > 0
                  ? Math.round((row.cantidad / carteraClientes.total) * 100)
                  : 0
              return (
                <div key={row.condicion} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{row.condicion}</span>
                    <span className="font-medium">{row.cantidad}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={pct} className="flex-1 h-1.5" />
                    <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      {/* Tablas recientes */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Últimos Pedidos */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm font-semibold">Últimos Pedidos</CardTitle>
              <Link href="/ventas/pedidos">
                <Button variant="ghost" size="sm" className="text-xs h-7">
                  Ver todos
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {pedidos
              .slice(-5)
              .reverse()
              .map((order) => {
                const estadoColor: Record<string, string> = {
                  BORRADOR: "bg-gray-100 text-gray-700",
                  EMITIDO: "bg-blue-100 text-blue-700",
                  PAGADO_PARCIAL: "bg-amber-100 text-amber-700",
                  PAGADO: "bg-green-100 text-green-700",
                  ANULADO: "bg-red-100 text-red-700",
                }
                return (
                  <div
                    key={order.id}
                    className="flex items-center justify-between gap-2 text-sm pb-2 border-b last:border-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-xs font-medium">{order.nroComprobante ?? "-"}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {terceros.find((t) => t.id === order.terceroId)?.razonSocial ??
                          String(order.terceroId)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded font-medium ${estadoColor[order.estado] ?? "bg-gray-100 text-gray-700"}`}
                      >
                        {order.estado}
                      </span>
                    </div>
                  </div>
                )
              })}
            {pedidos.length === 0 && (
              <div className="text-center py-4 text-xs text-muted-foreground">
                No se detectaron tipos documentales de pedido en el backend actual.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Remitos en tránsito */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm font-semibold">Remitos en Tránsito</CardTitle>
              <Link href="/ventas/remitos">
                <Button variant="ghost" size="sm" className="text-xs h-7">
                  Ver todos
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {remitos
              .filter((c) => c.estado === "EMITIDO")
              .slice(0, 3)
              .map((remito) => (
                <div
                  key={remito.id}
                  className="flex items-center justify-between gap-2 text-sm pb-2 border-b last:border-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs font-medium">{remito.nroComprobante ?? "-"}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      ${remito.saldo.toLocaleString("es-AR")} pendiente
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-xs shrink-0 bg-orange-50 border-orange-200 text-orange-700"
                  >
                    Emitido
                  </Badge>
                </div>
              ))}
            {remitos.filter((c) => c.estado === "EMITIDO").length === 0 && (
              <div className="text-center py-4 text-xs text-muted-foreground">
                No hay remitos emitidos detectados para mostrar.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Facturas vencidas */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm font-semibold">Facturas Vencidas</CardTitle>
              <Link href="/ventas/facturas">
                <Button variant="ghost" size="sm" className="text-xs h-7">
                  Ver todas
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {facturasVencidas.slice(0, 5).map((inv) => {
              const days = Math.floor(
                (today.getTime() - new Date(inv.fechaVto!).getTime()) / (1000 * 60 * 60 * 24)
              )
              return (
                <div
                  key={inv.id}
                  className="flex items-center justify-between gap-2 text-sm pb-2 border-b last:border-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs font-medium">
                      {(inv.nroComprobante ?? "-").slice(0, 20)}
                    </p>
                    <p className="text-xs text-red-600 font-medium">{days}d de mora</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold">${inv.total.toLocaleString("es-AR")}</p>
                  </div>
                </div>
              )
            })}
            {facturasVencidas.length === 0 && (
              <div className="text-center py-4 text-xs text-muted-foreground">
                <CheckCircle2 className="h-6 w-6 mx-auto text-green-500 mb-1" />
                Sin facturas vencidas
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Acciones Rápidas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { href: "/ventas/clientes", icon: Users, label: "Nuevo Cliente" },
              { href: "/ventas/productos", icon: Package, label: "Productos" },
              { href: "/ventas/listas-precios", icon: FileText, label: "Listas" },
              { href: "/ventas/descuentos", icon: Percent, label: "Descuentos" },
              { href: "/ventas/puntos-facturacion", icon: Receipt, label: "Ptos. Facturación" },
              { href: "/ventas/cuenta-corriente", icon: Landmark, label: "Cta. Corriente" },
              { href: "/ventas/pedidos", icon: ShoppingCart, label: "Nuevo Pedido" },
              { href: "/ventas/remitos", icon: Truck, label: "Nuevo Remito" },
              { href: "/ventas/facturas", icon: Receipt, label: "Nueva Factura" },
              { href: "/ventas/notas-credito", icon: Percent, label: "Nota de Crédito" },
              { href: "/ventas/reportes", icon: BarChart2, label: "Ver Reportes" },
              { href: "/ventas/cobros", icon: CreditCard, label: "Cobros" },
            ].map((action) => (
              <Link key={action.href} href={action.href}>
                <Button
                  variant="outline"
                  className="w-full justify-start text-sm bg-transparent h-10"
                >
                  <action.icon className="h-4 w-4 mr-2 text-muted-foreground" />
                  {action.label}
                </Button>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
