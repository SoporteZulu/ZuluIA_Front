"use client"

import Link from "next/link"
import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  Plus,
  Warehouse,
} from "lucide-react"
import { useDepositos } from "@/lib/hooks/useDepositos"
import { useOrdenesCompra } from "@/lib/hooks/useOrdenesCompra"
import { useComprobantes } from "@/lib/hooks/useComprobantes"
import { useStockActions, useStockResumen } from "@/lib/hooks/useStock"
import { useDefaultSucursalId } from "@/lib/hooks/useSucursales"
import { useTerceros } from "@/lib/hooks/useTerceros"
import {
  getOrdenCompraRecepcionLabel,
  getOrdenCompraRecepcionProgress,
  isOrdenCompraRecepcionAbierta,
  isOrdenCompraRecepcionParcial,
} from "@/lib/utils"

function getSalidaStatusLabel(estado: string) {
  switch ((estado ?? "").toUpperCase()) {
    case "BORRADOR":
      return "Preparacion pendiente"
    case "EMITIDO":
      return "Salida emitida"
    case "ANULADO":
      return "Salida anulada"
    default:
      return estado || "Sin estado"
  }
}

function getCoverageLabel(stockActual: number, stockMinimo: number) {
  if (stockActual <= 0) return "Sin cobertura operativa"
  if (stockMinimo <= 0) return "Sin mínimo configurado"
  const ratio = (stockActual / stockMinimo) * 100
  if (ratio < 50) return "Cobertura crítica"
  return "Cobertura baja con remanente"
}

