"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useMemo, useState } from "react"
import {
  Plus,
  Search,
  Eye,
  Ban,
  FileText,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ReceiptText,
  CalendarClock,
  Landmark,
  Building2,
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
import { useOrdenesCompra } from "@/lib/hooks/useOrdenesCompra"
import { useDefaultSucursalId, useSucursales } from "@/lib/hooks/useSucursales"
import { useItems } from "@/lib/hooks/useItems"
import { useProveedores } from "@/lib/hooks/useTerceros"
import type {
  Comprobante,
  ComprobanteDetalle,
  EmitirComprobanteDto,
} from "@/lib/types/comprobantes"
import type { OrdenCompra } from "@/lib/types/configuracion"
import type { Tercero } from "@/lib/types/terceros"

function formatMoney(value: number) {
  return value.toLocaleString("es-AR", { style: "currency", currency: "ARS" })
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString("es-AR") : "-"
}

function formatSupplierAddress(supplier?: Tercero | null) {
  if (!supplier) return "Sin domicilio visible"

  const parts = [
    [supplier.calle, supplier.nro].filter(Boolean).join(" "),
    supplier.piso ? `Piso ${supplier.piso}` : null,
    supplier.dpto ? `Dto ${supplier.dpto}` : null,
    supplier.localidadDescripcion,
    supplier.codigoPostal,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(" · ") : "Sin domicilio visible"
}

function getDaysPastDue(value?: string | null) {
  if (!value) return null
  const dueDate = new Date(value)
  const today = new Date()
  dueDate.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  return Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
}

function getPurchasePaymentStatus(invoice: ComprobanteDetalle) {
  if (invoice.estado === "ANULADO") return "Comprobante anulado"
  if (invoice.saldo <= 0 || invoice.estado === "PAGADO") return "Sin saldo pendiente"
  if (invoice.estado === "PAGADO_PARCIAL") return "Pago parcial en curso"

  const daysPastDue = getDaysPastDue(invoice.fechaVto)
  if (daysPastDue !== null && daysPastDue > 0) {
    return `Pendiente con ${daysPastDue} días de mora`
  }

  if (invoice.fechaVto) {
    return `Pendiente con vencimiento ${formatDate(invoice.fechaVto)}`
  }

  return "Pendiente de pago"
}

function getPurchaseDocumentStatus(invoice: ComprobanteDetalle) {
  if (invoice.estado === "ANULADO") return "Documento sin vigencia operativa"
  const daysPastDue = getDaysPastDue(invoice.fechaVto)
  if (daysPastDue !== null && daysPastDue > 0 && invoice.saldo > 0) {
    return `Documento vencido hace ${daysPastDue} días`
  }
  if (invoice.fechaVto) return `Documento vigente hasta ${formatDate(invoice.fechaVto)}`
  return "Documento registrado sin vencimiento informado"
}

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  BORRADOR: { label: "Borrador", variant: "secondary" },
  EMITIDO: { label: "Registrada", variant: "default" },
  PAGADO: { label: "Pagada", variant: "default" },
  PAGADO_PARCIAL: { label: "Pago parcial", variant: "outline" },
  ANULADO: { label: "Anulada", variant: "destructive" },
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

function getPurchaseOperationalControl(
  invoice: Pick<ComprobanteDetalle, "estado" | "saldo" | "fechaVto" | "cae">
) {
  if (invoice.estado === "ANULADO") return "Control cerrado por anulación"
  if (invoice.saldo <= 0) return "Control económico cerrado"
  if (invoice.fechaVto) return `Control con vencimiento ${formatDate(invoice.fechaVto)}`
  if (invoice.cae) return `Control fiscal con CAE ${invoice.cae}`
  return "Control documental pendiente de seguimiento"
}

type PurchaseFormItem = {
  id: string
  itemId: number
  descripcion: string
  cantidad: number
  precioUnitario: number
  descuento: number
  alicuotaIvaId: number
  alicuotaIvaPct: number
}

interface PurchaseInvoiceFormProps {
  onClose: () => void
  onSaved: () => void
  emitir: (dto: EmitirComprobanteDto) => Promise<boolean>
}

function createPurchaseInvoiceFormState(defaultSucursalId: number | undefined) {
  return {
    sucursalId: defaultSucursalId ?? 0,
    terceroId: 0,
    tipoComprobanteId: 0,
    fecha: new Date().toISOString().slice(0, 10),
    fechaVto: null,
    observacion: null,
    items: [],
  } satisfies EmitirComprobanteDto
}

function PurchaseInvoiceForm({ onClose, onSaved, emitir }: PurchaseInvoiceFormProps) {
  const defaultSucursalId = useDefaultSucursalId()
  const { tipos } = useComprobantesConfig()
  const { sucursales } = useSucursales()
  const { terceros: proveedores } = useProveedores()
  const { items } = useItems()
  const [tab, setTab] = useState("principal")
  const [form, setForm] = useState<EmitirComprobanteDto>(() =>
    createPurchaseInvoiceFormState(defaultSucursalId)
  )
  const [lineItems, setLineItems] = useState<PurchaseFormItem[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const compraTypes = tipos.filter((tipo) => tipo.esCompra)
  const effectiveSucursalId = form.sucursalId || defaultSucursalId || 0
  const effectiveTipoComprobanteId = form.tipoComprobanteId || compraTypes[0]?.id || 0

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
        precioUnitario: item.precioCosto,
        descuento: 0,
        alicuotaIvaId: item.alicuotaIvaId,
        alicuotaIvaPct: item.alicuotaIvaPorcentaje ?? 21,
      },
    ])
  }

  const updateLineItem = (id: string, key: keyof PurchaseFormItem, value: string | number) => {
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
  const selectedSupplier = useMemo(
    () => proveedores.find((supplier) => supplier.id === form.terceroId) ?? null,
    [form.terceroId, proveedores]
  )
  const selectedType = useMemo(
    () => compraTypes.find((tipo) => tipo.id === effectiveTipoComprobanteId) ?? null,
    [compraTypes, effectiveTipoComprobanteId]
  )
  const operationalPreviewFields = useMemo(
    () => [
      { label: "Proveedor", value: selectedSupplier?.razonSocial ?? "Sin proveedor seleccionado" },
      { label: "Domicilio", value: formatSupplierAddress(selectedSupplier) },
      {
        label: "Condición IVA",
        value: selectedSupplier?.condicionIvaDescripcion ?? "No informada",
      },
      {
        label: "Tipo de comprobante",
        value: selectedType
          ? `${selectedType.codigo} · ${selectedType.descripcion}`
          : "Sin tipo seleccionado",
      },
      {
        label: "Vencimiento",
        value: form.fechaVto ? formatDate(form.fechaVto) : "Sin vencimiento informado",
      },
      { label: "Items cargados", value: String(lineItems.length) },
      { label: "Total estimado", value: formatMoney(totals.total) },
      {
        label: "Control operativo",
        value: getPurchaseOperationalControl({
          estado: "EMITIDO",
          saldo: totals.total,
          fechaVto: form.fechaVto ?? null,
          cae: null,
        }),
      },
    ],
    [form.fechaVto, lineItems.length, selectedSupplier, selectedType, totals.total]
  )

  const handleSave = async () => {
    if (
      !effectiveSucursalId ||
      !form.terceroId ||
      !effectiveTipoComprobanteId ||
      lineItems.length === 0
    ) {
      setError("Sucursal, proveedor, tipo de comprobante e ítems son obligatorios")
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
    else setError("No se pudo registrar la factura de compra")
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
          <TabsTrigger value="operativa" className="py-2 text-xs">
            Operativa
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
                  {compraTypes.map((tipo) => (
                    <SelectItem key={tipo.id} value={String(tipo.id)}>
                      {tipo.codigo} · {tipo.descripcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Proveedor</Label>
              <Select
                value={form.terceroId ? String(form.terceroId) : ""}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, terceroId: Number(value) }))
                }
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
            <Label>Agregar ítem</Label>
            <Select value="__none__" onValueChange={addItem}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar producto o servicio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Seleccionar producto o servicio</SelectItem>
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
                <TableHead className="text-right">Costo Unitario</TableHead>
                <TableHead className="text-right">Desc. %</TableHead>
                <TableHead className="text-right">IVA %</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Agregue ítems para registrar la factura.
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
              <CardTitle className="text-base">Resumen de compra</CardTitle>
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

        <TabsContent value="operativa" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resumen operativo actual</CardTitle>
              <CardDescription>
                Lectura real de lo que ya queda definido antes de emitir el comprobante.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <DetailFieldGrid fields={operationalPreviewFields} />
              <div className="grid gap-4 md:grid-cols-2 text-sm">
                <div className="rounded-lg border p-4">
                  <p className="font-medium">Canales del proveedor</p>
                  <p className="mt-2 text-muted-foreground">
                    {[
                      selectedSupplier?.telefono,
                      selectedSupplier?.celular,
                      selectedSupplier?.email,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Sin canales visibles"}
                  </p>
                </div>
                <div className="rounded-lg border p-4 text-muted-foreground">
                  Esta emisión usa el motor documental real. Lo que no aparece como campo nativo en
                  backend queda explícitamente fuera, en vez de simularse con overlay legado.
                </div>
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
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Registrando..." : "Registrar factura"}
        </Button>
      </div>
    </div>
  )
}

function PurchaseInvoiceDetail({
  invoice,
  supplierName,
  supplier,
  typeName,
  sucursalName,
  relatedOrder,
}: {
  invoice: ComprobanteDetalle
  supplierName: string
  supplier?: Tercero | null
  typeName: string
  sucursalName: string
  relatedOrder: OrdenCompra | null
}) {
  const principalFields = [
    { label: "Comprobante", value: invoice.nroComprobante ?? `#${invoice.id}` },
    { label: "Tipo", value: typeName },
    { label: "Proveedor", value: supplierName },
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

  const operationalFields = [
    { label: "Estado documental", value: getPurchaseDocumentStatus(invoice) },
    { label: "Estado de pago", value: getPurchasePaymentStatus(invoice) },
    { label: "Total registrado", value: formatMoney(invoice.total) },
    { label: "Saldo actual", value: formatMoney(invoice.saldo) },
    {
      label: "CAE / autorización",
      value: invoice.cae ? `CAE ${invoice.cae}` : "Sin CAE informado",
    },
    {
      label: "Relación con orden",
      value: relatedOrder ? `OC-${relatedOrder.id} vinculada` : "Sin OC vinculada",
    },
  ]

  const extendedOperationalFields = [
    {
      label: "Documento origen",
      value:
        invoice.comprobanteOrigenNumero && invoice.comprobanteOrigenTipo
          ? `${invoice.comprobanteOrigenTipo} ${invoice.comprobanteOrigenNumero}`
          : "Sin documento origen visible",
    },
    {
      label: "Motivo devolución",
      value: invoice.motivoDevolucionDescripcion ?? "No aplica",
    },
    {
      label: "Tipo devolución",
      value: invoice.tipoDevolucionDescripcion ?? "No aplica",
    },
    {
      label: "Autorizador",
      value: invoice.autorizadorDevolucionNombre ?? "No informado",
    },
    {
      label: "Fecha autorización",
      value: formatDate(invoice.fechaAutorizacionDevolucion),
    },
    {
      label: "Reingresa stock",
      value:
        invoice.reingresaStock === undefined ? "No aplica" : invoice.reingresaStock ? "Sí" : "No",
    },
    {
      label: "Acredita cuenta corriente",
      value:
        invoice.acreditaCuentaCorriente === undefined
          ? "No aplica"
          : invoice.acreditaCuentaCorriente
            ? "Sí"
            : "No",
    },
    {
      label: "Control ampliado",
      value: getPurchaseOperationalControl(invoice),
    },
  ]

  const supplierFields = [
    { label: "Razón social", value: supplierName },
    { label: "Nombre fantasía", value: supplier?.nombreFantasia ?? "-" },
    { label: "CUIT / Documento", value: supplier?.nroDocumento ?? "-" },
    { label: "Condición IVA", value: supplier?.condicionIvaDescripcion ?? "-" },
    { label: "Domicilio", value: formatSupplierAddress(supplier) },
    {
      label: "Canales",
      value:
        [supplier?.telefono, supplier?.celular, supplier?.email].filter(Boolean).join(" · ") ||
        "Sin canales visibles",
    },
  ]

  return (
    <Tabs defaultValue="principal" className="w-full">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="principal">Principal</TabsTrigger>
        <TabsTrigger value="items">Items</TabsTrigger>
        <TabsTrigger value="fiscal">Fiscal</TabsTrigger>
        <TabsTrigger value="trazabilidad">Trazabilidad</TabsTrigger>
        <TabsTrigger value="operativa">Operativa</TabsTrigger>
      </TabsList>

      <TabsContent value="principal" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4" /> Cabecera de compra
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DetailFieldGrid fields={principalFields} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Landmark className="h-4 w-4" /> Proveedor vinculado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DetailFieldGrid fields={supplierFields} />
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
              <ReceiptText className="h-4 w-4" /> Datos fiscales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DetailFieldGrid fields={fiscalFields} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="trazabilidad" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4" /> Estado operativo actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DetailFieldGrid fields={operationalFields} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" /> Relación con órdenes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {relatedOrder ? (
              <DetailFieldGrid
                fields={[
                  { label: "Orden vinculada", value: `OC-${relatedOrder.id}` },
                  { label: "Estado de la orden", value: relatedOrder.estadoOc },
                  {
                    label: "Entrega requerida",
                    value: formatDate(relatedOrder.fechaEntregaReq),
                  },
                  {
                    label: "Habilitada para recepción",
                    value: relatedOrder.habilitada ? "Sí" : "No",
                  },
                  {
                    label: "Condiciones de entrega",
                    value: relatedOrder.condicionesEntrega ?? "-",
                  },
                  {
                    label: "Comprobante relacionado",
                    value: `#${relatedOrder.comprobanteId}`,
                  },
                ]}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Esta factura no tiene una orden de compra vinculada por `comprobanteId` en el
                backend actual.
              </p>
            )}
          </CardContent>
        </Card>
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
            <div className="grid gap-4 md:grid-cols-2 text-sm">
              <div className="rounded-lg border p-4">
                <p className="font-medium">Observación devolución</p>
                <p className="mt-2 text-muted-foreground">
                  {invoice.observacionDevolucion ?? "Sin observación adicional de devolución."}
                </p>
              </div>
              <div className="rounded-lg border p-4 text-muted-foreground">
                Esta lectura usa exclusivamente datos del comprobante real y sus relaciones visibles
                en backend. Las imputaciones avanzadas siguen perteneciendo al circuito específico
                de compras y contabilidad.
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

export default function FacturasComprasPage() {
  const searchParams = useSearchParams()
  const routeComprobanteId = Number(searchParams.get("comprobanteId") ?? "")
  const routeProviderId = Number(searchParams.get("proveedorId") ?? "")
  const focusInvoiceId =
    Number.isFinite(routeComprobanteId) && routeComprobanteId > 0 ? routeComprobanteId : null
  const focusProviderId =
    Number.isFinite(routeProviderId) && routeProviderId > 0 ? routeProviderId : null
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
  } = useComprobantes({ esCompra: true })
  const { tipos } = useComprobantesConfig()
  const { ordenes, loading: loadingOrders } = useOrdenesCompra()
  const { sucursales } = useSucursales()
  const { terceros: proveedores, loading: loadingProviders } = useProveedores()
  const [searchTerm, setSearchTerm] = useState(focusInvoiceId ? String(focusInvoiceId) : "")
  const [statusFilter, setStatusFilter] = useState("todos")
  const [typeFilter, setTypeFilter] = useState("todos")
  const [manualDueFilter, setManualDueFilter] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null)
  const [detailInvoice, setDetailInvoice] = useState<ComprobanteDetalle | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const routeDueFilter =
    searchParams.get("filtro") === "proximos-vencimientos" ? "proximos" : "todos"
  const dueFilter = manualDueFilter ?? routeDueFilter
  const isLoadingOverview = loading || loadingOrders || loadingProviders

  const compraTypes = useMemo(() => tipos.filter((tipo) => tipo.esCompra), [tipos])
  const ordenesByComprobanteId = useMemo(
    () => new Map(ordenes.map((order) => [order.comprobanteId, order])),
    [ordenes]
  )
  const supplierNameById = useMemo(
    () => new Map(proveedores.map((proveedor) => [proveedor.id, proveedor.razonSocial])),
    [proveedores]
  )
  const typeNameById = useMemo(
    () => new Map(tipos.map((tipo) => [tipo.id, tipo.descripcion])),
    [tipos]
  )
  const sucursalNameById = useMemo(
    () => new Map(sucursales.map((sucursal) => [sucursal.id, sucursal.descripcion])),
    [sucursales]
  )
  const selectedInvoice = useMemo(
    () => comprobantes.find((invoice) => invoice.id === selectedInvoiceId) ?? null,
    [comprobantes, selectedInvoiceId]
  )
  const routeFocusedInvoice = useMemo(
    () =>
      focusInvoiceId
        ? (comprobantes.find((invoice) => invoice.id === focusInvoiceId) ?? null)
        : null,
    [comprobantes, focusInvoiceId]
  )
  const detailOpen = isDetailOpen && selectedInvoice !== null

  const getSupplierName = (terceroId: number) => supplierNameById.get(terceroId) ?? `#${terceroId}`
  const getTypeName = (tipoId: number, fallback?: string) =>
    typeNameById.get(tipoId) ?? fallback ?? `#${tipoId}`
  const getSucursalName = (sucursalId: number) =>
    sucursalNameById.get(sucursalId) ?? `#${sucursalId}`

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase().trim()
    return comprobantes.filter((invoice) => {
      const typeName = (
        typeNameById.get(invoice.tipoComprobanteId) ??
        invoice.tipoComprobanteDescripcion ??
        `#${invoice.tipoComprobanteId}`
      ).toLowerCase()
      const supplierName = (
        supplierNameById.get(invoice.terceroId) ?? `#${invoice.terceroId}`
      ).toLowerCase()
      const matchesSearch =
        term === "" ||
        (invoice.nroComprobante ?? String(invoice.id)).toLowerCase().includes(term) ||
        supplierName.includes(term) ||
        typeName.includes(term)

      const matchesStatus = statusFilter === "todos" || invoice.estado === statusFilter
      const matchesType = typeFilter === "todos" || String(invoice.tipoComprobanteId) === typeFilter
      const daysPastDue = getDaysPastDue(invoice.fechaVto)
      const matchesDue =
        dueFilter === "todos" ||
        (dueFilter === "proximos" &&
          invoice.estado !== "ANULADO" &&
          invoice.estado !== "PAGADO" &&
          invoice.saldo > 0 &&
          daysPastDue !== null &&
          daysPastDue <= 0 &&
          daysPastDue >= -7)

      return matchesSearch && matchesStatus && matchesType && matchesDue
    })
  }, [
    comprobantes,
    dueFilter,
    searchTerm,
    statusFilter,
    supplierNameById,
    typeFilter,
    typeNameById,
  ])

  const kpis = {
    total: comprobantes.length,
    registradas: comprobantes.filter((invoice) => invoice.estado === "EMITIDO").length,
    pagadas: comprobantes.filter((invoice) => invoice.estado === "PAGADO").length,
    anuladas: comprobantes.filter((invoice) => invoice.estado === "ANULADO").length,
    vinculadasOc: comprobantes.filter((invoice) => ordenesByComprobanteId.has(invoice.id)).length,
    saldoPendiente: comprobantes
      .filter((invoice) => invoice.estado !== "PAGADO" && invoice.estado !== "ANULADO")
      .reduce((sum, invoice) => sum + invoice.saldo, 0),
  }

  const highlightedInvoice =
    selectedInvoice && filtered.some((invoice) => invoice.id === selectedInvoice.id)
      ? selectedInvoice
      : routeFocusedInvoice && filtered.some((invoice) => invoice.id === routeFocusedInvoice.id)
        ? routeFocusedInvoice
        : (filtered[0] ?? null)
  const highlightedSupplier = highlightedInvoice
    ? (proveedores.find((proveedor) => proveedor.id === highlightedInvoice.terceroId) ?? null)
    : null
  const highlightedOrder = highlightedInvoice
    ? (ordenesByComprobanteId.get(highlightedInvoice.id) ?? null)
    : null
  const vencidas = filtered.filter((invoice) => {
    const daysPastDue = getDaysPastDue(invoice.fechaVto)
    return (
      daysPastDue !== null && daysPastDue > 0 && invoice.estado !== "ANULADO" && invoice.saldo > 0
    )
  }).length
  const highlightedFields = highlightedInvoice
    ? [
        {
          label: "Proveedor",
          value: highlightedSupplier?.razonSocial ?? `#${highlightedInvoice.terceroId}`,
        },
        {
          label: "Tipo",
          value: getTypeName(
            highlightedInvoice.tipoComprobanteId,
            highlightedInvoice.tipoComprobanteDescripcion
          ),
        },
        { label: "Vencimiento", value: formatDate(highlightedInvoice.fechaVto) },
        { label: "Saldo", value: formatMoney(highlightedInvoice.saldo) },
        {
          label: "Estado documental",
          value: getPurchaseDocumentStatus(highlightedInvoice as ComprobanteDetalle),
        },
        { label: "Domicilio proveedor", value: formatSupplierAddress(highlightedSupplier) },
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
    if (!window.confirm(`¿Anular la factura ${invoice.nroComprobante ?? invoice.id}?`)) return
    await anular(invoice.id, false)
    await refetch()
    if (selectedInvoiceId === invoice.id) {
      const detail = await getById(invoice.id)
      setDetailInvoice(detail)
    }
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Facturas de Compra</h1>
          <p className="text-muted-foreground">
            Registro real de comprobantes de proveedores, control de saldo y detalle fiscal sobre la
            API actual.
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

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoadingOverview ? "..." : kpis.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Registradas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {isLoadingOverview ? "..." : kpis.registradas}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pagadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {isLoadingOverview ? "..." : kpis.pagadas}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Saldo pendiente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {isLoadingOverview ? "..." : formatMoney(kpis.saldoPendiente)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Con OC vinculada</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {isLoadingOverview ? "..." : kpis.vinculadasOc}
            </div>
          </CardContent>
        </Card>
      </div>

      {highlightedInvoice ? (
        <Card>
          <CardHeader>
            <CardTitle>Factura destacada</CardTitle>
            <CardDescription>
              {highlightedInvoice.nroComprobante ?? `#${highlightedInvoice.id}`} ·{" "}
              {highlightedSupplier?.razonSocial ?? `Proveedor #${highlightedInvoice.terceroId}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
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
              {highlightedOrder ? <Badge variant="outline">OC-{highlightedOrder.id}</Badge> : null}
              <Badge variant="outline">
                {getPurchasePaymentStatus(highlightedInvoice as ComprobanteDetalle)}
              </Badge>
            </div>

            <DetailFieldGrid fields={highlightedFields} />

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="bg-transparent"
                onClick={() => loadDetail(highlightedInvoice)}
              >
                <Eye className="mr-2 h-4 w-4" /> Abrir detalle
              </Button>
              <Button variant="outline" className="bg-transparent" asChild>
                <Link
                  href={`/compras/imputaciones?comprobanteId=${highlightedInvoice.id}&proveedorId=${highlightedInvoice.terceroId}`}
                >
                  <Landmark className="mr-2 h-4 w-4" /> Ver imputación
                </Link>
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3 text-sm text-muted-foreground">
              <div className="rounded-lg border p-4">
                Facturas vencidas con saldo dentro del filtro actual: {vencidas}.
              </div>
              <div className="rounded-lg border p-4">
                Saldo pendiente consolidado: {formatMoney(kpis.saldoPendiente)}.
              </div>
              <div className="rounded-lg border p-4">
                Observación proveedor:{" "}
                {highlightedSupplier?.observacion ?? "Sin observaciones visibles"}.
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {routeFocusedInvoice && (
        <Alert>
          <ReceiptText className="h-4 w-4" />
          <AlertDescription>
            Llegaste con foco sobre el comprobante{" "}
            {routeFocusedInvoice.nroComprobante ?? `#${routeFocusedInvoice.id}`}
            {focusProviderId ? ` del proveedor #${focusProviderId}` : ""}. La vista quedó centrada
            en ese documento.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-[1fr_240px_220px_220px_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por comprobante, proveedor o tipo..."
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
                {compraTypes.map((tipo) => (
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
                <SelectItem value="EMITIDO">Registrada</SelectItem>
                <SelectItem value="PAGADO">Pagada</SelectItem>
                <SelectItem value="PAGADO_PARCIAL">Pago parcial</SelectItem>
                <SelectItem value="ANULADO">Anulada</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dueFilter} onValueChange={setManualDueFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Vencimiento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los vencimientos</SelectItem>
                <SelectItem value="proximos">Próximos 7 días</SelectItem>
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
          <CardTitle>Comprobantes de compra ({filtered.length})</CardTitle>
          <CardDescription>
            La vista deja operativo el alta real y reserva los bloques heredados de imputación y
            control documental ampliado.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Comprobante</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead>OC</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Circuito</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={11} className="py-10 text-center text-muted-foreground">
                    <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin" />
                    Cargando comprobantes...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="py-10 text-center text-muted-foreground">
                    <FileText className="mx-auto mb-2 h-8 w-8 opacity-50" />
                    No se encontraron facturas de compra.
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
                      className={
                        focusInvoiceId === invoice.id
                          ? "cursor-pointer bg-primary/5 hover:bg-primary/10"
                          : "cursor-pointer hover:bg-muted/40"
                      }
                      onClick={() => loadDetail(invoice)}
                    >
                      <TableCell className="font-mono font-semibold">
                        {invoice.nroComprobante ?? `#${invoice.id}`}
                      </TableCell>
                      <TableCell>
                        {getTypeName(invoice.tipoComprobanteId, invoice.tipoComprobanteDescripcion)}
                      </TableCell>
                      <TableCell>{getSupplierName(invoice.terceroId)}</TableCell>
                      <TableCell>{formatDate(invoice.fecha)}</TableCell>
                      <TableCell>{formatDate(invoice.fechaVto)}</TableCell>
                      <TableCell>
                        {ordenesByComprobanteId.has(invoice.id)
                          ? `OC-${ordenesByComprobanteId.get(invoice.id)?.id}`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {getPurchasePaymentStatus(invoice as ComprobanteDetalle)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatMoney(invoice.total)}
                      </TableCell>
                      <TableCell className="text-right">{formatMoney(invoice.saldo)}</TableCell>
                      <TableCell
                        className="text-right"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => loadDetail(invoice)}>
                            <Eye className="h-4 w-4" />
                          </Button>
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
              <Building2 className="h-4 w-4" /> Registro proveedor
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {isLoadingOverview
              ? "Cargando comprobantes, proveedores y órdenes relacionadas..."
              : `${kpis.total} comprobantes registrados con proveedor, tipo y detalle real de ítems sobre la API actual.`}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4" /> Control de saldo
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {isLoadingOverview
              ? "Calculando estado de saldo y vencimientos..."
              : `${kpis.pagadas} pagadas, ${kpis.registradas} registradas y ${comprobantes.filter((invoice) => invoice.saldo > 0 && invoice.estado !== "ANULADO").length} con saldo pendiente dentro del contrato actual.`}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Landmark className="h-4 w-4" /> Segunda fase
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {isLoadingOverview
              ? "Cargando trazabilidad entre facturas y órdenes..."
              : `${kpis.vinculadasOc} facturas ya muestran vínculo con OC; quedan listos para integrar imputaciones, recepción contra OC, retenciones y prorrateos.`}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva factura de compra</DialogTitle>
            <DialogDescription>
              Registro real del comprobante de proveedor sobre la API unificada de comprobantes.
            </DialogDescription>
          </DialogHeader>
          <PurchaseInvoiceForm
            key={`purchase-invoice-${isFormOpen ? "open" : "closed"}-${compraTypes[0]?.id ?? 0}`}
            onClose={() => setIsFormOpen(false)}
            onSaved={handleSaved}
            emitir={emitir}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={detailOpen}
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
              {selectedInvoice ? getSupplierName(selectedInvoice.terceroId) : "Cargando..."}
            </DialogDescription>
          </DialogHeader>

          {loadingDetail ? (
            <div className="py-12 text-center text-muted-foreground">
              <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin" />
              Cargando detalle...
            </div>
          ) : detailInvoice && selectedInvoice ? (
            <PurchaseInvoiceDetail
              invoice={detailInvoice}
              supplierName={getSupplierName(selectedInvoice.terceroId)}
              supplier={
                proveedores.find((proveedor) => proveedor.id === selectedInvoice.terceroId) ?? null
              }
              typeName={getTypeName(
                selectedInvoice.tipoComprobanteId,
                selectedInvoice.tipoComprobanteDescripcion
              )}
              sucursalName={getSucursalName(selectedInvoice.sucursalId)}
              relatedOrder={ordenesByComprobanteId.get(selectedInvoice.id) ?? null}
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
            {selectedInvoice && selectedInvoice.estado !== "ANULADO" && (
              <Button variant="destructive" onClick={() => handleAnnul(selectedInvoice)}>
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
