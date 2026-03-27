"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Plus,
  Search,
  Eye,
  Ban,
  Shield,
  FileText,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ReceiptText,
  CalendarClock,
  Landmark,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
import { useComprobantes, useComprobantesConfig } from "@/lib/hooks/useComprobantes"
import { usePuntosFacturacion } from "@/lib/hooks/usePuntosFacturacion"
import { useDefaultSucursalId, useSucursales } from "@/lib/hooks/useSucursales"
import { useTerceros } from "@/lib/hooks/useTerceros"
import { useItems } from "@/lib/hooks/useItems"
import type {
  Comprobante,
  ComprobanteDetalle,
  EmitirComprobanteDto,
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

function getCollectionStatus(invoice: ComprobanteDetalle) {
  if (invoice.estado === "ANULADO") return "Anulada"
  if (invoice.saldo <= 0 || invoice.estado === "PAGADO") return "Sin saldo pendiente"
  if (invoice.estado === "PAGADO_PARCIAL") return "Cobro parcial en curso"

  const daysPastDue = getDaysPastDue(invoice.fechaVto)
  if (daysPastDue !== null && daysPastDue > 0) {
    return `Pendiente con ${daysPastDue} días de mora`
  }

  if (invoice.fechaVto) {
    return `Pendiente con vencimiento ${formatDate(invoice.fechaVto)}`
  }

  return "Pendiente de cobranza"
}

function getFiscalStatus(invoice: ComprobanteDetalle) {
  if (invoice.estado === "ANULADO") return "Circuito fiscal cerrado por anulación"
  if (invoice.cae)
    return `CAE asignado${invoice.caeFechaVto ? ` hasta ${formatDate(invoice.caeFechaVto)}` : ""}`
  return "CAE pendiente de registración"
}

function getDocumentStatus(invoice: ComprobanteDetalle) {
  if (invoice.estado === "ANULADO") return "Documento sin vigencia operativa"
  const daysPastDue = getDaysPastDue(invoice.fechaVto)
  if (daysPastDue !== null && daysPastDue > 0 && invoice.saldo > 0) {
    return `Documento vencido hace ${daysPastDue} días`
  }
  if (invoice.fechaVto) return `Documento vigente hasta ${formatDate(invoice.fechaVto)}`
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

interface InvoiceFormProps {
  onClose: () => void
  onSaved: () => void
  emitir: (dto: EmitirComprobanteDto) => Promise<boolean>
}

function createInvoiceFormState(defaultSucursalId: number | undefined): EmitirComprobanteDto {
  return {
    sucursalId: defaultSucursalId ?? 0,
    terceroId: 0,
    tipoComprobanteId: 0,
    fecha: new Date().toISOString().slice(0, 10),
    fechaVto: null,
    observacion: null,
    items: [],
  }
}

function InvoiceForm({ onClose, onSaved, emitir }: InvoiceFormProps) {
  const defaultSucursalId = useDefaultSucursalId()
  const { tipos } = useComprobantesConfig()
  const { sucursales } = useSucursales()
  const { terceros: clientes } = useTerceros()
  const { items } = useItems()
  const {
    puntos,
    getProximoNumero,
    loading: loadingPuntos,
  } = usePuntosFacturacion(effectiveSucursalId || undefined)
  const [tab, setTab] = useState("principal")
  const [form, setForm] = useState<EmitirComprobanteDto>(() =>
    createInvoiceFormState(defaultSucursalId)
  )
  const [lineItems, setLineItems] = useState<InvoiceFormItem[]>([])
  const [selectedPuntoId, setSelectedPuntoId] = useState<number | null>(null)
  const [nextNumberPreview, setNextNumberPreview] = useState<number | null>(null)
  const [loadingNextNumber, setLoadingNextNumber] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ventaTypes = tipos.filter((tipo) => tipo.esVenta)
  const effectiveSucursalId = form.sucursalId || defaultSucursalId || 0
  const effectiveTipoComprobanteId = form.tipoComprobanteId || ventaTypes[0]?.id || 0

  const puntoOptions = useMemo(
    () => puntos.filter((punto) => punto.activo).sort((left, right) => left.numero - right.numero),
    [puntos]
  )

  const selectedPunto = useMemo(
    () => puntoOptions.find((punto) => punto.id === selectedPuntoId) ?? puntoOptions[0] ?? null,
    [puntoOptions, selectedPuntoId]
  )

  useEffect(() => {
    if (selectedPuntoId && puntoOptions.some((punto) => punto.id === selectedPuntoId)) return
    setSelectedPuntoId(puntoOptions[0]?.id ?? null)
  }, [puntoOptions, selectedPuntoId])

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

  const updateLineItem = (id: string, key: keyof InvoiceFormItem, value: string | number) => {
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
    if (
      !effectiveSucursalId ||
      !form.terceroId ||
      !effectiveTipoComprobanteId ||
      lineItems.length === 0
    ) {
      setError("Sucursal, cliente, tipo de comprobante e ítems son obligatorios")
      return
    }

    const payload: EmitirComprobanteDto = {
      ...form,
      sucursalId: effectiveSucursalId,
      tipoComprobanteId: effectiveTipoComprobanteId,
      items: lineItems.map((item) => ({
        itemId: item.itemId,
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        descuento: item.descuento,
        alicuotaIvaId: item.alicuotaIvaId,
      })),
      observacion: form.observacion || null,
      fechaVto: form.fechaVto || null,
    }

    setSaving(true)
    setError(null)
    const ok = await emitir(payload)
    setSaving(false)

    if (ok) onSaved()
    else setError("No se pudo emitir la factura")
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
                value={effectiveSucursalId ? String(effectiveSucursalId) : ""}
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
              <Label>Tipo de comprobante</Label>
              <Select
                value={effectiveTipoComprobanteId ? String(effectiveTipoComprobanteId) : ""}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, tipoComprobanteId: Number(value) }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {ventaTypes.map((tipo) => (
                    <SelectItem key={tipo.id} value={String(tipo.id)}>
                      {tipo.codigo} · {tipo.descripcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Punto de facturación de referencia</Label>
              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                <Select
                  value={selectedPunto ? String(selectedPunto.id) : "__none__"}
                  onValueChange={(value) =>
                    setSelectedPuntoId(value === "__none__" ? null : Number(value))
                  }
                  disabled={!effectiveSucursalId || puntoOptions.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        !effectiveSucursalId
                          ? "Seleccione sucursal"
                          : loadingPuntos
                            ? "Cargando puntos..."
                            : "Sin puntos activos"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin punto de referencia</SelectItem>
                    {puntoOptions.map((punto) => (
                      <SelectItem key={punto.id} value={String(punto.id)}>
                        {String(punto.numero).padStart(4, "0")} · {punto.descripcion}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="rounded-lg border px-3 py-2 text-sm">
                  <p className="text-xs text-muted-foreground">Próximo número</p>
                  <p className="font-semibold">
                    {loadingNextNumber
                      ? "Consultando..."
                      : nextNumberPreview !== null
                        ? `#${nextNumberPreview}`
                        : "Sin vista previa"}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Referencia operativa del legacy. La emisión sigue usando el contrato actual por
                sucursal y tipo de comprobante, sin enviar un punto explícito al backend.
              </p>
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
            <div className="space-y-1.5 md:col-span-2">
              <Label>Observación</Label>
              <Textarea
                value={form.observacion ?? ""}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, observacion: event.target.value || null }))
                }
                rows={4}
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
                    Agregue productos para emitir la factura.
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
              <CardTitle className="text-base">Resumen Fiscal</CardTitle>
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
              El circuito legado contemplaba emisión masiva, facturación automática, vínculos con
              remitos y condiciones fiscales avanzadas. Esta primera migración deja estable la
              emisión manual real, suma referencia visible de punto y próximo número por sucursal, y
              reserva los bloques más profundos para esa segunda etapa.
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
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Emitiendo..." : "Emitir factura"}
        </Button>
      </div>
    </div>
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
  const principalFields = [
    { label: "Comprobante", value: invoice.nroComprobante ?? `#${invoice.id}` },
    { label: "Tipo", value: typeName },
    { label: "Cliente", value: customerName },
    { label: "Sucursal", value: sucursalName },
    { label: "Fecha", value: formatDate(invoice.fecha) },
    { label: "Fecha Vencimiento", value: formatDate(invoice.fechaVto) },
    { label: "Estado", value: STATUS_CONFIG[invoice.estado]?.label ?? invoice.estado },
    { label: "Observación", value: invoice.observacion ?? "-" },
  ]

  const fiscalFields = [
    { label: "Neto Gravado", value: formatMoney(invoice.netoGravado) },
    { label: "Neto No Gravado", value: formatMoney(invoice.netoNoGravado) },
    { label: "IVA RI", value: formatMoney(invoice.ivaRi) },
    { label: "IVA RNI", value: formatMoney(invoice.ivaRni) },
    { label: "Saldo", value: formatMoney(invoice.saldo) },
    { label: "Total", value: formatMoney(invoice.total) },
    { label: "CAE", value: invoice.cae ?? "-" },
    { label: "Vto. CAE", value: formatDate(invoice.caeFechaVto) },
  ]

  const circuitFields = [
    { label: "Estado documental", value: getDocumentStatus(invoice) },
    { label: "Estado de cobranza", value: getCollectionStatus(invoice) },
    { label: "Total emitido", value: formatMoney(invoice.total) },
    { label: "Saldo actual", value: formatMoney(invoice.saldo) },
    { label: "Estado fiscal", value: getFiscalStatus(invoice) },
    { label: "QR operativo", value: invoice.qrData ? "QR disponible" : "Sin QR cargado" },
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
        <TabsTrigger value="fiscal">Fiscal</TabsTrigger>
        <TabsTrigger value="circuito">Circuito</TabsTrigger>
        <TabsTrigger value="legado">Legado</TabsTrigger>
      </TabsList>

      <TabsContent value="principal" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ReceiptText className="h-4 w-4" /> Cabecera
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DetailFieldGrid fields={principalFields} />
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
              <TableHead className="text-right">Alic. IVA</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoice.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Este comprobante no devolvió detalle de ítems.
                </TableCell>
              </TableRow>
            ) : (
              invoice.items.map((item) => (
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

      <TabsContent value="fiscal" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4" /> Información fiscal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DetailFieldGrid fields={fiscalFields} />
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
              <Landmark className="h-4 w-4" /> Bloques reservados
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 text-sm text-muted-foreground">
            <div className="rounded-lg border p-4">
              Remitos vinculados, facturación automática y procesamiento masivo quedan reservados,
              pero esta vista ya expone el estado documental, fiscal y de cobranza del comprobante.
            </div>
            <div className="rounded-lg border p-4">
              Cuenta corriente avanzada, envío documental y conciliación posterior siguen como
              segunda etapa sobre el backend nuevo.
            </div>
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
  const { tipos } = useComprobantesConfig()
  const { sucursales } = useSucursales()
  const { terceros: clientes } = useTerceros()
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
  }, [comprobantes, searchTerm, statusFilter, typeFilter, getCustomerName, getTypeName])

  const selectedInvoice = useMemo(
    () => comprobantes.find((invoice) => invoice.id === selectedInvoiceId) ?? null,
    [comprobantes, selectedInvoiceId]
  )

  const kpis = {
    total: comprobantes.length,
    emitidas: comprobantes.filter((invoice) => invoice.estado === "EMITIDO").length,
    pagadas: comprobantes.filter((invoice) => invoice.estado === "PAGADO").length,
    anuladas: comprobantes.filter((invoice) => invoice.estado === "ANULADO").length,
    conCae: comprobantes.filter((invoice) => !!invoice.cae).length,
    totalFacturado: comprobantes.reduce((sum, invoice) => sum + invoice.total, 0),
  }
  const highlightedInvoice =
    selectedInvoice && filtered.some((invoice) => invoice.id === selectedInvoice.id)
      ? selectedInvoice
      : (filtered[0] ?? null)
  const highlightedCustomer = highlightedInvoice ? getCustomer(highlightedInvoice.terceroId) : null
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
        { label: "Vencimiento", value: formatDate(highlightedInvoice.fechaVto) },
        { label: "Total", value: formatMoney(highlightedInvoice.total) },
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Facturas de Venta</h1>
          <p className="text-muted-foreground">
            Emisión real de comprobantes, consulta detallada y administración de CAE sobre el
            circuito actual.
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Factura
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
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
            <CardTitle className="text-sm font-medium">Emitidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{kpis.emitidas}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pagadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{kpis.pagadas}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Anuladas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{kpis.anuladas}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Con CAE</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">{kpis.conCae}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Facturado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{formatMoney(kpis.totalFacturado)}</div>
          </CardContent>
        </Card>
      </div>

      {highlightedInvoice ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardDescription>Factura destacada</CardDescription>
              <CardTitle className="mt-1 text-xl">
                {highlightedInvoice.nroComprobante ?? `#${highlightedInvoice.id}`} ·{" "}
                {highlightedCustomer?.razonSocial ?? `Cliente #${highlightedInvoice.terceroId}`}
              </CardTitle>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                {highlightedInvoice.observacion?.trim() ||
                  "Sin observación comercial registrada para este comprobante."}
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
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-[1fr_240px_220px_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por comprobante, cliente, tipo o CAE..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-10"
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
                <SelectItem value="BORRADOR">Borrador</SelectItem>
                <SelectItem value="EMITIDO">Emitido</SelectItem>
                <SelectItem value="PAGADO">Pagado</SelectItem>
                <SelectItem value="PAGADO_PARCIAL">Pago parcial</SelectItem>
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
          <CardTitle>Comprobantes ({filtered.length})</CardTitle>
          <CardDescription>
            La vista mezcla estructura heredada y validación real del flujo actual de comprobantes.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
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
                      <TableCell>
                        {getTypeName(invoice.tipoComprobanteId, invoice.tipoComprobanteDescripcion)}
                      </TableCell>
                      <TableCell>{getCustomerName(invoice.terceroId)}</TableCell>
                      <TableCell>{formatDate(invoice.fecha)}</TableCell>
                      <TableCell>{formatDate(invoice.fechaVto)}</TableCell>
                      <TableCell>
                        {invoice.cae ? (
                          <span className="font-mono text-xs">{invoice.cae}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Sin CAE</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="max-w-65 text-sm text-muted-foreground">
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
                          <Button variant="ghost" size="icon" onClick={() => loadDetail(invoice)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!invoice.cae && invoice.estado !== "ANULADO" && (
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
                          )}
                          {invoice.estado !== "ANULADO" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleAnnul(invoice)}
                            >
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
              <ReceiptText className="h-4 w-4" /> Emisión operativa
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {kpis.total} comprobantes reales emitidos por {formatMoney(kpis.totalFacturado)} sobre
            el circuito actual de ventas.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4" /> Control documental
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {kpis.pagadas} pagadas, {kpis.emitidas} emitidas y{" "}
            {
              comprobantes.filter((invoice) => invoice.saldo > 0 && invoice.estado !== "ANULADO")
                .length
            }{" "}
            con saldo pendiente dentro del contrato actual.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4" /> CAE y fiscal
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {kpis.conCae} comprobantes ya tienen CAE y {kpis.total - kpis.conCae} siguen pendientes
            de registración fiscal.
          </CardContent>
        </Card>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva factura de venta</DialogTitle>
            <DialogDescription>
              Emisión real contra la API de comprobantes, preservando el circuito documental
              histórico.
            </DialogDescription>
          </DialogHeader>
          <InvoiceForm
            key={`${ventaTypes[0]?.id ?? 0}-${isFormOpen ? "open" : "closed"}`}
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
            setSelectedInvoiceId(null)
            setDetailInvoice(null)
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedInvoice?.nroComprobante ?? "Detalle de factura"}
            </DialogTitle>
            <DialogDescription>
              {selectedInvoice ? getCustomerName(selectedInvoice.terceroId) : "Cargando..."}
            </DialogDescription>
          </DialogHeader>

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

          <DialogFooter>
            <Button
              variant="outline"
              className="bg-transparent"
              onClick={() => setIsDetailOpen(false)}
            >
              Cerrar
            </Button>
            {selectedInvoice && !selectedInvoice.cae && selectedInvoice.estado !== "ANULADO" && (
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
            )}
            {selectedInvoice && selectedInvoice.estado !== "ANULADO" && (
              <Button variant="destructive" onClick={() => handleAnnul(selectedInvoice)}>
                <Ban className="mr-2 h-4 w-4" />
                Anular
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={caeState.open}
        onOpenChange={(open) => setCaeState((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Asignar CAE</DialogTitle>
            <DialogDescription>
              Registro operativo del CAE y vencimiento sobre el comprobante seleccionado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>CAE</Label>
              <Input
                value={caeState.cae}
                onChange={(event) => setCaeState((prev) => ({ ...prev, cae: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Vencimiento CAE</Label>
              <Input
                type="date"
                value={caeState.fechaVto}
                onChange={(event) =>
                  setCaeState((prev) => ({ ...prev, fechaVto: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>QR Data</Label>
              <Textarea
                value={caeState.qrData}
                onChange={(event) =>
                  setCaeState((prev) => ({ ...prev, qrData: event.target.value }))
                }
                rows={3}
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
