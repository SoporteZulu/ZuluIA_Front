"use client"

import { useCallback, useMemo, useState } from "react"
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Ban,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Landmark,
  Package,
  ReceiptText,
  RefreshCw,
  Search,
  ShieldAlert,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

function getDaysPastDue(value?: string | null) {
  if (!value) return null
  const dueDate = new Date(value)
  const today = new Date()
  dueDate.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  return Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
}

function normalizeText(value?: string | null) {
  return (value ?? "").toLowerCase()
}

function isCreditType(tipo: TipoComprobante) {
  const text = `${normalizeText(tipo.codigo)} ${normalizeText(tipo.descripcion)}`
  return text.includes("credito") || /(^|\W)nc($|\W)/.test(text)
}

function isDebitType(tipo: TipoComprobante) {
  const text = `${normalizeText(tipo.codigo)} ${normalizeText(tipo.descripcion)}`
  return text.includes("debito") || /(^|\W)nd($|\W)/.test(text)
}

function parseOperationalObservation(value?: string | null) {
  const parts = (value ?? "")
    .split(" | ")
    .map((part) => part.trim())
    .filter(Boolean)

  const motivo = parts.find((part) => part.startsWith("Motivo: "))?.replace("Motivo: ", "")
  const alcance = parts.find((part) => part.startsWith("Alcance: "))?.replace("Alcance: ", "")
  const referencia = parts
    .find((part) => part.startsWith("Comprobante referencia: "))
    ?.replace("Comprobante referencia: ", "")
  const detalle = parts.filter(
    (part) =>
      !part.startsWith("Motivo: ") &&
      !part.startsWith("Alcance: ") &&
      !part.startsWith("Comprobante referencia: ")
  )

  return {
    motivo: motivo || "No informado",
    alcance: alcance || "No informado",
    referencia: referencia || "Sin referencia explícita",
    detalle: detalle.length > 0 ? detalle.join(" | ") : "Sin detalle operativo",
  }
}

function getNoteDocumentStatus(note: ComprobanteDetalle) {
  if (note.estado === "ANULADO") return "Documento anulado"
  if (note.estado === "BORRADOR") return "Pendiente de emisión"
  if (note.estado === "PAGADO") return "Documento aplicado"
  if (note.estado === "PAGADO_PARCIAL") return "Aplicación parcial registrada"
  return "Documento emitido en circuito comercial"
}

function getApplicationStatus(note: ComprobanteDetalle) {
  if (note.estado === "ANULADO") return "Sin aplicación vigente"
  if (note.saldo <= 0 || note.estado === "PAGADO") return "Aplicada sin saldo pendiente"
  const daysPastDue = getDaysPastDue(note.fechaVto)
  if (daysPastDue !== null && daysPastDue > 0) {
    return `Saldo pendiente con ${daysPastDue} días de mora`
  }
  if (note.fechaVto) return `Saldo pendiente hasta ${formatDate(note.fechaVto)}`
  return "Saldo pendiente sin vencimiento informado"
}

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  BORRADOR: { label: "Borrador", variant: "secondary" },
  EMITIDO: { label: "Emitido", variant: "default" },
  PAGADO: { label: "Aplicado", variant: "outline" },
  PAGADO_PARCIAL: { label: "Aplicación parcial", variant: "outline" },
  ANULADO: { label: "Anulado", variant: "destructive" },
}

type NoteKind = "credito" | "debito"

interface VentasNotasPageProps {
  defaultKind?: NoteKind
  pageTitle?: string
  pageDescription?: string
}

type NoteFormItem = {
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
          <p className="text-sm font-medium wrap-break-word">{field.value}</p>
        </div>
      ))}
    </div>
  )
}

interface CreditDebitNoteFormProps {
  kind: NoteKind
  availableTypes: TipoComprobante[]
  referenceDocuments: Comprobante[]
  onClose: () => void
  onSaved: () => void
  emitir: (dto: EmitirComprobanteDto) => Promise<boolean>
}

