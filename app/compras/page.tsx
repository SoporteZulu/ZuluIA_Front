"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
  Star,
  Package
} from "lucide-react"
import Link from "next/link"
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from "recharts"
import { comprasKPIs, comprasPorMes, comprasPorCategoria, topProveedores } from "@/lib/compras-data"

const modules = [
  {
    title: "Proveedores",
    url: "/compras/proveedores",
    icon: Truck,
    count: "15 activos",
    color: "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20",
  },
  {
    title: "Órdenes de Compra",
    url: "/compras/ordenes",
    icon: FileText,
    count: `${comprasKPIs.ordenesActivas} activas`,
    color: "bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20",
  },
  {
    title: "Recepciones",
    url: "/compras/recepciones",
    icon: PackageCheck,
    count: `${comprasKPIs.recepcionesPendientes} pendientes`,
    color: "bg-green-500/10 text-green-600 hover:bg-green-500/20",
  },
  {
    title: "Requisiciones",
    url: "/compras/solicitudes",
    icon: ClipboardList,
    count: `${comprasKPIs.solicitudesPendientes} pendientes`,
    color: "bg-orange-500/10 text-orange-600 hover:bg-orange-500/20",
  },
  {
    title: "Facturas",
    url: "/compras/facturas",
    icon: Receipt,
    count: "Ver todas",
    color: "bg-purple-500/10 text-purple-600 hover:bg-purple-500/20",
  },
  {
    title: "Notas de Crédito",
    url: "/compras/notas-credito",
    icon: CreditCard,
    count: "Ver todas",
    color: "bg-pink-500/10 text-pink-600 hover:bg-pink-500/20",
  },
  {
    title: "Cuentas a Pagar",
    url: "/compras/cuentas-pagar",
    icon: DollarSign,
    count: `${comprasKPIs.proximosVencimientos} próximos`,
    color: "bg-red-500/10 text-red-600 hover:bg-red-500/20",
  },
  {
    title: "Reportes",
    url: "/compras/reportes",
    icon: BarChart3,
    count: "Analíticas",
    color: "bg-cyan-500/10 text-cyan-600 hover:bg-cyan-500/20",
  },
]

export default function ComprasDashboard() {
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
                    <CardTitle className="text-sm font-medium">
                      {module.title}
                    </CardTitle>
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Compras del Mes */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Compras del Mes</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${comprasKPIs.valorComprasMes.toLocaleString('es-AR')}
              </div>
              <div className="flex items-center text-xs text-green-600 mt-1">
                <TrendingUp className="h-3 w-3 mr-1" />
                <span>+8.5% vs mes anterior</span>
              </div>
            </CardContent>
          </Card>

          {/* Rating Promedio */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Rating Proveedores</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center">
                {comprasKPIs.ratingPromedioProveedores}
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400 ml-2" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Promedio ponderado
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
              <div className="text-2xl font-bold">{comprasKPIs.productosStockBajo}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Productos bajo punto de reorden
              </p>
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
                <span className="font-semibold text-red-600">{comprasKPIs.ordenesRetrasadas}</span> órdenes de compra con fecha de entrega vencida
              </p>
              <Link href="/compras/ordenes?filtro=retrasadas" className="text-sm text-primary hover:underline mt-2 inline-block">
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
                <span className="font-semibold text-orange-600">{comprasKPIs.proximosVencimientos}</span> facturas vencen en los próximos 7 días
              </p>
              <Link href="/compras/facturas?filtro=proximos-vencimientos" className="text-sm text-primary hover:underline mt-2 inline-block">
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
                <span className="font-semibold text-yellow-600">{comprasKPIs.productosStockBajo}</span> productos por debajo del punto de reorden
              </p>
              <Link href="/compras/solicitudes?tipo=automatico" className="text-sm text-primary hover:underline mt-2 inline-block">
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
                <span className="font-semibold text-blue-600">{comprasKPIs.solicitudesPendientes}</span> solicitudes de compra esperando aprobación
              </p>
              <Link href="/compras/solicitudes?estado=pendiente" className="text-sm text-primary hover:underline mt-2 inline-block">
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
            <CardDescription>Últimos 7 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={comprasPorMes}>
                <defs>
                  <linearGradient id="colorMonto" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="mes" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Area type="monotone" dataKey="monto" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorMonto)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Compras por Categoría */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Categoría</CardTitle>
            <CardDescription>Participación actual</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={comprasPorCategoria}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="valor"
                  label
                >
                  {comprasPorCategoria.map((entry, index) => (
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
          <CardTitle>Top Proveedores</CardTitle>
          <CardDescription>Por volumen de compra</CardDescription>
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
                    <p className="text-sm text-muted-foreground">{prov.ordenes} órdenes</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">${prov.volumen.toLocaleString('es-AR')}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
