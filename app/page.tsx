"use client"

import Link from "next/link"
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Boxes,
  BookOpenCheck,
  Briefcase,
  Building2,
  Calculator,
  DollarSign,
  HeartHandshake,
  LifeBuoy,
  Package,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Truck,
} from "lucide-react"
import {
  Area,
  AreaChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
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
import { useComprobantes } from "@/lib/hooks/useComprobantes"
import { useItems } from "@/lib/hooks/useItems"
import { useStockResumen } from "@/lib/hooks/useStock"
import { useTerceros } from "@/lib/hooks/useTerceros"
import { useDefaultSucursalId } from "@/lib/hooks/useSucursales"

const modules = [
  {
    title: "Inventario",
    description: "Gestiona productos, almacenes, categorias y movimientos de stock",
    icon: Package,
    href: "/inventario",
    color: "bg-blue-500/10 text-blue-500",
  },
  {
    title: "Ventas",
    description: "Administra clientes, pedidos, facturas y reportes de ventas",
    icon: ShoppingCart,
    href: "/ventas",
    color: "bg-green-500/10 text-green-500",
  },
  {
    title: "Compras",
    description: "Controla proveedores, ordenes de compra y recepciones",
    icon: Truck,
    href: "/compras",
    color: "bg-orange-500/10 text-orange-500",
  },
  {
    title: "Contabilidad",
    description: "Plan de cuentas, asientos contables, pagos y reportes financieros",
    icon: Calculator,
    href: "/contabilidad",
    color: "bg-purple-500/10 text-purple-500",
  },
  {
    title: "Maestros",
    description: "Agrupa sucursales reales, jurisdicciones legacy y maestros auxiliares faltantes",
    icon: Building2,
    href: "/maestros",
    color: "bg-slate-500/10 text-slate-500",
  },
  {
    title: "Colegio",
    description: "Cubre cartera, planes y lotes del vertical educativo heredado del VB6",
    icon: BookOpenCheck,
    href: "/colegio",
    color: "bg-emerald-500/10 text-emerald-500",
  },
  {
    title: "CRM",
    description: "Gestion de clientes, oportunidades, campanas y relaciones comerciales",
    icon: HeartHandshake,
    href: "/crm",
    color: "bg-cyan-500/10 text-cyan-500",
  },
  {
    title: "Help Desk",
    description: "Soporte tecnico, tickets, ordenes de servicio y base de conocimientos",
    icon: LifeBuoy,
    href: "/helpdesk",
    color: "bg-rose-500/10 text-rose-500",
  },
  {
    title: "Proyectos",
    description: "Gestiona proyectos, tareas, equipo, presupuestos y tiempo",
    icon: Briefcase,
    href: "/proyectos",
    color: "bg-indigo-500/10 text-indigo-500",
  },
  {
    title: "THOR",
    description: "Analisis de ventas, margenes, competencia y sugerencias comerciales",
    icon: BarChart3,
    href: "/thor",
    color: "bg-amber-500/10 text-amber-500",
  },
]

const pieColors = ["#2563eb", "#16a34a", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6"]

function formatCurrency(value: number) {
  return value.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  })
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("es-AR", { notation: "compact", maximumFractionDigits: 1 }).format(
    value
  )
}

function formatDate(value?: string | null) {
  if (!value) return "-"
  return new Date(value).toLocaleDateString("es-AR")
}

