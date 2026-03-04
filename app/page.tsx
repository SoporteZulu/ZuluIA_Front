"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, ShoppingCart, Truck, Calculator, TrendingUp, TrendingDown, DollarSign, Boxes, HeartHandshake, LifeBuoy, ArrowUpRight, ArrowDownRight, Briefcase, BarChart3 } from "lucide-react"
import Link from "next/link"
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from "recharts"

const stats = [
  {
    title: "Productos en Stock",
    value: "1,234",
    description: "+12% desde el mes pasado",
    icon: Boxes,
    trend: "up",
    href: "/inventario/productos",
  },
  {
    title: "Ventas del Mes",
    value: "$45,231",
    description: "+8.2% desde el mes pasado",
    icon: DollarSign,
    trend: "up",
    href: "/ventas/reportes",
  },
  {
    title: "Pedidos Pendientes",
    value: "23",
    description: "-4 desde ayer",
    icon: ShoppingCart,
    trend: "down",
    href: "/ventas/pedidos",
  },
  {
    title: "Facturas por Cobrar",
    value: "$12,450",
    description: "8 facturas vencidas",
    icon: Calculator,
    trend: "neutral",
    href: "/contabilidad/pagos",
  },
]

const ingresosGastosData = [
  { mes: "Ene", ingresos: 48000000, gastos: 32000000 },
  { mes: "Feb", ingresos: 52000000, gastos: 34000000 },
  { mes: "Mar", ingresos: 49000000, gastos: 33000000 },
  { mes: "Abr", ingresos: 58000000, gastos: 35000000 },
  { mes: "May", ingresos: 55000000, gastos: 34500000 },
  { mes: "Jun", ingresos: 67000000, gastos: 40000000 },
]

const ventasCategoriaData = [
  { nombre: "Electrónica", valor: 35, color: "#3b82f6" },
  { nombre: "Ropa", valor: 25, color: "#10b981" },
  { nombre: "Hogar", valor: 20, color: "#f59e0b" },
  { nombre: "Deportes", valor: 12, color: "#6366f1" },
  { nombre: "Otros", valor: 8, color: "#8b5cf6" },
]

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
    description: "Análisis de ventas, márgenes, competencia y sugerencias comerciales",
    icon: BarChart3,
    href: "/thor",
    color: "bg-amber-500/10 text-amber-500",
  },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Bienvenido a ZULU ERP. Resumen general del sistema.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Link key={stat.title} href={stat.href}>
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
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

      {/* Financial KPIs */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Indicadores Financieros</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          {/* Ingresos Totales */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-green-500" />
                </div>
                <div className="flex items-center gap-1 text-green-600">
                  <ArrowUpRight className="h-3 w-3" />
                  <span className="text-xs font-medium">12.5%</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground mb-1">INGRESOS TOTALES</div>
              <div className="text-2xl font-bold">$294.700.000</div>
              <div className="text-xs text-muted-foreground mt-1">vs período anterior</div>
            </CardContent>
          </Card>

          {/* Gastos Totales */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <TrendingDown className="h-5 w-5 text-red-500" />
                </div>
                <div className="flex items-center gap-1 text-red-600">
                  <ArrowDownRight className="h-3 w-3" />
                  <span className="text-xs font-medium">8.3%</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground mb-1">GASTOS TOTALES</div>
              <div className="text-2xl font-bold">$201.800.000</div>
              <div className="text-xs text-muted-foreground mt-1">vs período anterior</div>
            </CardContent>
          </Card>

          {/* Utilidad Neta */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                </div>
                <div className="flex items-center gap-1 text-green-600">
                  <ArrowUpRight className="h-3 w-3" />
                  <span className="text-xs font-medium">18.2%</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground mb-1">UTILIDAD NETA</div>
              <div className="text-2xl font-bold">$92.900.000</div>
              <div className="text-xs text-muted-foreground mt-1">vs período anterior</div>
            </CardContent>
          </Card>

          {/* Flujo de Caja */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <ArrowUpRight className="h-5 w-5 text-purple-500" />
                </div>
                <div className="flex items-center gap-1 text-green-600">
                  <ArrowUpRight className="h-3 w-3" />
                  <span className="text-xs font-medium">5.2%</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground mb-1">FLUJO DE CAJA</div>
              <div className="text-2xl font-bold">$45.200.000</div>
              <div className="text-xs text-muted-foreground mt-1">vs período anterior</div>
            </CardContent>
          </Card>

          {/* Ventas del Mes */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <ShoppingCart className="h-5 w-5 text-orange-500" />
                </div>
                <div className="flex items-center gap-1 text-green-600">
                  <ArrowUpRight className="h-3 w-3" />
                  <span className="text-xs font-medium">15.7%</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground mb-1">VENTAS DEL MES</div>
              <div className="text-2xl font-bold">$67.000.000</div>
              <div className="text-xs text-muted-foreground mt-1">vs período anterior</div>
            </CardContent>
          </Card>

          {/* ROI */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-cyan-500" />
                </div>
                <div className="flex items-center gap-1 text-green-600">
                  <ArrowUpRight className="h-3 w-3" />
                  <span className="text-xs font-medium">3.2%</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground mb-1">ROI</div>
              <div className="text-2xl font-bold">24.5%</div>
              <div className="text-xs text-muted-foreground mt-1">vs período anterior</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Financial Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Ingresos vs Gastos */}
        <Card>
          <CardHeader>
            <CardTitle>Ingresos vs Gastos</CardTitle>
            <CardDescription>Últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={ingresosGastosData}>
                <defs>
                  <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
                  </linearGradient>
                  <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="mes" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Area type="monotone" dataKey="ingresos" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIngresos)" />
                <Area type="monotone" dataKey="gastos" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorGastos)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Ventas por Categoría */}
        <Card>
          <CardHeader>
            <CardTitle>Ventas por Categoría</CardTitle>
            <CardDescription>Distribución actual</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={ventasCategoriaData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="valor"
                >
                  {ventasCategoriaData.map((entry, index) => (
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

      {/* Modules Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Modulos del Sistema</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {modules.map((module) => {
            const Icon = module.icon
            return (
              <Link key={module.title} href={module.href}>
                <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
                  <CardHeader>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${module.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-base">{module.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {module.description}
                    </CardDescription>
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
