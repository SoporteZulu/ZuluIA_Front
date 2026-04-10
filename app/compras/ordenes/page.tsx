"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  Eye,
  FileText,
  Landmark,
  PackageCheck,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShoppingBag,
  Truck,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCotizacionesCompra } from "@/lib/hooks/useCompras"
import { useComprobantes } from "@/lib/hooks/useComprobantes"
import { useOrdenesCompra } from "@/lib/hooks/useOrdenesCompra"
import { useProveedores } from "@/lib/hooks/useTerceros"
import type { CotizacionCompraListItem } from "@/lib/types/compras-operativa"
import type { Comprobante } from "@/lib/types/comprobantes"
import type { CreateOrdenCompraDto, OrdenCompra } from "@/lib/types/configuracion"
import type { Tercero } from "@/lib/types/terceros"

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString("es-AR") : "-"
}

function formatMoney(value: number) {
  return value.toLocaleString("es-AR", { style: "currency", currency: "ARS" })
}

function formatProviderAddress(provider?: Tercero | null) {
  if (!provider) return "Sin domicilio visible"

  const parts = [
    [provider.calle, provider.nro].filter(Boolean).join(" "),
    provider.piso ? `Piso ${provider.piso}` : null,
    provider.dpto ? `Dto ${provider.dpto}` : null,
    provider.localidadDescripcion,
    provider.codigoPostal,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(" · ") : "Sin domicilio visible"
}

function getDaysOffset(value?: string | null) {
  if (!value) return null
  const targetDate = new Date(value)
  const today = new Date()
  targetDate.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  return Math.floor((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function getDeliveryRequirementStatus(order: OrdenCompra) {
  if (!order.fechaEntregaReq) return "Sin fecha requerida informada"

  const offset = getDaysOffset(order.fechaEntregaReq)
  if (offset === null) return "Sin fecha requerida informada"
  if (offset < 0) return `Entrega requerida vencida hace ${Math.abs(offset)} días`
  if (offset === 0) return "Entrega requerida para hoy"
  return `Entrega requerida en ${offset} días`
}

function getOperationalStatus(order: OrdenCompra) {
  if (order.estadoOc === "CANCELADA") return "Orden fuera de circuito"
  if (order.estadoOc === "RECIBIDA") return "Orden ya recibida"
  if (!order.habilitada) return "Pendiente pero no habilitada para recepción"
  return "Orden pendiente habilitada para recepción"
}

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  PENDIENTE: { label: "Pendiente", variant: "secondary" },
  RECIBIDA: { label: "Recibida", variant: "default" },
  CANCELADA: { label: "Cancelada", variant: "destructive" },
}

function DetailFieldGrid({ fields }: { fields: Array<{ label: string; value: string }> }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {fields.map((field) => (
        <div key={field.label} className="rounded-lg bg-muted/40 p-3">
          <span className="mb-1 block text-xs text-muted-foreground">{field.label}</span>
          <p className="text-sm font-medium">{field.value}</p>
        </div>
      ))}
    </div>
  )
}

function getOrderOperationalControl(
  order: Pick<
    OrdenCompra,
    "estadoOc" | "habilitada" | "fechaEntregaReq" | "cantidadTotal" | "cantidadRecibida"
  >,
  relatedInvoice?: Comprobante | null
) {
  if (order.estadoOc === "CANCELADA") return "Control cerrado por cancelación"
  if (order.estadoOc === "RECIBIDA") return "Control cerrado con recepción completa"
  if (!order.habilitada) return "Pendiente de recepción pero no habilitada"
  if (relatedInvoice && (relatedInvoice.saldo ?? 0) <= 0)
    return "Control económico cerrado en el comprobante base"

  const deliveryOffset = getDaysOffset(order.fechaEntregaReq)
  if (deliveryOffset !== null && deliveryOffset < 0) {
    return `Seguimiento activo con entrega vencida hace ${Math.abs(deliveryOffset)} días`
  }

  return "Seguimiento operativo activo"
}

function getAvailableOrderBaseComprobantes(
  comprobantes: Comprobante[],
  linkedComprobanteIds: Set<number>,
  proveedorId: number
) {
  return comprobantes
    .filter((comprobante) => !linkedComprobanteIds.has(comprobante.id))
    .filter((comprobante) => (proveedorId ? comprobante.terceroId === proveedorId : true))
    .sort((left, right) => right.id - left.id)
}

function getDefaultOrderProviderId(
  comprobantes: Comprobante[],
  linkedComprobanteIds: Set<number>,
  proveedores: Array<{ id: number; razonSocial: string }>
) {
  return (
    proveedores.find(
      (proveedor) =>
        getAvailableOrderBaseComprobantes(comprobantes, linkedComprobanteIds, proveedor.id).length >
        0
    )?.id ??
    proveedores[0]?.id ??
    0
  )
}

function createPurchaseOrderFormState(
  proveedorId: number,
  comprobanteId: number
): CreateOrdenCompraDto {
  return {
    comprobanteId,
    proveedorId,
    fechaEntregaReq: null,
    condicionesEntrega: null,
  }
}

type OrderCreationContext = {
  quoteId: number
  providerId: number
  providerName: string
  requisitionReference: string | null
  total: number
  dueDate: string | null
  status: string
}

function buildOrderCreationContextFromQuote(quote: CotizacionCompraListItem): OrderCreationContext {
  return {
    quoteId: quote.id,
    providerId: quote.proveedorId,
    providerName: quote.proveedor || quote.proveedorRazonSocial,
    requisitionReference: quote.requisicionReferencia,
    total: quote.total,
    dueDate: quote.fechaVencimiento,
    status: (quote.estadoLegacy || quote.estado || "").toUpperCase(),
  }
}

function PurchaseOrderForm({
  comprobantes,
  ordenes,
  proveedores,
  initialProviderId,
  initialContext,
  onClose,
  onSaved,
  crear,
}: {
  comprobantes: Comprobante[]
  ordenes: OrdenCompra[]
  proveedores: Array<{ id: number; razonSocial: string }>
  initialProviderId?: number
  initialContext?: OrderCreationContext | null
  onClose: () => void
  onSaved: () => void
  crear: (dto: CreateOrdenCompraDto) => Promise<boolean>
}) {
  const [tab, setTab] = useState("principal")
  const linkedComprobanteIds = useMemo(
    () => new Set(ordenes.map((orden) => orden.comprobanteId)),
    [ordenes]
  )

  const defaultProveedorId = useMemo(
    () =>
      initialProviderId && proveedores.some((proveedor) => proveedor.id === initialProviderId)
        ? initialProviderId
        : getDefaultOrderProviderId(comprobantes, linkedComprobanteIds, proveedores),
    [comprobantes, initialProviderId, linkedComprobanteIds, proveedores]
  )

  const initialComprobanteId = useMemo(
    () =>
      getAvailableOrderBaseComprobantes(comprobantes, linkedComprobanteIds, defaultProveedorId)[0]
        ?.id ?? 0,
    [comprobantes, defaultProveedorId, linkedComprobanteIds]
  )

  const [form, setForm] = useState<CreateOrdenCompraDto>(() =>
    createPurchaseOrderFormState(defaultProveedorId, initialComprobanteId)
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const effectiveProveedorId = form.proveedorId || defaultProveedorId

  const availableComprobantes = useMemo(
    () =>
      getAvailableOrderBaseComprobantes(comprobantes, linkedComprobanteIds, effectiveProveedorId),
    [comprobantes, effectiveProveedorId, linkedComprobanteIds]
  )

  const effectiveComprobanteId = availableComprobantes.some(
    (comprobante) => comprobante.id === form.comprobanteId
  )
    ? form.comprobanteId
    : (availableComprobantes[0]?.id ?? 0)

  const selectedComprobante = useMemo(
    () =>
      availableComprobantes.find((comprobante) => comprobante.id === effectiveComprobanteId) ??
      null,
    [availableComprobantes, effectiveComprobanteId]
  )
  const selectedProvider = useMemo(
    () => proveedores.find((provider) => provider.id === effectiveProveedorId) ?? null,
    [effectiveProveedorId, proveedores]
  )
  const operationalPreviewFields = useMemo(
    () => [
      { label: "Proveedor", value: selectedProvider?.razonSocial ?? "Sin proveedor seleccionado" },
      { label: "Domicilio", value: formatProviderAddress(selectedProvider) },
      {
        label: "Comprobante base",
        value: selectedComprobante
          ? (selectedComprobante.nroComprobante ?? `#${selectedComprobante.id}`)
          : "Sin comprobante seleccionado",
      },
      {
        label: "Tipo documental",
        value: selectedComprobante?.tipoComprobanteDescripcion ?? "Sin tipo visible",
      },
      { label: "Entrega requerida", value: formatDate(form.fechaEntregaReq) },
      {
        label: "Condiciones de entrega",
        value: form.condicionesEntrega ?? "Sin condiciones informadas",
      },
      {
        label: "Saldo del comprobante",
        value: selectedComprobante ? formatMoney(selectedComprobante.saldo ?? 0) : "No disponible",
      },
      {
        label: "Control operativo",
        value: getOrderOperationalControl(
          {
            estadoOc: "PENDIENTE",
            habilitada: true,
            fechaEntregaReq: form.fechaEntregaReq,
            cantidadTotal: selectedComprobante?.total ?? 0,
            cantidadRecibida: 0,
          },
          selectedComprobante
        ),
      },
    ],
    [form.condicionesEntrega, form.fechaEntregaReq, selectedComprobante, selectedProvider]
  )

  const handleSave = async () => {
    if (!effectiveProveedorId || !effectiveComprobanteId) {
      setError("Proveedor y comprobante base son obligatorios")
      return
    }

    const payload: CreateOrdenCompraDto = {
      ...form,
      proveedorId: effectiveProveedorId,
      comprobanteId: effectiveComprobanteId,
    }

    setSaving(true)
    setError(null)
    const ok = await crear(payload)
    setSaving(false)

    if (ok) {
      onSaved()
      return
    }

    setError("No se pudo crear la orden de compra")
  }

  return (
    <div className="space-y-4">
      {initialContext && (
        <Card className="border-dashed bg-muted/20">
          <CardHeader>
            <CardTitle className="text-base">Origen comercial seleccionado</CardTitle>
            <CardDescription>
              Esta orden parte de una cotización aprobada y sólo completa el vínculo documental que
              hoy permite el backend.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Cotización</p>
              <p className="mt-1 text-sm font-medium">COT-{initialContext.quoteId}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Proveedor</p>
              <p className="mt-1 text-sm font-medium">{initialContext.providerName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Requisición</p>
              <p className="mt-1 text-sm font-medium">
                {initialContext.requisitionReference ?? "Sin requisición visible"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Monto / vencimiento</p>
              <p className="mt-1 text-sm font-medium">
                {formatMoney(initialContext.total)} · {formatDate(initialContext.dueDate)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid h-auto w-full grid-cols-3">
          <TabsTrigger value="principal" className="py-2 text-xs">
            Principal
          </TabsTrigger>
          <TabsTrigger value="vinculo" className="py-2 text-xs">
            Vínculo
          </TabsTrigger>
          <TabsTrigger value="operativa" className="py-2 text-xs">
            Operativa
          </TabsTrigger>
        </TabsList>

        <TabsContent value="principal" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <Label>Proveedor</Label>
              <Select
                value={effectiveProveedorId ? String(effectiveProveedorId) : ""}
                onValueChange={(value) => {
                  const proveedorId = Number(value)
                  const nextComprobanteId =
                    getAvailableOrderBaseComprobantes(
                      comprobantes,
                      linkedComprobanteIds,
                      proveedorId
                    )[0]?.id ?? 0

                  setForm((prev) => ({
                    ...prev,
                    proveedorId,
                    comprobanteId: nextComprobanteId,
                  }))
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar proveedor" />
                </SelectTrigger>
                <SelectContent>
                  {proveedores.map((proveedor) => (
                    <SelectItem key={proveedor.id} value={String(proveedor.id)}>
                      {proveedor.razonSocial}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label>Comprobante base</Label>
              <Select
                value={effectiveComprobanteId ? String(effectiveComprobanteId) : ""}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, comprobanteId: Number(value) }))
                }
                disabled={!effectiveProveedorId || availableComprobantes.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar comprobante" />
                </SelectTrigger>
                <SelectContent>
                  {availableComprobantes.map((comprobante) => (
                    <SelectItem key={comprobante.id} value={String(comprobante.id)}>
                      {(comprobante.nroComprobante ?? `#${comprobante.id}`) +
                        " · " +
                        formatDate(comprobante.fecha)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {effectiveProveedorId && availableComprobantes.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No hay comprobantes de compra disponibles para vincular con este proveedor.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Entrega requerida</Label>
              <Input
                type="date"
                value={form.fechaEntregaReq ?? ""}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    fechaEntregaReq: event.target.value || null,
                  }))
                }
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label>Condiciones de entrega</Label>
              <Textarea
                rows={4}
                value={form.condicionesEntrega ?? ""}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    condicionesEntrega: event.target.value || null,
                  }))
                }
                placeholder="Entrega parcial, horarios, recepción o notas operativas"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="vinculo" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resumen del comprobante seleccionado</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedComprobante ? (
                <DetailFieldGrid
                  fields={[
                    {
                      label: "Comprobante",
                      value: selectedComprobante.nroComprobante ?? `#${selectedComprobante.id}`,
                    },
                    {
                      label: "Fecha",
                      value: formatDate(selectedComprobante.fecha),
                    },
                    {
                      label: "Estado",
                      value: selectedComprobante.estado,
                    },
                    {
                      label: "Total",
                      value: formatMoney(selectedComprobante.total),
                    },
                    {
                      label: "Saldo",
                      value: formatMoney(selectedComprobante.saldo ?? 0),
                    },
                    {
                      label: "Tipo",
                      value:
                        selectedComprobante.tipoComprobanteDescripcion ??
                        `#${selectedComprobante.tipoComprobanteId}`,
                    },
                  ]}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Seleccione un comprobante base para crear la orden con un vínculo documental real.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operativa" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Preview operativo actual</CardTitle>
              <CardDescription>
                Lectura real de la orden antes de alta, sin simular metadatos heredados.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <DetailFieldGrid fields={operationalPreviewFields} />
              <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                Esta alta usa el contrato real actual de órdenes: vínculo con comprobante base,
                proveedor y condiciones de entrega. El detalle por renglón sigue dependiendo de una
                ampliación futura del backend.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {error && (
        <p className="flex items-center gap-1 text-sm text-red-500">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 border-t pt-3">
        <Button variant="outline" className="bg-transparent" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving || availableComprobantes.length === 0}>
          {saving ? "Guardando..." : "Crear orden"}
        </Button>
      </div>
    </div>
  )
}

function PurchaseOrderDetail({
  order,
  providerName,
  provider,
  relatedInvoice,
}: {
  order: OrdenCompra
  providerName: string
  provider?: Tercero | null
  relatedInvoice: Comprobante | null
}) {
  const mainFields = [
    { label: "Orden", value: `OC-${order.id}` },
    { label: "Proveedor", value: providerName },
    { label: "Comprobante relacionado", value: `#${order.comprobanteId}` },
    { label: "Estado", value: STATUS_CONFIG[order.estadoOc]?.label ?? order.estadoOc },
    { label: "Entrega requerida", value: formatDate(order.fechaEntregaReq) },
    { label: "Habilitada", value: order.habilitada ? "Sí" : "No" },
    { label: "Creada", value: formatDate(order.createdAt) },
    { label: "Condiciones de entrega", value: order.condicionesEntrega ?? "-" },
  ]

  const operationFields = [
    { label: "Estado operativo", value: getOperationalStatus(order) },
    { label: "Estado de entrega", value: getDeliveryRequirementStatus(order) },
    { label: "Recepción habilitada", value: order.habilitada ? "Sí" : "No" },
    {
      label: "Comprobante base",
      value: relatedInvoice
        ? (relatedInvoice.nroComprobante ?? `#${relatedInvoice.id}`)
        : `#${order.comprobanteId}`,
    },
    {
      label: "Saldo asociado",
      value: relatedInvoice ? formatMoney(relatedInvoice.saldo ?? 0) : "No disponible en consulta",
    },
    {
      label: "Condiciones operativas",
      value: order.condicionesEntrega ?? "Sin condiciones de entrega informadas",
    },
    {
      label: "Control ampliado",
      value: getOrderOperationalControl(order, relatedInvoice),
    },
  ]

  const extendedOperationalFields = [
    {
      label: "Cantidad total prevista",
      value: String(order.cantidadTotal),
    },
    {
      label: "Cantidad recibida",
      value: String(order.cantidadRecibida),
    },
    {
      label: "Saldo pendiente",
      value: String(order.saldoPendiente),
    },
    {
      label: "Última recepción",
      value: formatDate(order.fechaUltimaRecepcion),
    },
    {
      label: "Comprobante base",
      value: relatedInvoice
        ? (relatedInvoice.nroComprobante ?? `#${relatedInvoice.id}`)
        : `#${order.comprobanteId}`,
    },
    {
      label: "Fecha comprobante",
      value: relatedInvoice ? formatDate(relatedInvoice.fecha) : "No visible",
    },
    {
      label: "Estado comprobante",
      value: relatedInvoice?.estado ?? "No visible",
    },
    {
      label: "Saldo comprobante",
      value: relatedInvoice ? formatMoney(relatedInvoice.saldo ?? 0) : "No visible",
    },
  ]

  const providerFields = [
    { label: "Razón social", value: providerName },
    { label: "Nombre fantasía", value: provider?.nombreFantasia ?? "-" },
    { label: "CUIT / Documento", value: provider?.nroDocumento ?? "-" },
    { label: "Condición IVA", value: provider?.condicionIvaDescripcion ?? "-" },
    { label: "Domicilio", value: formatProviderAddress(provider) },
    {
      label: "Canales",
      value:
        [provider?.telefono, provider?.celular, provider?.email].filter(Boolean).join(" · ") ||
        "Sin canales visibles",
    },
  ]

  return (
    <Tabs defaultValue="principal" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="principal">Principal</TabsTrigger>
        <TabsTrigger value="operacion">Operación</TabsTrigger>
        <TabsTrigger value="operativa">Operativa</TabsTrigger>
      </TabsList>

      <TabsContent value="principal" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" /> Cabecera de la orden
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DetailFieldGrid fields={mainFields} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Landmark className="h-4 w-4" /> Proveedor vinculado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DetailFieldGrid fields={providerFields} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="operacion" className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <PackageCheck className="h-4 w-4" /> Estado operativo actual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DetailFieldGrid fields={operationFields} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Truck className="h-4 w-4" /> Seguimiento de recepción
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Esta orden ya participa del circuito real de recepción mediante los endpoints
              disponibles hoy. La recepción parcial por ítem queda pendiente hasta que el backend
              exponga el detalle completo del documento.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <PackageCheck className="h-4 w-4" /> Estado operativo
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              La habilitación indica si la orden sigue disponible para recepción y el comprobante
              relacionado deja trazabilidad con el documento base generado en compras.
            </CardContent>
          </Card>
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShoppingBag className="h-4 w-4" /> Trazabilidad documental
              </CardTitle>
            </CardHeader>
            <CardContent>
              {relatedInvoice ? (
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-lg bg-muted/40 p-3">
                    <span className="mb-1 block text-xs text-muted-foreground">Comprobante</span>
                    <p className="text-sm font-medium">
                      {relatedInvoice.nroComprobante ?? `#${relatedInvoice.id}`}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <span className="mb-1 block text-xs text-muted-foreground">Estado</span>
                    <p className="text-sm font-medium">{relatedInvoice.estado}</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <span className="mb-1 block text-xs text-muted-foreground">Fecha</span>
                    <p className="text-sm font-medium">{formatDate(relatedInvoice.fecha)}</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <span className="mb-1 block text-xs text-muted-foreground">Saldo</span>
                    <p className="text-sm font-medium">
                      {new Intl.NumberFormat("es-AR", {
                        style: "currency",
                        currency: "ARS",
                        maximumFractionDigits: 0,
                      }).format(relatedInvoice.saldo ?? 0)}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Esta orden conserva el vínculo con el comprobante #{order.comprobanteId}, pero el
                  documento no está disponible en la consulta actual de compras.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="operativa" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Landmark className="h-4 w-4" /> Operativa ampliada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DetailFieldGrid fields={extendedOperationalFields} />
            <div className="rounded-lg border p-4 text-sm text-muted-foreground">
              Esta lectura se apoya en la orden real y en el comprobante base vinculado. La parte
              que sigue pendiente no es visual sino contractual: renglones detallados, aprobaciones
              y negociación avanzada por backend.
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

export default function OrdenesCompraPage() {
  const searchParams = useSearchParams()
  const { ordenes, loading, error, getById, crear, recibir, cancelar, refetch } = useOrdenesCompra()
  const { cotizaciones, loading: loadingQuotes } = useCotizacionesCompra()
  const { comprobantes, loading: loadingComprobantes } = useComprobantes({ esCompra: true })
  const { terceros: proveedores, loading: loadingProviders } = useProveedores()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("todos")
  const [enabledFilter, setEnabledFilter] = useState("todos")
  const [manualDeliveryFilter, setManualDeliveryFilter] = useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createContext, setCreateContext] = useState<OrderCreationContext | null>(null)
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)
  const [detailOrder, setDetailOrder] = useState<OrdenCompra | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const routeIntentHandledRef = useRef(false)
  const routeDeliveryFilter = searchParams.get("filtro") === "retrasadas" ? "retrasadas" : "todos"
  const routeQuoteId = Number(searchParams.get("cotizacionId") ?? "")
  const routeProviderId = Number(searchParams.get("proveedorId") ?? "")
  const shouldAutoOpenCreate = searchParams.get("crear") === "1"
  const deliveryFilter = manualDeliveryFilter ?? routeDeliveryFilter
  const isLoadingOverview = loading || loadingQuotes || loadingComprobantes || loadingProviders

  const linkedComprobanteIds = useMemo(
    () => new Set(ordenes.map((order) => order.comprobanteId)),
    [ordenes]
  )
  const availableBaseComprobantes = useMemo(
    () => comprobantes.filter((comprobante) => !linkedComprobanteIds.has(comprobante.id)),
    [comprobantes, linkedComprobanteIds]
  )
  const providerNameById = useMemo(
    () => new Map(proveedores.map((provider) => [provider.id, provider.razonSocial])),
    [proveedores]
  )
  const approvedQuotes = useMemo(
    () =>
      cotizaciones
        .filter((quote) => {
          const status = (quote.estadoLegacy || quote.estado || "").toUpperCase()
          return status === "APROBADA" || status === "ACEPTADA"
        })
        .sort((left, right) => right.id - left.id),
    [cotizaciones]
  )
  const quotesReadyForOrder = useMemo(
    () =>
      approvedQuotes
        .map((quote) => ({
          quote,
          availableCount: getAvailableOrderBaseComprobantes(
            comprobantes,
            linkedComprobanteIds,
            quote.proveedorId
          ).length,
        }))
        .filter((entry) => entry.availableCount > 0)
        .slice(0, 4),
    [approvedQuotes, comprobantes, linkedComprobanteIds]
  )
  const selectedOrder = useMemo(
    () => ordenes.find((order) => order.id === selectedOrderId) ?? null,
    [ordenes, selectedOrderId]
  )
  const detailOpen = isDetailOpen && selectedOrder !== null

  const getProviderName = (providerId: number) =>
    providerNameById.get(providerId) ?? `#${providerId}`

  const getRelatedInvoice = (comprobanteId: number) =>
    comprobantes.find((comprobante) => comprobante.id === comprobanteId) ?? null

  useEffect(() => {
    if (routeIntentHandledRef.current || !shouldAutoOpenCreate || loadingQuotes) {
      return
    }

    const matchedQuote = Number.isFinite(routeQuoteId)
      ? (approvedQuotes.find((quote) => quote.id === routeQuoteId) ?? null)
      : null
    const fallbackProviderId =
      Number.isFinite(routeProviderId) && routeProviderId > 0 ? routeProviderId : null
    const providerId = matchedQuote?.proveedorId ?? fallbackProviderId

    routeIntentHandledRef.current = true
    if (!providerId) {
      return
    }

    const frame = window.requestAnimationFrame(() => {
      setCreateContext(matchedQuote ? buildOrderCreationContextFromQuote(matchedQuote) : null)
      setIsCreateOpen(true)
    })

    return () => window.cancelAnimationFrame(frame)
  }, [approvedQuotes, loadingQuotes, routeProviderId, routeQuoteId, shouldAutoOpenCreate])

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return ordenes.filter((order) => {
      const providerName = (
        providerNameById.get(order.proveedorId) ?? `#${order.proveedorId}`
      ).toLowerCase()
      const matchesSearch =
        term === "" ||
        String(order.id).includes(term) ||
        String(order.comprobanteId).includes(term) ||
        providerName.includes(term)

      const matchesStatus = statusFilter === "todos" || order.estadoOc === statusFilter
      const matchesEnabled =
        enabledFilter === "todos" ||
        (enabledFilter === "si" && order.habilitada) ||
        (enabledFilter === "no" && !order.habilitada)
      const deliveryOffset = getDaysOffset(order.fechaEntregaReq)
      const matchesDelivery =
        deliveryFilter === "todos" ||
        (deliveryFilter === "retrasadas" &&
          order.estadoOc === "PENDIENTE" &&
          deliveryOffset !== null &&
          deliveryOffset < 0)

      return matchesSearch && matchesStatus && matchesEnabled && matchesDelivery
    })
  }, [deliveryFilter, enabledFilter, ordenes, providerNameById, searchTerm, statusFilter])

  const kpis = useMemo(
    () => ({
      total: ordenes.length,
      pendientes: ordenes.filter((order) => order.estadoOc === "PENDIENTE").length,
      recibidas: ordenes.filter((order) => order.estadoOc === "RECIBIDA").length,
      canceladas: ordenes.filter((order) => order.estadoOc === "CANCELADA").length,
      habilitadas: ordenes.filter((order) => order.habilitada).length,
      conEntregaReq: ordenes.filter((order) => Boolean(order.fechaEntregaReq)).length,
    }),
    [ordenes]
  )

  const highlightedOrder =
    selectedOrder && filtered.some((order) => order.id === selectedOrder.id)
      ? selectedOrder
      : (filtered[0] ?? null)
  const highlightedProvider = highlightedOrder
    ? (proveedores.find((provider) => provider.id === highlightedOrder.proveedorId) ?? null)
    : null
  const highlightedInvoice = highlightedOrder
    ? getRelatedInvoice(highlightedOrder.comprobanteId)
    : null
  const overdueOrders = filtered.filter((order) => {
    const offset = getDaysOffset(order.fechaEntregaReq)
    return offset !== null && offset < 0 && order.estadoOc === "PENDIENTE"
  }).length
  const linkedSaldo = filtered.reduce((sum, order) => {
    const relatedInvoice = getRelatedInvoice(order.comprobanteId)
    return sum + (relatedInvoice?.saldo ?? 0)
  }, 0)
  const highlightedFields = highlightedOrder
    ? [
        {
          label: "Proveedor",
          value: highlightedProvider?.razonSocial ?? `#${highlightedOrder.proveedorId}`,
        },
        {
          label: "Comprobante base",
          value: highlightedInvoice?.nroComprobante ?? `#${highlightedOrder.comprobanteId}`,
        },
        { label: "Entrega requerida", value: formatDate(highlightedOrder.fechaEntregaReq) },
        { label: "Estado operativo", value: getOperationalStatus(highlightedOrder) },
        {
          label: "Saldo asociado",
          value: highlightedInvoice ? formatMoney(highlightedInvoice.saldo ?? 0) : "No visible",
        },
        { label: "Domicilio proveedor", value: formatProviderAddress(highlightedProvider) },
      ]
    : []

  const openDetail = async (order: OrdenCompra) => {
    setSelectedOrderId(order.id)
    setIsDetailOpen(true)
    setLoadingDetail(true)
    const detail = await getById(order.id)
    setDetailOrder(detail ?? order)
    setLoadingDetail(false)
  }

  const openCreateFromQuote = (quote: CotizacionCompraListItem) => {
    setCreateContext(buildOrderCreationContextFromQuote(quote))
    setIsCreateOpen(true)
  }

  const refreshSelection = async (orderId: number) => {
    const updated = await getById(orderId)
    if (updated) {
      setDetailOrder(updated)
    }
  }

  const handleReceive = async (order: OrdenCompra) => {
    if (!window.confirm(`¿Marcar como recibida la orden OC-${order.id}?`)) return
    const ok = await recibir(order.id)
    if (ok) {
      await refetch()
      await refreshSelection(order.id)
    }
  }

  const handleCancel = async (order: OrdenCompra) => {
    if (!window.confirm(`¿Cancelar la orden OC-${order.id}?`)) return
    const ok = await cancelar(order.id)
    if (ok) {
      await refetch()
      await refreshSelection(order.id)
    }
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Órdenes de Compra</h1>
          <p className="text-muted-foreground">
            Seguimiento real de órdenes registradas, con alta básica vinculada a comprobantes y
            acciones de recepción o cancelación sobre el backend actual.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setIsCreateOpen(true)}
            disabled={availableBaseComprobantes.length === 0 || proveedores.length === 0}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nueva orden
          </Button>
          <Button variant="outline" className="bg-transparent" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Recargar
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertDescription>
          La API actual permite una alta básica de la orden vinculada a un comprobante de compra ya
          existente. La edición por renglón, aprobación y condiciones comerciales avanzadas siguen
          pendientes del contrato ampliado del backend.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-dashed">
          <CardContent className="flex h-full flex-col justify-between gap-3 pt-6">
            <div>
              <p className="text-sm font-medium">Cotizaciones</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Ya hay un módulo separado para el circuito comercial previo a la orden.
              </p>
            </div>
            <Button asChild variant="outline" className="bg-transparent">
              <a href="/compras/cotizaciones">Abrir cotizaciones</a>
            </Button>
          </CardContent>
        </Card>
        <Card className="border-dashed">
          <CardContent className="flex h-full flex-col justify-between gap-3 pt-6">
            <div>
              <p className="text-sm font-medium">Requisiciones</p>
              <p className="mt-1 text-sm text-muted-foreground">
                El pedido interno por área u obra quedó separado del abastecimiento automático.
              </p>
            </div>
            <Button asChild variant="outline" className="bg-transparent">
              <a href="/compras/requisiciones">Abrir requisiciones</a>
            </Button>
          </CardContent>
        </Card>
        <Card className="border-dashed">
          <CardContent className="flex h-full flex-col justify-between gap-3 pt-6">
            <div>
              <p className="text-sm font-medium">Recepción e imputación</p>
              <p className="mt-1 text-sm text-muted-foreground">
                El lote actual ya expone remitos, devoluciones, ajustes e imputaciones en rutas
                propias.
              </p>
            </div>
            <Button asChild variant="outline" className="bg-transparent">
              <a href="/compras/imputaciones">Ver imputaciones</a>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Cotizaciones aprobadas listas para orden</CardTitle>
          <CardDescription>
            El backend todavía no transforma cotizaciones en órdenes por sí solo, pero desde acá ya
            se puede arrancar la alta con proveedor y contexto comercial preseleccionados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {quotesReadyForOrder.length > 0 ? (
            quotesReadyForOrder.map(({ quote, availableCount }) => (
              <div
                key={quote.id}
                className="flex flex-col gap-3 rounded-lg border p-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">COT-{quote.id}</p>
                    <Badge variant="default">Aprobada</Badge>
                    <Badge variant="outline">{availableCount} comprobantes base libres</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {quote.proveedor} · {quote.requisicionReferencia ?? "Sin requisición visible"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Total {formatMoney(quote.total)} · Vence {formatDate(quote.fechaVencimiento)}
                  </p>
                </div>
                <Button onClick={() => openCreateFromQuote(quote)}>
                  <Plus className="mr-2 h-4 w-4" /> Crear orden desde cotización
                </Button>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              {loadingQuotes
                ? "Cargando cotizaciones aprobadas..."
                : "No hay cotizaciones aprobadas con comprobantes base disponibles para iniciar nuevas órdenes."}
            </p>
          )}
        </CardContent>
      </Card>

      {!loadingComprobantes && availableBaseComprobantes.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No hay comprobantes de compra libres para crear nuevas órdenes. Cada orden actual se
            vincula a un `comprobanteId`, por eso la alta queda condicionada a documentos todavía no
            usados.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Total órdenes</p>
            <p className="mt-2 text-2xl font-bold">{isLoadingOverview ? "..." : kpis.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Pendientes</p>
            <p className="mt-2 text-2xl font-bold text-amber-600">
              {isLoadingOverview ? "..." : kpis.pendientes}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Recibidas</p>
            <p className="mt-2 text-2xl font-bold text-emerald-600">
              {isLoadingOverview ? "..." : kpis.recibidas}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Canceladas</p>
            <p className="mt-2 text-2xl font-bold text-red-600">
              {isLoadingOverview ? "..." : kpis.canceladas}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Habilitadas</p>
            <p className="mt-2 text-2xl font-bold text-primary">
              {isLoadingOverview ? "..." : kpis.habilitadas}
            </p>
          </CardContent>
        </Card>
      </div>

      {highlightedOrder ? (
        <Card>
          <CardHeader>
            <CardTitle>Orden destacada</CardTitle>
            <CardDescription>
              OC-{highlightedOrder.id} ·{" "}
              {highlightedProvider?.razonSocial ?? `Proveedor #${highlightedOrder.proveedorId}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={
                  (STATUS_CONFIG[highlightedOrder.estadoOc]?.variant ?? "outline") as
                    | "default"
                    | "secondary"
                    | "outline"
                    | "destructive"
                }
              >
                {STATUS_CONFIG[highlightedOrder.estadoOc]?.label ?? highlightedOrder.estadoOc}
              </Badge>
              <Badge variant="outline">
                {highlightedOrder.habilitada ? "Habilitada" : "No habilitada"}
              </Badge>
              <Badge variant="outline">{getDeliveryRequirementStatus(highlightedOrder)}</Badge>
            </div>

            <DetailFieldGrid fields={highlightedFields} />

            <div className="grid gap-4 md:grid-cols-3 text-sm text-muted-foreground">
              <div className="rounded-lg border p-4">
                Riesgo de recepción: {overdueOrders} órdenes pendientes con entrega requerida
                vencida dentro del filtro actual.
              </div>
              <div className="rounded-lg border p-4">
                Saldo vinculado a comprobantes base del conjunto filtrado:{" "}
                {formatMoney(linkedSaldo)}.
              </div>
              <div className="rounded-lg border p-4">
                Observación del proveedor:{" "}
                {highlightedProvider?.observacion ?? "Sin observaciones visibles"}.
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-[1fr_220px_180px_200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-10"
                placeholder="Buscar por orden, comprobante o proveedor..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                <SelectItem value="RECIBIDA">Recibida</SelectItem>
                <SelectItem value="CANCELADA">Cancelada</SelectItem>
              </SelectContent>
            </Select>
            <Select value={enabledFilter} onValueChange={setEnabledFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Habilitada" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                <SelectItem value="si">Habilitadas</SelectItem>
                <SelectItem value="no">No habilitadas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={deliveryFilter} onValueChange={setManualDeliveryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Entrega" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas las entregas</SelectItem>
                <SelectItem value="retrasadas">Solo retrasadas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Órdenes registradas ({filtered.length})</CardTitle>
          <CardDescription>
            Vista centrada en operación real: consultar, recibir y cancelar órdenes ya emitidas.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Orden</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Comprobante</TableHead>
                <TableHead>Entrega requerida</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Circuito</TableHead>
                <TableHead>Habilitada</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin" />
                    Cargando órdenes...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    No se encontraron órdenes con los filtros actuales.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((order) => {
                  const status = STATUS_CONFIG[order.estadoOc] ?? {
                    label: order.estadoOc,
                    variant: "outline" as const,
                  }
                  return (
                    <TableRow
                      key={order.id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => openDetail(order)}
                    >
                      <TableCell className="font-mono font-semibold">OC-{order.id}</TableCell>
                      <TableCell>{getProviderName(order.proveedorId)}</TableCell>
                      <TableCell>#{order.comprobanteId}</TableCell>
                      <TableCell>{formatDate(order.fechaEntregaReq)}</TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {getOperationalStatus(order)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{order.habilitada ? "Sí" : "No"}</Badge>
                      </TableCell>
                      <TableCell
                        className="text-right"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openDetail(order)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {order.estadoOc === "PENDIENTE" && order.habilitada && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleReceive(order)}
                            >
                              <PackageCheck className="h-4 w-4 text-emerald-600" />
                            </Button>
                          )}
                          {order.estadoOc === "PENDIENTE" && (
                            <Button variant="ghost" size="icon" onClick={() => handleCancel(order)}>
                              <Ban className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingBag className="h-4 w-4" /> Operación actual
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {isLoadingOverview
              ? "Cargando órdenes, proveedores y comprobantes vinculados..."
              : `${kpis.total} órdenes registradas sobre la API actual; ${kpis.habilitadas} siguen habilitadas para recepción dentro del circuito disponible hoy.`}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Truck className="h-4 w-4" /> Flujo de recepción
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {isLoadingOverview
              ? "Calculando flujo operativo de recepción..."
              : `${kpis.pendientes} pendientes y ${kpis.recibidas} recibidas dejan visible el estado real del flujo de recepción, con ${kpis.conEntregaReq} órdenes que ya exponen fecha requerida.`}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Landmark className="h-4 w-4" /> Próximo paso
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {isLoadingOverview
              ? "Cargando estado documental de las órdenes..."
              : `${kpis.canceladas} canceladas siguen visibles como control documental; edición por renglones, aprobación formal y negociación avanzada quedan reservadas.`}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open)
          if (!open) {
            setCreateContext(null)
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva orden de compra</DialogTitle>
            <DialogDescription>
              Alta real usando el DTO disponible hoy: proveedor, comprobante base y condiciones de
              entrega.
            </DialogDescription>
          </DialogHeader>

          <PurchaseOrderForm
            key={`purchase-order-${isCreateOpen ? "open" : "closed"}-${createContext?.quoteId ?? "manual"}-${createContext?.providerId ?? proveedores[0]?.id ?? 0}-${availableBaseComprobantes[0]?.id ?? 0}`}
            comprobantes={comprobantes}
            ordenes={ordenes}
            proveedores={proveedores}
            initialProviderId={createContext?.providerId}
            initialContext={createContext}
            crear={crear}
            onClose={() => {
              setIsCreateOpen(false)
              setCreateContext(null)
            }}
            onSaved={async () => {
              setIsCreateOpen(false)
              setCreateContext(null)
              await refetch()
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={detailOpen}
        onOpenChange={(open) => {
          setIsDetailOpen(open)
          if (!open) {
            setSelectedOrderId(null)
            setDetailOrder(null)
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedOrder ? `OC-${selectedOrder.id}` : "Detalle de orden"}
            </DialogTitle>
            <DialogDescription>
              {selectedOrder ? getProviderName(selectedOrder.proveedorId) : "Cargando..."}
            </DialogDescription>
          </DialogHeader>

          {loadingDetail ? (
            <div className="py-10 text-center text-muted-foreground">
              <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin" />
              Cargando detalle...
            </div>
          ) : detailOrder ? (
            <PurchaseOrderDetail
              order={detailOrder}
              providerName={getProviderName(detailOrder.proveedorId)}
              provider={
                proveedores.find((provider) => provider.id === detailOrder.proveedorId) ?? null
              }
              relatedInvoice={getRelatedInvoice(detailOrder.comprobanteId)}
            />
          ) : (
            <p className="py-8 text-center text-muted-foreground">
              No se pudo cargar el detalle de la orden.
            </p>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              className="bg-transparent"
              onClick={() => setIsDetailOpen(false)}
            >
              Cerrar
            </Button>
            {selectedOrder && (
              <Button variant="outline" className="bg-transparent" asChild>
                <Link
                  href={`/compras/recepciones?ordenId=${selectedOrder.id}&proveedorId=${selectedOrder.proveedorId}`}
                >
                  <Truck className="mr-2 h-4 w-4" /> Ir a recepciones
                </Link>
              </Button>
            )}
            {selectedOrder?.estadoOc === "PENDIENTE" && selectedOrder.habilitada && (
              <Button onClick={() => handleReceive(selectedOrder)}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Marcar recibida
              </Button>
            )}
            {selectedOrder?.estadoOc === "PENDIENTE" && (
              <Button variant="destructive" onClick={() => handleCancel(selectedOrder)}>
                <Ban className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
