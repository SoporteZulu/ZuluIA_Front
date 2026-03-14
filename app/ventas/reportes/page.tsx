'use client'

import React, { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area,
} from 'recharts'
import { Download, FileText, TrendingUp, TrendingDown, DollarSign, Users, BarChart3, Percent } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useComprobantes } from '@/lib/hooks/useComprobantes'
import { useTerceros } from '@/lib/hooks/useTerceros'
import { useItems } from '@/lib/hooks/useItems'

function fmtARS(n: number) {
  return n.toLocaleString('es-AR', { minimumFractionDigits: 2 })
}

const COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

// ─── Derived data ─────────────────────────────────────────────────────────────

// Monthly trend data (simulated from enriched invoices)
const monthlyData = [
  { mes: 'Sep', ventas: 780000, costo: 480000, margen: 300000 },
  { mes: 'Oct', ventas: 920000, costo: 560000, margen: 360000 },
  { mes: 'Nov', ventas: 1050000, costo: 630000, margen: 420000 },
  { mes: 'Dic', ventas: 1380000, costo: 810000, margen: 570000 },
  { mes: 'Ene', ventas: 980000, costo: 590000, margen: 390000 },
  { mes: 'Feb', ventas: 1245000, costo: 740000, margen: 505000 },
]

// ─── Reusable Chart Tooltip ───────────────────────────────────────────────────

