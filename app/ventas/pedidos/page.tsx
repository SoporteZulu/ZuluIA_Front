"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertCircle,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Landmark,
  Package,
  RefreshCw,
  Search,
  ShieldAlert,
  ShoppingCart,
  UserRound,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
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
import { Tabs, TabsContent, TabsTrigger } from "@/components/ui/tabs"
import { SalesDialogContent, SalesTabsList } from "@/components/ventas/sales-responsive"
import { Textarea } from "@/components/ui/textarea"
import { useComprobantes, useComprobantesConfig } from "@/lib/hooks/useComprobantes"
import { useDefaultSucursalId, useSucursales } from "@/lib/hooks/useSucursales"
import { useTerceros } from "@/lib/hooks/useTerceros"
import { useItems } from "@/lib/hooks/useItems"
import type {
  Comprobante,
  ComprobanteDetalle,
  EmitirComprobanteDto,
  TipoComprobante,
} from "@/lib/types/comprobantes"
import type { Tercero } from "@/lib/types/terceros"

function formatMoney(value: number) {
  return value.toLocaleString("es-AR", { style: "currency", currency: "ARS" })
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString("es-AR") : "-"
}

function formatCustomerAddress(customer?: Tercero | null) {
  if (!customer) return "-"
  const parts = [
    [customer.calle, customer.nro].filter(Boolean).join(" "),
    customer.piso ? `Piso ${customer.piso}` : null,
    customer.dpto ? `Dto ${customer.dpto}` : null,
    customer.localidadDescripcion,
    customer.codigoPostal,
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

function getCommitmentStatus(order: ComprobanteDetalle) {
  if (!order.fechaVto) return "Sin compromiso informado"

  const offset = getDaysOffset(order.fechaVto)
  if (offset === null) return "Sin compromiso informado"
  if (offset < 0) return `Compromiso vencido hace ${Math.abs(offset)} días`
  if (offset === 0) return "Compromiso previsto para hoy"
  return `Compromiso previsto en ${offset} días`
}

function getOrderDocumentStatus(order: ComprobanteDetalle) {
  if (order.estado === "ANULADO") return "Pedido anulado"
  if (order.estado === "BORRADOR") return "Pendiente de confirmación"
  if (order.estado === "PAGADO") return "Pedido cerrado"
  if (order.estado === "PAGADO_PARCIAL") return "Pedido con cierre parcial"
  return "Pedido confirmado en circuito comercial"
}

function parseOperationalObservation(value?: string | null) {
  const parts = (value ?? "")
    .split(" | ")
    .map((part) => part.trim())
    .filter(Boolean)

  const vendedor = parts.find((part) => part.startsWith("Vendedor: "))?.replace("Vendedor: ", "")
  const canal = parts.find((part) => part.startsWith("Canal: "))?.replace("Canal: ", "")
  const entrega = parts
    .find((part) => part.startsWith("Entrega estimada: "))
    ?.replace("Entrega estimada: ", "")
  const condicionVenta = parts
    .find((part) => part.startsWith("Condición venta: "))
    ?.replace("Condición venta: ", "")
  const tipoEntrega = parts
    .find((part) => part.startsWith("Tipo entrega: "))
    ?.replace("Tipo entrega: ", "")
  const zona = parts.find((part) => part.startsWith("Zona: "))?.replace("Zona: ", "")
  const transporte = parts
    .find((part) => part.startsWith("Transporte: "))
    ?.replace("Transporte: ", "")
  const domicilioEntrega = parts
    .find((part) => part.startsWith("Domicilio entrega: "))
    ?.replace("Domicilio entrega: ", "")
  const observacionEntrega = parts
    .find((part) => part.startsWith("Obs. entrega: "))
    ?.replace("Obs. entrega: ", "")

  const operationalNotes = parts.filter(
    (part) =>
      !part.startsWith("Vendedor: ") &&
      !part.startsWith("Canal: ") &&
      !part.startsWith("Entrega estimada: ") &&
      !part.startsWith("Condición venta: ") &&
      !part.startsWith("Tipo entrega: ") &&
      !part.startsWith("Zona: ") &&
      !part.startsWith("Transporte: ") &&
      !part.startsWith("Domicilio entrega: ") &&
      !part.startsWith("Obs. entrega: ")
  )

  return {
    vendedor: vendedor || "No informado",
    canal: canal || "No informado",
    entrega: entrega || "No informada",
    condicionVenta: condicionVenta || "No informada",
    tipoEntrega: tipoEntrega || "No informado",
    zona: zona || "No informada",
    transporte: transporte || "No informado",
    domicilioEntrega: domicilioEntrega || "No informado",
    observacionEntrega: observacionEntrega || "Sin observación de entrega",
    detalle: operationalNotes.length > 0 ? operationalNotes.join(" | ") : "Sin detalle operativo",
  }
}

function normalizeText(value?: string | null) {
  return (value ?? "").toLowerCase()
}

function isOrderType(tipo: TipoComprobante) {
  const text = `${normalizeText(tipo.codigo)} ${normalizeText(tipo.descripcion)}`
  return text.includes("pedido") || /(^|\W)ped($|\W)/.test(text)
}

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  BORRADOR: { label: "Borrador", variant: "secondary" },
  EMITIDO: { label: "Confirmado", variant: "default" },
  PAGADO: { label: "Cerrado", variant: "outline" },
  PAGADO_PARCIAL: { label: "Parcial", variant: "outline" },
  ANULADO: { label: "Anulado", variant: "destructive" },
}

type OrderFormItem = {
  id: string
  itemId: number
  descripcion: string
  cantidad: number
  precioUnitario: number
  descuento: number
  alicuotaIvaId: number
  alicuotaIvaPct: number
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

function createSalesOrderFormState(
  defaultSucursalId: number | undefined,
  availableTypes: TipoComprobante[]
): EmitirComprobanteDto {
  return {
    sucursalId: defaultSucursalId ?? 0,
    terceroId: 0,
    tipoComprobanteId: availableTypes[0]?.id ?? 0,
    fecha: new Date().toISOString().slice(0, 10),
    fechaVto: null,
    observacion: null,
    items: [],
  }
}

function SalesOrderForm({
  availableTypes,
  onClose,
  onSaved,
  emitir,
}: {
  availableTypes: TipoComprobante[]
  onClose: () => void
  onSaved: () => void
  emitir: (dto: EmitirComprobanteDto) => Promise<boolean>
}) {
  const defaultSucursalId = useDefaultSucursalId()
  const { sucursales } = useSucursales()
  const { terceros: clientes } = useTerceros()
  const { items } = useItems()
  const [tab, setTab] = useState("principal")
  const [form, setForm] = useState<EmitirComprobanteDto>(() =>
    createSalesOrderFormState(defaultSucursalId, availableTypes)
  )
  const [lineItems, setLineItems] = useState<OrderFormItem[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [vendedor, setVendedor] = useState("")
  const [canal, setCanal] = useState("vendedor")
  const [entregaEstimada, setEntregaEstimada] = useState("")
  const [condicionVenta, setCondicionVenta] = useState("cuenta corriente")
  const [tipoEntrega, setTipoEntrega] = useState("domicilio")
  const [zonaEntrega, setZonaEntrega] = useState("")
  const [transporte, setTransporte] = useState("")
  const [domicilioEntrega, setDomicilioEntrega] = useState("")
  const [observacionEntrega, setObservacionEntrega] = useState("")
  const [detalleOperativo, setDetalleOperativo] = useState("")

  useEffect(() => {
    setForm((current) => {
      const nextSucursalId = current.sucursalId || defaultSucursalId || 0
      const hasCurrentType = availableTypes.some((tipo) => tipo.id === current.tipoComprobanteId)
      const nextTipoComprobanteId = hasCurrentType
        ? current.tipoComprobanteId
        : (availableTypes[0]?.id ?? 0)

      if (
        nextSucursalId === current.sucursalId &&
        nextTipoComprobanteId === current.tipoComprobanteId
      ) {
        return current
      }

      return {
        ...current,
        sucursalId: nextSucursalId,
        tipoComprobanteId: nextTipoComprobanteId,
      }
    })
  }, [availableTypes, defaultSucursalId])

  const selectedCustomer = useMemo(
    () => clientes.find((cliente) => cliente.id === form.terceroId) ?? null,
    [clientes, form.terceroId]
  )

  const selectedSucursal = useMemo(
    () => sucursales.find((sucursal) => sucursal.id === form.sucursalId) ?? null,
    [form.sucursalId, sucursales]
  )

  const operationalWarnings = useMemo(() => {
    const warnings: string[] = []

    if (!form.terceroId) warnings.push("Falta seleccionar el cliente del pedido.")
    if (!form.sucursalId) warnings.push("Falta seleccionar la sucursal emisora.")
    if (!vendedor.trim()) warnings.push("Conviene indicar el vendedor responsable del pedido.")
    if (!entregaEstimada) warnings.push("Conviene informar una fecha de entrega comprometida.")
    if (!domicilioEntrega.trim())
      warnings.push("Falta un domicilio o punto de entrega para el pedido.")
    if (lineItems.length === 0)
      warnings.push("Agregá al menos un renglón antes de registrar el pedido.")
    if (!detalleOperativo.trim()) {
      warnings.push("Sumá un detalle comercial para que el pedido sea más claro en seguimiento.")
    }

    return warnings
  }, [
    detalleOperativo,
    domicilioEntrega,
    entregaEstimada,
    form.sucursalId,
    form.terceroId,
    lineItems.length,
    vendedor,
  ])

  const addItem = (itemId: string) => {
    const item = items.find((current) => current.id === Number(itemId))
    if (!item) return
    const existing = lineItems.find((current) => current.itemId === item.id)
    if (existing) {
      setLineItems((prev) =>
        prev.map((current) =>
          current.itemId === item.id ? { ...current, cantidad: current.cantidad + 1 } : current
        )
      )
      return
    }

    setLineItems((prev) => [
      ...prev,
      {
        id: `line-${item.id}-${Date.now()}`,
        itemId: item.id,
        descripcion: item.descripcion,
        cantidad: 1,
        precioUnitario: item.precioVenta,
        descuento: 0,
        alicuotaIvaId: item.alicuotaIvaId,
        alicuotaIvaPct: item.alicuotaIvaPorcentaje ?? 21,
      },
    ])
  }

  const updateLineItem = (id: string, key: keyof OrderFormItem, value: number | string) => {
    setLineItems((prev) => prev.map((item) => (item.id === id ? { ...item, [key]: value } : item)))
  }

  const removeLineItem = (id: string) => {
    setLineItems((prev) => prev.filter((item) => item.id !== id))
  }

  const totals = useMemo(() => {
    return lineItems.reduce(
      (acc, item) => {
        const subtotal = item.cantidad * item.precioUnitario * (1 - item.descuento / 100)
        const iva = subtotal * (item.alicuotaIvaPct / 100)
        return {
          subtotal: acc.subtotal + subtotal,
          iva: acc.iva + iva,
          total: acc.total + subtotal + iva,
        }
      },
      { subtotal: 0, iva: 0, total: 0 }
    )
  }, [lineItems])

  const handleSave = async () => {
    if (!form.sucursalId || !form.terceroId || !form.tipoComprobanteId || lineItems.length === 0) {
      setError("Sucursal, cliente, tipo de pedido e ítems son obligatorios")
      return
    }

    const observationParts = [
      vendedor ? `Vendedor: ${vendedor}` : null,
      `Canal: ${canal}`,
      condicionVenta ? `Condición venta: ${condicionVenta}` : null,
      entregaEstimada ? `Entrega estimada: ${entregaEstimada}` : null,
      tipoEntrega ? `Tipo entrega: ${tipoEntrega}` : null,
      zonaEntrega.trim() ? `Zona: ${zonaEntrega.trim()}` : null,
      transporte.trim() ? `Transporte: ${transporte.trim()}` : null,
      domicilioEntrega.trim() ? `Domicilio entrega: ${domicilioEntrega.trim()}` : null,
      observacionEntrega.trim() ? `Obs. entrega: ${observacionEntrega.trim()}` : null,
      detalleOperativo.trim() || null,
      form.observacion?.trim() || null,
    ].filter(Boolean)

    const payload: EmitirComprobanteDto = {
      ...form,
      items: lineItems.map((item) => ({
        itemId: item.itemId,
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        descuento: item.descuento,
        alicuotaIvaId: item.alicuotaIvaId,
      })),
      observacion: observationParts.join(" | ") || null,
      fechaVto: form.fechaVto || null,
    }

    setSaving(true)
    setError(null)
    const ok = await emitir(payload)
    setSaving(false)
    if (ok) onSaved()
    else setError("No se pudo registrar el pedido")
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-4">
        <Card className="border-slate-200 bg-slate-50/80">
          <CardContent className="space-y-1 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Pedido</p>
            <p className="text-base font-semibold text-slate-900">
              {availableTypes.find((tipo) => tipo.id === form.tipoComprobanteId)?.descripcion ??
                "Pedido de venta"}
            </p>
            <p className="text-xs text-slate-600">{formatDate(form.fecha)}</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50/80">
          <CardContent className="space-y-1 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-emerald-700">Cliente</p>
            <p className="text-base font-semibold text-emerald-950 wrap-break-word">
              {selectedCustomer?.razonSocial ?? "Sin cliente seleccionado"}
            </p>
            <p className="text-xs text-emerald-800">
              {selectedCustomer?.condicionIvaDescripcion ?? "Condición fiscal pendiente"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-sky-200 bg-sky-50/80">
          <CardContent className="space-y-1 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-sky-700">Entrega</p>
            <p className="text-base font-semibold text-sky-950">
              {entregaEstimada ? formatDate(entregaEstimada) : "Sin fecha comprometida"}
            </p>
            <p className="text-xs text-sky-800 wrap-break-word">
              {domicilioEntrega || "Sin punto de entrega cargado"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/80">
          <CardContent className="space-y-1 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-amber-700">Totales</p>
            <p className="text-base font-semibold text-amber-950">{formatMoney(totals.total)}</p>
            <p className="text-xs text-amber-800">{lineItems.length} renglón(es) informados</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <SalesTabsList className="md:grid-cols-3 xl:grid-cols-5">
          <TabsTrigger value="principal" className="py-2 text-xs">
            Principal
          </TabsTrigger>
          <TabsTrigger value="items" className="py-2 text-xs">
            Items
          </TabsTrigger>
          <TabsTrigger value="entrega" className="py-2 text-xs">
            Entrega
          </TabsTrigger>
          <TabsTrigger value="totales" className="py-2 text-xs">
            Totales
          </TabsTrigger>
          <TabsTrigger value="legado" className="py-2 text-xs">
            Cobertura
          </TabsTrigger>
        </SalesTabsList>

        <TabsContent value="principal" className="mt-4 space-y-4">
          {operationalWarnings.length > 0 ? (
            <Card className="border-amber-200 bg-amber-50/60">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-amber-950">
                  <AlertCircle className="h-4 w-4" /> Pendientes para cerrar el pedido
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 md:grid-cols-2">
                {operationalWarnings.map((warning) => (
                  <div
                    key={warning}
                    className="rounded-lg border border-amber-200 bg-background/80 px-3 py-2 text-sm text-slate-700"
                  >
                    {warning}
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Sucursal</Label>
              <Select
                value={form.sucursalId ? String(form.sucursalId) : ""}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, sucursalId: Number(value) }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar sucursal" />
                </SelectTrigger>
                <SelectContent>
                  {sucursales.map((sucursal) => (
                    <SelectItem key={sucursal.id} value={String(sucursal.id)}>
                      {sucursal.descripcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de pedido</Label>
              <Select
                value={form.tipoComprobanteId ? String(form.tipoComprobanteId) : ""}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, tipoComprobanteId: Number(value) }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {availableTypes.map((tipo) => (
                    <SelectItem key={tipo.id} value={String(tipo.id)}>
                      {tipo.codigo} · {tipo.descripcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Cliente</Label>
              <Select
                value={form.terceroId ? String(form.terceroId) : ""}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, terceroId: Number(value) }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((cliente) => (
                    <SelectItem key={cliente.id} value={String(cliente.id)}>
                      {cliente.razonSocial}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Fecha</Label>
              <Input
                type="date"
                value={form.fecha}
                onChange={(event) => setForm((prev) => ({ ...prev, fecha: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Compromiso de entrega</Label>
              <Input
                type="date"
                value={entregaEstimada}
                onChange={(event) => setEntregaEstimada(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Vendedor</Label>
              <Input
                value={vendedor}
                onChange={(event) => setVendedor(event.target.value)}
                placeholder="Responsable comercial"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Canal</Label>
              <Select value={canal} onValueChange={setCanal}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vendedor">Vendedor</SelectItem>
                  <SelectItem value="telefono">Teléfono</SelectItem>
                  <SelectItem value="web">Web</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Condición de venta</Label>
              <Select value={condicionVenta} onValueChange={setCondicionVenta}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cuenta corriente">Cuenta corriente</SelectItem>
                  <SelectItem value="contado">Contado</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="acordada">Condición acordada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Detalle operativo</Label>
              <Textarea
                rows={3}
                value={detalleOperativo}
                onChange={(event) => setDetalleOperativo(event.target.value)}
                placeholder="Observaciones comerciales, condiciones o referencias del cliente"
              />
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Cliente y emisión</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2 text-sm">
                <div className="rounded-lg border bg-muted/30 p-3 md:col-span-2">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Cliente
                  </p>
                  <p className="mt-1 font-medium wrap-break-word">
                    {selectedCustomer?.razonSocial ?? "Sin cliente seleccionado"}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Sucursal
                  </p>
                  <p className="mt-1 font-medium wrap-break-word">
                    {selectedSucursal?.descripcion ?? "Sin sucursal"}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">IVA</p>
                  <p className="mt-1 font-medium wrap-break-word">
                    {selectedCustomer?.condicionIvaDescripcion ?? "Sin condición"}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">CUIT</p>
                  <p className="mt-1 font-medium wrap-break-word">
                    {selectedCustomer?.nroDocumento ?? "Sin documento"}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Contacto
                  </p>
                  <p className="mt-1 font-medium wrap-break-word">
                    {selectedCustomer?.telefono ?? selectedCustomer?.email ?? "Sin contacto"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Programación comercial</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2 text-sm">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Vendedor
                  </p>
                  <p className="mt-1 font-medium wrap-break-word">{vendedor || "Sin vendedor"}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Canal</p>
                  <p className="mt-1 font-medium capitalize">{canal}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Condición
                  </p>
                  <p className="mt-1 font-medium capitalize">{condicionVenta}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Compromiso
                  </p>
                  <p className="mt-1 font-medium">
                    {entregaEstimada ? formatDate(entregaEstimada) : "Sin fecha"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="entrega" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Tipo de entrega</Label>
              <Select value={tipoEntrega} onValueChange={setTipoEntrega}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="domicilio">A domicilio</SelectItem>
                  <SelectItem value="retiro">Retiro en sucursal</SelectItem>
                  <SelectItem value="transporte">Por transporte</SelectItem>
                  <SelectItem value="programada">Programada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Zona</Label>
              <Input
                value={zonaEntrega}
                onChange={(event) => setZonaEntrega(event.target.value)}
                placeholder="Zona comercial o logística"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Transporte</Label>
              <Input
                value={transporte}
                onChange={(event) => setTransporte(event.target.value)}
                placeholder="Transportista o retiro"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2 xl:col-span-3">
              <Label>Domicilio de entrega</Label>
              <Textarea
                rows={3}
                value={domicilioEntrega}
                onChange={(event) => setDomicilioEntrega(event.target.value)}
                placeholder="Dirección, sucursal o punto de retiro comprometido"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2 xl:col-span-3">
              <Label>Observación de entrega</Label>
              <Textarea
                rows={3}
                value={observacionEntrega}
                onChange={(event) => setObservacionEntrega(event.target.value)}
                placeholder="Horario, contacto en recepción, instrucciones o restricciones"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="items" className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label>Agregar producto</Label>
            <Select value="__none__" onValueChange={addItem}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar producto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Seleccionar producto</SelectItem>
                {items.map((item) => (
                  <SelectItem key={item.id} value={String(item.id)}>
                    {item.codigo} · {item.descripcion}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-right">Desc. %</TableHead>
                  <TableHead className="text-right">IVA %</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      Agregue items para registrar el pedido.
                    </TableCell>
                  </TableRow>
                ) : (
                  lineItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.descripcion}</TableCell>
                      <TableCell className="text-right">
                        <Input
                          className="ml-auto w-20 text-right"
                          type="number"
                          min={1}
                          value={item.cantidad}
                          onChange={(event) =>
                            updateLineItem(
                              item.id,
                              "cantidad",
                              Math.max(1, Number(event.target.value) || 1)
                            )
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          className="ml-auto w-28 text-right"
                          type="number"
                          min={0}
                          step={0.01}
                          value={item.precioUnitario}
                          onChange={(event) =>
                            updateLineItem(
                              item.id,
                              "precioUnitario",
                              parseFloat(event.target.value) || 0
                            )
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          className="ml-auto w-24 text-right"
                          type="number"
                          min={0}
                          max={100}
                          step={0.01}
                          value={item.descuento}
                          onChange={(event) =>
                            updateLineItem(
                              item.id,
                              "descuento",
                              parseFloat(event.target.value) || 0
                            )
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        {item.alicuotaIvaPct.toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => removeLineItem(item.id)}>
                          <AlertCircle className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="totales" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Totales del pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatMoney(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">IVA</span>
                <span>{formatMoney(totals.iva)}</span>
              </div>
              <div className="flex justify-between border-t pt-3 text-base font-semibold">
                <span>Total</span>
                <span>{formatMoney(totals.total)}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="legado" className="mt-4 space-y-4">
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              La pantalla ya cubre cabecera comercial, detalle, programación y datos de entrega. La
              reserva de stock, las aprobaciones, la preparación por área y la transformación formal
              a remito o factura siguen dependiendo de integración backend adicional.
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
        <Button onClick={handleSave} disabled={saving || availableTypes.length === 0}>
          {saving ? "Registrando..." : "Registrar pedido"}
        </Button>
      </div>
    </div>
  )
}

function SalesOrderDetail({
  order,
  customerName,
  customer,
  typeName,
  sucursalName,
}: {
  order: ComprobanteDetalle
  customerName: string
  customer?: Tercero | null
  typeName: string
  sucursalName: string
}) {
  const operationalContext = parseOperationalObservation(order.observacion)

  const mainFields = [
    { label: "Pedido", value: order.nroComprobante ?? `#${order.id}` },
    { label: "Tipo", value: typeName },
    { label: "Cliente", value: customerName },
    { label: "Sucursal", value: sucursalName },
    { label: "Fecha", value: formatDate(order.fecha) },
    { label: "Compromiso", value: formatDate(order.fechaVto) },
    { label: "Estado", value: STATUS_CONFIG[order.estado]?.label ?? order.estado },
    { label: "Observación", value: order.observacion ?? "-" },
  ]

  const totalFields = [
    { label: "Neto Gravado", value: formatMoney(order.netoGravado) },
    { label: "Neto No Gravado", value: formatMoney(order.netoNoGravado) },
    { label: "IVA RI", value: formatMoney(order.ivaRi) },
    { label: "IVA RNI", value: formatMoney(order.ivaRni) },
    { label: "Saldo", value: formatMoney(order.saldo) },
    { label: "Total", value: formatMoney(order.total) },
  ]

  const circuitFields = [
    { label: "Estado documental", value: getOrderDocumentStatus(order) },
    { label: "Estado del compromiso", value: getCommitmentStatus(order) },
    { label: "Vendedor", value: operationalContext.vendedor },
    { label: "Canal", value: operationalContext.canal },
    { label: "Condición venta", value: operationalContext.condicionVenta },
    { label: "Entrega estimada", value: operationalContext.entrega },
    { label: "Tipo entrega", value: operationalContext.tipoEntrega },
    { label: "Zona", value: operationalContext.zona },
    { label: "Transporte", value: operationalContext.transporte },
    { label: "Domicilio entrega", value: operationalContext.domicilioEntrega },
    {
      label: "Items / unidades",
      value: `${order.items.length} renglones · ${order.items.reduce((total, item) => total + item.cantidad, 0)} unidades`,
    },
    {
      label: "Saldo asociado",
      value: order.saldo > 0 ? formatMoney(order.saldo) : "Sin saldo pendiente",
    },
    { label: "Obs. entrega", value: operationalContext.observacionEntrega },
    { label: "Detalle operativo", value: operationalContext.detalle },
  ]

  const customerFields = [
    { label: "Razón social", value: customer?.razonSocial ?? customerName },
    { label: "Fantasia", value: customer?.nombreFantasia ?? "-" },
    { label: "CUIT", value: customer?.nroDocumento ?? "-" },
    { label: "Condición IVA", value: customer?.condicionIvaDescripcion ?? "-" },
    { label: "Domicilio", value: formatCustomerAddress(customer) },
    { label: "Contacto", value: customer?.email ?? customer?.telefono ?? customer?.celular ?? "-" },
    {
      label: "Límite crédito",
      value:
        typeof customer?.limiteCredito === "number" ? formatMoney(customer.limiteCredito) : "-",
    },
    { label: "Facturable", value: customer ? (customer.facturable ? "Sí" : "No") : "-" },
  ]

  return (
    <Tabs defaultValue="principal" className="w-full">
      <SalesTabsList className="md:grid-cols-3 xl:grid-cols-5">
        <TabsTrigger value="principal">Principal</TabsTrigger>
        <TabsTrigger value="items">Items</TabsTrigger>
        <TabsTrigger value="totales">Totales</TabsTrigger>
        <TabsTrigger value="circuito">Circuito</TabsTrigger>
        <TabsTrigger value="legado">Cobertura</TabsTrigger>
      </SalesTabsList>
      <TabsContent value="principal" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingCart className="h-4 w-4" /> Cabecera comercial
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DetailFieldGrid fields={mainFields} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cliente vinculado</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailFieldGrid fields={customerFields} />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="items" className="space-y-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Precio</TableHead>
                <TableHead className="text-right">Desc.</TableHead>
                <TableHead className="text-right">IVA</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Este pedido no devolvió detalle de ítems.
                  </TableCell>
                </TableRow>
              ) : (
                order.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.descripcion}</TableCell>
                    <TableCell className="text-right">{item.cantidad}</TableCell>
                    <TableCell className="text-right">{formatMoney(item.precioUnitario)}</TableCell>
                    <TableCell className="text-right">
                      {item.descuento ? `${item.descuento}%` : "-"}
                    </TableCell>
                    <TableCell className="text-right">{item.alicuotaIvaPct}%</TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatMoney(item.subtotal)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </TabsContent>
      <TabsContent value="totales" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-4 w-4" /> Totales del documento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DetailFieldGrid fields={totalFields} />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="circuito" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4" /> Estado operativo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DetailFieldGrid fields={circuitFields} />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="legado" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Landmark className="h-4 w-4" /> Cobertura e integración pendiente
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm text-muted-foreground md:grid-cols-2">
            <div className="rounded-lg border p-4">
              Esta etapa ya deja visible compromiso, contexto comercial, programación y entrega;
              reserva, preparación y seguimiento por área siguen reservados.
            </div>
            <div className="rounded-lg border p-4">
              La conversión formal del pedido a remito o factura con trazabilidad de cumplimiento
              queda reservada para la integración siguiente.
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

export default function PedidosPage() {
  const { comprobantes, loading, error, totalPages, page, setPage, emitir, getById, refetch } =
    useComprobantes({ esVenta: true })
  const { tipos } = useComprobantesConfig()
  const { terceros: clientes } = useTerceros()
  const { sucursales } = useSucursales()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("vigentes")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)
  const [detailOrder, setDetailOrder] = useState<ComprobanteDetalle | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const orderTypes = useMemo(
    () => tipos.filter((tipo) => tipo.esVenta && isOrderType(tipo)),
    [tipos]
  )
  const orderTypeIds = useMemo(() => new Set(orderTypes.map((tipo) => tipo.id)), [orderTypes])
  const orders = useMemo(
    () => comprobantes.filter((item) => orderTypeIds.has(item.tipoComprobanteId)),
    [comprobantes, orderTypeIds]
  )
  const activeOrders = useMemo(() => orders.filter((order) => order.estado !== "ANULADO"), [orders])

  const getCustomerName = useCallback(
    (terceroId: number) =>
      clientes.find((cliente) => cliente.id === terceroId)?.razonSocial ?? `#${terceroId}`,
    [clientes]
  )
  const getCustomer = useCallback(
    (terceroId: number) => clientes.find((cliente) => cliente.id === terceroId) ?? null,
    [clientes]
  )
  const getTypeName = useCallback(
    (tipoId: number, fallback?: string) =>
      tipos.find((tipo) => tipo.id === tipoId)?.descripcion ?? fallback ?? `#${tipoId}`,
    [tipos]
  )
  const getSucursalName = useCallback(
    (sucursalId: number) =>
      sucursales.find((sucursal) => sucursal.id === sucursalId)?.descripcion ?? `#${sucursalId}`,
    [sucursales]
  )

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return orders.filter((order) => {
      const matchesSearch =
        term === "" ||
        (order.nroComprobante ?? String(order.id)).toLowerCase().includes(term) ||
        getCustomerName(order.terceroId).toLowerCase().includes(term) ||
        getTypeName(order.tipoComprobanteId, order.tipoComprobanteDescripcion)
          .toLowerCase()
          .includes(term)

      const matchesStatus =
        statusFilter === "vigentes"
          ? order.estado !== "ANULADO"
          : statusFilter === "todos"
            ? true
            : order.estado === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [orders, searchTerm, statusFilter, getCustomerName, getTypeName])

  const kpis = useMemo(
    () => ({
      total: activeOrders.length,
      borradores: activeOrders.filter((order) => order.estado === "BORRADOR").length,
      confirmados: activeOrders.filter((order) => order.estado === "EMITIDO").length,
      cerrados: activeOrders.filter((order) => order.estado === "PAGADO").length,
      conCompromiso: activeOrders.filter((order) => Boolean(order.fechaVto)).length,
      conSaldoPendiente: activeOrders.filter((order) => order.saldo > 0).length,
    }),
    [activeOrders]
  )

  const selectedOrder = useMemo(
    () => comprobantes.find((order) => order.id === selectedOrderId) ?? null,
    [comprobantes, selectedOrderId]
  )

  const highlightedOrder =
    selectedOrder && filtered.some((order) => order.id === selectedOrder.id)
      ? selectedOrder
      : (filtered[0] ?? null)
  const highlightedCustomer = highlightedOrder ? getCustomer(highlightedOrder.terceroId) : null
  const highlightedContext = highlightedOrder
    ? parseOperationalObservation(highlightedOrder.observacion)
    : null
  const highlightedFields = highlightedOrder
    ? [
        {
          label: "Cliente",
          value: highlightedCustomer?.razonSocial ?? `#${highlightedOrder.terceroId}`,
        },
        {
          label: "Tipo",
          value: getTypeName(
            highlightedOrder.tipoComprobanteId,
            highlightedOrder.tipoComprobanteDescripcion
          ),
        },
        { label: "Compromiso", value: formatDate(highlightedOrder.fechaVto) },
        { label: "Total", value: formatMoney(highlightedOrder.total) },
        {
          label: "Circuito",
          value: getOrderDocumentStatus(highlightedOrder as ComprobanteDetalle),
        },
        { label: "Condición", value: highlightedContext?.condicionVenta ?? "No informada" },
        { label: "Canal", value: highlightedContext?.canal ?? "No informado" },
        { label: "Entrega", value: highlightedContext?.tipoEntrega ?? "Sin modalidad" },
        { label: "Zona", value: highlightedContext?.zona ?? "Sin zona" },
      ]
    : []

  const openDetail = async (order: Comprobante) => {
    setSelectedOrderId(order.id)
    setIsDetailOpen(true)
    setLoadingDetail(true)
    const detail = await getById(order.id)
    setDetailOrder(detail)
    setLoadingDetail(false)
  }

  const handleSaved = async () => {
    setIsFormOpen(false)
    await refetch()
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pedidos de Venta</h1>
          <p className="text-muted-foreground">
            Seguimiento comercial de pedidos reales cuando el backend expone tipos documentales de
            pedido.
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)} disabled={orderTypes.length === 0}>
          <ShoppingCart className="mr-2 h-4 w-4" />
          Nuevo Pedido
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {orderTypes.length === 0 && (
        <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>
            El backend actual no expone tipos documentales de pedido detectables. La vista queda en
            modo consulta y la creación permanece deshabilitada hasta que exista ese soporte real.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-slate-200 bg-slate-50/70">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Total</p>
            <p className="mt-2 text-2xl font-bold text-slate-950">{kpis.total}</p>
            <p className="mt-1 text-xs text-slate-600">
              Pedidos detectados en el circuito comercial.
            </p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/80">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs uppercase tracking-[0.18em] text-amber-700">Borradores</p>
            <p className="mt-2 text-2xl font-bold text-amber-950">{kpis.borradores}</p>
            <p className="mt-1 text-xs text-amber-800">
              Todavía requieren validación comercial o cierre operativo.
            </p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50/80">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs uppercase tracking-[0.18em] text-emerald-700">Confirmados</p>
            <p className="mt-2 text-2xl font-bold text-emerald-950">{kpis.confirmados}</p>
            <p className="mt-1 text-xs text-emerald-800">
              Pedidos ya emitidos dentro del flujo disponible.
            </p>
          </CardContent>
        </Card>
        <Card className="border-sky-200 bg-sky-50/80">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs uppercase tracking-[0.18em] text-sky-700">Seguimiento</p>
            <p className="mt-2 text-2xl font-bold text-sky-950">{kpis.conCompromiso}</p>
            <p className="mt-1 text-xs text-sky-800">
              Con compromiso visible y {kpis.conSaldoPendiente} con saldo pendiente.
            </p>
          </CardContent>
        </Card>
      </div>

      {highlightedOrder ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardDescription>Pedido destacado</CardDescription>
              <CardTitle className="mt-1 text-xl">
                {highlightedOrder.nroComprobante ?? `#${highlightedOrder.id}`} ·{" "}
                {highlightedCustomer?.razonSocial ?? `Cliente #${highlightedOrder.terceroId}`}
              </CardTitle>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                {highlightedContext?.detalle ?? "Sin detalle operativo registrado."}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="rounded-full border bg-background/80 px-3 py-1">
                  {highlightedContext?.vendedor
                    ? `Vendedor: ${highlightedContext.vendedor}`
                    : "Vendedor sin asignar"}
                </span>
                <span className="rounded-full border bg-background/80 px-3 py-1">
                  {highlightedContext?.tipoEntrega
                    ? `Entrega: ${highlightedContext.tipoEntrega}`
                    : "Entrega sin modalidad"}
                </span>
                <span className="rounded-full border bg-background/80 px-3 py-1">
                  {highlightedContext?.transporte
                    ? `Transporte: ${highlightedContext.transporte}`
                    : "Sin transporte informado"}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={
                  (STATUS_CONFIG[highlightedOrder.estado]?.variant ?? "outline") as
                    | "default"
                    | "secondary"
                    | "outline"
                    | "destructive"
                }
              >
                {STATUS_CONFIG[highlightedOrder.estado]?.label ?? highlightedOrder.estado}
              </Badge>
              <Badge variant="outline">
                {getCommitmentStatus(highlightedOrder as ComprobanteDetalle)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <DetailFieldGrid fields={highlightedFields} />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-[1fr_220px_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-10"
                placeholder="Buscar por pedido, cliente o tipo..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vigentes">Activos</SelectItem>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="BORRADOR">Borrador</SelectItem>
                <SelectItem value="EMITIDO">Confirmado</SelectItem>
                <SelectItem value="PAGADO">Cerrado</SelectItem>
                <SelectItem value="PAGADO_PARCIAL">Parcial</SelectItem>
                <SelectItem value="ANULADO">Anulado</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="bg-transparent" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Recargar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pedidos detectados ({filtered.length})</CardTitle>
          <CardDescription>
            Solo se muestran comprobantes de venta cuyos tipos fueron detectados como pedidos a
            partir de la metadata real disponible.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Compromiso</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Circuito</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                      <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin" />
                      Cargando pedidos...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                      No se encontraron pedidos para los filtros actuales.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((order) => {
                    const status = STATUS_CONFIG[order.estado] ?? {
                      label: order.estado,
                      variant: "outline" as const,
                    }
                    return (
                      <TableRow
                        key={order.id}
                        className="cursor-pointer hover:bg-muted/40"
                        onClick={() => openDetail(order)}
                      >
                        <TableCell className="font-mono font-semibold">
                          {order.nroComprobante ?? `#${order.id}`}
                        </TableCell>
                        <TableCell>
                          {getTypeName(order.tipoComprobanteId, order.tipoComprobanteDescripcion)}
                        </TableCell>
                        <TableCell>{getCustomerName(order.terceroId)}</TableCell>
                        <TableCell>{formatDate(order.fecha)}</TableCell>
                        <TableCell>{formatDate(order.fechaVto)}</TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                        <TableCell className="max-w-64 whitespace-normal wrap-break-word text-sm text-muted-foreground">
                          {getOrderDocumentStatus(order as ComprobanteDetalle)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatMoney(order.total)}
                        </TableCell>
                        <TableCell
                          className="text-right"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <Button variant="ghost" size="icon" onClick={() => openDetail(order)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-emerald-200 bg-emerald-50/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserRound className="h-4 w-4" /> Contexto comercial
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-emerald-950/80">
            {kpis.total} pedidos detectados sobre tipos reales; el detalle ya expone vendedor,
            canal, condición comercial y notas operativas desde la información actual.
          </CardContent>
        </Card>
        <Card className="border-sky-200 bg-sky-50/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4" /> Seguimiento
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-sky-950/80">
            {kpis.conCompromiso} pedidos ya muestran compromiso y {kpis.conSaldoPendiente}
            conservan saldo pendiente visible dentro del circuito actual.
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Landmark className="h-4 w-4" /> Próxima fase
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-amber-950/80">
            {kpis.confirmados} confirmados y {kpis.cerrados} cerrados ya quedan controlados; reserva
            de stock, preparación, aprobaciones y transformación formal siguen pendientes.
          </CardContent>
        </Card>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <SalesDialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Nuevo Pedido</DialogTitle>
            <DialogDescription>
              Registro comercial real usando tipos de pedido solo si el backend los expone
              actualmente.
            </DialogDescription>
          </DialogHeader>
          <SalesOrderForm
            key={`${orderTypes[0]?.id ?? 0}-${isFormOpen ? "open" : "closed"}`}
            availableTypes={orderTypes}
            onClose={() => setIsFormOpen(false)}
            onSaved={handleSaved}
            emitir={emitir}
          />
        </SalesDialogContent>
      </Dialog>

      <Dialog
        open={isDetailOpen}
        onOpenChange={(open) => {
          setIsDetailOpen(open)
          if (!open) {
            setSelectedOrderId(null)
            setDetailOrder(null)
          }
        }}
      >
        <SalesDialogContent size="lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedOrder?.nroComprobante ?? "Detalle del pedido"}
            </DialogTitle>
            <DialogDescription>
              {selectedOrder ? getCustomerName(selectedOrder.terceroId) : "Cargando..."}
            </DialogDescription>
          </DialogHeader>
          {loadingDetail ? (
            <div className="py-12 text-center text-muted-foreground">
              <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin" />
              Cargando detalle...
            </div>
          ) : detailOrder && selectedOrder ? (
            <SalesOrderDetail
              order={detailOrder}
              customerName={getCustomerName(selectedOrder.terceroId)}
              customer={getCustomer(selectedOrder.terceroId)}
              typeName={getTypeName(
                selectedOrder.tipoComprobanteId,
                selectedOrder.tipoComprobanteDescripcion
              )}
              sucursalName={getSucursalName(selectedOrder.sucursalId)}
            />
          ) : (
            <p className="py-8 text-center text-muted-foreground">
              No se pudo cargar el detalle del pedido.
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
          </DialogFooter>
        </SalesDialogContent>
      </Dialog>
    </div>
  )
}
