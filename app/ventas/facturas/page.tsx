"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertCircle,
  Ban,
  Building2,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Landmark,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  Shield,
  ShoppingCart,
  UserRound,
  WalletCards,
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
import { ScrollArea } from "@/components/ui/scroll-area"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useComprobantes, useComprobantesConfig } from "@/lib/hooks/useComprobantes"
import { useItems, useItemsConfig } from "@/lib/hooks/useItems"
import { usePuntosFacturacion } from "@/lib/hooks/usePuntosFacturacion"
import { useDefaultSucursalId, useSucursales } from "@/lib/hooks/useSucursales"
import { useTerceros } from "@/lib/hooks/useTerceros"
import type {
  Comprobante,
  ComprobanteDetalle,
  EmitirComprobanteDto,
} from "@/lib/types/comprobantes"
import type { Item } from "@/lib/types/items"
import type { Tercero } from "@/lib/types/terceros"

function formatMoney(value: number) {
  return value.toLocaleString("es-AR", { style: "currency", currency: "ARS" })
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString("es-AR") : "-"
}

function formatCustomerAddress(customer?: Tercero | null) {
  if (!customer) return "Sin domicilio fiscal visible"

  const parts = [
    [customer.calle, customer.nro].filter(Boolean).join(" "),
    customer.piso ? `Piso ${customer.piso}` : null,
    customer.dpto ? `Dto ${customer.dpto}` : null,
    customer.localidadDescripcion,
    customer.codigoPostal,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(" · ") : "Sin domicilio fiscal visible"
}

function getDaysPastDue(value?: string | null) {
  if (!value) return null

  const dueDate = new Date(value)
  const today = new Date()
  dueDate.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  return Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
}

function getCollectionStatus(invoice: Pick<ComprobanteDetalle, "estado" | "saldo" | "fechaVto">) {
  if (invoice.estado === "ANULADO") return "Anulada"
  if (invoice.saldo <= 0 || invoice.estado === "PAGADO") return "Sin saldo pendiente"
  if (invoice.estado === "PAGADO_PARCIAL") return "Cobro parcial en seguimiento"

  const daysPastDue = getDaysPastDue(invoice.fechaVto)
  if (daysPastDue !== null && daysPastDue > 0) {
    return `Pendiente con ${daysPastDue} día(s) de mora`
  }

  if (invoice.fechaVto) {
    return `Pendiente con vencimiento ${formatDate(invoice.fechaVto)}`
  }

  return "Pendiente de cobranza"
}

function getFiscalStatus(invoice: Pick<ComprobanteDetalle, "estado" | "cae" | "caeFechaVto">) {
  if (invoice.estado === "ANULADO") return "Circuito fiscal cerrado por anulación"
  if (invoice.cae) {
    return invoice.caeFechaVto
      ? `CAE vigente hasta ${formatDate(invoice.caeFechaVto)}`
      : "CAE asignado"
  }
  return "CAE pendiente"
}

function getDocumentStatus(invoice: Pick<ComprobanteDetalle, "estado" | "fechaVto" | "saldo">) {
  if (invoice.estado === "ANULADO") return "Documento sin vigencia operativa"

  const daysPastDue = getDaysPastDue(invoice.fechaVto)
  if (daysPastDue !== null && daysPastDue > 0 && invoice.saldo > 0) {
    return `Documento vencido hace ${daysPastDue} día(s)`
  }

  if (invoice.fechaVto) return `Vigente hasta ${formatDate(invoice.fechaVto)}`
  return "Documento emitido sin vencimiento informado"
}

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  BORRADOR: { label: "Borrador", variant: "secondary" },
  EMITIDO: { label: "Emitido", variant: "default" },
  PAGADO: { label: "Pagado", variant: "default" },
  PAGADO_PARCIAL: { label: "Pago parcial", variant: "outline" },
  ANULADO: { label: "Anulado", variant: "destructive" },
}

function DetailFieldGrid({ fields }: { fields: Array<{ label: string; value: string }> }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {fields.map((field) => (
        <div key={field.label} className="rounded-xl border bg-muted/30 p-3">
          <span className="mb-1 block text-xs uppercase tracking-[0.16em] text-muted-foreground">
            {field.label}
          </span>
          <p className="text-sm font-medium wrap-break-word text-foreground">{field.value}</p>
        </div>
      ))}
    </div>
  )
}

type InvoiceFormItem = {
  id: string
  itemId: number
  descripcion: string
  cantidad: number
  precioUnitario: number
  descuento: number
  alicuotaIvaId: number
  alicuotaIvaPct: number
}

type InvoiceFormState = {
  sucursalId: number
  terceroId: number
  tipoComprobanteId: number
  fecha: string
  fechaVto: string
  observacion: string
  puntoFacturacionId: number | null
  condicionVenta: string
  listaPrecios: string
  monedaId: number | null
  cotizacion: string
  vendedor: string
  remitoReferencia: string
  ordenCompra: string
  contactoAdministrativo: string
  domicilioEntrega: string
  cuit: string
  condicionIva: string
  ingresosBrutos: string
  observacionesInternas: string
}

interface InvoiceFormProps {
  onClose: () => void
  onSaved: () => void
  emitir: (dto: EmitirComprobanteDto) => Promise<boolean>
}

function createInvoiceFormState(defaultSucursalId: number | undefined): InvoiceFormState {
  return {
    sucursalId: defaultSucursalId ?? 0,
    terceroId: 0,
    tipoComprobanteId: 0,
    fecha: new Date().toISOString().slice(0, 10),
    fechaVto: "",
    observacion: "",
    puntoFacturacionId: null,
    condicionVenta: "Cuenta corriente",
    listaPrecios: "Lista general",
    monedaId: null,
    cotizacion: "1",
    vendedor: "",
    remitoReferencia: "",
    ordenCompra: "",
    contactoAdministrativo: "",
    domicilioEntrega: "",
    cuit: "",
    condicionIva: "",
    ingresosBrutos: "",
    observacionesInternas: "",
  }
}

