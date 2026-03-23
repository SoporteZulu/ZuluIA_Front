"use client"

import { useCallback, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Search,
  PackageCheck,
  Truck,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Eye,
  Clock,
  XCircle,
  ClipboardList,
  CalendarClock,
  Building2,
} from "lucide-react"
import { useComprobantes } from "@/lib/hooks/useComprobantes"
import { useOrdenesCompra } from "@/lib/hooks/useOrdenesCompra"
import { useProveedores } from "@/lib/hooks/useTerceros"
import type { Comprobante } from "@/lib/types/comprobantes"
import type { OrdenCompra } from "@/lib/types/configuracion"
import type { Tercero } from "@/lib/types/terceros"

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString("es-AR") : "-"
}

function formatMoney(value: number) {
  return value.toLocaleString("es-AR", { style: "currency", currency: "ARS" })
}

function formatSupplierAddress(supplier?: Tercero | null) {
  if (!supplier) return "-"
  const parts = [
    [supplier.calle, supplier.nro].filter(Boolean).join(" "),
    supplier.piso ? `Piso ${supplier.piso}` : null,
    supplier.dpto ? `Dto ${supplier.dpto}` : null,
    supplier.localidadDescripcion,
    supplier.codigoPostal,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(", ") : "-"
}

function getDaysOffset(value?: string | null) {
  if (!value) return null
  const targetDate = new Date(value)
  const today = new Date()
  targetDate.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  return Math.floor((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function getDeliveryStatus(order: OrdenCompra) {
  if (!order.fechaEntregaReq) return "Sin fecha requerida informada"

  const offset = getDaysOffset(order.fechaEntregaReq)
  if (offset === null) return "Sin fecha requerida informada"
  if (offset < 0) return `Entrega vencida hace ${Math.abs(offset)} días`
  if (offset === 0) return "Entrega requerida para hoy"
  return `Entrega requerida en ${offset} días`
}

function getOperationalStatus(order: OrdenCompra) {
  if (order.estadoOc === "CANCELADA") return "Orden fuera del circuito de recepción"
  if (order.estadoOc === "RECIBIDA") return "Recepción confirmada"
  if (!order.habilitada) return "Pendiente no habilitada para recepción"
  return "Pendiente habilitada para ingreso"
}

function DetailFieldGrid({ fields }: { fields: Array<{ label: string; value: string }> }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {fields.map((field) => (
        <div key={field.label} className="rounded-lg bg-muted/40 p-3">
          <Label>{field.label}</Label>
          <p className="text-sm font-medium">{field.value}</p>
        </div>
      ))}
    </div>
  )
}

const ESTADO_CONFIG: Record<
  string,
  {
    label: string
    variant: "default" | "secondary" | "destructive" | "outline"
    icon: React.ElementType
  }
> = {
  PENDIENTE: { label: "Pendiente", variant: "secondary", icon: Clock },
  RECIBIDA: { label: "Recibida", variant: "default", icon: CheckCircle2 },
  CANCELADA: { label: "Cancelada", variant: "destructive", icon: XCircle },
}

export default function RecepcionesPage() {
  const { ordenes, loading, error, estado, setEstado, recibir, cancelar, refetch } =
    useOrdenesCompra()
  const { comprobantes } = useComprobantes({ esCompra: true })
  const { terceros: proveedores } = useProveedores()

  const [searchTerm, setSearchTerm] = useState("")
  const [proveedorFilter, setProveedorFilter] = useState<string>("todos")
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [cancelId, setCancelId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [detailOrder, setDetailOrder] = useState<OrdenCompra | null>(null)

  const getProveedor = useCallback(
    (proveedorId: number) => proveedores.find((p) => p.id === proveedorId) ?? null,
    [proveedores]
  )

  const getProveedorNombre = useCallback(
    (proveedorId: number) => getProveedor(proveedorId)?.razonSocial ?? `ID ${proveedorId}`,
    [getProveedor]
  )

  const getComprobanteRelacionado = useCallback(
    (comprobanteId: number): Comprobante | null =>
      comprobantes.find((comprobante) => comprobante.id === comprobanteId) ?? null,
    [comprobantes]
  )

  const filteredOrdenes = useMemo(() => {
    return ordenes.filter((oc) => {
      const nombreProv = getProveedorNombre(oc.proveedorId).toLowerCase()
      const matchSearch =
        searchTerm === "" ||
        String(oc.id).includes(searchTerm) ||
        nombreProv.includes(searchTerm.toLowerCase())

      const matchProveedor =
        proveedorFilter === "todos" || oc.proveedorId === Number(proveedorFilter)

      return matchSearch && matchProveedor
    })
  }, [ordenes, proveedorFilter, searchTerm, getProveedorNombre])

  const handleRecibir = async () => {
    if (confirmId === null) return
    setSubmitting(true)
    const ok = await recibir(confirmId)
    setSubmitting(false)
    setConfirmId(null)
    if (ok) refetch()
  }

  const handleCancelar = async () => {
    if (cancelId === null) return
    setSubmitting(true)
    const ok = await cancelar(cancelId)
    setSubmitting(false)
    setCancelId(null)
    if (ok) refetch()
  }

  const { pendientes, recibidas, canceladas } = {
    pendientes: filteredOrdenes.filter((o) => o.estadoOc === "PENDIENTE"),
    recibidas: filteredOrdenes.filter((o) => o.estadoOc === "RECIBIDA"),
    canceladas: filteredOrdenes.filter((o) => o.estadoOc === "CANCELADA"),
  }

  const detailInvoice = detailOrder ? getComprobanteRelacionado(detailOrder.comprobanteId) : null
  const detailSupplier = detailOrder ? getProveedor(detailOrder.proveedorId) : null

  const vencidas = filteredOrdenes.filter(
    (order) =>
      order.estadoOc === "PENDIENTE" &&
      !!order.fechaEntregaReq &&
      order.fechaEntregaReq < new Date().toISOString().slice(0, 10)
  ).length

  const habilitadas = filteredOrdenes.filter((order) => order.habilitada).length
  const highlightedOrder =
    detailOrder && filteredOrdenes.some((order) => order.id === detailOrder.id)
      ? detailOrder
      : (filteredOrdenes[0] ?? null)
  const highlightedSupplier = highlightedOrder ? getProveedor(highlightedOrder.proveedorId) : null
  const highlightedInvoice = highlightedOrder
    ? getComprobanteRelacionado(highlightedOrder.comprobanteId)
    : null
  const highlightedFields = highlightedOrder
    ? [
        {
          label: "Proveedor",
          value: highlightedSupplier?.razonSocial ?? `ID ${highlightedOrder.proveedorId}`,
        },
        { label: "Entrega requerida", value: formatDate(highlightedOrder.fechaEntregaReq) },
        { label: "Estado operativo", value: getOperationalStatus(highlightedOrder) },
        { label: "Estado entrega", value: getDeliveryStatus(highlightedOrder) },
        {
          label: "Comprobante base",
          value: highlightedInvoice
            ? (highlightedInvoice.nroComprobante ?? `#${highlightedInvoice.id}`)
            : `#${highlightedOrder.comprobanteId}`,
        },
        {
          label: "Saldo asociado",
          value: highlightedInvoice ? formatMoney(highlightedInvoice.saldo ?? 0) : "No disponible",
        },
      ]
    : []

  const OrdenRow = ({ oc }: { oc: OrdenCompra }) => {
    const cfg = ESTADO_CONFIG[oc.estadoOc] ?? {
      label: oc.estadoOc,
      variant: "outline" as const,
      icon: Clock,
    }
    const Icon = cfg.icon
    return (
      <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => setDetailOrder(oc)}>
        <TableCell className="font-medium">OC-{oc.id}</TableCell>
        <TableCell>{getProveedorNombre(oc.proveedorId)}</TableCell>
        <TableCell>
          {oc.fechaEntregaReq ? new Date(oc.fechaEntregaReq).toLocaleDateString("es-AR") : "-"}
        </TableCell>
        <TableCell>
          <Badge variant={cfg.variant} className="gap-1">
            <Icon className="h-3 w-3" />
            {cfg.label}
          </Badge>
        </TableCell>
        <TableCell className="max-w-65 text-sm text-muted-foreground">
          {getOperationalStatus(oc)}
        </TableCell>
        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="icon" onClick={() => setDetailOrder(oc)}>
              <Eye className="h-4 w-4" />
            </Button>
            {oc.estadoOc === "PENDIENTE" && (
              <>
                <Button size="sm" onClick={() => setConfirmId(oc.id)}>
                  <PackageCheck className="h-4 w-4 mr-1" />
                  Recibir
                </Button>
                <Button size="sm" variant="outline" onClick={() => setCancelId(oc.id)}>
                  <XCircle className="h-4 w-4 mr-1" />
                  Cancelar
                </Button>
              </>
            )}
          </div>
        </TableCell>
      </TableRow>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recepciones de Mercadería</h1>
          <p className="text-muted-foreground">Gestión de recepciones de órdenes de compra</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes de Recepción</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendientes.length}</div>
            <p className="text-xs text-muted-foreground">órdenes en tránsito / por recibir</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recibidas</CardTitle>
            <PackageCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recibidas.length}</div>
            <p className="text-xs text-muted-foreground">
              confirmadas en sistema sobre el flujo actual
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Canceladas</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{canceladas.length}</div>
            <p className="text-xs text-muted-foreground">órdenes fuera del circuito operativo</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes Vencidas</CardTitle>
            <CalendarClock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{vencidas}</div>
            <p className="text-xs text-muted-foreground">
              requieren seguimiento sobre fechas reales
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Truck className="h-4 w-4" /> Operación vigente
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {filteredOrdenes.length} órdenes visibles en recepción y {habilitadas} aún habilitadas
            para ingreso dentro del circuito actual.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PackageCheck className="h-4 w-4" /> Control de entrega
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {pendientes.length} pendientes y {vencidas} vencidas ya permiten priorizar seguimiento
            sin depender de bloques decorativos.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4" /> Segunda fase
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Recepción parcial, diferencias por ítem, remitos asociados y observaciones de depósito
            siguen reservados para la etapa siguiente.
          </CardContent>
        </Card>
      </div>

      {highlightedOrder ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Recepción destacada</p>
              <CardTitle className="mt-1 text-xl">
                OC-{highlightedOrder.id} ·{" "}
                {highlightedSupplier?.razonSocial ?? `Proveedor #${highlightedOrder.proveedorId}`}
              </CardTitle>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                {highlightedOrder.condicionesEntrega?.trim() ||
                  "Sin condiciones logísticas registradas para esta orden."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={ESTADO_CONFIG[highlightedOrder.estadoOc]?.variant ?? "outline"}>
                {ESTADO_CONFIG[highlightedOrder.estadoOc]?.label ?? highlightedOrder.estadoOc}
              </Badge>
              <Badge variant="outline">{getDeliveryStatus(highlightedOrder)}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <DetailFieldGrid fields={highlightedFields} />
          </CardContent>
        </Card>
      ) : null}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-[1fr_220px_260px]">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por ID o proveedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select
              value={estado || "__all__"}
              onValueChange={(value) => setEstado(value === "__all__" ? "" : value)}
            >
              <SelectTrigger className="w-45">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                <SelectItem value="RECIBIDA">Recibida</SelectItem>
                <SelectItem value="CANCELADA">Cancelada</SelectItem>
              </SelectContent>
            </Select>
            <Select value={proveedorFilter} onValueChange={setProveedorFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Proveedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los proveedores</SelectItem>
                {proveedores.map((proveedor) => (
                  <SelectItem key={proveedor.id} value={String(proveedor.id)}>
                    {proveedor.razonSocial}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Órdenes de Compra ({filteredOrdenes.length})</CardTitle>
          <p className="text-sm text-muted-foreground">
            Vista de recepción inspirada en el circuito legacy: estado, proveedor, vencimiento y
            confirmación operativa.
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-muted-foreground">Cargando órdenes...</p>
          ) : filteredOrdenes.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No hay órdenes de compra registradas.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nro. OC</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Entrega Requerida</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Circuito</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrdenes.map((oc) => (
                  <OrdenRow key={oc.id} oc={oc} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Confirm recibir dialog */}
      <Dialog
        open={confirmId !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmId(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Recepción</DialogTitle>
            <DialogDescription>
              ¿Confirma que la OC-{confirmId} fue recibida en su totalidad? Esta acción marcará la
              orden como RECIBIDA y no podrá revertirse.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmId(null)} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={handleRecibir} disabled={submitting}>
              <PackageCheck className="h-4 w-4 mr-2" />
              {submitting ? "Procesando..." : "Confirmar Recepción"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={cancelId !== null}
        onOpenChange={(open) => {
          if (!open) setCancelId(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar orden de compra</DialogTitle>
            <DialogDescription>
              ¿Confirma que la OC-{cancelId} debe marcarse como cancelada? Esto replicará el cierre
              operativo del circuito de recepción sin ingreso de mercadería.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelId(null)} disabled={submitting}>
              Volver
            </Button>
            <Button variant="destructive" onClick={handleCancelar} disabled={submitting}>
              <XCircle className="h-4 w-4 mr-2" />
              {submitting ? "Procesando..." : "Cancelar orden"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog
        open={detailOrder !== null}
        onOpenChange={(open) => {
          if (!open) setDetailOrder(null)
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle OC-{detailOrder?.id}</DialogTitle>
            <DialogDescription>
              {getProveedorNombre(detailOrder?.proveedorId ?? 0)}
            </DialogDescription>
          </DialogHeader>
          {detailOrder && (
            <Tabs defaultValue="principal" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="principal">Principal</TabsTrigger>
                <TabsTrigger value="logistica">Logística</TabsTrigger>
                <TabsTrigger value="legado">Legado</TabsTrigger>
              </TabsList>

              <TabsContent value="principal" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <ClipboardList className="h-4 w-4" /> Cabecera de la Orden
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg bg-muted/40 p-3">
                      <Label>Proveedor</Label>
                      <p className="text-sm font-medium">
                        {getProveedorNombre(detailOrder.proveedorId)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-3">
                      <Label>Estado</Label>
                      <div className="pt-1">
                        <Badge variant={ESTADO_CONFIG[detailOrder.estadoOc]?.variant ?? "outline"}>
                          {ESTADO_CONFIG[detailOrder.estadoOc]?.label ?? detailOrder.estadoOc}
                        </Badge>
                      </div>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-3">
                      <Label>Comprobante ID</Label>
                      <p className="text-sm font-medium">{detailOrder.comprobanteId}</p>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-3">
                      <Label>Creada</Label>
                      <p className="text-sm font-medium">{formatDate(detailOrder.createdAt)}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Proveedor vinculado</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DetailFieldGrid
                      fields={[
                        {
                          label: "Razón social",
                          value:
                            detailSupplier?.razonSocial ??
                            getProveedorNombre(detailOrder.proveedorId),
                        },
                        { label: "Fantasia", value: detailSupplier?.nombreFantasia ?? "-" },
                        { label: "CUIT", value: detailSupplier?.nroDocumento ?? "-" },
                        {
                          label: "Condición IVA",
                          value: detailSupplier?.condicionIvaDescripcion ?? "-",
                        },
                        { label: "Domicilio", value: formatSupplierAddress(detailSupplier) },
                        {
                          label: "Contacto",
                          value:
                            detailSupplier?.email ??
                            detailSupplier?.telefono ??
                            detailSupplier?.celular ??
                            "-",
                        },
                        {
                          label: "Límite crédito",
                          value:
                            typeof detailSupplier?.limiteCredito === "number"
                              ? formatMoney(detailSupplier.limiteCredito)
                              : "-",
                        },
                        {
                          label: "Facturable",
                          value: detailSupplier ? (detailSupplier.facturable ? "Sí" : "No") : "-",
                        },
                      ]}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="logistica" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <CalendarClock className="h-4 w-4" /> Estado operativo
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DetailFieldGrid
                      fields={[
                        { label: "Estado operativo", value: getOperationalStatus(detailOrder) },
                        { label: "Estado de entrega", value: getDeliveryStatus(detailOrder) },
                        {
                          label: "Recepción habilitada",
                          value: detailOrder.habilitada ? "Sí" : "No",
                        },
                        {
                          label: "Comprobante base",
                          value: detailInvoice
                            ? (detailInvoice.nroComprobante ?? `#${detailInvoice.id}`)
                            : `#${detailOrder.comprobanteId}`,
                        },
                        {
                          label: "Saldo asociado",
                          value: detailInvoice
                            ? formatMoney(detailInvoice.saldo ?? 0)
                            : "No disponible",
                        },
                        {
                          label: "Condiciones activas",
                          value: detailOrder.condicionesEntrega ?? "Sin condiciones registradas",
                        },
                      ]}
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Building2 className="h-4 w-4" /> Recepción y Entrega
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg bg-muted/40 p-3">
                      <Label>Entrega requerida</Label>
                      <p className="text-sm font-medium">
                        {formatDate(detailOrder.fechaEntregaReq)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-3">
                      <Label>Habilitada</Label>
                      <p className="text-sm font-medium">{detailOrder.habilitada ? "Sí" : "No"}</p>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-3 md:col-span-2">
                      <Label>Condiciones de entrega</Label>
                      <p className="text-sm font-medium">
                        {detailOrder.condicionesEntrega ?? "Sin condiciones registradas"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <ClipboardList className="h-4 w-4" /> Documento vinculado
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {detailInvoice ? (
                      <div className="grid gap-3 md:grid-cols-4">
                        <div className="rounded-lg bg-muted/40 p-3">
                          <Label>Comprobante</Label>
                          <p className="text-sm font-medium">
                            {detailInvoice.nroComprobante ?? `#${detailInvoice.id}`}
                          </p>
                        </div>
                        <div className="rounded-lg bg-muted/40 p-3">
                          <Label>Estado</Label>
                          <p className="text-sm font-medium">{detailInvoice.estado}</p>
                        </div>
                        <div className="rounded-lg bg-muted/40 p-3">
                          <Label>Total</Label>
                          <p className="text-sm font-medium">{formatMoney(detailInvoice.total)}</p>
                        </div>
                        <div className="rounded-lg bg-muted/40 p-3">
                          <Label>Fecha</Label>
                          <p className="text-sm font-medium">{formatDate(detailInvoice.fecha)}</p>
                        </div>
                        <div className="rounded-lg bg-muted/40 p-3">
                          <Label>Saldo</Label>
                          <p className="text-sm font-medium">
                            {formatMoney(detailInvoice.saldo ?? 0)}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        La orden mantiene el comprobante #{detailOrder.comprobanteId}, pero ese
                        documento no está visible en la consulta actual de compras.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="legado" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Bloques heredados reservados</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    La pantalla ya deja visible estado operativo, vencimiento y trazabilidad del
                    comprobante. Recepción parcial, diferencias, observaciones de depósito, remitos
                    asociados y validación por ítems quedan reservados para la siguiente etapa.
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOrder(null)}>
              Cerrar
            </Button>
            {detailOrder?.estadoOc === "PENDIENTE" && (
              <Button
                onClick={() => {
                  setDetailOrder(null)
                  setConfirmId(detailOrder.id)
                }}
              >
                <PackageCheck className="h-4 w-4 mr-2" />
                Recibir
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
