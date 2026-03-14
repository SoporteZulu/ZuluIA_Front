'use client'

import React, { useState, useMemo } from 'react'
import {
  Plus, Search, Eye, Edit, Trash2, Tag, Percent, Star, CalendarDays,
  Users, Package, X, Save, CheckCircle2, AlertCircle, TrendingUp,
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
import { Switch } from '@/components/ui/switch'
import { promotions, preciosEspeciales, products, customers } from '@/lib/sales-data'
import type { Promotion, PrecioEspecial } from '@/lib/sales-types'
import { useListasPrecios } from '@/lib/hooks/useListasPrecios'
import type { ListaPrecios, ListaPreciosDetalle } from '@/lib/types/listas-precios'

function fmtARS(n: number) {
  return n.toLocaleString('es-AR', { minimumFractionDigits: 2 })
}

function getProductName(id: string) {
  return products.find(p => p.id === id)?.nombre ?? id
}

function getCustomerName(id: string) {
  return customers.find(c => c.id === id)?.razonSocial ?? id
}

// ─── Promotion Status Badge ───────────────────────────────────────────────────

function PromoBadge({ estado }: { estado: Promotion['estado'] }) {
  const cfg = {
    programada:  { label: 'Programada',  variant: 'secondary' as const,    cls: 'bg-blue-100 text-blue-800 border-blue-200' },
    activa:      { label: 'Activa',      variant: 'default' as const,      cls: 'bg-green-100 text-green-800 border-green-200' },
    finalizada:  { label: 'Finalizada',  variant: 'outline' as const,      cls: 'bg-gray-100 text-gray-600' },
    suspendida:  { label: 'Suspendida',  variant: 'destructive' as const,  cls: 'bg-red-100 text-red-800 border-red-200' },
  }[estado]
  return <Badge variant={cfg.variant} className={`text-xs ${cfg.cls}`}>{cfg.label}</Badge>
}

// ─── Price List Detail ────────────────────────────────────────────────────────

function PriceListDetail({ list }: { list: ListaPreciosDetalle }) {
  const [tab, setTab] = useState('productos')
  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="productos">Productos ({list.items.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="general" className="mt-4 space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            ['Moneda', list.monedaSimbolo ?? String(list.monedaId)],
            ['Vigencia Desde', list.vigenciaDesde ? new Date(list.vigenciaDesde).toLocaleDateString('es-AR') : 'Sin fecha'],
            ['Vigencia Hasta', list.vigenciaHasta ? new Date(list.vigenciaHasta).toLocaleDateString('es-AR') : 'Sin vencimiento'],
            ['Lista Default', list.esDefault ? 'Sí' : 'No'],
            ['Estado', list.activa ? 'Activa' : 'Inactiva'],
          ].map(([k, v]) => (
            <div key={k} className="p-3 rounded-lg bg-muted/50">
              <span className="text-xs text-muted-foreground block mb-0.5">{k}</span>
              <p className="font-medium">{v}</p>
            </div>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="productos" className="mt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead className="text-right">Descuento</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.items.length === 0 ? (
              <TableRow><TableCell colSpan={3} className="text-center py-6 text-muted-foreground text-sm">Sin productos en esta lista.</TableCell></TableRow>
            ) : list.items.map(item => (
              <TableRow key={item.itemId}>
                <TableCell>
                  <p className="font-medium text-sm">{item.itemDescripcion}</p>
                  <p className="text-xs text-muted-foreground font-mono">{item.itemCodigo}</p>
                </TableCell>
                <TableCell className="text-right font-semibold">${fmtARS(item.precio)}</TableCell>
                <TableCell className="text-right">
                  {item.descuentoPct > 0
                    ? <span className="text-orange-600 font-semibold">{item.descuentoPct.toFixed(1)}%</span>
                    : <span className="text-muted-foreground">-</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TabsContent>
    </Tabs>
  )
}

// ─── New Price List Form ──────────────────────────────────────────────────────

function NuevaListaForm() {
  const [tipo, setTipo] = useState<PriceList['tipo']>('minorista')
  const [divisa, setDivisa] = useState<'ARS' | 'USD' | 'EUR'>('ARS')

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Nombre <span className="text-red-500">*</span></Label>
          <Input placeholder="Lista Mayoristas Verano 2026" />
        </div>
        <div className="space-y-1.5">
          <Label>Tipo <span className="text-red-500">*</span></Label>
          <Select value={tipo} onValueChange={(v) => setTipo(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="minorista">Minorista</SelectItem>
              <SelectItem value="mayorista">Mayorista</SelectItem>
              <SelectItem value="especial">Especial</SelectItem>
              <SelectItem value="promocional">Promocional</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Divisa</Label>
          <Select value={divisa} onValueChange={(v) => setDivisa(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ARS">ARS - Pesos</SelectItem>
              <SelectItem value="USD">USD - Dólares</SelectItem>
              <SelectItem value="EUR">EUR - Euros</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Prioridad</Label>
          <Input type="number" placeholder="1" min={1} />
        </div>
        <div className="space-y-1.5">
          <Label>Vigencia Desde</Label>
          <Input type="date" />
        </div>
        <div className="space-y-1.5">
          <Label>Vigencia Hasta</Label>
          <Input type="date" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Switch id="default-list" />
        <Label htmlFor="default-list">Marcar como lista default</Label>
      </div>
    </div>
  )
}

// ─── Promo Detail ─────────────────────────────────────────────────────────────

function PromoDetail({ promo }: { promo: Promotion }) {
  const dias = Math.ceil((new Date(promo.fechaFin).getTime() - new Date(promo.fechaInicio).getTime()) / 86400000)
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 text-sm">
        {[
          ['Tipo Promoción', promo.tipo.replace('_', ' ')],
          ['Descuento', promo.descuentoPorcentaje ? `${promo.descuentoPorcentaje}%` : promo.descuentoMonto ? `$${fmtARS(promo.descuentoMonto)}` : '-'],
          ['Inicio', new Date(promo.fechaInicio).toLocaleDateString('es-AR')],
          ['Fin', new Date(promo.fechaFin).toLocaleDateString('es-AR')],
          ['Duración', `${dias} días`],
          ['Compra Mínima', promo.compraMinima ? `$${fmtARS(promo.compraMinima)}` : 'Sin mínimo'],
          ['Límite Usos', promo.limiteUsos ? String(promo.limiteUsos) : 'Ilimitado'],
          ['No Acumulable', promo.noAcumulable ? 'Sí' : 'No'],
        ].map(([k, v]) => (
          <div key={k} className="p-3 rounded-lg bg-muted/50">
            <span className="text-xs text-muted-foreground block mb-0.5">{k}</span>
            <p className="font-medium capitalize">{v}</p>
          </div>
        ))}
      </div>
      {promo.descripcion && (
        <div className="p-3 rounded-lg bg-muted/50">
          <span className="text-xs text-muted-foreground block mb-0.5">Descripción</span>
          <p className="text-sm">{promo.descripcion}</p>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

const ListasPreciosPage = () => {
  const { listas, loading: loadingListas, error: errorListas, getById, crear } = useListasPrecios()
  const [mainTab, setMainTab]         = useState('listas')
  const [searchTerm, setSearchTerm]   = useState('')
  const [isListaFormOpen, setIsListaFormOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen]       = useState(false)
  const [detailList, setDetailList]           = useState<ListaPreciosDetalle | null>(null)
  const [loadingDetail, setLoadingDetail]     = useState(false)
  const [isPromoDetailOpen, setIsPromoDetailOpen] = useState(false)
  const [detailPromo, setDetailPromo]             = useState<Promotion | null>(null)

  const handleOpenDetail = async (lista: ListaPrecios) => {
    setLoadingDetail(true)
    setIsDetailOpen(true)
    const detail = await getById(lista.id)
    setDetailList(detail)
    setLoadingDetail(false)
  }

  const filteredLists = useMemo(() => listas.filter(l =>
    l.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  ), [listas, searchTerm])

  const filteredPromos = useMemo(() => promotions.filter(p =>
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  ), [searchTerm])

  const filteredPE = useMemo(() => preciosEspeciales.filter(pe =>
    getCustomerName(pe.clienteId).toLowerCase().includes(searchTerm.toLowerCase()) ||
    getProductName(pe.productoId).toLowerCase().includes(searchTerm.toLowerCase())
  ), [searchTerm])

  const kpis = {
    listas:    listas.length,
    activas:   promotions.filter(p => p.estado === 'activa').length,
    especiales: preciosEspeciales.filter(pe => pe.estado === 'activo').length,
    vencidas:  preciosEspeciales.filter(pe => pe.estado === 'vencido').length,
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Precios y Promociones</h1>
          <p className="text-muted-foreground">Gestión de listas de precios, promociones y precios especiales</p>
        </div>
        <Button onClick={() => setIsListaFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Lista
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Listas Activas',         value: kpis.listas,     icon: <Tag className="h-4 w-4" />,         color: 'text-primary' },
          { label: 'Promociones Activas',    value: kpis.activas,    icon: <Percent className="h-4 w-4" />,     color: 'text-green-600' },
          { label: 'Precios Especiales',     value: kpis.especiales, icon: <Star className="h-4 w-4" />,        color: 'text-orange-600' },
          { label: 'Precios Vencidos',       value: kpis.vencidas,   icon: <AlertCircle className="h-4 w-4" />, color: 'text-red-600' },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value}</p>
                </div>
                <div className={`${k.color} opacity-60`}>{k.icon}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar en listas, promociones o precios especiales..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Main Tabs */}
      <Tabs value={mainTab} onValueChange={setMainTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="listas" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Listas de Precios
          </TabsTrigger>
          <TabsTrigger value="promociones" className="flex items-center gap-2">
            <Percent className="h-4 w-4" />
            Promociones
          </TabsTrigger>
          <TabsTrigger value="especiales" className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            Precios Especiales
          </TabsTrigger>
        </TabsList>

        {/* ── Listas de Precios ── */}
        <TabsContent value="listas" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Moneda</TableHead>
                    <TableHead>Vigencia</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingListas ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-10"><div className="inline-block animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" /></TableCell></TableRow>
                  ) : errorListas ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-10 text-red-600 text-sm">{errorListas}</TableCell></TableRow>
                  ) : filteredLists.map(list => (
                    <TableRow key={list.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleOpenDetail(list)}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{list.nombre}</span>
                          {list.esDefault && <Badge variant="secondary" className="text-xs">Default</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono font-medium">{list.monedaSimbolo ?? list.monedaId}</TableCell>
                      <TableCell className="text-sm">
                        <p>{list.vigenciaDesde ? new Date(list.vigenciaDesde).toLocaleDateString('es-AR') : '-'}</p>
                        <p className="text-xs text-muted-foreground">
                          {list.vigenciaHasta ? `hasta ${new Date(list.vigenciaHasta).toLocaleDateString('es-AR')}` : 'Sin vencimiento'}
                        </p>
                      </TableCell>
                      <TableCell>
                        {list.activa
                          ? <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">Activa</Badge>
                          : <Badge variant="outline" className="text-xs">Inactiva</Badge>}
                      </TableCell>
                      <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenDetail(list)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Promociones ── */}
        <TabsContent value="promociones" className="mt-4">
          <div className="flex justify-end mb-3">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Promoción
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descuento</TableHead>
                    <TableHead>Vigencia</TableHead>
                    <TableHead>Aplica a</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPromos.map(promo => (
                    <TableRow key={promo.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setDetailPromo(promo); setIsPromoDetailOpen(true) }}>
                      <TableCell>
                        <p className="font-semibold">{promo.nombre}</p>
                        {promo.noAcumulable && <Badge variant="outline" className="text-xs mt-1">No Acumulable</Badge>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize text-xs">
                          {promo.tipo.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-orange-600">
                        {promo.descuentoPorcentaje ? `${promo.descuentoPorcentaje}%` : promo.descuentoMonto ? `$${fmtARS(promo.descuentoMonto)}` : promo.tipo}
                      </TableCell>
                      <TableCell className="text-sm">
                        <p>{new Date(promo.fechaInicio).toLocaleDateString('es-AR')}</p>
                        <p className="text-xs text-muted-foreground">hasta {new Date(promo.fechaFin).toLocaleDateString('es-AR')}</p>
                      </TableCell>
                      <TableCell className="text-sm capitalize text-muted-foreground">{promo.clientesAplica.replace('_', ' ')}</TableCell>
                      <TableCell><PromoBadge estado={promo.estado} /></TableCell>
                      <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setDetailPromo(promo); setIsPromoDetailOpen(true) }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Precios Especiales ── */}
        <TabsContent value="especiales" className="mt-4">
          <div className="flex justify-end mb-3">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Precio Especial
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">P. Lista</TableHead>
                    <TableHead className="text-right">P. Especial</TableHead>
                    <TableHead className="text-right">Descuento</TableHead>
                    <TableHead>Vigencia</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPE.map(pe => {
                    const pct = (((pe.precioListaActual - pe.precioEspecial) / pe.precioListaActual) * 100)
                    const estadoCfg = {
                      activo:    { label: 'Activo',    cls: 'bg-green-100 text-green-800 border-green-200' },
                      vencido:   { label: 'Vencido',   cls: 'bg-red-100 text-red-800' },
                      pendiente: { label: 'Pendiente', cls: 'bg-yellow-100 text-yellow-800' },
                    }[pe.estado ?? 'activo']
                    return (
                      <TableRow key={pe.id} className="hover:bg-muted/50">
                        <TableCell>
                          <p className="font-medium text-sm">{getCustomerName(pe.clienteId)}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{getProductName(pe.productoId)}</p>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground line-through text-sm">
                          ${fmtARS(pe.precioListaActual)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-primary">
                          ${fmtARS(pe.precioEspecial)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-orange-600 font-semibold">-{pct.toFixed(1)}%</span>
                        </TableCell>
                        <TableCell className="text-sm">
                          {pe.esIndefinido ? (
                            <span className="text-muted-foreground">Sin vencimiento</span>
                          ) : (
                            <span>{pe.vigenciaHasta ? new Date(pe.vigenciaHasta).toLocaleDateString('es-AR') : '-'}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${estadoCfg.cls}`}>
                            {estadoCfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Price List Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Tag className="h-5 w-5" />
              {detailList?.nombre ?? 'Cargando...'}
              {detailList?.esDefault && <Badge variant="secondary">Default</Badge>}
            </DialogTitle>
          </DialogHeader>
          {loadingDetail ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : detailList ? (
            <PriceListDetail list={detailList} />
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Promotion Detail Dialog */}
      <Dialog open={isPromoDetailOpen} onOpenChange={setIsPromoDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Percent className="h-5 w-5" />
              {detailPromo?.nombre}
              {detailPromo && <PromoBadge estado={detailPromo.estado} />}
            </DialogTitle>
          </DialogHeader>
          {detailPromo && <PromoDetail promo={detailPromo} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPromoDetailOpen(false)}>Cerrar</Button>
            <Button variant="outline"><Edit className="h-4 w-4 mr-2" />Editar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Price List Form Dialog */}
      <Dialog open={isListaFormOpen} onOpenChange={setIsListaFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nueva Lista de Precios</DialogTitle>
          </DialogHeader>
          <NuevaListaForm />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsListaFormOpen(false)}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button>
              <Save className="h-4 w-4 mr-2" />
              Crear Lista
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ListasPreciosPage
