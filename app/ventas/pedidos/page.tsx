'use client'

import React, { useState, useMemo } from 'react'
import {
  Plus, Search, Eye, Edit, Trash2, ChevronDown, AlertTriangle,
  CheckCircle2, Clock, Truck, FileText, X, Save, ShoppingCart,
  AlertCircle, Package,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { salesOrders, customers, products, priceLists } from '@/lib/sales-data'
import type { SalesOrder, OrderItem, OrderStatus } from '@/lib/sales-types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const estadoConfig: Record<OrderStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; icon: React.ReactNode }> = {
  borrador:       { label: 'Borrador',       variant: 'secondary',    icon: <Clock className="h-3 w-3" /> },
  confirmado:     { label: 'Confirmado',     variant: 'default',      icon: <CheckCircle2 className="h-3 w-3" /> },
  en_preparacion: { label: 'En Preparación', variant: 'outline',      icon: <Package className="h-3 w-3" /> },
  despachado:     { label: 'Despachado',     variant: 'outline',      icon: <Truck className="h-3 w-3" /> },
  facturado:      { label: 'Facturado',      variant: 'default',      icon: <FileText className="h-3 w-3" /> },
  cancelado:      { label: 'Cancelado',      variant: 'destructive',  icon: <X className="h-3 w-3" /> },
}

function fmtARS(n: number) {
  return n.toLocaleString('es-AR', { minimumFractionDigits: 2 })
}

function getCustomerById(id: string) {
  return customers.find(c => c.id === id)
}

function getPriceForProduct(productId: string, customerId: string) {
  const customer = getCustomerById(customerId)
  const listName = customer?.listaAsignada
  const list = priceLists.find(l => l.nombre === listName)
  const item = list?.items.find(i => i.productoId === productId)
  if (item) return item.precioLista
  const product = products.find(p => p.id === productId)
  return product?.precioVenta ?? 0
}

// ─── New Order Form ────────────────────────────────────────────────────────────

interface FormItem {
  id: string
  productoId: string
  descripcion: string
  cantidad: number
  precioUnitario: number
  descuentoPorcentaje: number
}

function calcItem(i: FormItem) {
  const base = i.cantidad * i.precioUnitario
  const desc = base * (i.descuentoPorcentaje / 100)
  const neto = base - desc
  const iva  = neto * 0.21
  return { subtotal: neto, iva, total: neto + iva }
}