export default function AlmacenesPage() {
  const defaultSucursalId = useDefaultSucursalId()
  const { resumen, bajoMinimo, loading, refetch } = useStockResumen(defaultSucursalId)
  const { depositos } = useDepositos()
  const { ordenes } = useOrdenesCompra()
  const { comprobantes } = useComprobantes({ esVenta: true })
  const { terceros } = useTerceros()
  const { ajustar, loading: adjusting, error: adjustError } = useStockActions()
  const [selectedAlert, setSelectedAlert] = useState<string | null>(null)
  const [isAdjustOpen, setIsAdjustOpen] = useState(false)
  const [adjustQuantity, setAdjustQuantity] = useState(0)
  const [adjustNote, setAdjustNote] = useState("")

  const kpis = {
    totalItemsConStock: resumen?.totalItemsConStock ?? 0,
    itemsBajoMinimo: resumen?.itemsBajoMinimo ?? 0,
    itemsSinStock: resumen?.itemsSinStock ?? 0,
    totalDepositos: resumen?.totalDepositos ?? depositos.length,
  }

  const recepcionesAbiertas = ordenes.filter(isOrdenCompraRecepcionAbierta)
  const recepcionesParciales = recepcionesAbiertas.filter(isOrdenCompraRecepcionParcial).length
  const salidasActivas = comprobantes.filter((c) => c.estado === "BORRADOR")
  const alertasCriticas = bajoMinimo.filter((item) => item.stockActual <= 0).length
  const alertasReposicion = bajoMinimo.filter((item) => item.stockActual > 0).length
  const depositosConCobertura = kpis.totalDepositos > 0 && kpis.totalItemsConStock > 0
  const selectedAlertDetail = selectedAlert
    ? bajoMinimo.find((item) => `${item.itemId}-${item.depositoId}` === selectedAlert)
    : null
  const highlightedAlert = selectedAlertDetail ?? bajoMinimo[0] ?? null

  const getClienteNombre = (terceroId: number) =>
    terceros.find((cliente) => cliente.id === terceroId)?.razonSocial ?? `#${terceroId}`

  const getClienteDestino = (terceroId: number) => {
    const customer = terceros.find((cliente) => cliente.id === terceroId)
    if (!customer) return "Destino no informado"
    const destination = [
      customer.localidadDescripcion,
      [customer.calle, customer.nro].filter(Boolean).join(" "),
    ]
      .filter(Boolean)
      .join(" · ")
    return destination || "Destino no informado"
  }

  const openAdjustDialog = () => {
    if (!highlightedAlert) return
    setAdjustQuantity(highlightedAlert.stockMinimo)
    setAdjustNote(`Ajuste rápido desde dashboard para ${highlightedAlert.codigo}`)
    setIsAdjustOpen(true)
  }

  const handleAdjustStock = async () => {
    if (!highlightedAlert) return
    const ok = await ajustar({
      itemId: highlightedAlert.itemId,
      depositoId: highlightedAlert.depositoId,
      nuevaCantidad: adjustQuantity,
      observacion: adjustNote.trim() || undefined,
    })

    if (ok) {
      setIsAdjustOpen(false)
      await refetch()
      setSelectedAlert(`${highlightedAlert.itemId}-${highlightedAlert.depositoId}`)
    }
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <Card className="border-sky-200 bg-linear-to-br from-sky-50 via-background to-cyan-50">
          <CardHeader className="space-y-4">
            <Badge variant="outline" className="w-fit border-sky-200 bg-white/80 text-sky-900">
              Centro operativo
            </Badge>
            <div className="space-y-2">
              <CardTitle className="text-3xl tracking-tight text-slate-950">
                Almacenes WMS
              </CardTitle>
              <CardDescription className="max-w-3xl text-base leading-7 text-slate-600">
                Vista central de stock, recepciones y salidas con lectura operativa orientada a
                desvíos visibles y circuitos activos del backend actual.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="bg-white/80 text-slate-900">
                {kpis.totalDepositos} depósitos visibles
              </Badge>
              <Badge variant="secondary" className="bg-white/80 text-slate-900">
                {recepcionesAbiertas.length} recepciones activas
              </Badge>
              <Badge variant="secondary" className="bg-white/80 text-slate-900">
                {kpis.itemsBajoMinimo} alertas en foco
              </Badge>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-sky-200 bg-white/80 p-4">
                <p className="text-xs uppercase tracking-wide text-sky-900/70">Cobertura</p>
                <p className="mt-2 text-sm font-semibold text-sky-950">
                  {depositosConCobertura ? "Stock visible en circuito" : "Cobertura insuficiente"}
                </p>
              </div>
              <div className="rounded-xl border border-sky-200 bg-white/80 p-4">
                <p className="text-xs uppercase tracking-wide text-sky-900/70">
                  Recepciones parciales
                </p>
                <p className="mt-2 text-sm font-semibold text-sky-950">
                  {recepcionesParciales} con saldo pendiente real
                </p>
              </div>
              <div className="rounded-xl border border-sky-200 bg-white/80 p-4">
                <p className="text-xs uppercase tracking-wide text-sky-900/70">Salida visible</p>
                <p className="mt-2 text-sm font-semibold text-sky-950">
                  {salidasActivas.length > 0
                    ? "Documentos borrador en curso"
                    : "Sin salidas en foco"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-linear-to-br from-slate-50 via-background to-stone-50">
          <CardHeader>
            <CardDescription>Pulso del módulo</CardDescription>
            <CardTitle className="text-xl">Jerarquía rápida de operación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border bg-white/85 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Stock bajo vigilancia</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {alertasCriticas} críticas y {alertasReposicion} con reposición pendiente.
                  </p>
                </div>
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
            </div>
            <div className="rounded-xl border bg-white/85 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Recepción y despacho</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {recepcionesAbiertas.length} ingresos abiertos y {salidasActivas.length} salidas
                    visibles.
                  </p>
                </div>
                <Warehouse className="h-5 w-5 text-sky-700" />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href="/almacenes/reportes">
                  Abrir reportes
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild>
                <Link href="/almacenes/inventario">Ir a inventario</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KPIs Principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-slate-200 bg-linear-to-br from-white via-white to-slate-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Items con Stock</CardTitle>
            <Boxes className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalItemsConStock}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {kpis.totalDepositos} depositos activos
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-linear-to-br from-white via-white to-rose-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sin Stock</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{kpis.itemsSinStock}</div>
            <p className="text-xs text-muted-foreground mt-2">Items agotados</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-linear-to-br from-white via-white to-sky-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ordenes Activas</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {recepcionesAbiertas.length + salidasActivas.length}
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">Rec {recepcionesAbiertas.length}</Badge>
              <Badge variant="outline">Parciales {recepcionesParciales}</Badge>
              <Badge variant="outline">Sal {salidasActivas.length}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-linear-to-br from-white via-white to-orange-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas de Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{kpis.itemsBajoMinimo}</div>
            <p className="text-xs text-muted-foreground mt-2">Items bajo minimo</p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Items Bajo Minimo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{alertasReposicion}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Con stock positivo pero debajo del minimo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Items Sin Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{alertasCriticas}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Alertas criticas sin cobertura operativa
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Depositos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalDepositos}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {depositosConCobertura
                ? "Con cobertura visible en stock y movimientos"
                : "Sin cobertura visible suficiente"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {[
          {
            title: "Regiones",
            description:
              "Mapa funcional por planta y responsable para cerrar la estructura visible del WMS.",
            href: "/almacenes/regiones",
          },
          {
            title: "Zonas",
            description: "Zonas fisicas, criticidad y capacidad visible por deposito.",
            href: "/almacenes/zonas",
          },
          {
            title: "Conteos",
            description: "Planes de conteo ciclico y divergencias de auditoria en modo lectura.",
            href: "/almacenes/conteos",
          },
          {
            title: "Reportes WMS",
            description: "Consolidado de movimientos, alertas y cobertura operacional.",
            href: "/almacenes/reportes",
          },
          {
            title: "Producción",
            description: "Consumos, ingresos y ajustes productivos vinculados a órdenes reales.",
            href: "/almacenes/produccion",
          },
        ].map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="h-full transition-colors hover:border-primary/40 hover:bg-primary/5">
              <CardHeader>
                <CardTitle className="text-base">{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      {highlightedAlert ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardDescription>Alerta destacada</CardDescription>
              <CardTitle className="mt-1 text-xl">
                {highlightedAlert.codigo} · {highlightedAlert.descripcion}
              </CardTitle>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                {highlightedAlert.depositoDescripcion} con {highlightedAlert.stockActual} unidades
                visibles frente a un mínimo de {highlightedAlert.stockMinimo}.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={highlightedAlert.stockActual <= 0 ? "destructive" : "outline"}>
                {getCoverageLabel(highlightedAlert.stockActual, highlightedAlert.stockMinimo)}
              </Badge>
              <Button size="sm" onClick={openAdjustDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Ajustar stock
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg bg-background/70 p-3">
                <p className="text-xs text-muted-foreground">Depósito</p>
                <p className="text-sm font-medium">{highlightedAlert.depositoDescripcion}</p>
              </div>
              <div className="rounded-lg bg-background/70 p-3">
                <p className="text-xs text-muted-foreground">Cobertura</p>
                <p className="text-sm font-medium">
                  {getCoverageLabel(highlightedAlert.stockActual, highlightedAlert.stockMinimo)}
                </p>
              </div>
              <div className="rounded-lg bg-background/70 p-3">
                <p className="text-xs text-muted-foreground">Brecha</p>
                <p className="text-sm font-medium">
                  {Math.max(highlightedAlert.stockMinimo - highlightedAlert.stockActual, 0)}{" "}
                  unidades
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Alertas Activas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Items Bajo Minimo</CardTitle>
            <CardDescription>Requieren reposicion urgente</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : bajoMinimo.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Sin alertas de stock</p>
              </div>
            ) : (
              bajoMinimo.slice(0, 6).map((item) => (
                <div
                  key={`${item.itemId}-${item.depositoId}`}
                  className="border-l-4 border-l-orange-500 bg-orange-50 p-3 rounded"
                  onClick={() => setSelectedAlert(`${item.itemId}-${item.depositoId}`)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium">{item.descripcion}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.depositoDescripcion} · Cod: {item.codigo}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-orange-100 text-orange-800 text-xs whitespace-nowrap"
                    >
                      {item.stockActual}/{item.stockMinimo}
                    </Badge>
                  </div>
                  <div className="mt-1.5">
                    <Progress
                      value={(item.stockActual / item.stockMinimo) * 100}
                      className="h-1.5"
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recepciones Abiertas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recepciones Abiertas</CardTitle>
              <CardDescription>Órdenes en proceso</CardDescription>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href="/almacenes/recepciones">Abrir circuito</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Progreso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recepcionesAbiertas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                      No hay recepciones operativas abiertas.
                    </TableCell>
                  </TableRow>
                ) : (
                  recepcionesAbiertas.slice(0, 3).map((order) => {
                    const progress = getOrdenCompraRecepcionProgress(order)

                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.id}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{getOrdenCompraRecepcionLabel(order)}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {progress.cantidadTotal > 0
                              ? `${progress.cantidadRecibida}/${progress.cantidadTotal} u · saldo ${progress.saldoPendiente}`
                              : (order.fechaEntregaReq ?? "-")}
                          </span>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
            <Button asChild variant="link" className="mt-4 w-full">
              <Link href="/almacenes/recepciones">Ver todas las recepciones</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Órdenes de Salida Activas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Órdenes de Salida Activas</CardTitle>
            <CardDescription>Preparación y despacho</CardDescription>
          </div>
          <Button asChild size="sm">
            <Link href="/almacenes/picking">
              <Plus className="h-4 w-4 mr-2" />
              Abrir picking
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código OS</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Prioridad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Progreso</TableHead>
                <TableHead className="text-right">Circuito</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salidasActivas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                    No hay salidas activas visibles en el lote actual.
                  </TableCell>
                </TableRow>
              ) : (
                salidasActivas.slice(0, 3).map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.nroComprobante ?? "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {getClienteNombre(order.terceroId)}
                    </TableCell>
                    <TableCell>{getClienteDestino(order.terceroId)}</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{getSalidaStatusLabel(order.estado)}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        ${order.total.toLocaleString("es-AR")}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="ghost">
                        <Link href="/almacenes/picking">
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Lectura de alertas</CardTitle>
            <CardDescription>
              Resumen del item de stock bajo minimo actualmente seleccionado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedAlertDetail ? (
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Item</p>
                  <p className="font-medium">
                    {selectedAlertDetail.codigo} · {selectedAlertDetail.descripcion}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Deposito</p>
                  <p className="font-medium">{selectedAlertDetail.depositoDescripcion}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Cobertura</p>
                  <p className="font-medium">
                    {getCoverageLabel(
                      selectedAlertDetail.stockActual,
                      selectedAlertDetail.stockMinimo
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Brecha de reposición</p>
                  <p className="font-medium">
                    {Math.max(selectedAlertDetail.stockMinimo - selectedAlertDetail.stockActual, 0)}{" "}
                    unidades
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Selecciona una alerta de stock para revisar su contexto operativo.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Circuito de recepcion</CardTitle>
            <CardDescription>
              Estado visible de las ordenes abiertas en el frontend actual.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Las recepciones abiertas ahora excluyen ordenes canceladas y distinguen ingresos
              parciales con saldo pendiente real.
            </p>
            <p>
              El progreso visible sale de cantidades recibidas y saldo pendiente, sin volver a una
              lectura simplificada del circuito.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Salidas en preparacion</CardTitle>
            <CardDescription>
              Documentos borrador visibles como ordenes de salida activas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              El tablero muestra comprobantes en borrador como salidas pendientes dentro del
              circuito actual.
            </p>
            <p>
              Esto recupera visibilidad operativa del modulo sin alterar backend ni contratos
              documentales.
            </p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isAdjustOpen} onOpenChange={setIsAdjustOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajuste rápido de stock</DialogTitle>
            <DialogDescription>
              {highlightedAlert
                ? `${highlightedAlert.codigo} · ${highlightedAlert.descripcion} en ${highlightedAlert.depositoDescripcion}`
                : "Selecciona una alerta para ajustar stock"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nueva cantidad</Label>
              <Input
                type="number"
                min={0}
                value={adjustQuantity || ""}
                onChange={(event) =>
                  setAdjustQuantity(Math.max(0, Number(event.target.value) || 0))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Observación</Label>
              <Textarea
                rows={3}
                value={adjustNote}
                onChange={(event) => setAdjustNote(event.target.value)}
                placeholder="Motivo operativo del ajuste"
              />
            </div>
            {adjustError ? (
              <Alert variant="destructive">
                <AlertDescription>{adjustError}</AlertDescription>
              </Alert>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="bg-transparent"
              onClick={() => setIsAdjustOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleAdjustStock} disabled={adjusting || !highlightedAlert}>
              {adjusting ? "Ajustando..." : "Confirmar ajuste"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
