"use client"

import { useCallback, useMemo, useState } from "react"
import {
  AlertCircle,
  Ban,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  FileText,
  Landmark,
  MapPin,
  Package,
  Plus,
  RefreshCw,
  Search,
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
import { useDepositos } from "@/lib/hooks/useDepositos"
import { useItems } from "@/lib/hooks/useItems"
import { useDefaultSucursalId, useSucursales } from "@/lib/hooks/useSucursales"
import { useTerceros } from "@/lib/hooks/useTerceros"
import { useTransportistas } from "@/lib/hooks/useTransportistas"
import type {
  Comprobante,
  ComprobanteDetalle,
  EmitirComprobanteDto,
  TipoComprobante,
} from "@/lib/types/comprobantes"
import type { Item } from "@/lib/types/items"
import type { Tercero, TerceroSucursalEntrega, TerceroTransporte } from "@/lib/types/terceros"
import type { Transportista } from "@/lib/types/transportistas"

function formatMoney(value: number) {
  return value.toLocaleString("es-AR", { style: "currency", currency: "ARS" })
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString("es-AR") : "-"
}

function formatDateTime(value?: string | null) {
  return value ? new Date(value).toLocaleString("es-AR") : "-"
}

function getDaysOffset(value?: string | null) {
  if (!value) return null

  const targetDate = new Date(value)
  const today = new Date()

  targetDate.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)

  return Math.floor((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function formatCustomerAddress(customer?: Tercero | null) {
  if (!customer) return "Sin domicilio visible"

  const parts = [
    [customer.calle, customer.nro].filter(Boolean).join(" "),
    customer.piso ? `Piso ${customer.piso}` : null,
    customer.dpto ? `Dto ${customer.dpto}` : null,
    customer.localidadDescripcion,
    customer.codigoPostal,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(" · ") : "Sin domicilio visible"
}

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  BORRADOR: { label: "Borrador", variant: "secondary" },
  EMITIDO: { label: "Emitido", variant: "default" },
  PAGADO_PARCIAL: { label: "Cierre parcial", variant: "outline" },
  PAGADO: { label: "Cerrado", variant: "outline" },
  ANULADO: { label: "Anulado", variant: "destructive" },
}

const LOGISTICS_MARKER = "##ZULUIA-LOGISTICA##"

type LogisticsFields = {
  deposito: string
  puntoEntrega: string
  transportista: string
  patente: string
  cot: string
  cotVigencia: string
  descripcionCot: string
  legajo: string
  legajoSucursal: string
  hojaRuta: string
  contactoRecepcion: string
  bultos: string
  notasEntrega: string
}

type LogisticsFieldKey = keyof LogisticsFields

type DeliveryFormItem = {
  id: string
  itemId: number
  descripcion: string
  cantidad: number
  precioUnitario: number
  descuento: number
  alicuotaIvaId: number
  alicuotaIvaPct: number
  stockDisponible: number | null
}

const EMPTY_LOGISTICS: LogisticsFields = {
  deposito: "",
  puntoEntrega: "",
  transportista: "",
  patente: "",
  cot: "",
  cotVigencia: "",
  descripcionCot: "",
  legajo: "",
  legajoSucursal: "",
  hojaRuta: "",
  contactoRecepcion: "",
  bultos: "",
  notasEntrega: "",
}

const LOGISTICS_FIELD_LABELS: Record<LogisticsFieldKey, string> = {
  deposito: "Depósito",
  puntoEntrega: "Punto de entrega",
  transportista: "Transportista",
  patente: "Patente",
  cot: "Nro. COT",
  cotVigencia: "Vigencia COT",
  descripcionCot: "Descripción COT",
  legajo: "Legajo",
  legajoSucursal: "Legajo sucursal",
  hojaRuta: "Hoja de ruta",
  contactoRecepcion: "Contacto recepción",
  bultos: "Bultos",
  notasEntrega: "Notas de entrega",
}

const LOGISTICS_FIELD_ORDER: LogisticsFieldKey[] = [
  "deposito",
  "puntoEntrega",
  "transportista",
  "patente",
  "cot",
  "cotVigencia",
  "descripcionCot",
  "legajo",
  "legajoSucursal",
  "hojaRuta",
  "contactoRecepcion",
  "bultos",
  "notasEntrega",
]

function buildOperationalObservation(note: string, logistics: LogisticsFields) {
  const plainNote = note.trim()
  const logisticsLines = LOGISTICS_FIELD_ORDER.map((key) => {
    const value = logistics[key].trim()
    return value ? `${LOGISTICS_FIELD_LABELS[key]}: ${value}` : null
  }).filter(Boolean) as string[]

  if (logisticsLines.length === 0) {
    return plainNote || null
  }

  return [plainNote, LOGISTICS_MARKER, ...logisticsLines].filter(Boolean).join("\n")
}

function parseOperationalObservation(observation?: string | null) {
  if (!observation) {
    return { note: "", logistics: { ...EMPTY_LOGISTICS } }
  }

  if (!observation.includes(LOGISTICS_MARKER)) {
    return { note: observation.trim(), logistics: { ...EMPTY_LOGISTICS } }
  }

  const [notePart, logisticsPart] = observation.split(LOGISTICS_MARKER)
  const logistics = { ...EMPTY_LOGISTICS }

  logisticsPart
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const separatorIndex = line.indexOf(":")
      if (separatorIndex === -1) return

      const label = line.slice(0, separatorIndex).trim()
      const value = line.slice(separatorIndex + 1).trim()
      const key = (Object.entries(LOGISTICS_FIELD_LABELS).find(
        ([, currentLabel]) => currentLabel === label
      )?.[0] ?? null) as LogisticsFieldKey | null

      if (key) logistics[key] = value
    })

  return {
    note: notePart.trim(),
    logistics,
  }
}

function getCommitmentStatus(remito: Pick<Comprobante, "fechaVto" | "estado">) {
  if (!remito.fechaVto) return "Sin compromiso informado"

  const offset = getDaysOffset(remito.fechaVto)
  if (offset === null) return "Sin compromiso informado"
  if (remito.estado === "ANULADO") return "Compromiso sin efecto por anulación"
  if (offset < 0) return `Vencido hace ${Math.abs(offset)} días`
  if (offset === 0) return "Compromiso previsto para hoy"
  return `Compromiso en ${offset} días`
}

function getDeliveryDocumentStatus(remito: Pick<Comprobante, "estado" | "saldo">) {
  if (remito.estado === "ANULADO") return "Documento logístico anulado"
  if (remito.estado === "BORRADOR") return "Pendiente de emisión definitiva"
  if (remito.estado === "PAGADO") return "Circuito documental cerrado"
  if (remito.estado === "PAGADO_PARCIAL") return "Circuito documental con cierre parcial"
  if (remito.saldo > 0) return "Emitido con saldo operativo pendiente"
  return "Emitido y operativo"
}

function getPrimaryDeliveryBranch(customer?: Tercero | null) {
  if (!customer?.sucursalesEntrega?.length) return null
  return (
    customer.sucursalesEntrega.find((branch) => branch.principal) ?? customer.sucursalesEntrega[0]
  )
}

function formatDeliveryBranch(branch?: TerceroSucursalEntrega | null) {
  if (!branch) return ""

  return [branch.descripcion, branch.direccion, branch.localidad].filter(Boolean).join(" · ")
}

function getCustomerTransportPreference(customer?: Tercero | null) {
  if (!customer?.transportes?.length) return null
  return customer.transportes.find((transport) => transport.principal) ?? customer.transportes[0]
}

function resolveTransportDisplay(
  transportPreference: TerceroTransporte | null,
  transportistas: Transportista[]
) {
  if (!transportPreference) return { transportista: "", patente: "" }

  const matchedTransportista = transportPreference.transportistaId
    ? transportistas.find((item) => item.id === transportPreference.transportistaId)
    : null

  return {
    transportista:
      matchedTransportista?.terceroRazonSocial ??
      transportPreference.transportistaNombre ??
      transportPreference.nombre ??
      "",
    patente: matchedTransportista?.patente ?? "",
  }
}

function buildLineItem(item: Item): DeliveryFormItem {
  return {
    id: `line-${item.id}-${Date.now()}`,
    itemId: item.id,
    descripcion: item.descripcion,
    cantidad: 1,
    precioUnitario: item.precioVenta,
    descuento: 0,
    alicuotaIvaId: item.alicuotaIvaId,
    alicuotaIvaPct: item.alicuotaIvaPorcentaje ?? 21,
    stockDisponible: item.stock ?? null,
  }
}

function createDeliveryNoteFormState(
  defaultSucursalId: number | undefined,
  tipoComprobanteId: number | null
): EmitirComprobanteDto {
  return {
    sucursalId: defaultSucursalId ?? 0,
    terceroId: 0,
    tipoComprobanteId: tipoComprobanteId ?? 0,
    fecha: new Date().toISOString().slice(0, 10),
    fechaVto: null,
    observacion: null,
    items: [],
  }
}

function MetricCard({
  title,
  value,
  description,
}: {
  title: string
  value: string | number
  description: string
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

function DetailFieldGrid({ fields }: { fields: Array<{ label: string; value: string }> }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {fields.map((field) => (
        <div key={field.label} className="rounded-xl border bg-muted/30 p-3">
          <span className="mb-1 block text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {field.label}
          </span>
          <p className="text-sm font-medium wrap-break-word">{field.value}</p>
        </div>
      ))}
    </div>
  )
}

interface DeliveryNoteFormProps {
  initialTypeId: number | null
  remitoTypes: TipoComprobante[]
  onClose: () => void
  onSaved: () => void
  emitir: (dto: EmitirComprobanteDto) => Promise<boolean>
}

function DeliveryNoteForm({
  initialTypeId,
  remitoTypes,
  onClose,
  onSaved,
  emitir,
}: DeliveryNoteFormProps) {
  const defaultSucursalId = useDefaultSucursalId()
  const { sucursales } = useSucursales()
  const { terceros } = useTerceros()
  const { items, loading: loadingItems } = useItems()
  const { transportistas } = useTransportistas()
  const [tab, setTab] = useState("cabecera")
  const [form, setForm] = useState<EmitirComprobanteDto>(() =>
    createDeliveryNoteFormState(defaultSucursalId, initialTypeId)
  )
  const [logistics, setLogistics] = useState<LogisticsFields>({ ...EMPTY_LOGISTICS })
  const [internalNote, setInternalNote] = useState("")
  const [lineItems, setLineItems] = useState<DeliveryFormItem[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const effectiveSucursalId = form.sucursalId || defaultSucursalId || 0
  const effectiveTipoComprobanteId = form.tipoComprobanteId || initialTypeId || 0
  const { depositos } = useDepositos(effectiveSucursalId || undefined)

  const clientes = useMemo(() => terceros.filter((tercero) => tercero.esCliente), [terceros])

  const selectedCustomer = useMemo(
    () => clientes.find((cliente) => cliente.id === form.terceroId) ?? null,
    [clientes, form.terceroId]
  )
  const selectedType = useMemo(
    () => remitoTypes.find((tipo) => tipo.id === effectiveTipoComprobanteId) ?? null,
    [effectiveTipoComprobanteId, remitoTypes]
  )

  const totals = useMemo(() => {
    return lineItems.reduce(
      (acc, item) => {
        const subtotal = item.cantidad * item.precioUnitario * (1 - item.descuento / 100)
        const iva = subtotal * (item.alicuotaIvaPct / 100)
        return {
          subtotal: acc.subtotal + subtotal,
          iva: acc.iva + iva,
          total: acc.total + subtotal + iva,
          units: acc.units + item.cantidad,
        }
      },
      { subtotal: 0, iva: 0, total: 0, units: 0 }
    )
  }, [lineItems])

  const addItem = (itemId: string) => {
    if (itemId === "none") return

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

    setLineItems((prev) => [...prev, buildLineItem(item)])
  }

  const updateLineItem = (id: string, key: keyof DeliveryFormItem, value: number | string) => {
    setLineItems((prev) => prev.map((item) => (item.id === id ? { ...item, [key]: value } : item)))
  }

  const removeLineItem = (id: string) => {
    setLineItems((prev) => prev.filter((item) => item.id !== id))
  }

  const handleSave = async () => {
    if (
      !effectiveSucursalId ||
      !form.terceroId ||
      !effectiveTipoComprobanteId ||
      lineItems.length === 0
    ) {
      setError("Sucursal, cliente, tipo de remito e ítems son obligatorios")
      return
    }

    const payload: EmitirComprobanteDto = {
      ...form,
      sucursalId: effectiveSucursalId,
      tipoComprobanteId: effectiveTipoComprobanteId,
      fechaVto: form.fechaVto || null,
      observacion: buildOperationalObservation(internalNote, logistics),
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
    else setError("No se pudo emitir el remito")
  }

  return (
    <div className="space-y-5">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Depósito, punto de entrega, COT, hoja de ruta y recepción quedan visibles desde ahora.
          Mientras el backend no tenga campos propios para logística, se consolidan dentro de la
          observación operativa del remito en un formato estable y legible.
        </AlertDescription>
      </Alert>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid h-auto w-full grid-cols-4">
          <TabsTrigger value="cabecera" className="py-2 text-xs">
            Cabecera
          </TabsTrigger>
          <TabsTrigger value="logistica" className="py-2 text-xs">
            Logística
          </TabsTrigger>
          <TabsTrigger value="renglones" className="py-2 text-xs">
            Renglones
          </TabsTrigger>
          <TabsTrigger value="cierre" className="py-2 text-xs">
            Cierre
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cabecera" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Sucursal emisora</Label>
              <Select
                value={effectiveSucursalId ? String(effectiveSucursalId) : "none"}
                onValueChange={(value) => {
                  if (value === "none") return
                  setForm((prev) => ({ ...prev, sucursalId: Number(value) }))
                  setLogistics((prev) => ({ ...prev, deposito: "" }))
                }}
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
              <Label>Tipo de remito</Label>
              <Select
                value={effectiveTipoComprobanteId ? String(effectiveTipoComprobanteId) : "none"}
                onValueChange={(value) => {
                  if (value === "none") return
                  setForm((prev) => ({ ...prev, tipoComprobanteId: Number(value) }))
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {remitoTypes.map((tipo) => (
                    <SelectItem key={tipo.id} value={String(tipo.id)}>
                      {tipo.codigo} · {tipo.descripcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Fecha emisión</Label>
              <Input
                type="date"
                value={form.fecha}
                onChange={(event) => setForm((prev) => ({ ...prev, fecha: event.target.value }))}
              />
            </div>

            <div className="space-y-1.5 xl:col-span-2">
              <Label>Cliente</Label>
              <Select
                value={form.terceroId ? String(form.terceroId) : "none"}
                onValueChange={(value) => {
                  if (value === "none") return
                  const customer = clientes.find((cliente) => cliente.id === Number(value)) ?? null
                  const branch = getPrimaryDeliveryBranch(customer)
                  const transportPreference = getCustomerTransportPreference(customer)
                  const transportResolution = resolveTransportDisplay(
                    transportPreference,
                    transportistas
                  )
                  const mainContact = customer?.contactos?.find((contact) => contact.principal)

                  setForm((prev) => ({ ...prev, terceroId: Number(value) }))
                  setLogistics((prev) => ({
                    ...prev,
                    puntoEntrega: prev.puntoEntrega || formatDeliveryBranch(branch),
                    contactoRecepcion:
                      prev.contactoRecepcion ||
                      [mainContact?.nombre, mainContact?.telefono || mainContact?.email]
                        .filter(Boolean)
                        .join(" · "),
                    transportista: prev.transportista || transportResolution.transportista,
                    patente: prev.patente || transportResolution.patente,
                  }))
                }}
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
              <Label>Fecha compromiso</Label>
              <Input
                type="date"
                value={form.fechaVto ?? ""}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, fechaVto: event.target.value || null }))
                }
              />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ficha comercial y fiscal</CardTitle>
                <CardDescription>
                  Se usa el maestro real del cliente para anticipar el circuito de entrega.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DetailFieldGrid
                  fields={[
                    {
                      label: "Razón social",
                      value: selectedCustomer?.razonSocial ?? "Sin seleccionar",
                    },
                    {
                      label: "Condición IVA",
                      value: selectedCustomer?.condicionIvaDescripcion ?? "Sin dato",
                    },
                    {
                      label: "Domicilio fiscal",
                      value: formatCustomerAddress(selectedCustomer),
                    },
                    {
                      label: "Entrega principal",
                      value:
                        formatDeliveryBranch(getPrimaryDeliveryBranch(selectedCustomer)) ||
                        "Sin sucursal de entrega cargada",
                    },
                    {
                      label: "Canales",
                      value:
                        [
                          selectedCustomer?.telefono,
                          selectedCustomer?.celular,
                          selectedCustomer?.email,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "Sin contacto visible",
                    },
                    {
                      label: "Observación comercial",
                      value:
                        selectedCustomer?.perfilComercial?.observacionComercial ??
                        selectedCustomer?.observacion ??
                        "Sin observaciones",
                    },
                  ]}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Lectura rápida</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="rounded-xl border p-3">
                  <p className="font-medium">Documento</p>
                  <p className="text-muted-foreground">
                    {selectedType
                      ? `${selectedType.codigo} · ${selectedType.descripcion}`
                      : "Elegí un tipo de remito"}
                  </p>
                </div>
                <div className="rounded-xl border p-3">
                  <p className="font-medium">Compromiso</p>
                  <p className="text-muted-foreground">
                    {form.fechaVto
                      ? `Entrega prevista para ${formatDate(form.fechaVto)}`
                      : "Sin fecha compromiso todavía"}
                  </p>
                </div>
                <div className="rounded-xl border p-3">
                  <p className="font-medium">Capas visibles</p>
                  <p className="text-muted-foreground">
                    Cabecera comercial, salida logística, renglones y estructura para COT del
                    circuito heredado.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="logistica" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Depósito</Label>
              <Select
                value={logistics.deposito || "none"}
                onValueChange={(value) =>
                  setLogistics((prev) => ({ ...prev, deposito: value === "none" ? "" : value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar depósito" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin depósito específico</SelectItem>
                  {depositos.map((deposito) => (
                    <SelectItem key={deposito.id} value={deposito.descripcion}>
                      {deposito.descripcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 xl:col-span-2">
              <Label>Punto de entrega</Label>
              <Input
                value={logistics.puntoEntrega}
                onChange={(event) =>
                  setLogistics((prev) => ({ ...prev, puntoEntrega: event.target.value }))
                }
                placeholder="Sucursal del cliente, obra, depósito o dirección de despacho"
              />
            </div>

            <div className="space-y-1.5 xl:col-span-2">
              <Label>Transportista</Label>
              <Select
                value={logistics.transportista || "none"}
                onValueChange={(value) => {
                  if (value === "none") {
                    setLogistics((prev) => ({ ...prev, transportista: "", patente: "" }))
                    return
                  }

                  const matched = transportistas.find(
                    (transportista) =>
                      (transportista.terceroRazonSocial ?? `Transportista #${transportista.id}`) ===
                      value
                  )

                  setLogistics((prev) => ({
                    ...prev,
                    transportista: value,
                    patente: matched?.patente ?? prev.patente,
                  }))
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar transportista" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin transportista asignado</SelectItem>
                  {transportistas.map((transportista) => {
                    const label =
                      transportista.terceroRazonSocial ?? `Transportista #${transportista.id}`

                    return (
                      <SelectItem key={transportista.id} value={label}>
                        {label}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Patente</Label>
              <Input
                value={logistics.patente}
                onChange={(event) =>
                  setLogistics((prev) => ({ ...prev, patente: event.target.value.toUpperCase() }))
                }
                placeholder="AA000AA"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Nro. COT</Label>
              <Input
                value={logistics.cot}
                onChange={(event) => setLogistics((prev) => ({ ...prev, cot: event.target.value }))}
                placeholder="Código de operación de traslado"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Vigencia COT</Label>
              <Input
                type="date"
                value={logistics.cotVigencia}
                onChange={(event) =>
                  setLogistics((prev) => ({ ...prev, cotVigencia: event.target.value }))
                }
              />
            </div>

            <div className="space-y-1.5 xl:col-span-3">
              <Label>Descripción COT</Label>
              <Input
                value={logistics.descripcionCot}
                onChange={(event) =>
                  setLogistics((prev) => ({ ...prev, descripcionCot: event.target.value }))
                }
                placeholder="Detalle corto del motivo o alcance del traslado"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Legajo</Label>
              <Input
                value={logistics.legajo}
                onChange={(event) =>
                  setLogistics((prev) => ({ ...prev, legajo: event.target.value }))
                }
                placeholder="Legajo comercial o pedido"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Legajo sucursal</Label>
              <Input
                value={logistics.legajoSucursal}
                onChange={(event) =>
                  setLogistics((prev) => ({ ...prev, legajoSucursal: event.target.value }))
                }
                placeholder="Identificador interno de la sucursal"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Hoja de ruta</Label>
              <Input
                value={logistics.hojaRuta}
                onChange={(event) =>
                  setLogistics((prev) => ({ ...prev, hojaRuta: event.target.value }))
                }
                placeholder="Ruta, recorrido o reparto"
              />
            </div>

            <div className="space-y-1.5 xl:col-span-2">
              <Label>Contacto recepción</Label>
              <Input
                value={logistics.contactoRecepcion}
                onChange={(event) =>
                  setLogistics((prev) => ({ ...prev, contactoRecepcion: event.target.value }))
                }
                placeholder="Persona, teléfono o ventana horaria de recepción"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Bultos</Label>
              <Input
                value={logistics.bultos}
                onChange={(event) =>
                  setLogistics((prev) => ({ ...prev, bultos: event.target.value }))
                }
                placeholder="Cantidad de bultos o pallets"
              />
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notas de entrega</CardTitle>
              <CardDescription>
                Complementa el despacho con instrucciones operativas y condiciones puntuales de
                entrega.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={logistics.notasEntrega}
                onChange={(event) =>
                  setLogistics((prev) => ({ ...prev, notasEntrega: event.target.value }))
                }
                rows={4}
                placeholder="Acceso a planta, horario de descarga, conformidad, retiro parcial o notas de reparto"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="renglones" className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
            <div className="space-y-1.5">
              <Label>Agregar ítem</Label>
              <Select value="none" onValueChange={addItem}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar producto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Seleccionar producto</SelectItem>
                  {items.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      {item.codigo} · {item.descripcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-xl border bg-muted/20 p-3 text-sm text-muted-foreground">
              {loadingItems
                ? "Cargando catálogo de productos..."
                : `${items.length} productos disponibles para consolidar el remito en esta sesión.`}
            </div>
          </div>

          <ScrollArea className="w-full whitespace-nowrap rounded-xl border">
            <Table className="min-w-270">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[320px]">Descripción</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-right">Desc. %</TableHead>
                  <TableHead className="text-right">IVA %</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                      Agregá productos para preparar la salida logística.
                    </TableCell>
                  </TableRow>
                ) : (
                  lineItems.map((item) => {
                    const subtotal =
                      item.cantidad * item.precioUnitario * (1 - item.descuento / 100)

                    return (
                      <TableRow key={item.id}>
                        <TableCell className="max-w-[320px] whitespace-normal font-medium">
                          {item.descripcion}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.stockDisponible === null ? "-" : item.stockDisponible}
                        </TableCell>
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
                        <TableCell className="text-right">
                          {item.alicuotaIvaPct.toFixed(2)}%
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatMoney(subtotal)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeLineItem(item.id)}
                          >
                            <Ban className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="cierre" className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1.25fr_0.9fr]">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Observación interna</CardTitle>
                <CardDescription>
                  Texto libre para coordinación comercial, reparto o auditoría documental.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={internalNote}
                  onChange={(event) => setInternalNote(event.target.value)}
                  rows={7}
                  placeholder="Indicaciones complementarias para el equipo comercial, expedición o seguimiento posterior"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Resumen del remito</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Renglones</span>
                  <span>{lineItems.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Unidades</span>
                  <span>{totals.units}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatMoney(totals.subtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">IVA</span>
                  <span>{formatMoney(totals.iva)}</span>
                </div>
                <div className="flex items-center justify-between border-t pt-3 text-base font-semibold">
                  <span>Total</span>
                  <span>{formatMoney(totals.total)}</span>
                </div>
                <div className="rounded-xl border bg-muted/30 p-3 text-xs text-muted-foreground">
                  El detalle operativo se guardará como observación estructurada para que el remito
                  conserve COT, depósito, transportista y contexto de entrega desde hoy.
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
          {saving ? "Emitiendo..." : "Emitir remito"}
        </Button>
      </div>
    </div>
  )
}

function DeliveryNoteDetail({
  remito,
  customer,
  customerName,
  typeName,
  sucursalName,
}: {
  remito: ComprobanteDetalle
  customer?: Tercero | null
  customerName: string
  typeName: string
  sucursalName: string
}) {
  const parsedObservation = useMemo(
    () => parseOperationalObservation(remito.observacion),
    [remito.observacion]
  )
  const primaryDeliveryBranch = getPrimaryDeliveryBranch(customer)
  const units = remito.items.reduce((total, item) => total + item.cantidad, 0)

  const headerFields = [
    { label: "Comprobante", value: remito.nroComprobante ?? `#${remito.id}` },
    { label: "Tipo", value: typeName },
    { label: "Sucursal", value: sucursalName },
    { label: "Fecha", value: formatDate(remito.fecha) },
    { label: "Fecha compromiso", value: formatDate(remito.fechaVto) },
    { label: "Estado", value: STATUS_CONFIG[remito.estado]?.label ?? remito.estado },
    { label: "Cliente", value: customerName },
    { label: "Creado", value: formatDateTime(remito.createdAt) },
    { label: "Circuito", value: getDeliveryDocumentStatus(remito) },
  ]

  const customerFields = [
    { label: "Razón social", value: customerName },
    { label: "Nombre fantasía", value: customer?.nombreFantasia ?? "-" },
    { label: "CUIT / Documento", value: customer?.nroDocumento ?? "-" },
    { label: "Condición IVA", value: customer?.condicionIvaDescripcion ?? "-" },
    { label: "Domicilio fiscal", value: formatCustomerAddress(customer) },
    {
      label: "Sucursal de entrega preferida",
      value: formatDeliveryBranch(primaryDeliveryBranch) || "Sin sucursal de entrega visible",
    },
  ]

  const logisticsFields = [
    { label: "Depósito", value: parsedObservation.logistics.deposito || "Sin dato" },
    {
      label: "Punto de entrega",
      value: parsedObservation.logistics.puntoEntrega || "Sin dato",
    },
    {
      label: "Transportista",
      value: parsedObservation.logistics.transportista || "Sin dato",
    },
    { label: "Patente", value: parsedObservation.logistics.patente || "Sin dato" },
    { label: "Nro. COT", value: parsedObservation.logistics.cot || "Sin dato" },
    {
      label: "Vigencia COT",
      value: parsedObservation.logistics.cotVigencia
        ? formatDate(parsedObservation.logistics.cotVigencia)
        : "Sin dato",
    },
    {
      label: "Descripción COT",
      value: parsedObservation.logistics.descripcionCot || "Sin dato",
    },
    { label: "Legajo", value: parsedObservation.logistics.legajo || "Sin dato" },
    {
      label: "Legajo sucursal",
      value: parsedObservation.logistics.legajoSucursal || "Sin dato",
    },
    { label: "Hoja de ruta", value: parsedObservation.logistics.hojaRuta || "Sin dato" },
    {
      label: "Contacto recepción",
      value: parsedObservation.logistics.contactoRecepcion || "Sin dato",
    },
    { label: "Bultos", value: parsedObservation.logistics.bultos || "Sin dato" },
  ]

  const totalsFields = [
    { label: "Unidades", value: String(units) },
    { label: "Neto gravado", value: formatMoney(remito.netoGravado) },
    { label: "Neto no gravado", value: formatMoney(remito.netoNoGravado) },
    { label: "IVA RI", value: formatMoney(remito.ivaRi) },
    { label: "IVA RNI", value: formatMoney(remito.ivaRni) },
    { label: "Saldo", value: formatMoney(remito.saldo) },
    { label: "Total", value: formatMoney(remito.total) },
    { label: "Compromiso", value: getCommitmentStatus(remito) },
    {
      label: "Observación libre",
      value: parsedObservation.note || "Sin observación libre cargada",
    },
  ]

  return (
    <Tabs defaultValue="cabecera" className="w-full">
      <TabsList className="grid h-auto w-full grid-cols-4">
        <TabsTrigger value="cabecera">Cabecera</TabsTrigger>
        <TabsTrigger value="renglones">Renglones</TabsTrigger>
        <TabsTrigger value="logistica">Logística</TabsTrigger>
        <TabsTrigger value="totales">Totales</TabsTrigger>
      </TabsList>

      <TabsContent value="cabecera" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4" /> Cabecera documental
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DetailFieldGrid fields={headerFields} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Landmark className="h-4 w-4" /> Cliente y entrega
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DetailFieldGrid fields={customerFields} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="renglones" className="space-y-4">
        <ScrollArea className="w-full whitespace-nowrap rounded-xl border">
          <Table className="min-w-230">
            <TableHeader>
              <TableRow>
                <TableHead className="w-90">Descripción</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Precio unitario</TableHead>
                <TableHead className="text-right">Desc. %</TableHead>
                <TableHead className="text-right">IVA %</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {remito.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    Este remito no devolvió renglones desde el backend.
                  </TableCell>
                </TableRow>
              ) : (
                remito.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="max-w-90 whitespace-normal font-medium">
                      {item.descripcion}
                    </TableCell>
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
        </ScrollArea>
      </TabsContent>

      <TabsContent value="logistica" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4" /> Seguimiento logístico
            </CardTitle>
            <CardDescription>
              Expone la lectura logística capturada en la observación estructurada del documento.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DetailFieldGrid fields={logisticsFields} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Truck className="h-4 w-4" /> Notas de despacho
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
              {parsedObservation.logistics.notasEntrega ||
                "Sin notas adicionales sobre recepción, descarga o coordinación de ruta."}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="totales" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-4 w-4" /> Totales y control
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DetailFieldGrid fields={totalsFields} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

export default function RemitosPage() {
  const {
    comprobantes,
    loading,
    error,
    totalPages,
    page,
    setPage,
    emitir,
    anular,
    getById,
    refetch,
  } = useComprobantes({ esVenta: true })
  const { tipos } = useComprobantesConfig()
  const { sucursales } = useSucursales()
  const { terceros } = useTerceros()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("todos")
  const [typeFilter, setTypeFilter] = useState("todos")
  const [sucursalFilter, setSucursalFilter] = useState("todos")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedRemitoId, setSelectedRemitoId] = useState<number | null>(null)
  const [detailRemito, setDetailRemito] = useState<ComprobanteDetalle | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const clientes = useMemo(() => terceros.filter((tercero) => tercero.esCliente), [terceros])
  const remitoTypes = useMemo(
    () => tipos.filter((tipo) => tipo.esVenta && tipo.afectaStock),
    [tipos]
  )
  const validTypeIds = useMemo(() => new Set(remitoTypes.map((tipo) => tipo.id)), [remitoTypes])
  const visibleRemitos = useMemo(
    () => comprobantes.filter((comprobante) => validTypeIds.has(comprobante.tipoComprobanteId)),
    [comprobantes, validTypeIds]
  )
  const logisticsByRemito = useMemo(
    () =>
      new Map(
        visibleRemitos.map((remito) => [remito.id, parseOperationalObservation(remito.observacion)])
      ),
    [visibleRemitos]
  )
  const defaultRemitoTypeId = remitoTypes[0]?.id ?? null

  const getCustomer = useCallback(
    (terceroId: number) => clientes.find((cliente) => cliente.id === terceroId) ?? null,
    [clientes]
  )
  const getCustomerName = useCallback(
    (terceroId: number) => getCustomer(terceroId)?.razonSocial ?? `#${terceroId}`,
    [getCustomer]
  )
  const getTypeName = useCallback(
    (tipoId: number, fallback?: string) =>
      remitoTypes.find((tipo) => tipo.id === tipoId)?.descripcion ?? fallback ?? `#${tipoId}`,
    [remitoTypes]
  )
  const getSucursalName = useCallback(
    (sucursalId: number) =>
      sucursales.find((sucursal) => sucursal.id === sucursalId)?.descripcion ?? `#${sucursalId}`,
    [sucursales]
  )

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase().trim()

    return visibleRemitos.filter((remito) => {
      const customer = getCustomer(remito.terceroId)
      const customerName = customer?.razonSocial.toLowerCase() ?? `#${remito.terceroId}`
      const typeName = getTypeName(
        remito.tipoComprobanteId,
        remito.tipoComprobanteDescripcion
      ).toLowerCase()
      const logistics = logisticsByRemito.get(remito.id)?.logistics ?? EMPTY_LOGISTICS
      const searchableFields = [
        remito.nroComprobante ?? String(remito.id),
        customerName,
        typeName,
        logistics.deposito,
        logistics.transportista,
        logistics.cot,
        logistics.legajo,
        logistics.legajoSucursal,
      ]
        .join(" ")
        .toLowerCase()

      const matchesSearch = term === "" || searchableFields.includes(term)
      const matchesStatus = statusFilter === "todos" || remito.estado === statusFilter
      const matchesType = typeFilter === "todos" || String(remito.tipoComprobanteId) === typeFilter
      const matchesSucursal =
        sucursalFilter === "todos" || String(remito.sucursalId) === sucursalFilter

      return matchesSearch && matchesStatus && matchesType && matchesSucursal
    })
  }, [
    getCustomer,
    getTypeName,
    logisticsByRemito,
    searchTerm,
    statusFilter,
    sucursalFilter,
    typeFilter,
    visibleRemitos,
  ])

  const overdueCount = useMemo(
    () =>
      filtered.filter((remito) => {
        const offset = getDaysOffset(remito.fechaVto)
        return offset !== null && offset < 0 && remito.estado !== "ANULADO"
      }).length,
    [filtered]
  )
  const cotCount = useMemo(
    () =>
      filtered.filter((remito) => Boolean(logisticsByRemito.get(remito.id)?.logistics.cot)).length,
    [filtered, logisticsByRemito]
  )
  const activeCount = useMemo(
    () => filtered.filter((remito) => remito.estado !== "ANULADO").length,
    [filtered]
  )
  const saldoPendienteTotal = useMemo(
    () => filtered.reduce((total, remito) => total + remito.saldo, 0),
    [filtered]
  )

  const selectedRemito = useMemo(
    () => visibleRemitos.find((remito) => remito.id === selectedRemitoId) ?? null,
    [selectedRemitoId, visibleRemitos]
  )
  const highlightedRemito =
    selectedRemito && filtered.some((remito) => remito.id === selectedRemito.id)
      ? selectedRemito
      : (filtered[0] ?? null)
  const highlightedCustomer = highlightedRemito ? getCustomer(highlightedRemito.terceroId) : null
  const highlightedTypeName = highlightedRemito
    ? getTypeName(highlightedRemito.tipoComprobanteId, highlightedRemito.tipoComprobanteDescripcion)
    : "-"
  const highlightedLogistics = highlightedRemito
    ? (logisticsByRemito.get(highlightedRemito.id)?.logistics ?? EMPTY_LOGISTICS)
    : EMPTY_LOGISTICS

  const loadDetail = async (remito: Comprobante) => {
    setSelectedRemitoId(remito.id)
    setIsDetailOpen(true)
    setLoadingDetail(true)
    const detail = await getById(remito.id)
    setDetailRemito(detail)
    setLoadingDetail(false)
  }

  const handleSaved = async () => {
    setIsFormOpen(false)
    await refetch()
  }

  const handleAnnul = async (remito: Comprobante) => {
    if (!window.confirm(`¿Anular el remito ${remito.nroComprobante ?? remito.id}?`)) return

    await anular(remito.id, true)
    await refetch()

    if (selectedRemitoId === remito.id) {
      const detail = await getById(remito.id)
      setDetailRemito(detail)
    }
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Remitos de venta</h1>
          <p className="text-muted-foreground">
            Consola operativa para emisión, seguimiento documental y lectura logística del remito.
            Ordena depósito, COT, legajos, hoja de ruta y recepción sin salir del contrato actual
            del backend.
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)} disabled={!defaultRemitoTypeId}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo remito
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Remitos visibles"
          value={filtered.length}
          description={`${activeCount} siguen activos dentro de los filtros actuales.`}
        />
        <MetricCard
          title="Con COT cargado"
          value={cotCount}
          description="Hace visible el control operativo de COT dentro de la misma consola."
        />
        <MetricCard
          title="Compromisos vencidos"
          value={overdueCount}
          description="Ayuda a detectar entregas atrasadas sin abrir cada documento."
        />
        <MetricCard
          title="Saldo operativo"
          value={formatMoney(saldoPendienteTotal)}
          description="Monto pendiente del conjunto filtrado para control documental."
        />
      </div>

      {highlightedRemito ? (
        <Card className="overflow-hidden border-none bg-linear-to-br from-slate-950 via-slate-900 to-slate-800 text-slate-50 shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl">Panel destacado del remito</CardTitle>
            <CardDescription className="text-slate-300">
              {(highlightedRemito.nroComprobante ?? `#${highlightedRemito.id}`) +
                " · " +
                (highlightedCustomer?.razonSocial ?? `Cliente #${highlightedRemito.terceroId}`)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={
                  (STATUS_CONFIG[highlightedRemito.estado]?.variant ?? "outline") as
                    | "default"
                    | "secondary"
                    | "outline"
                    | "destructive"
                }
                className="border-white/20 bg-white/10 text-slate-50"
              >
                {STATUS_CONFIG[highlightedRemito.estado]?.label ?? highlightedRemito.estado}
              </Badge>
              <Badge variant="outline" className="border-white/20 text-slate-100">
                {highlightedTypeName}
              </Badge>
              <Badge variant="outline" className="border-white/20 text-slate-100">
                {getCommitmentStatus(highlightedRemito)}
              </Badge>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.35fr_0.95fr]">
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  { label: "Cliente", value: highlightedCustomer?.razonSocial ?? "Sin cliente" },
                  { label: "Sucursal", value: getSucursalName(highlightedRemito.sucursalId) },
                  {
                    label: "Depósito",
                    value: highlightedLogistics.deposito || "Sin depósito operativo cargado",
                  },
                  {
                    label: "Punto entrega",
                    value: highlightedLogistics.puntoEntrega || "Sin punto de entrega cargado",
                  },
                  {
                    label: "Transportista",
                    value: highlightedLogistics.transportista || "Sin transportista asignado",
                  },
                  { label: "COT", value: highlightedLogistics.cot || "Sin COT informado" },
                ].map((field) => (
                  <div
                    key={field.label}
                    className="rounded-xl border border-white/10 bg-white/5 p-4"
                  >
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                      {field.label}
                    </p>
                    <p className="mt-2 text-sm font-medium wrap-break-word text-slate-100">
                      {field.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 text-sm">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-slate-200">
                  Estado documental: {getDeliveryDocumentStatus(highlightedRemito)}.
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-slate-200">
                  Fecha compromiso: {formatDate(highlightedRemito.fechaVto)}. Saldo:{" "}
                  {formatMoney(highlightedRemito.saldo)}.
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-slate-200">
                  Domicilio fiscal: {formatCustomerAddress(highlightedCustomer)}.
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-slate-200">
                  Observación libre:{" "}
                  {logisticsByRemito.get(highlightedRemito.id)?.note || "Sin texto complementario"}.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Filtros operativos</CardTitle>
          <CardDescription>
            Combinan búsqueda documental, sucursal y tipo con lectura logística del remito.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 xl:grid-cols-[1fr_220px_220px_220px_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-10"
                placeholder="Buscar por remito, cliente, COT, depósito, legajo o transportista..."
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
                {remitoTypes.map((tipo) => (
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
                <SelectItem value="BORRADOR">Borrador</SelectItem>
                <SelectItem value="EMITIDO">Emitido</SelectItem>
                <SelectItem value="PAGADO_PARCIAL">Cierre parcial</SelectItem>
                <SelectItem value="PAGADO">Cerrado</SelectItem>
                <SelectItem value="ANULADO">Anulado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sucursalFilter} onValueChange={setSucursalFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Sucursal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas las sucursales</SelectItem>
                {sucursales.map((sucursal) => (
                  <SelectItem key={sucursal.id} value={String(sucursal.id)}>
                    {sucursal.descripcion}
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

      <Card>
        <CardHeader>
          <CardTitle>Remitos documentados ({filtered.length})</CardTitle>
          <CardDescription>
            Lista unificada con foco en cabecera, datos de entrega y trazabilidad del despacho.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="w-full whitespace-nowrap">
            <Table className="min-w-7xl">
              <TableHeader>
                <TableRow>
                  <TableHead>Comprobante</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Sucursal</TableHead>
                  <TableHead>Depósito</TableHead>
                  <TableHead>Transportista</TableHead>
                  <TableHead>COT</TableHead>
                  <TableHead>Compromiso</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-12 text-center text-muted-foreground">
                      <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin" />
                      Cargando remitos...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-12 text-center text-muted-foreground">
                      <Truck className="mx-auto mb-2 h-8 w-8 opacity-40" />
                      No se encontraron remitos con los filtros actuales.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((remito) => {
                    const status = STATUS_CONFIG[remito.estado] ?? {
                      label: remito.estado,
                      variant: "outline" as const,
                    }
                    const logistics = logisticsByRemito.get(remito.id)?.logistics ?? EMPTY_LOGISTICS

                    return (
                      <TableRow
                        key={remito.id}
                        className="cursor-pointer hover:bg-muted/40"
                        onClick={() => loadDetail(remito)}
                      >
                        <TableCell className="font-mono font-semibold">
                          {remito.nroComprobante ?? `#${remito.id}`}
                        </TableCell>
                        <TableCell className="max-w-55 whitespace-normal font-medium">
                          {getCustomerName(remito.terceroId)}
                        </TableCell>
                        <TableCell>{getSucursalName(remito.sucursalId)}</TableCell>
                        <TableCell className="max-w-45 whitespace-normal">
                          {logistics.deposito || "-"}
                        </TableCell>
                        <TableCell className="max-w-55 whitespace-normal">
                          {logistics.transportista || "-"}
                        </TableCell>
                        <TableCell>{logistics.cot || "-"}</TableCell>
                        <TableCell>{formatDate(remito.fechaVto)}</TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatMoney(remito.total)}
                        </TableCell>
                        <TableCell
                          className="text-right"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => loadDetail(remito)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {remito.estado !== "ANULADO" ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleAnnul(remito)}
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
          </ScrollArea>
        </CardContent>
      </Card>

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

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Truck className="h-4 w-4" /> Emisión y salida
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            La pantalla prioriza emisión real del comprobante y deja visible el bloque operativo de
            depósito, reparto, legajo y control COT.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4" /> Entrega y recepción
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Usa sucursales de entrega y transportes del cliente cuando existen, para no empezar cada
            remito desde cero.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" /> Persistencia actual
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Hasta ampliar el backend, los campos logísticos extendidos se mantienen como observación
            estructurada. Eso evita perder contexto y no simula endpoints inexistentes.
          </CardContent>
        </Card>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-h-[92vh] max-w-6xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo remito</DialogTitle>
            <DialogDescription>
              Emisión real del comprobante con bloque logístico reforzado para despacho y
              seguimiento.
            </DialogDescription>
          </DialogHeader>
          <DeliveryNoteForm
            key={`${defaultRemitoTypeId ?? 0}-${isFormOpen ? "open" : "closed"}`}
            initialTypeId={defaultRemitoTypeId}
            remitoTypes={remitoTypes}
            onClose={() => setIsFormOpen(false)}
            onSaved={handleSaved}
            emitir={emitir}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={isDetailOpen}
        onOpenChange={(open) => {
          setIsDetailOpen(open)
          if (!open) {
            setSelectedRemitoId(null)
            setDetailRemito(null)
          }
        }}
      >
        <DialogContent className="max-h-[92vh] max-w-6xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedRemito?.nroComprobante ?? "Detalle de remito"}
            </DialogTitle>
            <DialogDescription>
              {selectedRemito ? getCustomerName(selectedRemito.terceroId) : "Cargando detalle..."}
            </DialogDescription>
          </DialogHeader>

          {loadingDetail ? (
            <div className="py-12 text-center text-muted-foreground">
              <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin" />
              Cargando detalle...
            </div>
          ) : detailRemito && selectedRemito ? (
            <DeliveryNoteDetail
              remito={detailRemito}
              customer={getCustomer(selectedRemito.terceroId)}
              customerName={getCustomerName(selectedRemito.terceroId)}
              typeName={getTypeName(
                selectedRemito.tipoComprobanteId,
                selectedRemito.tipoComprobanteDescripcion
              )}
              sucursalName={getSucursalName(selectedRemito.sucursalId)}
            />
          ) : (
            <p className="py-8 text-center text-muted-foreground">
              No se pudo cargar el detalle del remito.
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
            {selectedRemito && selectedRemito.estado !== "ANULADO" ? (
              <Button variant="destructive" onClick={() => handleAnnul(selectedRemito)}>
                <Ban className="mr-2 h-4 w-4" />
                Anular
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