function NuevoPedidoForm({ onClose }: { onClose: () => void }) {
  const [clienteId, setClienteId] = useState('')
  const [vendedor, setVendedor] = useState('')
  const [fuente, setFuente] = useState<'web' | 'telefono' | 'vendedor' | 'otro'>('vendedor')
  const [entregaEstimada, setEntregaEstimada] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [items, setItems] = useState<FormItem[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [tab, setTab] = useState('datos')

  const customer = useMemo(() => customers.find(c => c.id === clienteId), [clienteId])

  const addProduct = (productId: string) => {
    const prod = products.find(p => p.id === productId)
    if (!prod) return
    const existing = items.find(i => i.productoId === productId)
    if (existing) {
      setItems(items.map(i => i.productoId === productId ? { ...i, cantidad: i.cantidad + 1 } : i))
    } else {
      setItems([...items, {
        id: `fi-${Date.now()}`,
        productoId: productId,
        descripcion: prod.nombre,
        cantidad: 1,
        precioUnitario: getPriceForProduct(productId, clienteId),
        descuentoPorcentaje: customer?.descuentoGeneral ?? 0,
      }])
    }
    setProductSearch('')
  }

  const updateItem = (id: string, field: keyof FormItem, value: number | string) => {
    setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i))
  }

  const removeItem = (id: string) => setItems(items.filter(i => i.id !== id))

  const totals = useMemo(() => {
    const subtotal = items.reduce((s, i) => s + calcItem(i).subtotal, 0)
    const desc     = items.reduce((s, i) => s + i.cantidad * i.precioUnitario * (i.descuentoPorcentaje / 100), 0)
    const iva      = items.reduce((s, i) => s + calcItem(i).iva, 0)
    return { subtotal, desc, iva, total: subtotal + iva }
  }, [items])

  const creditPct = customer
    ? Math.min(Math.round(((customer.creditoUtilizado + totals.total) / customer.creditoLimite) * 100), 100)
    : 0
  const creditWarning = creditPct >= 90
  const creditBlocked = customer?.estado === 'bloqueado' || customer?.estado === 'moroso'

  const filteredProducts = products.filter(p =>
    p.nombre.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.sku.toLowerCase().includes(productSearch.toLowerCase())
  ).slice(0, 8)

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="datos">Datos del Pedido</TabsTrigger>
          <TabsTrigger value="items">Items ({items.length})</TabsTrigger>
          <TabsTrigger value="resumen">Resumen y Totales</TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Datos ── */}
        <TabsContent value="datos" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Cliente <span className="text-red-500">*</span></Label>
              <Select value={clienteId} onValueChange={setClienteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cliente..." />
                </SelectTrigger>
                <SelectContent>
                  {customers.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="font-medium">{c.razonSocial}</span>
                      <span className="text-xs text-muted-foreground ml-2">{c.cuitCuil}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {customer && (
              <div className={`p-3 rounded-lg border text-sm ${creditBlocked ? 'border-red-300 bg-red-50' : creditWarning ? 'border-orange-300 bg-orange-50' : 'border-green-300 bg-green-50'}`}>
                <div className="flex items-center gap-2 mb-1">
                  {creditBlocked ? <AlertCircle className="h-4 w-4 text-red-600" /> : creditWarning ? <AlertTriangle className="h-4 w-4 text-orange-600" /> : <CheckCircle2 className="h-4 w-4 text-green-600" />}
                  <span className="font-medium text-xs">
                    {creditBlocked ? 'CLIENTE BLOQUEADO / MOROSO' : creditWarning ? 'Límite de crédito próximo a agotarse' : 'Crédito disponible'}
                  </span>
                </div>
                <Progress value={creditPct} className="h-1.5 mb-1" />
                <p className="text-xs text-muted-foreground">
                  Disponible: ${(customer.creditoLimite - customer.creditoUtilizado).toLocaleString('es-AR')} / Límite: ${customer.creditoLimite.toLocaleString('es-AR')}
                </p>
                {customer.listaAsignada && (
                  <p className="text-xs mt-1">Lista: <span className="font-medium">{customer.listaAsignada}</span></p>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Vendedor</Label>
              <Select value={vendedor} onValueChange={setVendedor}>
                <SelectTrigger><SelectValue placeholder="Seleccionar vendedor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Juan Pérez">Juan Pérez</SelectItem>
                  <SelectItem value="María García">María García</SelectItem>
                  <SelectItem value="Carlos Ruiz">Carlos Ruiz</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Fuente</Label>
              <Select value={fuente} onValueChange={(v) => setFuente(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vendedor">Vendedor</SelectItem>
                  <SelectItem value="telefono">Teléfono</SelectItem>
                  <SelectItem value="web">Web</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Entrega Estimada</Label>
              <Input type="date" value={entregaEstimada} onChange={e => setEntregaEstimada(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Observaciones del Cliente</Label>
            <Textarea
              placeholder="Instrucciones especiales, referencias, etc."
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
              className="resize-none h-20"
            />
          </div>
        </TabsContent>

        {/* ── Tab 2: Items ── */}
        <TabsContent value="items" className="space-y-4 mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar producto por nombre o SKU para agregar..."
              value={productSearch}
              onChange={e => setProductSearch(e.target.value)}
              className="pl-10"
            />
            {productSearch && filteredProducts.length > 0 && (
              <div className="absolute z-10 top-full left-0 right-0 bg-background border rounded-lg shadow-lg mt-1 overflow-hidden">
                {filteredProducts.map(p => (
                  <button
                    key={p.id}
                    onClick={() => addProduct(p.id)}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/60 text-sm border-b last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-muted-foreground w-20 shrink-0">{p.sku}</span>
                      <span className="font-medium">{p.nombre}</span>
                    </div>
                    <div className="flex items-center gap-4 text-right shrink-0">
                      <span className="text-xs text-muted-foreground">Stock: {p.stock}</span>
                      <span className="font-semibold text-primary">${getPriceForProduct(p.id, clienteId).toLocaleString('es-AR')}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
              <ShoppingCart className="h-10 w-10 mb-2 opacity-30" />
              <p className="text-sm">Sin items. Busca un producto arriba para agregar.</p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-[30%]">Producto</TableHead>
                    <TableHead className="text-right w-20">Cant.</TableHead>
                    <TableHead className="text-right w-32">P.Unitario</TableHead>
                    <TableHead className="text-right w-24">Dto. %</TableHead>
                    <TableHead className="text-right w-32">Subtotal</TableHead>
                    <TableHead className="text-right w-32">Total c/IVA</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map(item => {
                    const c = calcItem(item)
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="text-sm font-medium">{item.descripcion}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min={1}
                            value={item.cantidad}
                            onChange={e => updateItem(item.id, 'cantidad', Math.max(1, Number(e.target.value)))}
                            className="h-7 w-16 text-right text-xs ml-auto"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min={0}
                            value={item.precioUnitario}
                            onChange={e => updateItem(item.id, 'precioUnitario', Number(e.target.value))}
                            className="h-7 w-28 text-right text-xs ml-auto"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={item.descuentoPorcentaje}
                            onChange={e => updateItem(item.id, 'descuentoPorcentaje', Number(e.target.value))}
                            className="h-7 w-20 text-right text-xs ml-auto"
                          />
                        </TableCell>
                        <TableCell className="text-right text-sm">${fmtARS(c.subtotal)}</TableCell>
                        <TableCell className="text-right text-sm font-semibold">${fmtARS(c.total)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeItem(item.id)}>
                            <X className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ── Tab 3: Resumen ── */}
        <TabsContent value="resumen" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-4 space-y-3">
                <h4 className="text-sm font-semibold">Resumen de Items</h4>
                {items.map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.descripcion} x{item.cantidad}</span>
                    <span className="font-medium">${fmtARS(calcItem(item).total)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 space-y-3">
                <h4 className="text-sm font-semibold">Totales</h4>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal (sin IVA)</span>
                  <span>${fmtARS(totals.subtotal + totals.desc)}</span>
                </div>
                <div className="flex justify-between text-sm text-orange-600">
                  <span>Descuentos</span>
                  <span>-${fmtARS(totals.desc)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Neto</span>
                  <span>${fmtARS(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-purple-600">
                  <span>IVA 21%</span>
                  <span>${fmtARS(totals.iva)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span className="text-primary">${fmtARS(totals.total)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ─── Detail Dialog ─────────────────────────────────────────────────────────────

function OrderDetail({ order }: { order: SalesOrder }) {
  const customer = getCustomerById(order.clienteId)

  return (
    <Tabs defaultValue="general" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="items">Items ({order.items.length})</TabsTrigger>
        <TabsTrigger value="totales">Totales</TabsTrigger>
      </TabsList>

      <TabsContent value="general" className="space-y-4 mt-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            ['Cliente', customer?.razonSocial ?? order.clienteId],
            ['CUIT', customer?.cuitCuil ?? '-'],
            ['Vendedor', order.vendedor ?? '-'],
            ['Fuente', order.fuente],
            ['Fecha Pedido', new Date(order.fecha).toLocaleDateString('es-AR')],
            ['Entrega Estimada', new Date(order.entregaEstimada).toLocaleDateString('es-AR')],
            ['Lista de Precios', customer?.listaAsignada ?? '-'],
            ['Condición Pago', `${customer?.condicionesPago?.plazo ?? 30} días`],
          ].map(([k, v]) => (
            <div key={k} className="p-3 rounded-lg bg-muted/50">
              <span className="text-xs text-muted-foreground block mb-0.5">{k}</span>
              <p className="font-medium">{v}</p>
            </div>
          ))}
        </div>
        {order.observacionesCliente && (
          <div className="p-3 rounded-lg bg-muted/50">
            <span className="text-xs text-muted-foreground block mb-0.5">Observaciones</span>
            <p className="text-sm">{order.observacionesCliente}</p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="items" className="mt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead className="text-right">Cant.</TableHead>
              <TableHead className="text-right">P.Unitario</TableHead>
              <TableHead className="text-right">Dto.</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.items.map(item => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.descripcion}</TableCell>
                <TableCell className="text-right">{item.cantidad}</TableCell>
                <TableCell className="text-right">${fmtARS(item.precioUnitario)}</TableCell>
                <TableCell className="text-right text-orange-600">
                  {item.descuentoPorcentaje > 0 ? `${item.descuentoPorcentaje}%` : '-'}
                </TableCell>
                <TableCell className="text-right font-semibold">${fmtARS(item.total)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TabsContent>

      <TabsContent value="totales" className="mt-4">
        <div className="max-w-sm ml-auto space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>${fmtARS(order.subtotal)}</span></div>
          <div className="flex justify-between text-orange-600"><span>Descuentos</span><span>-${fmtARS(order.descuentos)}</span></div>
          <div className="flex justify-between text-purple-600"><span>IVA</span><span>${fmtARS(order.iva)}</span></div>
          <Separator />
          <div className="flex justify-between font-bold text-base"><span>Total</span><span className="text-primary">${fmtARS(order.total)}</span></div>
        </div>
      </TabsContent>
    </Tabs>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

const PedidosPage = () => {
  const [searchTerm, setSearchTerm]         = useState('')
  const [statusFilter, setStatusFilter]     = useState('todos')
  const [isNewOpen, setIsNewOpen]           = useState(false)
  const [isDetailOpen, setIsDetailOpen]     = useState(false)
  const [detailOrder, setDetailOrder]       = useState<SalesOrder | null>(null)

  const filtered = useMemo(() => salesOrders.filter(o => {
    const customer = getCustomerById(o.clienteId)
    const matchSearch =
      o.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer?.razonSocial ?? '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchStatus = statusFilter === 'todos' || o.estado === statusFilter
    return matchSearch && matchStatus
  }), [searchTerm, statusFilter])

  const kpis = useMemo(() => ({
    total:         salesOrders.length,
    confirmados:   salesOrders.filter(o => o.estado === 'confirmado').length,
    preparacion:   salesOrders.filter(o => o.estado === 'en_preparacion').length,
    despachados:   salesOrders.filter(o => o.estado === 'despachado').length,
    montoTotal:    salesOrders.reduce((s, o) => s + o.total, 0),
    montoPendiente: salesOrders.filter(o => !['facturado', 'cancelado'].includes(o.estado)).reduce((s, o) => s + o.total, 0),
  }), [])

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pedidos de Venta</h1>
          <p className="text-muted-foreground">Gestión de órdenes de venta</p>
        </div>
        <Button onClick={() => setIsNewOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Pedido
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        {[
          { label: 'Total Pedidos',    value: kpis.total,         color: 'text-foreground' },
          { label: 'Confirmados',      value: kpis.confirmados,   color: 'text-green-600' },
          { label: 'En Preparación',   value: kpis.preparacion,   color: 'text-orange-600' },
          { label: 'Despachados',      value: kpis.despachados,   color: 'text-blue-600' },
          { label: 'Monto Total',      value: `$${(kpis.montoTotal / 1000).toFixed(0)}K`,      color: 'text-primary' },
          { label: 'Monto Pendiente',  value: `$${(kpis.montoPendiente / 1000).toFixed(0)}K`,  color: 'text-orange-600' },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código o cliente..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            {Object.entries(estadoConfig).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Entrega</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(order => {
                const cfg = estadoConfig[order.estado]
                const customer = getCustomerById(order.clienteId)
                return (
                  <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setDetailOrder(order); setIsDetailOpen(true) }}>
                    <TableCell className="font-mono font-semibold text-primary">{order.codigo}</TableCell>
                    <TableCell>
                      <p className="font-medium text-sm">{customer?.razonSocial ?? order.clienteId}</p>
                      <p className="text-xs text-muted-foreground">{customer?.cuitCuil}</p>
                    </TableCell>
                    <TableCell className="text-sm">{order.vendedor ?? '-'}</TableCell>
                    <TableCell className="text-sm">{new Date(order.fecha).toLocaleDateString('es-AR')}</TableCell>
                    <TableCell className="text-sm">{new Date(order.entregaEstimada).toLocaleDateString('es-AR')}</TableCell>
                    <TableCell>
                      <Badge variant={cfg.variant} className="flex items-center gap-1 w-fit">
                        {cfg.icon}
                        {cfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">${fmtARS(order.total)}</TableCell>
                    <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" onClick={() => { setDetailOrder(order); setIsDetailOpen(true) }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    No se encontraron pedidos con los filtros actuales.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* New Order Dialog */}
      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Nuevo Pedido de Venta
            </DialogTitle>
          </DialogHeader>
          <NuevoPedidoForm onClose={() => setIsNewOpen(false)} />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsNewOpen(false)}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button variant="outline">
              <Save className="h-4 w-4 mr-2" />
              Guardar Borrador
            </Button>
            <Button>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Confirmar Pedido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span className="font-mono">{detailOrder?.codigo}</span>
              {detailOrder && (
                <Badge variant={estadoConfig[detailOrder.estado].variant} className="flex items-center gap-1">
                  {estadoConfig[detailOrder.estado].icon}
                  {estadoConfig[detailOrder.estado].label}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {detailOrder && <OrderDetail order={detailOrder} />}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>Cerrar</Button>
            {detailOrder?.estado === 'confirmado' && (
              <Button variant="outline">
                <Truck className="h-4 w-4 mr-2" />
                Generar Remito
              </Button>
            )}
            {detailOrder?.estado === 'despachado' && (
              <Button>
                <FileText className="h-4 w-4 mr-2" />
                Generar Factura
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default PedidosPage
