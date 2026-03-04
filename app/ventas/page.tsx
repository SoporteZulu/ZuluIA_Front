'use client'

import React from 'react'
import Link from 'next/link'
import {
  Users, FileText, Truck, Receipt, CreditCard, ShoppingCart, TrendingUp, TrendingDown,
  ArrowRight, AlertTriangle, Clock, DollarSign, BarChart2, Tag, Percent,
  AlertCircle, CheckCircle2, XCircle, ArrowUpRight, ArrowDownRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts'
import { ventasStats, salesOrders, invoices, remitos, customers, promotions } from '@/lib/sales-data'

// ─── Workflow Document ─────────────────────────────────────────────────────────

const workflowSteps = [
  { icon: Users, label: 'Lead/Oportunidad', sub: 'CRM', href: '/crm/oportunidades', color: 'border-blue-200 bg-blue-50 hover:bg-blue-100', iconColor: 'text-blue-600' },
  { icon: FileText, label: 'Presupuesto', sub: 'Cotización', href: '/ventas/listas-precios', color: 'border-violet-200 bg-violet-50 hover:bg-violet-100', iconColor: 'text-violet-600' },
  { icon: ShoppingCart, label: 'Pedido', sub: 'Orden de Venta', href: '/ventas/pedidos', color: 'border-green-200 bg-green-50 hover:bg-green-100', iconColor: 'text-green-600' },
  { icon: Truck, label: 'Remito', sub: 'Despacho', href: '/ventas/remitos', color: 'border-orange-200 bg-orange-50 hover:bg-orange-100', iconColor: 'text-orange-600' },
  { icon: Receipt, label: 'Factura', sub: 'Comprobante AFIP', href: '/ventas/facturas', color: 'border-red-200 bg-red-50 hover:bg-red-100', iconColor: 'text-red-600' },
  { icon: CreditCard, label: 'Cobro', sub: 'Recibo de Pago', href: '/ventas/facturas', color: 'border-teal-200 bg-teal-50 hover:bg-teal-100', iconColor: 'text-teal-600' },
  { icon: Tag, label: 'Nota de Crédito', sub: 'Devolución/Ajuste', href: '/ventas/notas-credito', color: 'border-pink-200 bg-pink-50 hover:bg-pink-100', iconColor: 'text-pink-600' },
  { icon: Percent, label: 'Nota de Débito', sub: 'Cargo adicional', href: '/ventas/notas-credito', color: 'border-amber-200 bg-amber-50 hover:bg-amber-100', iconColor: 'text-amber-600' },
]

// ─── Chart Data ────────────────────────────────────────────────────────────────

const ventasMensuales = [
  { mes: 'Mar', ventas: 1180000, meta: 1200000 },
  { mes: 'Abr', ventas: 1340000, meta: 1250000 },
  { mes: 'May', ventas: 1220000, meta: 1300000 },
  { mes: 'Jun', ventas: 1560000, meta: 1350000 },
  { mes: 'Jul', ventas: 1480000, meta: 1400000 },
  { mes: 'Ago', ventas: 1720000, meta: 1450000 },
  { mes: 'Sep', ventas: 1650000, meta: 1500000 },
  { mes: 'Oct', ventas: 1890000, meta: 1600000 },
  { mes: 'Nov', ventas: 2100000, meta: 1700000 },
  { mes: 'Dic', ventas: 2320000, meta: 1900000 },
  { mes: 'Ene', ventas: 2132500, meta: 2100000 },
  { mes: 'Feb', ventas: 2458320, meta: 2200000 },
]

const topClientes = [
  { cliente: 'SuperReg', monto: 1200000 },
  { cliente: 'TechAndes', monto: 680000 },
  { cliente: 'Min. Educ.', monto: 450000 },
  { cliente: 'Dist. Norte', monto: 320000 },
  { cliente: 'Import. Patag.', monto: 195000 },
  { cliente: 'MetalNOA', monto: 167000 },
  { cliente: 'Agro Pampeana', monto: 167000 },
  { cliente: 'Hosp. Paraná', monto: 234000 },
]

const estadosPedidos = [
  { name: 'Confirmado', value: salesOrders.filter(o => o.estado === 'confirmado').length, color: '#3b82f6' },
  { name: 'En Preparación', value: salesOrders.filter(o => o.estado === 'en_preparacion').length, color: '#f59e0b' },
  { name: 'Despachado', value: salesOrders.filter(o => o.estado === 'despachado').length, color: '#8b5cf6' },
  { name: 'Facturado', value: salesOrders.filter(o => o.estado === 'facturado').length, color: '#10b981' },
  { name: 'Borrador', value: salesOrders.filter(o => o.estado === 'borrador').length, color: '#6b7280' },
]

const antiguedadDeuda = [
  { rango: '0-30 días', monto: 1293000, color: '#3b82f6' },
  { rango: '31-60 días', monto: 879000, color: '#f59e0b' },
  { rango: '61-90 días', monto: 345000, color: '#ef4444' },
  { rango: '+90 días', monto: 220000, color: '#991b1b' },
]

// ─── Alerts ────────────────────────────────────────────────────────────────────

const alertas = [
  { tipo: 'error', icon: XCircle, texto: `${customers.filter(c => c.creditoUtilizado > c.creditoLimite).length} clientes con crédito excedido`, href: '/ventas/clientes' },
  { tipo: 'warning', icon: AlertTriangle, texto: `${invoices.filter(i => i.estado === 'emitida' && new Date(i.fechaVencimiento) < new Date()).length} facturas vencidas sin cobrar`, href: '/ventas/facturas' },
  { tipo: 'warning', icon: Clock, texto: `${remitos.filter(r => r.estado === 'en_transito').length} remitos en tránsito sin confirmar`, href: '/ventas/remitos' },
  { tipo: 'info', icon: CheckCircle2, texto: `${promotions.filter(p => p.estado === 'activa').length} promociones activas en este momento`, href: '/ventas/listas-precios' },
]

// ─── Main Component ────────────────────────────────────────────────────────────

export default function VentasDashboard() {
  const porCobrar = invoices.filter(i => i.estado === 'emitida').reduce((s, i) => s + i.total, 0)
  const facturasVencidas = invoices.filter(i => i.estado === 'emitida' && new Date(i.fechaVencimiento) < new Date())

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Ventas</h1>
          <p className="text-muted-foreground">Dashboard ejecutivo — Febrero 2026</p>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Ventas del Mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${ventasStats.ventasMes.toLocaleString('es-AR')}</div>
            <div className="flex items-center gap-1 mt-1">
              <ArrowUpRight className="h-3 w-3 text-green-600" />
              <p className="text-xs text-green-600 font-medium">+{ventasStats.variacionIngresos}% vs mes anterior</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pedidos Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{salesOrders.filter(o => ['confirmado', 'en_preparacion'].includes(o.estado)).length}</div>
            <div className="flex items-center gap-1 mt-1">
              <ArrowDownRight className="h-3 w-3 text-orange-500" />
              <p className="text-xs text-orange-500">{ventasStats.pedidosBorrador} en borrador</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Por Cobrar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${porCobrar.toLocaleString('es-AR')}</div>
            <div className="flex items-center gap-1 mt-1">
              {facturasVencidas.length > 0
                ? <AlertTriangle className="h-3 w-3 text-red-500" />
                : <CheckCircle2 className="h-3 w-3 text-green-500" />}
              <p className={`text-xs font-medium ${facturasVencidas.length > 0 ? 'text-red-500' : 'text-green-500'}`}>
                {facturasVencidas.length} fact. vencidas
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-violet-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Clientes Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ventasStats.clientesActivos}</div>
            <div className="flex items-center gap-1 mt-1">
              <ArrowUpRight className="h-3 w-3 text-green-600" />
              <p className="text-xs text-green-600">+3 este mes</p>
            </div>
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
                <div className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                  alerta.tipo === 'error' ? 'bg-red-50 border-red-200 hover:bg-red-100' :
                  alerta.tipo === 'warning' ? 'bg-amber-50 border-amber-200 hover:bg-amber-100' :
                  'bg-blue-50 border-blue-200 hover:bg-blue-100'
                }`}>
                  <alerta.icon className={`h-4 w-4 flex-shrink-0 ${
                    alerta.tipo === 'error' ? 'text-red-600' :
                    alerta.tipo === 'warning' ? 'text-amber-600' : 'text-blue-600'
                  }`} />
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
          <CardDescription>Haga clic en cada etapa para acceder a la gestión del documento correspondiente</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-stretch gap-1 overflow-x-auto pb-2">
            {workflowSteps.map((step, idx) => (
              <React.Fragment key={idx}>
                <Link href={step.href} className="flex-shrink-0">
                  <div className={`flex flex-col items-center gap-2 px-3 py-4 rounded-lg border-2 cursor-pointer transition-all w-28 h-full ${step.color}`}>
                    <step.icon className={`h-6 w-6 ${step.iconColor}`} />
                    <div className="text-xs font-semibold text-center leading-tight">{step.label}</div>
                    <div className="text-xs text-muted-foreground text-center leading-tight">{step.sub}</div>
                  </div>
                </Link>
                {idx < workflowSteps.length - 1 && (
                  <div className="flex items-center flex-shrink-0">
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Gráficos fila 1 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evolución de Ventas (12 meses)</CardTitle>
            <CardDescription>Ventas vs meta mensual en ARS</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={ventasMensuales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number) => `$${value.toLocaleString('es-AR')}`} />
                <Area type="monotone" dataKey="ventas" stroke="#6366f1" fill="#e0e7ff" strokeWidth={2} name="Ventas" />
                <Line type="monotone" dataKey="meta" stroke="#94a3b8" strokeDasharray="4 4" strokeWidth={1.5} name="Meta" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 8 Clientes por Saldo</CardTitle>
            <CardDescription>Crédito utilizado en cuenta corriente (ARS)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topClientes} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                <YAxis dataKey="cliente" type="category" tick={{ fontSize: 10 }} width={70} />
                <Tooltip formatter={(value: number) => `$${value.toLocaleString('es-AR')}`} />
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
            <CardDescription>Distribución actual del pipeline de ventas</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <ResponsiveContainer width="50%" height={180}>
              <PieChart>
                <Pie data={estadosPedidos} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
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
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: e.color }} />
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
              const pct = Math.round((item.monto / total) * 100)
              return (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.rango}</span>
                    <span className="font-medium">${item.monto.toLocaleString('es-AR')}</span>
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
              <span>${antiguedadDeuda.reduce((s, x) => s + x.monto, 0).toLocaleString('es-AR')}</span>
            </div>
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
                <Button variant="ghost" size="sm" className="text-xs h-7">Ver todos</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {salesOrders.slice(-5).reverse().map((order) => {
              const estadoColor: Record<string, string> = {
                borrador: 'bg-gray-100 text-gray-700',
                confirmado: 'bg-blue-100 text-blue-700',
                en_preparacion: 'bg-amber-100 text-amber-700',
                despachado: 'bg-violet-100 text-violet-700',
                facturado: 'bg-green-100 text-green-700',
                cancelado: 'bg-red-100 text-red-700',
              }
              return (
                <div key={order.id} className="flex items-center justify-between gap-2 text-sm pb-2 border-b last:border-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs font-medium">{order.codigo}</p>
                    <p className="text-xs text-muted-foreground truncate">{order.clienteId}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${estadoColor[order.estado]}`}>
                      {order.estado.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Remitos en tránsito */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm font-semibold">Remitos en Tránsito</CardTitle>
              <Link href="/ventas/remitos">
                <Button variant="ghost" size="sm" className="text-xs h-7">Ver todos</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {remitos.filter(r => r.estado === 'en_transito').map((remito) => (
              <div key={remito.id} className="flex items-center justify-between gap-2 text-sm pb-2 border-b last:border-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-xs font-medium">{remito.codigo}</p>
                  <p className="text-xs text-muted-foreground truncate">{remito.transporte || 'Sin transporte'}</p>
                </div>
                <Badge variant="outline" className="text-xs flex-shrink-0 bg-orange-50 border-orange-200 text-orange-700">
                  En tránsito
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Facturas vencidas */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm font-semibold">Facturas Vencidas</CardTitle>
              <Link href="/ventas/facturas">
                <Button variant="ghost" size="sm" className="text-xs h-7">Ver todas</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {invoices.filter(i => i.estado === 'emitida' && new Date(i.fechaVencimiento) < new Date()).slice(0, 5).map((inv) => {
              const days = Math.floor((new Date().getTime() - new Date(inv.fechaVencimiento).getTime()) / (1000 * 60 * 60 * 24))
              return (
                <div key={inv.id} className="flex items-center justify-between gap-2 text-sm pb-2 border-b last:border-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs font-medium">{inv.codigo.slice(0, 20)}</p>
                    <p className="text-xs text-red-600 font-medium">{days}d de mora</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-semibold">${inv.total.toLocaleString('es-AR')}</p>
                  </div>
                </div>
              )
            })}
            {invoices.filter(i => i.estado === 'emitida' && new Date(i.fechaVencimiento) < new Date()).length === 0 && (
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
              { href: '/ventas/clientes', icon: Users, label: 'Nuevo Cliente' },
              { href: '/ventas/pedidos', icon: ShoppingCart, label: 'Nuevo Pedido' },
              { href: '/ventas/remitos', icon: Truck, label: 'Nuevo Remito' },
              { href: '/ventas/facturas', icon: Receipt, label: 'Nueva Factura' },
              { href: '/ventas/listas-precios', icon: Tag, label: 'Listas de Precios' },
              { href: '/ventas/notas-credito', icon: Percent, label: 'Nota de Crédito' },
              { href: '/ventas/reportes', icon: BarChart2, label: 'Ver Reportes' },
              { href: '/ventas/productos', icon: DollarSign, label: 'Productos' },
            ].map((action) => (
              <Link key={action.href} href={action.href}>
                <Button variant="outline" className="w-full justify-start text-sm bg-transparent h-10">
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