function InvoiceForm({ onClose, onSaved, emitir }: InvoiceFormProps) {
  const defaultSucursalId = useDefaultSucursalId()
  const { tipos } = useComprobantesConfig()
  const { monedas } = useItemsConfig()
  const { sucursales } = useSucursales()
  const { terceros: clientes } = useTerceros({ soloActivos: true })
  const { items } = useItems()
  const [tab, setTab] = useState("cabecera")
  const [form, setForm] = useState<InvoiceFormState>(() =>
    createInvoiceFormState(defaultSucursalId)
  )
  const [lineItems, setLineItems] = useState<InvoiceFormItem[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ventaTypes = useMemo(() => tipos.filter((tipo) => tipo.esVenta), [tipos])
  const effectiveTipoComprobanteId = form.tipoComprobanteId || ventaTypes[0]?.id || 0
  const effectiveSucursalId = form.sucursalId || defaultSucursalId || 0
  const {
    puntos,
    getProximoNumero,
    loading: loadingPuntos,
  } = usePuntosFacturacion(effectiveSucursalId || undefined)
  const [nextNumberPreview, setNextNumberPreview] = useState<number | null>(null)
  const [loadingNextNumber, setLoadingNextNumber] = useState(false)

  const selectedCustomer = useMemo(
    () => clientes.find((customer) => customer.id === form.terceroId) ?? null,
    [clientes, form.terceroId]
  )

  const selectedType = useMemo(
    () => ventaTypes.find((tipo) => tipo.id === effectiveTipoComprobanteId) ?? null,
    [effectiveTipoComprobanteId, ventaTypes]
  )

  const activePuntos = useMemo(
    () => puntos.filter((punto) => punto.activo).sort((left, right) => left.numero - right.numero),
    [puntos]
  )

  const selectedPunto = useMemo(
    () =>
      activePuntos.find((punto) => punto.id === form.puntoFacturacionId) ?? activePuntos[0] ?? null,
    [activePuntos, form.puntoFacturacionId]
  )

  useEffect(() => {
    let cancelled = false

    async function loadNextNumber() {
      if (!selectedPunto || !effectiveTipoComprobanteId) {
        setNextNumberPreview(null)
        setLoadingNextNumber(false)
        return
      }

      setLoadingNextNumber(true)
      const value = await getProximoNumero(selectedPunto.id, effectiveTipoComprobanteId)
      if (!cancelled) {
        setNextNumberPreview(value)
        setLoadingNextNumber(false)
      }
    }

    void loadNextNumber()

    return () => {
      cancelled = true
    }
  }, [effectiveTipoComprobanteId, getProximoNumero, selectedPunto])

  const setField = <K extends keyof InvoiceFormState>(key: K, value: InvoiceFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleCustomerChange = (value: string) => {
    if (value === "__none__") {
      setForm((current) => ({
        ...current,
        terceroId: 0,
        cuit: "",
        condicionIva: "",
        ingresosBrutos: "",
        vendedor: "",
        contactoAdministrativo: "",
        domicilioEntrega: "",
      }))
      return
    }

    const customerId = Number(value)
    const customer = clientes.find((entry) => entry.id === customerId)

    setForm((current) => ({
      ...current,
      terceroId: customerId,
      cuit: customer?.nroDocumento ?? "",
      condicionIva: customer?.condicionIvaDescripcion ?? "",
      ingresosBrutos: customer?.nroIngresosBrutos ?? "",
      vendedor:
        customer?.vendedorNombre ??
        (customer?.vendedorId ? `Vendedor #${customer.vendedorId}` : ""),
      contactoAdministrativo: customer?.email ?? customer?.telefono ?? customer?.celular ?? "",
      domicilioEntrega: formatCustomerAddress(customer),
      monedaId: current.monedaId ?? customer?.monedaId ?? null,
    }))
  }

  const addItem = (itemId: string) => {
    if (itemId === "__none__") return

    const selectedItem = items.find((item) => item.id === Number(itemId))
    if (!selectedItem) return

    const existing = lineItems.find((item) => item.itemId === selectedItem.id)
    if (existing) {
      setLineItems((current) =>
        current.map((item) =>
          item.itemId === selectedItem.id ? { ...item, cantidad: item.cantidad + 1 } : item
        )
      )
      return
    }

    setLineItems((current) => [...current, createInvoiceFormItem(selectedItem)])
  }

  const updateLineItem = (id: string, key: keyof InvoiceFormItem, value: string | number) => {
    setLineItems((current) =>
      current.map((item) => (item.id === id ? { ...item, [key]: value } : item))
    )
  }

  const removeLineItem = (id: string) => {
    setLineItems((current) => current.filter((item) => item.id !== id))
  }

  const totals = useMemo(() => {
    const byVat = new Map<number, number>()

    const aggregate = lineItems.reduce(
      (acc, item) => {
        const subtotal = item.cantidad * item.precioUnitario * (1 - item.descuento / 100)
        const iva = subtotal * (item.alicuotaIvaPct / 100)
        byVat.set(item.alicuotaIvaPct, (byVat.get(item.alicuotaIvaPct) ?? 0) + iva)

        return {
          subtotal: acc.subtotal + subtotal,
          iva: acc.iva + iva,
          total: acc.total + subtotal + iva,
        }
      },
      { subtotal: 0, iva: 0, total: 0 }
    )

    return {
      ...aggregate,
      byVat: Array.from(byVat.entries()).sort((left, right) => left[0] - right[0]),
    }
  }, [lineItems])

  const coverageBadges = useMemo(
    () => [
      selectedCustomer ? "Cliente seleccionado" : "Falta cliente",
      selectedPunto ? "Punto de facturación listo" : "Sin punto activo",
      form.cuit ? "CUIT visible" : "Sin documento fiscal",
      form.condicionVenta ? "Condición de venta cargada" : "Falta condición de venta",
      lineItems.length > 0 ? `${lineItems.length} ítem(s)` : "Sin ítems",
    ],
    [form.condicionVenta, form.cuit, lineItems.length, selectedCustomer, selectedPunto]
  )

  const validate = () => {
    if (!effectiveSucursalId) return "Debe seleccionar una sucursal de emisión"
    if (!form.terceroId) return "Debe seleccionar un cliente"
    if (!effectiveTipoComprobanteId) return "Debe seleccionar un tipo de comprobante"
    if (lineItems.length === 0) return "Debe agregar al menos un ítem"
    if (!form.fecha) return "Debe indicar la fecha de emisión"

    const invalidItem = lineItems.find(
      (item) =>
        item.cantidad <= 0 || item.precioUnitario < 0 || item.descuento < 0 || item.descuento > 100
    )
    if (invalidItem) return "Revise cantidades, precios y descuentos de los ítems"

    return null
  }

  const handleSave = async () => {
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    const payload: EmitirComprobanteDto = {
      sucursalId: effectiveSucursalId,
      terceroId: form.terceroId,
      tipoComprobanteId: effectiveTipoComprobanteId,
      fecha: form.fecha,
      fechaVto: form.fechaVto || null,
      observacion:
        [form.observacion, form.observacionesInternas]
          .map((value) => value.trim())
          .filter(Boolean)
          .join("\n\n") || null,
      items: lineItems.map((item) => ({
        itemId: item.itemId,
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        descuento: item.descuento,
        alicuotaIvaId: item.alicuotaIvaId,
      })),
    }

    setSaving(true)
    setError(null)
    const ok = await emitir(payload)
    setSaving(false)

    if (ok) onSaved()
    else setError("No se pudo emitir la factura")
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <InvoiceMetricCard
          label="Cliente"
          title={selectedCustomer?.razonSocial ?? "Pendiente"}
          description={selectedCustomer?.nombreFantasia ?? "Definí el receptor del comprobante"}
        />
        <InvoiceMetricCard
          label="Comprobante"
          title={
            selectedType ? `${selectedType.codigo} · ${selectedType.descripcion}` : "Pendiente"
          }
          description={
            loadingNextNumber
              ? "Consultando numeración"
              : nextNumberPreview !== null
                ? `Próximo número sugerido #${nextNumberPreview}`
                : "Sin numeración visible"
          }
        />
        <InvoiceMetricCard
          label="Totales"
          title={formatMoney(totals.total)}
          description={`${lineItems.length} ítem(s) · IVA ${formatMoney(totals.iva)}`}
        />
        <InvoiceMetricCard
          label="Cobertura"
          title={coverageBadges.slice(0, 2).join(" · ")}
          description={coverageBadges.slice(2).join(" · ")}
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid h-auto w-full grid-cols-2 gap-2 md:grid-cols-4">
          <TabsTrigger value="cabecera" className="py-2 text-xs">
            Cabecera
          </TabsTrigger>
          <TabsTrigger value="fiscal" className="py-2 text-xs">
            Fiscal y comercial
          </TabsTrigger>
          <TabsTrigger value="detalle" className="py-2 text-xs">
            Detalle
          </TabsTrigger>
          <TabsTrigger value="totales" className="py-2 text-xs">
            Totales y notas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cabecera" className="mt-4 space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,1fr)]">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Cabecera de facturación</CardTitle>
                <CardDescription>
                  Sucursal, numeración, cliente y referencias administrativas del comprobante.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Sucursal de emisión</Label>
                  <Select
                    value={effectiveSucursalId ? String(effectiveSucursalId) : "__none__"}
                    onValueChange={(value) =>
                      setField("sucursalId", value === "__none__" ? 0 : Number(value))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar sucursal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Seleccionar sucursal</SelectItem>
                      {sucursales.map((sucursal) => (
                        <SelectItem key={sucursal.id} value={String(sucursal.id)}>
                          {sucursal.descripcion}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Tipo de comprobante</Label>
                  <Select
                    value={
                      effectiveTipoComprobanteId ? String(effectiveTipoComprobanteId) : "__none__"
                    }
                    onValueChange={(value) =>
                      setField("tipoComprobanteId", value === "__none__" ? 0 : Number(value))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Seleccionar tipo</SelectItem>
                      {ventaTypes.map((tipo) => (
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
                    value={form.terceroId ? String(form.terceroId) : "__none__"}
                    onValueChange={handleCustomerChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Seleccionar cliente</SelectItem>
                      {clientes.map((cliente) => (
                        <SelectItem key={cliente.id} value={String(cliente.id)}>
                          {cliente.razonSocial}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Punto de facturación</Label>
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_200px]">
                    <Select
                      value={selectedPunto ? String(selectedPunto.id) : "__none__"}
                      onValueChange={(value) =>
                        setField("puntoFacturacionId", value === "__none__" ? null : Number(value))
                      }
                      disabled={activePuntos.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            loadingPuntos
                              ? "Cargando puntos..."
                              : activePuntos.length === 0
                                ? "Sin puntos activos"
                                : "Seleccionar punto"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Sin punto</SelectItem>
                        {activePuntos.map((punto) => (
                          <SelectItem key={punto.id} value={String(punto.id)}>
                            {String(punto.numero).padStart(4, "0")} · {punto.descripcion}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="rounded-xl border bg-muted/30 px-3 py-2">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Próximo número
                      </p>
                      <p className="text-sm font-semibold text-foreground">
                        {loadingNextNumber
                          ? "Consultando..."
                          : nextNumberPreview !== null
                            ? `#${nextNumberPreview}`
                            : "Sin vista previa"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Fecha de emisión</Label>
                  <Input
                    type="date"
                    value={form.fecha}
                    onChange={(event) => setField("fecha", event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Fecha de vencimiento</Label>
                  <Input
                    type="date"
                    value={form.fechaVto}
                    onChange={(event) => setField("fechaVto", event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Remito / guía de referencia</Label>
                  <Input
                    placeholder="Ej. REM-000123"
                    value={form.remitoReferencia}
                    onChange={(event) => setField("remitoReferencia", event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Orden de compra</Label>
                  <Input
                    placeholder="Ej. OC-4587"
                    value={form.ordenCompra}
                    onChange={(event) => setField("ordenCompra", event.target.value)}
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Domicilio fiscal</Label>
                  <Input value={formatCustomerAddress(selectedCustomer)} readOnly />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Domicilio de entrega</Label>
                  <Input
                    placeholder="Dirección visible para logística y entrega"
                    value={form.domicilioEntrega}
                    onChange={(event) => setField("domicilioEntrega", event.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Lectura rápida</CardTitle>
                <CardDescription>
                  Resumen operativo para validar la cabecera antes de cargar el detalle.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-xl border bg-muted/30 p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Receptor
                  </p>
                  <p className="mt-1 text-sm font-semibold wrap-break-word text-foreground">
                    {selectedCustomer?.razonSocial ?? "Sin cliente seleccionado"}
                  </p>
                </div>
                <div className="rounded-xl border bg-muted/30 p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Documento fiscal
                  </p>
                  <p className="mt-1 text-sm font-semibold wrap-break-word text-foreground">
                    {form.cuit || "Sin CUIT visible"}
                  </p>
                </div>
                <div className="rounded-xl border bg-muted/30 p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Condición comercial
                  </p>
                  <p className="mt-1 text-sm font-semibold wrap-break-word text-foreground">
                    {form.condicionVenta || "Sin condición definida"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {coverageBadges.map((entry) => (
                    <Badge
                      key={entry}
                      variant="outline"
                      className="max-w-full wrap-break-word whitespace-normal"
                    >
                      {entry}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="fiscal" className="mt-4 space-y-4">
          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Datos fiscales del cliente</CardTitle>
                <CardDescription>
                  Campos de lectura y apoyo comercial tomados del circuito histórico de facturación.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>CUIT / documento</Label>
                  <Input
                    value={form.cuit}
                    onChange={(event) => setField("cuit", event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Condición IVA</Label>
                  <Input
                    value={form.condicionIva}
                    onChange={(event) => setField("condicionIva", event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Ingresos brutos</Label>
                  <Input
                    value={form.ingresosBrutos}
                    onChange={(event) => setField("ingresosBrutos", event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Contacto administrativo</Label>
                  <Input
                    value={form.contactoAdministrativo}
                    onChange={(event) => setField("contactoAdministrativo", event.target.value)}
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Observación comercial</Label>
                  <Textarea
                    className="h-28 resize-none"
                    placeholder="Aclaraciones para facturación, entrega o seguimiento interno"
                    value={form.observacion}
                    onChange={(event) => setField("observacion", event.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Condiciones comerciales</CardTitle>
                <CardDescription>
                  Moneda, cotización, lista y referencias de venta para completar la operación.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Condición de venta</Label>
                  <Select
                    value={form.condicionVenta}
                    onValueChange={(value) => setField("condicionVenta", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar condición" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cuenta corriente">Cuenta corriente</SelectItem>
                      <SelectItem value="Contado">Contado</SelectItem>
                      <SelectItem value="Transferencia">Transferencia</SelectItem>
                      <SelectItem value="Cheque diferido">Cheque diferido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Lista de precios</Label>
                  <Select
                    value={form.listaPrecios}
                    onValueChange={(value) => setField("listaPrecios", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar lista" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Lista general">Lista general</SelectItem>
                      <SelectItem value="Mayorista">Mayorista</SelectItem>
                      <SelectItem value="Convenio">Convenio</SelectItem>
                      <SelectItem value="Promocional">Promocional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Moneda</Label>
                  <Select
                    value={form.monedaId ? String(form.monedaId) : "__none__"}
                    onValueChange={(value) =>
                      setField("monedaId", value === "__none__" ? null : Number(value))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar moneda" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sin moneda</SelectItem>
                      {monedas.map((moneda) => (
                        <SelectItem key={moneda.id} value={String(moneda.id)}>
                          {moneda.descripcion} ({moneda.simbolo})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Cotización</Label>
                  <Input
                    placeholder="1"
                    value={form.cotizacion}
                    onChange={(event) => setField("cotizacion", event.target.value)}
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Vendedor</Label>
                  <Input
                    placeholder="Responsable comercial visible en la factura"
                    value={form.vendedor}
                    onChange={(event) => setField("vendedor", event.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="detalle" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Detalle de ítems</CardTitle>
              <CardDescription>
                El detalle queda contenido en scroll horizontal para evitar cortes y desbordes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-1.5">
                  <Label>Agregar producto o servicio</Label>
                  <Select value="__none__" onValueChange={addItem}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar ítem" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Seleccionar ítem</SelectItem>
                      {items.map((item) => (
                        <SelectItem key={item.id} value={String(item.id)}>
                          {item.codigo} · {item.descripcion}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="rounded-xl border bg-muted/30 p-3 text-sm">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Lectura del detalle
                  </p>
                  <p className="mt-1 font-medium text-foreground">
                    {lineItems.length === 0
                      ? "Todavía no hay renglones cargados"
                      : `${lineItems.length} renglón(es) con ${formatMoney(totals.total)} total estimado`}
                  </p>
                </div>
              </div>

              <ScrollArea className="w-full whitespace-nowrap rounded-xl border">
                <div className="min-w-260">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-70">Descripción</TableHead>
                        <TableHead className="text-right">Cantidad</TableHead>
                        <TableHead className="text-right">Precio unitario</TableHead>
                        <TableHead className="text-right">Desc. %</TableHead>
                        <TableHead className="text-right">IVA %</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lineItems.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="py-10 text-center text-muted-foreground"
                          >
                            Agregá productos o servicios para completar la factura.
                          </TableCell>
                        </TableRow>
                      ) : (
                        lineItems.map((item) => {
                          const subtotal =
                            item.cantidad * item.precioUnitario * (1 - item.descuento / 100)

                          return (
                            <TableRow key={item.id}>
                              <TableCell>
                                <div className="max-w-70 space-y-2">
                                  <Input
                                    value={item.descripcion}
                                    onChange={(event) =>
                                      updateLineItem(item.id, "descripcion", event.target.value)
                                    }
                                  />
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <Input
                                  className="ml-auto w-24 text-right"
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
                                      Math.max(0, Number(event.target.value) || 0)
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
                                      Math.min(100, Math.max(0, Number(event.target.value) || 0))
                                    )
                                  }
                                />
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {item.alicuotaIvaPct.toFixed(2)}%
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                {formatMoney(subtotal)}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeLineItem(item.id)}
                                >
                                  Quitar
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="totales" className="mt-4 space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_380px]">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Notas y seguimiento</CardTitle>
                <CardDescription>
                  Espacio para aclaraciones internas, cobranzas y referencias administrativas.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Observación visible del comprobante</Label>
                  <Textarea
                    className="h-28 resize-none"
                    value={form.observacion}
                    onChange={(event) => setField("observacion", event.target.value)}
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Notas internas</Label>
                  <Textarea
                    className="h-32 resize-none"
                    placeholder="Seguimiento de cobranza, acuerdos de entrega, observaciones de operador..."
                    value={form.observacionesInternas}
                    onChange={(event) => setField("observacionesInternas", event.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Resumen fiscal</CardTitle>
                <CardDescription>
                  Totales calculados sobre el detalle actualmente cargado.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <SummaryRow label="Subtotal neto" value={formatMoney(totals.subtotal)} />
                {totals.byVat.map(([vat, amount]) => (
                  <SummaryRow
                    key={vat}
                    label={`IVA ${vat.toFixed(0)}%`}
                    value={formatMoney(amount)}
                  />
                ))}
                <SummaryRow label="IVA total" value={formatMoney(totals.iva)} />
                <div className="border-t pt-3">
                  <SummaryRow
                    label="Total comprobante"
                    value={formatMoney(totals.total)}
                    highlight
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {error ? (
        <p className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      ) : null}

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button variant="outline" className="bg-transparent" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Emitiendo..." : "Emitir factura"}
        </Button>
      </div>
    </div>
  )
}

function createInvoiceFormItem(item: Item): InvoiceFormItem {
  return {
    id: `line-${item.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    itemId: item.id,
    descripcion: item.descripcion,
    cantidad: 1,
    precioUnitario: item.precioVenta,
    descuento: 0,
    alicuotaIvaId: item.alicuotaIvaId,
    alicuotaIvaPct: item.alicuotaIvaPorcentaje ?? 21,
  }
}

function SummaryRow({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 ${highlight ? "text-base font-semibold text-foreground" : "text-muted-foreground"}`}
    >
      <span>{label}</span>
      <span className={highlight ? "text-foreground" : "text-foreground/90"}>{value}</span>
    </div>
  )
}

function InvoiceMetricCard({
  label,
  title,
  description,
}: {
  label: string
  title: string
  description: string
}) {
  return (
    <Card className="border-border/70 bg-card/80">
      <CardContent className="space-y-1 p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
        <p className="text-base font-semibold wrap-break-word text-foreground">{title}</p>
        <p className="text-xs wrap-break-word text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

function InvoiceDetail({
  invoice,
  customerName,
  customer,
  typeName,
  sucursalName,
}: {
  invoice: ComprobanteDetalle
  customerName: string
  customer?: Tercero | null
  typeName: string
  sucursalName: string
}) {
  const headerFields = [
    { label: "Comprobante", value: invoice.nroComprobante ?? `#${invoice.id}` },
    { label: "Tipo", value: typeName },
    { label: "Sucursal", value: sucursalName },
    { label: "Cliente", value: customerName },
    { label: "Fecha emisión", value: formatDate(invoice.fecha) },
    { label: "Fecha vencimiento", value: formatDate(invoice.fechaVto) },
    { label: "Estado documental", value: getDocumentStatus(invoice) },
    { label: "Estado cobranza", value: getCollectionStatus(invoice) },
    { label: "Observación", value: invoice.observacion ?? "-" },
  ]

  const fiscalFields = [
    { label: "Neto gravado", value: formatMoney(invoice.netoGravado) },
    { label: "Neto no gravado", value: formatMoney(invoice.netoNoGravado) },
    { label: "IVA RI", value: formatMoney(invoice.ivaRi) },
    { label: "IVA RNI", value: formatMoney(invoice.ivaRni) },
    { label: "Total", value: formatMoney(invoice.total) },
    { label: "Saldo", value: formatMoney(invoice.saldo) },
    { label: "CAE", value: invoice.cae ?? "-" },
    { label: "Vto. CAE", value: formatDate(invoice.caeFechaVto) },
    { label: "Estado fiscal", value: getFiscalStatus(invoice) },
  ]

  const customerFields = [
    { label: "Razón social", value: customer?.razonSocial ?? customerName },
    { label: "Nombre de fantasía", value: customer?.nombreFantasia ?? "-" },
    { label: "CUIT", value: customer?.nroDocumento ?? "-" },
    { label: "Condición IVA", value: customer?.condicionIvaDescripcion ?? "-" },
    { label: "Domicilio", value: formatCustomerAddress(customer) },
    {
      label: "Contacto",
      value: customer?.email ?? customer?.telefono ?? customer?.celular ?? "-",
    },
    {
      label: "Límite de crédito",
      value:
        typeof customer?.limiteCredito === "number" ? formatMoney(customer.limiteCredito) : "-",
    },
    { label: "Facturable", value: customer ? (customer.facturable ? "Sí" : "No") : "-" },
  ]

  return (
    <Tabs defaultValue="resumen" className="w-full">
      <TabsList className="grid h-auto w-full grid-cols-3 gap-2">
        <TabsTrigger value="resumen">Resumen</TabsTrigger>
        <TabsTrigger value="items">Ítems</TabsTrigger>
        <TabsTrigger value="fiscal">Fiscal</TabsTrigger>
      </TabsList>

      <TabsContent value="resumen" className="space-y-4 pt-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Cabecera</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailFieldGrid fields={headerFields} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Cliente vinculado</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailFieldGrid fields={customerFields} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="items" className="space-y-4 pt-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Detalle del comprobante</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="w-full whitespace-nowrap rounded-b-xl border-t">
              <div className="min-w-230">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">Precio unitario</TableHead>
                      <TableHead className="text-right">Desc. %</TableHead>
                      <TableHead className="text-right">IVA %</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                          Este comprobante no devolvió detalle de ítems.
                        </TableCell>
                      </TableRow>
                    ) : (
                      invoice.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="max-w-80 whitespace-normal wrap-break-word font-medium">
                            {item.descripcion}
                          </TableCell>
                          <TableCell className="text-right">{item.cantidad}</TableCell>
                          <TableCell className="text-right">
                            {formatMoney(item.precioUnitario)}
                          </TableCell>
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
            </ScrollArea>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="fiscal" className="space-y-4 pt-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Lectura fiscal</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailFieldGrid fields={fiscalFields} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

export default function FacturasPage() {
  const {
    comprobantes,
    loading,
    error,
    totalPages,
    page,
    setPage,
    emitir,
    anular,
    asignarCae,
    getById,
    refetch,
  } = useComprobantes({ esVenta: true })
  const { tipos, estados } = useComprobantesConfig()
  const { sucursales } = useSucursales()
  const { terceros: clientes } = useTerceros({ soloActivos: true })
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("todos")
  const [typeFilter, setTypeFilter] = useState("todos")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null)
  const [detailInvoice, setDetailInvoice] = useState<ComprobanteDetalle | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [caeState, setCaeState] = useState({
    open: false,
    id: 0,
    cae: "",
    fechaVto: "",
    qrData: "",
  })

  const ventaTypes = useMemo(() => tipos.filter((tipo) => tipo.esVenta), [tipos])

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
    const term = searchTerm.toLowerCase().trim()

    return comprobantes.filter((invoice) => {
      const typeName = getTypeName(
        invoice.tipoComprobanteId,
        invoice.tipoComprobanteDescripcion
      ).toLowerCase()
      const customerName = getCustomerName(invoice.terceroId).toLowerCase()
      const matchesSearch =
        term === "" ||
        (invoice.nroComprobante ?? String(invoice.id)).toLowerCase().includes(term) ||
        customerName.includes(term) ||
        typeName.includes(term) ||
        (invoice.cae ?? "").toLowerCase().includes(term)

      const matchesStatus = statusFilter === "todos" || invoice.estado === statusFilter
      const matchesType = typeFilter === "todos" || String(invoice.tipoComprobanteId) === typeFilter

      return matchesSearch && matchesStatus && matchesType
    })
  }, [comprobantes, getCustomerName, getTypeName, searchTerm, statusFilter, typeFilter])

  const selectedInvoice = useMemo(
    () => comprobantes.find((invoice) => invoice.id === selectedInvoiceId) ?? null,
    [comprobantes, selectedInvoiceId]
  )

  const highlightedInvoice =
    selectedInvoice && filtered.some((invoice) => invoice.id === selectedInvoice.id)
      ? selectedInvoice
      : (filtered[0] ?? null)

  const highlightedCustomer = highlightedInvoice ? getCustomer(highlightedInvoice.terceroId) : null

  const kpis = useMemo(
    () => ({
      total: comprobantes.length,
      emitidas: comprobantes.filter((invoice) => invoice.estado === "EMITIDO").length,
      pagadas: comprobantes.filter((invoice) => invoice.estado === "PAGADO").length,
      anuladas: comprobantes.filter((invoice) => invoice.estado === "ANULADO").length,
      conCae: comprobantes.filter((invoice) => Boolean(invoice.cae)).length,
      totalFacturado: comprobantes.reduce((sum, invoice) => sum + invoice.total, 0),
    }),
    [comprobantes]
  )

  const highlightedFields = highlightedInvoice
    ? [
        {
          label: "Cliente",
          value: highlightedCustomer?.razonSocial ?? `#${highlightedInvoice.terceroId}`,
        },
        {
          label: "Tipo",
          value: getTypeName(
            highlightedInvoice.tipoComprobanteId,
            highlightedInvoice.tipoComprobanteDescripcion
          ),
        },
        { label: "Emisión", value: formatDate(highlightedInvoice.fecha) },
        { label: "Vencimiento", value: formatDate(highlightedInvoice.fechaVto) },
        { label: "Cobranza", value: getCollectionStatus(highlightedInvoice as ComprobanteDetalle) },
        { label: "Fiscal", value: getFiscalStatus(highlightedInvoice as ComprobanteDetalle) },
      ]
    : []

  const loadDetail = async (invoice: Comprobante) => {
    setSelectedInvoiceId(invoice.id)
    setIsDetailOpen(true)
    setLoadingDetail(true)
    const detail = await getById(invoice.id)
    setDetailInvoice(detail)
    setLoadingDetail(false)
  }

  const handleSaved = async () => {
    setIsFormOpen(false)
    await refetch()
  }

  const handleAnnul = async (invoice: Comprobante) => {
    if (!window.confirm(`¿Anular el comprobante ${invoice.nroComprobante ?? invoice.id}?`)) return
    await anular(invoice.id, true)
    await refetch()

    if (selectedInvoiceId === invoice.id) {
      const detail = await getById(invoice.id)
      setDetailInvoice(detail)
    }
  }

  const handleAssignCae = async () => {
    if (!caeState.id || !caeState.cae.trim() || !caeState.fechaVto) return

    await asignarCae(caeState.id, caeState.cae, caeState.fechaVto, caeState.qrData || undefined)
    setCaeState({ open: false, id: 0, cae: "", fechaVto: "", qrData: "" })
    await refetch()

    if (selectedInvoiceId === caeState.id) {
      const detail = await getById(caeState.id)
      setDetailInvoice(detail)
    }
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Ventas</Badge>
            <Badge variant="secondary">Facturación</Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Facturas de venta</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Vista operativa completa para emitir, revisar y controlar facturas con foco en cabecera
            comercial, lectura fiscal clara y detalle sin desbordes.
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva factura
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <DashboardKpi icon={ReceiptText} label="Comprobantes" value={String(kpis.total)} />
        <DashboardKpi
          icon={Landmark}
          label="Total facturado"
          value={formatMoney(kpis.totalFacturado)}
        />
        <DashboardKpi
          icon={CalendarClock}
          label="Emitidas"
          value={String(kpis.emitidas)}
          accent="text-sky-700"
        />
        <DashboardKpi
          icon={WalletCards}
          label="Pagadas"
          value={String(kpis.pagadas)}
          accent="text-emerald-700"
        />
        <DashboardKpi
          icon={Shield}
          label="Con CAE"
          value={String(kpis.conCae)}
          accent="text-violet-700"
        />
        <DashboardKpi
          icon={Ban}
          label="Anuladas"
          value={String(kpis.anuladas)}
          accent="text-rose-700"
        />
      </div>

      {highlightedInvoice ? (
        <Card className="overflow-hidden border-border/70 bg-linear-to-r from-slate-50 to-white">
          <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <CardDescription>Comprobante destacado</CardDescription>
              <CardTitle className="text-xl wrap-break-word">
                {highlightedInvoice.nroComprobante ?? `#${highlightedInvoice.id}`} ·{" "}
                {highlightedCustomer?.razonSocial ?? `Cliente #${highlightedInvoice.terceroId}`}
              </CardTitle>
              <p className="max-w-3xl text-sm text-muted-foreground wrap-break-word">
                {highlightedInvoice.observacion?.trim() ||
                  "Sin observación registrada. Usá el detalle para revisar cabecera, fiscalidad e ítems."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={
                  (STATUS_CONFIG[highlightedInvoice.estado]?.variant ?? "outline") as
                    | "default"
                    | "secondary"
                    | "outline"
                    | "destructive"
                }
              >
                {STATUS_CONFIG[highlightedInvoice.estado]?.label ?? highlightedInvoice.estado}
              </Badge>
              <Badge variant="outline">
                {getCollectionStatus(highlightedInvoice as ComprobanteDetalle)}
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
          <CardDescription>
            Buscá por número, cliente, tipo o CAE y combiná filtros de estado para revisar el
            circuito.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_240px_220px_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-10"
                placeholder="Buscar por comprobante, cliente, tipo o CAE..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los tipos</SelectItem>
                {ventaTypes.map((tipo) => (
                  <SelectItem key={tipo.id} value={String(tipo.id)}>
                    {tipo.codigo} · {tipo.descripcion}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {estados.length > 0
                  ? estados.map((state) => (
                      <SelectItem key={state.valor} value={state.valor}>
                        {state.descripcion}
                      </SelectItem>
                    ))
                  : Object.entries(STATUS_CONFIG).map(([key, value]) => (
                      <SelectItem key={key} value={key}>
                        {value.label}
                      </SelectItem>
                    ))}
              </SelectContent>
            </Select>
            <Button variant="outline" className="bg-transparent" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Recargar
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_380px]">
        <Card>
          <CardHeader>
            <CardTitle>Comprobantes ({filtered.length})</CardTitle>
            <CardDescription>
              Lista compacta con foco en cliente, vencimiento, CAE, estado y total.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="w-full whitespace-nowrap rounded-b-xl border-t">
              <div className="min-w-290">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Comprobante</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Emisión</TableHead>
                      <TableHead>Vencimiento</TableHead>
                      <TableHead>CAE</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Circuito</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                          <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin" />
                          Cargando comprobantes...
                        </TableCell>
                      </TableRow>
                    ) : filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                          <FileText className="mx-auto mb-2 h-8 w-8 opacity-50" />
                          No se encontraron facturas.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((invoice) => {
                        const status = STATUS_CONFIG[invoice.estado] ?? {
                          label: invoice.estado,
                          variant: "outline" as const,
                        }

                        return (
                          <TableRow
                            key={invoice.id}
                            className="cursor-pointer hover:bg-muted/40"
                            onClick={() => loadDetail(invoice)}
                          >
                            <TableCell className="font-mono font-semibold">
                              {invoice.nroComprobante ?? `#${invoice.id}`}
                            </TableCell>
                            <TableCell className="max-w-45 whitespace-normal wrap-break-word">
                              {getTypeName(
                                invoice.tipoComprobanteId,
                                invoice.tipoComprobanteDescripcion
                              )}
                            </TableCell>
                            <TableCell className="max-w-55 whitespace-normal wrap-break-word">
                              {getCustomerName(invoice.terceroId)}
                            </TableCell>
                            <TableCell>{formatDate(invoice.fecha)}</TableCell>
                            <TableCell>{formatDate(invoice.fechaVto)}</TableCell>
                            <TableCell>
                              {invoice.cae ? (
                                <span className="font-mono text-xs">{invoice.cae}</span>
                              ) : (
                                <span className="text-xs text-muted-foreground">Pendiente</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={status.variant}>{status.label}</Badge>
                            </TableCell>
                            <TableCell className="max-w-55 whitespace-normal wrap-break-word text-sm text-muted-foreground">
                              {getDocumentStatus(invoice as ComprobanteDetalle)}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatMoney(invoice.total)}
                            </TableCell>
                            <TableCell
                              className="text-right"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => loadDetail(invoice)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {!invoice.cae && invoice.estado !== "ANULADO" ? (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      setCaeState({
                                        open: true,
                                        id: invoice.id,
                                        cae: "",
                                        fechaVto: "",
                                        qrData: "",
                                      })
                                    }
                                  >
                                    <Shield className="h-4 w-4" />
                                  </Button>
                                ) : null}
                                {invoice.estado !== "ANULADO" ? (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleAnnul(invoice)}
                                  >
                                    <Ban className="h-4 w-4 text-destructive" />
                                  </Button>
                                ) : null}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Panel operativo</CardTitle>
            <CardDescription>
              Estado rápido del circuito seleccionado para ventas, fiscalidad y cobranza.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border bg-muted/30 p-4">
              <div className="flex items-start gap-3">
                <Building2 className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Sucursal destacada</p>
                  <p className="text-sm text-muted-foreground wrap-break-word">
                    {highlightedInvoice
                      ? getSucursalName(highlightedInvoice.sucursalId)
                      : "Sin selección"}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border bg-muted/30 p-4">
              <div className="flex items-start gap-3">
                <UserRound className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Cliente en foco</p>
                  <p className="text-sm text-muted-foreground wrap-break-word">
                    {highlightedCustomer?.razonSocial ?? "Sin cliente destacado"}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border bg-muted/30 p-4">
              <div className="flex items-start gap-3">
                <ShoppingCart className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Estado del circuito</p>
                  <p className="text-sm text-muted-foreground wrap-break-word">
                    {highlightedInvoice
                      ? getCollectionStatus(highlightedInvoice as ComprobanteDetalle)
                      : "Seleccioná un comprobante para ver su estado"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {totalPages > 1 ? (
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
      ) : null}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-h-[92vh] max-w-7xl overflow-hidden p-0">
          <div className="flex h-full max-h-[92vh] flex-col">
            <DialogHeader className="border-b px-6 py-5">
              <DialogTitle>Nueva factura de venta</DialogTitle>
              <DialogDescription>
                Cabecera comercial completa, fiscalidad visible y detalle listo para emitir.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="flex-1 px-6 py-5">
              <InvoiceForm
                onClose={() => setIsFormOpen(false)}
                onSaved={handleSaved}
                emitir={emitir}
              />
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isDetailOpen}
        onOpenChange={(open) => {
          setIsDetailOpen(open)
          if (!open) {
            setSelectedInvoiceId(null)
            setDetailInvoice(null)
          }
        }}
      >
        <DialogContent className="max-h-[92vh] max-w-6xl overflow-hidden p-0">
          <div className="flex h-full max-h-[92vh] flex-col">
            <DialogHeader className="border-b px-6 py-5">
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {selectedInvoice?.nroComprobante ?? "Detalle de factura"}
              </DialogTitle>
              <DialogDescription>
                {selectedInvoice ? getCustomerName(selectedInvoice.terceroId) : "Cargando..."}
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="flex-1 px-6 py-5">
              {loadingDetail ? (
                <div className="py-12 text-center text-muted-foreground">
                  <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin" />
                  Cargando detalle...
                </div>
              ) : detailInvoice && selectedInvoice ? (
                <InvoiceDetail
                  invoice={detailInvoice}
                  customerName={getCustomerName(selectedInvoice.terceroId)}
                  customer={getCustomer(selectedInvoice.terceroId)}
                  typeName={getTypeName(
                    selectedInvoice.tipoComprobanteId,
                    selectedInvoice.tipoComprobanteDescripcion
                  )}
                  sucursalName={getSucursalName(selectedInvoice.sucursalId)}
                />
              ) : (
                <p className="py-8 text-center text-muted-foreground">
                  No se pudo cargar el detalle del comprobante.
                </p>
              )}
            </ScrollArea>

            <DialogFooter className="border-t px-6 py-4">
              <Button
                variant="outline"
                className="bg-transparent"
                onClick={() => setIsDetailOpen(false)}
              >
                Cerrar
              </Button>
              {selectedInvoice && !selectedInvoice.cae && selectedInvoice.estado !== "ANULADO" ? (
                <Button
                  onClick={() =>
                    setCaeState({
                      open: true,
                      id: selectedInvoice.id,
                      cae: "",
                      fechaVto: "",
                      qrData: "",
                    })
                  }
                >
                  <Shield className="mr-2 h-4 w-4" />
                  Asignar CAE
                </Button>
              ) : null}
              {selectedInvoice && selectedInvoice.estado !== "ANULADO" ? (
                <Button variant="destructive" onClick={() => handleAnnul(selectedInvoice)}>
                  <Ban className="mr-2 h-4 w-4" />
                  Anular
                </Button>
              ) : null}
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={caeState.open}
        onOpenChange={(open) => setCaeState((current) => ({ ...current, open }))}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Asignar CAE</DialogTitle>
            <DialogDescription>
              Registro fiscal del CAE y su vencimiento para el comprobante seleccionado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>CAE</Label>
              <Input
                value={caeState.cae}
                onChange={(event) =>
                  setCaeState((current) => ({ ...current, cae: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Vencimiento CAE</Label>
              <Input
                type="date"
                value={caeState.fechaVto}
                onChange={(event) =>
                  setCaeState((current) => ({ ...current, fechaVto: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>QR data</Label>
              <Textarea
                rows={3}
                value={caeState.qrData}
                onChange={(event) =>
                  setCaeState((current) => ({ ...current, qrData: event.target.value }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="bg-transparent"
              onClick={() => setCaeState({ open: false, id: 0, cae: "", fechaVto: "", qrData: "" })}
            >
              Cancelar
            </Button>
            <Button onClick={handleAssignCae}>Guardar CAE</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function DashboardKpi({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof ReceiptText
  label: string
  value: string
  accent?: string
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="rounded-xl border bg-muted/40 p-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
          <p className={`truncate text-lg font-semibold text-foreground ${accent ?? ""}`}>
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