function createCreditDebitFormState(
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

function CreditDebitNoteForm({
  kind,
  availableTypes,
  referenceDocuments,
  onClose,
  onSaved,
  emitir,
}: CreditDebitNoteFormProps) {
  const defaultSucursalId = useDefaultSucursalId()
  const { sucursales } = useSucursales()
  const { terceros: clientes } = useTerceros()
  const { items } = useItems()
  const [tab, setTab] = useState("principal")
  const [form, setForm] = useState<EmitirComprobanteDto>(() =>
    createCreditDebitFormState(defaultSucursalId, availableTypes)
  )
  const [lineItems, setLineItems] = useState<NoteFormItem[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [motivo, setMotivo] = useState(kind === "credito" ? "devolucion" : "recargo")
  const [alcance, setAlcance] = useState("parcial")
  const [comprobanteReferenciaId, setComprobanteReferenciaId] = useState<string>("none")
  const [detalleOperativo, setDetalleOperativo] = useState("")

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

  const updateLineItem = (id: string, key: keyof NoteFormItem, value: number | string) => {
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
      setError("Sucursal, cliente, tipo de nota e ítems son obligatorios")
      return
    }

    const reference = referenceDocuments.find(
      (current) => String(current.id) === comprobanteReferenciaId
    )
    const observationParts = [
      `Motivo: ${motivo}`,
      `Alcance: ${alcance}`,
      reference
        ? `Comprobante referencia: ${reference.nroComprobante ?? `#${reference.id}`}`
        : null,
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
    else setError(`No se pudo emitir la nota de ${kind}`)
  }

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid h-auto w-full grid-cols-4">
          <TabsTrigger value="principal" className="py-2 text-xs">
            Principal
          </TabsTrigger>
          <TabsTrigger value="items" className="py-2 text-xs">
            Items
          </TabsTrigger>
          <TabsTrigger value="totales" className="py-2 text-xs">
            Totales
          </TabsTrigger>
          <TabsTrigger value="legado" className="py-2 text-xs">
            Legado
          </TabsTrigger>
        </TabsList>

        <TabsContent value="principal" className="mt-4 space-y-4">
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
              <Label>Tipo de nota</Label>
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
              <Label>Fecha Vencimiento</Label>
              <Input
                type="date"
                value={form.fechaVto ?? ""}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, fechaVto: event.target.value || null }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Motivo</Label>
              <Select value={motivo} onValueChange={setMotivo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={kind === "credito" ? "devolucion" : "recargo"}>
                    {kind === "credito" ? "Devolución / Ajuste" : "Recargo / Diferencia"}
                  </SelectItem>
                  <SelectItem value="descuento">Descuento / Bonificación</SelectItem>
                  <SelectItem value="error">Corrección documental</SelectItem>
                  <SelectItem value="anulacion">Anulación parcial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Alcance</Label>
              <Select value={alcance} onValueChange={setAlcance}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="total">Total</SelectItem>
                  <SelectItem value="parcial">Parcial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Comprobante de referencia</Label>
              <Select value={comprobanteReferenciaId} onValueChange={setComprobanteReferenciaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar documento base" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin referencia explícita</SelectItem>
                  {referenceDocuments.map((document) => (
                    <SelectItem key={document.id} value={String(document.id)}>
                      {(document.nroComprobante ?? `#${document.id}`) +
                        " · " +
                        formatDate(document.fecha)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Detalle operativo</Label>
              <Textarea
                value={detalleOperativo}
                onChange={(event) => setDetalleOperativo(event.target.value)}
                rows={3}
                placeholder="Motivo comercial, devolución, diferencia o respaldo operativo"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Observación adicional</Label>
              <Textarea
                value={form.observacion ?? ""}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, observacion: event.target.value || null }))
                }
                rows={3}
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
                    Agregue items para emitir la nota.
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
                          updateLineItem(item.id, "descuento", parseFloat(event.target.value) || 0)
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">{item.alicuotaIvaPct.toFixed(2)}%</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => removeLineItem(item.id)}>
                        <Ban className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="totales" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Totales de la nota</CardTitle>
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
              El sistema legado contemplaba autorización, relación exacta contra factura origen,
              devolución por ítem, bonificación comercial y reimpresión fiscal. Esta etapa deja real
              la emisión documental y preserva el contexto operativo en observaciones hasta que el
              backend exponga la vinculación formal.
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
          {saving ? "Emitiendo..." : `Emitir nota de ${kind}`}
        </Button>
      </div>
    </div>
  )
}

function NoteDetail({
  note,
  customerName,
  customer,
  typeName,
  sucursalName,
}: {
  note: ComprobanteDetalle
  customerName: string
  customer?: Tercero | null
  typeName: string
  sucursalName: string
}) {
  const operationalContext = parseOperationalObservation(note.observacion)

  const mainFields = [
    { label: "Comprobante", value: note.nroComprobante ?? `#${note.id}` },
    { label: "Tipo", value: typeName },
    { label: "Cliente", value: customerName },
    { label: "Sucursal", value: sucursalName },
    { label: "Fecha", value: formatDate(note.fecha) },
    { label: "Vencimiento", value: formatDate(note.fechaVto) },
    { label: "Estado", value: STATUS_CONFIG[note.estado]?.label ?? note.estado },
    { label: "Observación", value: note.observacion ?? "-" },
  ]

  const totalsFields = [
    { label: "Neto Gravado", value: formatMoney(note.netoGravado) },
    { label: "Neto No Gravado", value: formatMoney(note.netoNoGravado) },
    { label: "IVA RI", value: formatMoney(note.ivaRi) },
    { label: "IVA RNI", value: formatMoney(note.ivaRni) },
    { label: "Saldo", value: formatMoney(note.saldo) },
    { label: "Total", value: formatMoney(note.total) },
  ]

  const circuitFields = [
    { label: "Estado documental", value: getNoteDocumentStatus(note) },
    { label: "Estado de aplicación", value: getApplicationStatus(note) },
    { label: "Motivo", value: operationalContext.motivo },
    { label: "Alcance", value: operationalContext.alcance },
    { label: "Referencia", value: operationalContext.referencia },
    { label: "Detalle operativo", value: operationalContext.detalle },
    {
      label: "Renglones informados",
      value: `${note.items.length} ítems`,
    },
    {
      label: "Importe actual",
      value:
        note.saldo > 0
          ? `${formatMoney(note.total)} con saldo ${formatMoney(note.saldo)}`
          : formatMoney(note.total),
    },
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
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="principal">Principal</TabsTrigger>
        <TabsTrigger value="items">Items</TabsTrigger>
        <TabsTrigger value="totales">Totales</TabsTrigger>
        <TabsTrigger value="circuito">Circuito</TabsTrigger>
        <TabsTrigger value="legado">Legado</TabsTrigger>
      </TabsList>

      <TabsContent value="principal" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ReceiptText className="h-4 w-4" /> Cabecera documental
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descripción</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead className="text-right">Precio Unitario</TableHead>
              <TableHead className="text-right">Descuento</TableHead>
              <TableHead className="text-right">IVA</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {note.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Este documento no devolvió detalle de ítems.
                </TableCell>
              </TableRow>
            ) : (
              note.items.map((item) => (
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
      </TabsContent>

      <TabsContent value="totales" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-4 w-4" /> Totales aplicados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DetailFieldGrid fields={totalsFields} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="circuito" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" /> Estado operativo
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
              <Landmark className="h-4 w-4" /> Pendientes del circuito clásico
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm text-muted-foreground md:grid-cols-2">
            <div className="rounded-lg border p-4">
              Esta etapa ya deja visible motivo, alcance, referencia operativa y saldo;
              autorización, relación exacta con factura original y control por renglón siguen
              reservados.
            </div>
            <div className="rounded-lg border p-4">
              Ajustes fiscales, motivo AFIP y reimpresión documental específica de notas quedan
              reservados para la siguiente fase.
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

export function VentasNotasPage({
  defaultKind = "credito",
  pageTitle = "Notas de Crédito / Débito",
  pageDescription = "Ajustes documentales sobre ventas con emisión real, detalle completo y preparación para la vinculación formal contra comprobantes origen.",
}: VentasNotasPageProps) {
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
  const { terceros: clientes } = useTerceros()
  const { sucursales } = useSucursales()
  const [activeKind, setActiveKind] = useState<NoteKind>(defaultKind)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("todos")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null)
  const [detailNote, setDetailNote] = useState<ComprobanteDetalle | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const creditTypes = useMemo(
    () => tipos.filter((tipo) => tipo.esVenta && isCreditType(tipo)),
    [tipos]
  )
  const debitTypes = useMemo(
    () => tipos.filter((tipo) => tipo.esVenta && isDebitType(tipo)),
    [tipos]
  )
  const noteTypeIds = useMemo(
    () => new Set([...creditTypes, ...debitTypes].map((tipo) => tipo.id)),
    [creditTypes, debitTypes]
  )
  const notes = useMemo(
    () => comprobantes.filter((item) => noteTypeIds.has(item.tipoComprobanteId)),
    [comprobantes, noteTypeIds]
  )
  const referenceDocuments = useMemo(
    () => comprobantes.filter((item) => !noteTypeIds.has(item.tipoComprobanteId)),
    [comprobantes, noteTypeIds]
  )
  const visibleNotes = useMemo(() => {
    const typeIds = new Set(
      (activeKind === "credito" ? creditTypes : debitTypes).map((tipo) => tipo.id)
    )
    return notes.filter((item) => typeIds.has(item.tipoComprobanteId))
  }, [activeKind, creditTypes, debitTypes, notes])

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return visibleNotes.filter((note) => {
      const customerName =
        clientes.find((cliente) => cliente.id === note.terceroId)?.razonSocial ??
        `#${note.terceroId}`
      const typeName =
        tipos.find((tipo) => tipo.id === note.tipoComprobanteId)?.descripcion ??
        note.tipoComprobanteDescripcion ??
        `#${note.tipoComprobanteId}`
      const matchesSearch =
        term === "" ||
        (note.nroComprobante ?? String(note.id)).toLowerCase().includes(term) ||
        customerName.toLowerCase().includes(term) ||
        typeName.toLowerCase().includes(term)
      const matchesStatus = statusFilter === "todos" || note.estado === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [visibleNotes, searchTerm, statusFilter, clientes, tipos])

  const kpis = useMemo(
    () => ({
      total: notes.length,
      creditos: notes.filter((item) =>
        creditTypes.some((tipo) => tipo.id === item.tipoComprobanteId)
      ).length,
      debitos: notes.filter((item) => debitTypes.some((tipo) => tipo.id === item.tipoComprobanteId))
        .length,
      pendientes: notes.filter((item) => item.estado === "BORRADOR").length,
      aplicadas: notes.filter((item) => item.estado === "PAGADO").length,
      conSaldo: notes.filter((item) => item.saldo > 0 && item.estado !== "ANULADO").length,
    }),
    [notes, creditTypes, debitTypes]
  )

  const activeTypes = activeKind === "credito" ? creditTypes : debitTypes

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

  const openDetail = async (note: Comprobante) => {
    setSelectedNoteId(note.id)
    setIsDetailOpen(true)
    setLoadingDetail(true)
    const detail = await getById(note.id)
    setDetailNote(detail)
    setLoadingDetail(false)
  }

  const handleSaved = async () => {
    setIsFormOpen(false)
    await refetch()
  }

  const handleAnnul = async (note: Comprobante) => {
    if (!window.confirm(`¿Anular la nota ${note.nroComprobante ?? note.id}?`)) return
    await anular(note.id, true)
    await refetch()
    if (selectedNoteId === note.id) {
      const detail = await getById(note.id)
      setDetailNote(detail)
    }
  }

  const selectedNote = useMemo(
    () => comprobantes.find((note) => note.id === selectedNoteId) ?? null,
    [comprobantes, selectedNoteId]
  )

  const highlightedNote =
    selectedNote && filtered.some((note) => note.id === selectedNote.id)
      ? selectedNote
      : (filtered[0] ?? null)
  const highlightedCustomer = highlightedNote ? getCustomer(highlightedNote.terceroId) : null
  const highlightedContext = highlightedNote
    ? parseOperationalObservation(highlightedNote.observacion)
    : null
  const highlightedFields = highlightedNote
    ? [
        {
          label: "Cliente",
          value: highlightedCustomer?.razonSocial ?? `#${highlightedNote.terceroId}`,
        },
        {
          label: "Tipo",
          value: getTypeName(
            highlightedNote.tipoComprobanteId,
            highlightedNote.tipoComprobanteDescripcion
          ),
        },
        { label: "Vencimiento", value: formatDate(highlightedNote.fechaVto) },
        { label: "Total", value: formatMoney(highlightedNote.total) },
        { label: "Aplicación", value: getApplicationStatus(highlightedNote as ComprobanteDetalle) },
        {
          label: "Referencia",
          value: highlightedContext?.referencia ?? "Sin referencia explícita",
        },
      ]
    : []

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{pageTitle}</h1>
          <p className="text-muted-foreground">{pageDescription}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="bg-transparent"
            onClick={() => {
              setActiveKind("debito")
              setIsFormOpen(true)
            }}
            disabled={debitTypes.length === 0}
          >
            <ArrowUpRight className="mr-2 h-4 w-4" />
            Nueva Nota de Débito
          </Button>
          <Button
            onClick={() => {
              setActiveKind("credito")
              setIsFormOpen(true)
            }}
            disabled={creditTypes.length === 0}
          >
            <ArrowDownLeft className="mr-2 h-4 w-4" />
            Nueva Nota de Crédito
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {(creditTypes.length === 0 || debitTypes.length === 0) && (
        <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>
            La metadata actual no expone todos los tipos esperados para notas. La pantalla usa solo
            los tipos detectados desde el backend y deja el resto pendiente de configuración.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Crédito</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{kpis.creditos}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Débito</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{kpis.debitos}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Borrador</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-600">{kpis.pendientes}</div>
          </CardContent>
        </Card>
      </div>

      {highlightedNote ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardDescription>Documento destacado</CardDescription>
              <CardTitle className="mt-1 text-xl">
                {highlightedNote.nroComprobante ?? `#${highlightedNote.id}`} ·{" "}
                {highlightedCustomer?.razonSocial ?? `Cliente #${highlightedNote.terceroId}`}
              </CardTitle>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                {highlightedContext?.detalle ?? "Sin detalle operativo registrado."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={
                  (STATUS_CONFIG[highlightedNote.estado]?.variant ?? "outline") as
                    | "default"
                    | "secondary"
                    | "outline"
                    | "destructive"
                }
              >
                {STATUS_CONFIG[highlightedNote.estado]?.label ?? highlightedNote.estado}
              </Badge>
              <Badge variant="outline">{highlightedContext?.motivo ?? "Sin motivo"}</Badge>
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
          <div className="grid gap-4 md:grid-cols-[1fr_240px_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-10"
                placeholder="Buscar por comprobante, cliente o tipo..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="BORRADOR">Borrador</SelectItem>
                <SelectItem value="EMITIDO">Emitido</SelectItem>
                <SelectItem value="PAGADO">Aplicado</SelectItem>
                <SelectItem value="PAGADO_PARCIAL">Aplicación parcial</SelectItem>
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

      <Tabs value={activeKind} onValueChange={(value) => setActiveKind(value as NoteKind)}>
        <TabsList>
          <TabsTrigger value="credito">Notas de Crédito ({kpis.creditos})</TabsTrigger>
          <TabsTrigger value="debito">Notas de Débito ({kpis.debitos})</TabsTrigger>
        </TabsList>
        <TabsContent value="credito" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>
                Documentos de crédito ({activeKind === "credito" ? filtered.length : kpis.creditos})
              </CardTitle>
              <CardDescription>
                Ajustes por devolución, bonificación o corrección comercial registrados con tipos
                documentales reales del backend.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <NoteTable
                notes={activeKind === "credito" ? filtered : []}
                loading={loading}
                onOpen={openDetail}
                onAnnul={handleAnnul}
                getCustomerName={getCustomerName}
                getTypeName={getTypeName}
                getApplicationStatus={(note) => getApplicationStatus(note as ComprobanteDetalle)}
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="debito" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>
                Documentos de débito ({activeKind === "debito" ? filtered.length : kpis.debitos})
              </CardTitle>
              <CardDescription>
                Recargos, diferencias y reimputaciones documentadas sobre el circuito comercial.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <NoteTable
                notes={activeKind === "debito" ? filtered : []}
                loading={loading}
                onOpen={openDetail}
                onAnnul={handleAnnul}
                getCustomerName={getCustomerName}
                getTypeName={getTypeName}
                getApplicationStatus={(note) => getApplicationStatus(note as ComprobanteDetalle)}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ReceiptText className="h-4 w-4" /> Emisión documental
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {kpis.total} notas detectadas en el motor documental actual, con {kpis.creditos} de
            crédito y {kpis.debitos} de débito.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" /> Contexto legado
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Motivo, alcance y referencia ya se leen desde la observación operativa; {kpis.conSaldo}{" "}
            documentos conservan saldo pendiente visible en pantalla.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Landmark className="h-4 w-4" /> Próxima fase
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {kpis.aplicadas} ya figuran como aplicadas; sigue pendiente la aplicación exacta contra
            factura origen, devoluciones por renglón y motivo fiscal específico.
          </CardContent>
        </Card>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {activeKind === "credito" ? "Nueva Nota de Crédito" : "Nueva Nota de Débito"}
            </DialogTitle>
            <DialogDescription>
              Emisión real usando los tipos detectados actualmente en el backend para documentos de
              ajuste comercial.
            </DialogDescription>
          </DialogHeader>
          <CreditDebitNoteForm
            key={`${activeKind}-${activeTypes[0]?.id ?? 0}-${isFormOpen ? "open" : "closed"}`}
            kind={activeKind}
            availableTypes={activeTypes}
            referenceDocuments={referenceDocuments}
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
            setSelectedNoteId(null)
            setDetailNote(null)
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedNote?.nroComprobante ?? "Detalle del documento"}
            </DialogTitle>
            <DialogDescription>
              {selectedNote ? getCustomerName(selectedNote.terceroId) : "Cargando..."}
            </DialogDescription>
          </DialogHeader>

          {loadingDetail ? (
            <div className="py-12 text-center text-muted-foreground">
              <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin" />
              Cargando detalle...
            </div>
          ) : detailNote && selectedNote ? (
            <NoteDetail
              note={detailNote}
              customerName={getCustomerName(selectedNote.terceroId)}
              customer={getCustomer(selectedNote.terceroId)}
              typeName={getTypeName(
                selectedNote.tipoComprobanteId,
                selectedNote.tipoComprobanteDescripcion
              )}
              sucursalName={getSucursalName(selectedNote.sucursalId)}
            />
          ) : (
            <p className="py-8 text-center text-muted-foreground">
              No se pudo cargar el detalle del documento.
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
            {selectedNote && selectedNote.estado !== "ANULADO" && (
              <Button variant="destructive" onClick={() => handleAnnul(selectedNote)}>
                <Ban className="mr-2 h-4 w-4" />
                Anular
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function NotasCreditoPage() {
  return (
    <VentasNotasPage
      defaultKind="credito"
      pageTitle="Notas de Crédito"
      pageDescription="Ajustes por devolución, bonificación o corrección comercial con emisión real sobre el circuito documental de ventas."
    />
  )
}

function NoteTable({
  notes,
  loading,
  onOpen,
  onAnnul,
  getCustomerName,
  getTypeName,
  getApplicationStatus,
}: {
  notes: Comprobante[]
  loading: boolean
  onOpen: (note: Comprobante) => void
  onAnnul: (note: Comprobante) => void
  getCustomerName: (terceroId: number) => string
  getTypeName: (tipoId: number, fallback?: string) => string
  getApplicationStatus: (note: Comprobante) => string
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Comprobante</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead>Fecha</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Circuito</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
              <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin" />
              Cargando documentos...
            </TableCell>
          </TableRow>
        ) : notes.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
              No se encontraron documentos en esta categoría.
            </TableCell>
          </TableRow>
        ) : (
          notes.map((note) => {
            const status = STATUS_CONFIG[note.estado] ?? {
              label: note.estado,
              variant: "outline" as const,
            }

            return (
              <TableRow
                key={note.id}
                className="cursor-pointer hover:bg-muted/40"
                onClick={() => onOpen(note)}
              >
                <TableCell className="font-mono font-semibold">
                  {note.nroComprobante ?? `#${note.id}`}
                </TableCell>
                <TableCell>
                  {getTypeName(note.tipoComprobanteId, note.tipoComprobanteDescripcion)}
                </TableCell>
                <TableCell>{getCustomerName(note.terceroId)}</TableCell>
                <TableCell>{formatDate(note.fecha)}</TableCell>
                <TableCell>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </TableCell>
                <TableCell className="max-w-65 text-sm text-muted-foreground">
                  {getApplicationStatus(note)}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatMoney(note.total)}
                </TableCell>
                <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => onOpen(note)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {note.estado !== "ANULADO" && (
                      <Button variant="ghost" size="icon" onClick={() => onAnnul(note)}>
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
  )
}