function customTooltipFormatter(value: number) {
  return [`$${fmtARS(value)}`, '']
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

const ReportesPage = () => {
  const { comprobantes } = useComprobantes()
  const { terceros } = useTerceros()
  const { items } = useItems()
  const [periodoFilter, setPeriodoFilter] = useState('mes')
  const [tab, setTab]                     = useState('ejecutivo')

  const margenPorProducto = React.useMemo(() => items.map(p => ({
    sku:      p.codigo,
    nombre:   p.descripcion,
    costo:    p.precioCosto,
    precio:   p.precioVenta,
    margen:   p.precioVenta > 0 ? ((p.precioVenta - p.precioCosto) / p.precioVenta) * 100 : 0,
    margenAbs: p.precioVenta - p.precioCosto,
    categoria: p.categoriaDescripcion ?? 'General',
  })).sort((a, b) => b.margen - a.margen), [items])

  const topClientes = React.useMemo(() => terceros.slice(0, 8), [terceros])

  const libroIVA = React.useMemo(() => comprobantes.filter(c => c.estado !== 'ANULADO').map(c => {
    const t = terceros.find(x => x.id === c.terceroId)
    return {
      id:             c.id,
      fecha:          c.fecha,
      nroComprobante: c.nroComprobante ?? '-',
      tipo:           c.tipoComprobanteDescripcion ?? '-',
      razonSocial:    t?.razonSocial ?? String(c.terceroId),
      cuit:           t?.nroDocumento ?? '-',
      subtotal:       c.netoGravado,
      iva21:          c.ivaRi,
      iva105:         c.ivaRni,
      total:          c.total,
    }
  }), [comprobantes, terceros])

  const libroIVATotals = React.useMemo(() => libroIVA.reduce((acc, i) => ({
    neto:   acc.neto   + i.subtotal,
    iva21:  acc.iva21  + i.iva21,
    iva105: acc.iva105 + i.iva105,
    iva27:  0,
    total:  acc.total  + i.total,
  }), { neto: 0, iva21: 0, iva105: 0, iva27: 0, total: 0 }), [libroIVA])

  const clientesPorGrupo = React.useMemo(() => [
    { name: 'Activos',   value: terceros.filter(t => t.activo).length },
    { name: 'Inactivos', value: terceros.filter(t => !t.activo).length },
  ].filter(x => x.value > 0), [terceros])

  const estadosPedidosLocal = React.useMemo(() => [
    { name: 'Borrador',   value: comprobantes.filter(c => c.estado === 'BORRADOR').length },
    { name: 'Emitido',    value: comprobantes.filter(c => c.estado === 'EMITIDO').length },
    { name: 'Pago Parc.', value: comprobantes.filter(c => c.estado === 'PAGADO_PARCIAL').length },
    { name: 'Pagado',     value: comprobantes.filter(c => c.estado === 'PAGADO').length },
    { name: 'Anulado',    value: comprobantes.filter(c => c.estado === 'ANULADO').length },
  ], [comprobantes])

  const kpis = React.useMemo(() => ({
    ingresosMes: comprobantes.reduce((s, c) => s + c.total, 0),
    variacion:   0,
    ticketProm:  comprobantes.reduce((s, c) => s + c.total, 0) / (comprobantes.length || 1),
    conversion:  comprobantes.length > 0
      ? (comprobantes.filter(c => c.estado === 'PAGADO').length / comprobantes.length) * 100
      : 0,
    activosClientes: terceros.filter(t => t.activo).length,
    margenProm:  margenPorProducto.length > 0
      ? margenPorProducto.reduce((s, p) => s + p.margen, 0) / margenPorProducto.length
      : 0,
  }), [comprobantes, terceros, margenPorProducto])

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reportes de Ventas</h1>
          <p className="text-muted-foreground">Análisis ejecutivo, Libro IVA, márgenes y efectividad de promociones</p>
        </div>
        <div className="flex gap-2">
          <Select value={periodoFilter} onValueChange={setPeriodoFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="semana">Esta semana</SelectItem>
              <SelectItem value="mes">Este mes</SelectItem>
              <SelectItem value="trimestre">Trimestre</SelectItem>
              <SelectItem value="anual">Anual</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        {[
          { label: 'Ingresos Mes',    value: `$${(kpis.ingresosMes / 1000).toFixed(0)}K`,   delta: `+${kpis.variacion}%`,  deltaUp: true },
          { label: 'Ticket Promedio', value: `$${(kpis.ticketProm / 1000).toFixed(1)}K`,    delta: null, deltaUp: true },
          { label: 'Conversión',      value: `${kpis.conversion.toFixed(1)}%`,               delta: null, deltaUp: true },
          { label: 'Clientes Activos', value: String(kpis.activosClientes),                  delta: null, deltaUp: true },
          { label: 'Margen Prom.',    value: `${kpis.margenProm.toFixed(1)}%`,               delta: null, deltaUp: true },
          { label: 'Total Comprobantes', value: String(comprobantes.length),             delta: null, deltaUp: true },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="text-2xl font-bold mt-1 text-primary">{k.value}</p>
              {k.delta && (
                <p className={`text-xs mt-1 flex items-center gap-1 ${k.deltaUp ? 'text-green-600' : 'text-red-600'}`}>
                  {k.deltaUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {k.delta}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Report Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="ejecutivo">Ejecutivo</TabsTrigger>
          <TabsTrigger value="libros">Libro IVA</TabsTrigger>
          <TabsTrigger value="margenes">Márgenes</TabsTrigger>
          <TabsTrigger value="promociones">Promociones</TabsTrigger>
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
        </TabsList>

        {/* ── Ejecutivo ── */}
        <TabsContent value="ejecutivo" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Evolución de Ventas y Márgenes</CardTitle>
                <CardDescription>Últimos 6 meses</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorMargen" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} />
                    <Tooltip formatter={(v: number) => [`$${fmtARS(v)}`, '']} />
                    <Legend />
                    <Area type="monotone" dataKey="ventas"  stroke="#6366f1" fill="url(#colorVentas)" strokeWidth={2} name="Ventas" />
                    <Area type="monotone" dataKey="margen"  stroke="#10b981" fill="url(#colorMargen)" strokeWidth={2} name="Margen" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Pedidos por Estado</CardTitle>
                <CardDescription>Distribución actual</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={estadosPedidosLocal}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#6366f1" radius={[3, 3, 0, 0]} name="Pedidos" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Segmentación de Clientes</CardTitle>
                <CardDescription>Por grupo comercial</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={clientesPorGrupo} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {clientesPorGrupo.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Top 8 Clientes por Facturación</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {topClientes.map((c, i) => (
                    <div key={c.id} className="flex items-center gap-3">
                      <span className="text-xs font-mono text-muted-foreground w-5">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.razonSocial}</p>
                        <p className="text-xs text-muted-foreground font-mono">{c.nroDocumento}</p>
                      </div>
                      <span className="text-sm text-muted-foreground shrink-0">
                        {c.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Libro IVA ── */}
        <TabsContent value="libros" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Libro IVA Ventas</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Período: Febrero 2026 — Todos los comprobantes excepto cancelados</p>
            </div>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar a Excel
            </Button>
          </div>

          {/* Totales IVA */}
          <div className="grid gap-3 md:grid-cols-5">
            {[
              { label: 'Neto Gravado',  value: libroIVATotals.neto,   color: 'text-primary' },
              { label: 'IVA 21%',       value: libroIVATotals.iva21,  color: 'text-purple-600' },
              { label: 'IVA 10.5%',     value: libroIVATotals.iva105, color: 'text-purple-400' },
              { label: 'IVA 27%',       value: libroIVATotals.iva27,  color: 'text-indigo-600' },
              { label: 'Total',         value: libroIVATotals.total,  color: 'text-green-600' },
            ].map(k => (
              <div key={k.label} className="p-3 rounded-lg border bg-muted/30">
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className={`text-lg font-bold mt-1 ${k.color}`}>${fmtARS(k.value)}</p>
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
                    <TableHead>Razón Social</TableHead>
                    <TableHead>CUIT</TableHead>
                    <TableHead>Condición IVA</TableHead>
                    <TableHead className="text-right">Neto</TableHead>
                    <TableHead className="text-right">IVA 21%</TableHead>
                    <TableHead className="text-right">IVA 10.5%</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {libroIVA.map(i => (
                    <TableRow key={i.id} className="text-sm">
                      <TableCell>{new Date(i.fecha).toLocaleDateString('es-AR')}</TableCell>
                      <TableCell className="font-mono">{i.nroComprobante}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs uppercase">
                          {i.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{i.razonSocial}</TableCell>
                      <TableCell className="font-mono text-xs">{i.cuit}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">-</TableCell>
                      <TableCell className="text-right">${fmtARS(i.subtotal)}</TableCell>
                      <TableCell className="text-right text-purple-600">{i.iva21 > 0 ? `$${fmtARS(i.iva21)}` : '-'}</TableCell>
                      <TableCell className="text-right text-purple-400">{i.iva105 > 0 ? `$${fmtARS(i.iva105)}` : '-'}</TableCell>
                      <TableCell className="text-right font-semibold">${fmtARS(i.total)}</TableCell>
                    </TableRow>
                  ))}
                  {/* Totals row */}
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell colSpan={6} className="text-right text-sm">Totales:</TableCell>
                    <TableCell className="text-right text-sm">${fmtARS(libroIVATotals.neto)}</TableCell>
                    <TableCell className="text-right text-sm text-purple-600">${fmtARS(libroIVATotals.iva21)}</TableCell>
                    <TableCell className="text-right text-sm text-purple-400">${fmtARS(libroIVATotals.iva105)}</TableCell>
                    <TableCell className="text-right text-sm text-green-600">${fmtARS(libroIVATotals.total)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Márgenes ── */}
        <TabsContent value="margenes" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Margen por Producto (Top 10)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={margenPorProducto.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" domain={[0, 80]} tickFormatter={v => `${v}%`} tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="sku" tick={{ fontSize: 10 }} width={70} />
                    <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, 'Margen']} />
                    <Bar dataKey="margen" fill="#10b981" radius={[0, 3, 3, 0]} name="Margen %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Análisis Detallado de Márgenes</CardTitle>
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {margenPorProducto.map(p => (
                      <TableRow key={p.sku}>
                        <TableCell>
                          <p className="font-medium text-xs">{p.nombre}</p>
                          <p className="font-mono text-xs text-muted-foreground">{p.sku}</p>
                        </TableCell>
                        <TableCell className="text-right text-sm">${fmtARS(p.costo)}</TableCell>
                        <TableCell className="text-right text-sm">${fmtARS(p.precio)}</TableCell>
                        <TableCell className="text-right font-medium text-sm">${fmtARS(p.margenAbs)}</TableCell>
                        <TableCell className="text-right">
                          <span className={`font-bold text-sm ${p.margen >= 40 ? 'text-green-600' : p.margen >= 20 ? 'text-orange-600' : 'text-red-600'}`}>
                            {p.margen.toFixed(1)}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Promociones ── */}
        <TabsContent value="promociones" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Ventas Generadas por Promoción</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-8 text-center text-muted-foreground">
                  <p className="font-medium">Sin datos de promociones</p>
                  <p className="text-xs mt-1">No hay un endpoint de promociones disponible</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Efectividad por Promoción</CardTitle>
                <CardDescription>Clientes impactados y tasa de uso</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="p-8 text-center text-muted-foreground">
                  <p className="font-medium">Sin datos de promociones</p>
                  <p className="text-xs mt-1">No hay un endpoint de promociones disponible en esta versión</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Clientes ── */}
        <TabsContent value="clientes" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Estado de la Cartera</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 pt-2">
                  {(['activo', 'inactivo'] as const).map(e => {
                    const n   = e === 'activo' ? terceros.filter(t => t.activo).length : terceros.filter(t => !t.activo).length
                    const pct = terceros.length > 0 ? Math.round((n / terceros.length) * 100) : 0
                    const color = e === 'activo' ? 'bg-green-500' : 'bg-gray-400'
                    return (
                      <div key={e} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="capitalize">{e}</span>
                          <span className="font-semibold">{n} ({pct}%)</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Ranking de Clientes</CardTitle>
                <CardDescription>Por facturación acumulada</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Grupo</TableHead>
                      <TableHead className="text-right">Comprado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topClientes.map((c, i) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono text-muted-foreground text-xs">{i + 1}</TableCell>
                        <TableCell className="font-medium text-sm">{c.razonSocial}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize text-xs">{c.activo ? 'Activo' : 'Inactivo'}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-primary text-sm">
                          {c.nroDocumento}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default ReportesPage