function getMonthKey(value: string) {
  const date = new Date(value)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

function buildPeriods(count: number) {
  const months = []
  const cursor = new Date()
  cursor.setDate(1)

  for (let index = count - 1; index >= 0; index -= 1) {
    const current = new Date(cursor.getFullYear(), cursor.getMonth() - index, 1)
    months.push({
      key: `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`,
      label: current.toLocaleDateString("es-AR", { month: "short" }).replace(".", ""),
    })
  }

  return months
}

export default function DashboardPage() {
  const defaultSucursalId = useDefaultSucursalId()
  const { items, loading: itemsLoading } = useItems()
  const { comprobantes: ventas, loading: ventasLoading } = useComprobantes({ esVenta: true })
  const { comprobantes: compras, loading: comprasLoading } = useComprobantes({ esCompra: true })
  const { terceros: clientes, loading: clientesLoading } = useTerceros()
  const {
    resumen: stockResumen,
    bajoMinimo,
    loading: stockLoading,
  } = useStockResumen(defaultSucursalId)

  const today = new Date()
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const periods = buildPeriods(6)
  const validVentas = ventas.filter((comprobante) => comprobante.estado !== "ANULADO")
  const validCompras = compras.filter((comprobante) => comprobante.estado !== "ANULADO")
  const ventasMes = validVentas.filter((comprobante) => new Date(comprobante.fecha) >= monthStart)
  const comprasMes = validCompras.filter((comprobante) => new Date(comprobante.fecha) >= monthStart)
  const ventasMesTotal = ventasMes.reduce((total, comprobante) => total + comprobante.total, 0)
  const comprasMesTotal = comprasMes.reduce((total, comprobante) => total + comprobante.total, 0)
  const saldoPendienteVentas = validVentas.reduce(
    (total, comprobante) => total + comprobante.saldo,
    0
  )
  const comprobantesVencidos = validVentas.filter((comprobante) => {
    if (!comprobante.fechaVto || comprobante.saldo <= 0) return false
    return new Date(comprobante.fechaVto) < today
  })
  const clientesSinContacto = clientes.filter(
    (cliente) => !cliente.email && !cliente.telefono && !cliente.celular
  ).length
  const itemsSinCategoria = items.filter((item) => item.categoriaId === null).length
  const serviciosActivos = items.filter((item) => item.esServicio).length
  const flujoOperativoVisible = ventasMesTotal - comprasMesTotal
  const chartData = periods.map((period) => ({
    mes: period.label,
    ingresos: validVentas
      .filter((comprobante) => getMonthKey(comprobante.fecha) === period.key)
      .reduce((total, comprobante) => total + comprobante.total, 0),
    gastos: validCompras
      .filter((comprobante) => getMonthKey(comprobante.fecha) === period.key)
      .reduce((total, comprobante) => total + comprobante.total, 0),
  }))

  const clientesPorCondicion = Object.values(
    clientes.reduce<Record<string, { nombre: string; valor: number }>>((accumulator, cliente) => {
      const key = cliente.condicionIvaDescripcion || "Sin condicion"
      const current = accumulator[key] ?? { nombre: key, valor: 0 }
      current.valor += 1
      accumulator[key] = current
      return accumulator
    }, {})
  )
    .sort((left, right) => right.valor - left.valor)
    .slice(0, 6)
    .map((entry, index) => ({ ...entry, color: pieColors[index % pieColors.length] }))

  const operationalRadar = [
    {
      modulo: "Ventas",
      estado: saldoPendienteVentas > 0 ? "Seguimiento" : "Estable",
      detalle: `${validVentas.filter((comprobante) => comprobante.saldo > 0).length} comprobantes con saldo y ${comprobantesVencidos.length} vencidos`,
      href: "/ventas/cuenta-corriente",
    },
    {
      modulo: "Compras",
      estado: comprasMesTotal > ventasMesTotal ? "Atencion" : "Controlado",
      detalle: `${validCompras.filter((comprobante) => comprobante.saldo > 0).length} comprobantes abiertos en la tanda visible`,
      href: "/compras",
    },
    {
      modulo: "Inventario",
      estado: (stockResumen?.itemsBajoMinimo ?? 0) > 0 ? "Reposicion" : "Cubierto",
      detalle: `${stockResumen?.itemsBajoMinimo ?? 0} bajo minimo y ${stockResumen?.itemsSinStock ?? 0} sin stock`,
      href: "/inventario",
    },
    {
      modulo: "Clientes",
      estado: clientesSinContacto > 0 ? "Depurar" : "Completo",
      detalle: `${clientes.length} clientes visibles, ${clientesSinContacto} sin canal de contacto`,
      href: "/ventas/clientes",
    },
    {
      modulo: "Catalogo",
      estado: itemsSinCategoria > 0 ? "Ordenar" : "Normal",
      detalle: `${items.length} items activos, ${itemsSinCategoria} sin categoria y ${serviciosActivos} servicios`,
      href: "/inventario/productos",
    },
  ]

  const activityFeed = [...validVentas, ...validCompras]
    .sort((left, right) => new Date(right.fecha).getTime() - new Date(left.fecha).getTime())
    .slice(0, 8)

  const summaryCards = [
    {
      title: "Productos con Stock",
      value: stockResumen
        ? String(stockResumen.totalItemsConStock)
        : formatCompactNumber(items.length),
      description: stockResumen
        ? `${stockResumen.totalDepositos} depositos visibles en sucursal por defecto`
        : "Cargando cobertura de stock",
      icon: Boxes,
      trend: "up",
      href: "/inventario",
    },
    {
      title: "Ventas del Mes",
      value: formatCurrency(ventasMesTotal),
      description: `${ventasMes.length} comprobantes de venta visibles emitidos este mes`,
      icon: DollarSign,
      trend: ventasMesTotal >= comprasMesTotal ? "up" : "neutral",
      href: "/ventas",
    },
    {
      title: "Pendientes de Cobro",
      value: formatCurrency(saldoPendienteVentas),
      description: `${comprobantesVencidos.length} comprobantes vencidos con saldo pendiente`,
      icon: ShoppingCart,
      trend: comprobantesVencidos.length > 0 ? "down" : "neutral",
      href: "/ventas/cuenta-corriente",
    },
    {
      title: "Clientes Activos",
      value: String(clientes.length),
      description: `${clientes.filter((cliente) => cliente.facturable).length} habilitados para facturacion`,
      icon: HeartHandshake,
      trend: clientesSinContacto > 0 ? "neutral" : "up",
      href: "/ventas/clientes",
    },
  ]

  const dashboardLoading =
    itemsLoading || ventasLoading || comprasLoading || clientesLoading || stockLoading

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Resumen general con señales visibles de ventas, compras, stock y cartera desde los
          contratos ya expuestos.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Link key={stat.title} href={stat.href}>
              <Card className="cursor-pointer transition-colors hover:bg-accent/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    {stat.trend === "up" && <TrendingUp className="h-3 w-3 text-green-500" />}
                    {stat.trend === "down" && <TrendingDown className="h-3 w-3 text-red-500" />}
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Indicadores Cruzados</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                  <DollarSign className="h-5 w-5 text-green-500" />
                </div>
                <div
                  className={`flex items-center gap-1 ${ventasMesTotal >= comprasMesTotal ? "text-green-600" : "text-amber-600"}`}
                >
                  {ventasMesTotal >= comprasMesTotal ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  <span className="text-xs font-medium">Mes actual</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-1 text-xs text-muted-foreground">INGRESOS VISIBLES</div>
              <div className="text-2xl font-bold">{formatCurrency(ventasMesTotal)}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Comprobantes de venta no anulados del mes
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                  <Truck className="h-5 w-5 text-red-500" />
                </div>
                <div className="flex items-center gap-1 text-red-600">
                  <ArrowDownRight className="h-3 w-3" />
                  <span className="text-xs font-medium">Mes actual</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-1 text-xs text-muted-foreground">EGRESOS VISIBLES</div>
              <div className="text-2xl font-bold">{formatCurrency(comprasMesTotal)}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Comprobantes de compra no anulados del mes
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                </div>
                <div
                  className={`flex items-center gap-1 ${flujoOperativoVisible >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {flujoOperativoVisible >= 0 ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  <span className="text-xs font-medium">Cruce visible</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-1 text-xs text-muted-foreground">FLUJO OPERATIVO</div>
              <div className="text-2xl font-bold">{formatCurrency(flujoOperativoVisible)}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Diferencia entre ventas y compras visibles del mes
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                  <Calculator className="h-5 w-5 text-purple-500" />
                </div>
                <div className="flex items-center gap-1 text-amber-600">
                  <ArrowDownRight className="h-3 w-3" />
                  <span className="text-xs font-medium">Seguimiento</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-1 text-xs text-muted-foreground">SALDO A COBRAR</div>
              <div className="text-2xl font-bold">{formatCurrency(saldoPendienteVentas)}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Saldo pendiente sobre la tanda visible de comprobantes
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                  <Boxes className="h-5 w-5 text-orange-500" />
                </div>
                <div className="flex items-center gap-1 text-orange-600">
                  <ArrowDownRight className="h-3 w-3" />
                  <span className="text-xs font-medium">Reposicion</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-1 text-xs text-muted-foreground">BAJO MINIMO</div>
              <div className="text-2xl font-bold">
                {stockResumen?.itemsBajoMinimo ?? bajoMinimo.length}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Items que requieren reposicion en sucursal por defecto
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10">
                  <HeartHandshake className="h-5 w-5 text-cyan-500" />
                </div>
                <div
                  className={`flex items-center gap-1 ${clientesSinContacto > 0 ? "text-amber-600" : "text-green-600"}`}
                >
                  {clientesSinContacto > 0 ? (
                    <ArrowDownRight className="h-3 w-3" />
                  ) : (
                    <ArrowUpRight className="h-3 w-3" />
                  )}
                  <span className="text-xs font-medium">Maestro</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-1 text-xs text-muted-foreground">CLIENTES FACTURABLES</div>
              <div className="text-2xl font-bold">
                {clientes.filter((cliente) => cliente.facturable).length}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {clientesSinContacto} clientes sin mail ni telefono visible
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ingresos vs Egresos</CardTitle>
            <CardDescription>Ultimos 6 meses de comprobantes visibles</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="mes" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={formatCompactNumber} />
                <Tooltip formatter={(value: number) => formatCurrency(Number(value))} />
                <Area
                  type="monotone"
                  dataKey="ingresos"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorIngresos)"
                />
                <Area
                  type="monotone"
                  dataKey="gastos"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorGastos)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Base de Clientes</CardTitle>
            <CardDescription>Distribucion visible por condicion IVA</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={clientesPorCondicion}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="valor"
                >
                  {clientesPorCondicion.map((entry, index) => (
                    <Cell key={`${entry.nombre}-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${value} clientes`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Radar Operativo</CardTitle>
            <CardDescription>
              Lectura cruzada para entrar a los modulos con mayor pendiente
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Modulo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Detalle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {operationalRadar.map((row) => (
                  <TableRow key={row.modulo}>
                    <TableCell>
                      <Link href={row.href} className="font-medium hover:underline">
                        {row.modulo}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          row.estado === "Estable" ||
                          row.estado === "Controlado" ||
                          row.estado === "Cubierto" ||
                          row.estado === "Completo" ||
                          row.estado === "Normal"
                            ? "secondary"
                            : row.estado === "Seguimiento" ||
                                row.estado === "Reposicion" ||
                                row.estado === "Depurar" ||
                                row.estado === "Ordenar"
                              ? "outline"
                              : "destructive"
                        }
                      >
                        {row.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{row.detalle}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
            <CardDescription>Ultimos comprobantes visibles entre ventas y compras</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {activityFeed.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {dashboardLoading
                  ? "Cargando actividad visible..."
                  : "No hay comprobantes visibles para resumir."}
              </p>
            )}
            {activityFeed.map((comprobante) => (
              <div
                key={`${comprobante.tipoComprobanteId}-${comprobante.id}`}
                className="rounded-lg border p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {comprobante.tipoComprobanteDescripcion ??
                        `Tipo ${comprobante.tipoComprobanteId}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {comprobante.nroComprobante ?? `Comprobante ${comprobante.id}`} •{" "}
                      {formatDate(comprobante.fecha)}
                    </p>
                  </div>
                  <Badge variant={comprobante.saldo > 0 ? "outline" : "secondary"}>
                    {comprobante.saldo > 0 ? "Con saldo" : comprobante.estado}
                  </Badge>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total visible</span>
                  <span className="font-medium">{formatCurrency(comprobante.total)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Vencimiento</span>
                  <span>{formatDate(comprobante.fechaVto)}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Modulos del Sistema</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {modules.map((module) => {
            const Icon = module.icon
            return (
              <Link key={module.title} href={module.href}>
                <Card className="h-full cursor-pointer transition-colors hover:bg-accent/50">
                  <CardHeader>
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${module.color}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-base">{module.title}</CardTitle>
                    <CardDescription className="text-sm">{module.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
