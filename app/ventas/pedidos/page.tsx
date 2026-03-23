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

  const operationalNotes = parts.filter(
    (part) =>
      !part.startsWith("Vendedor: ") &&
      !part.startsWith("Canal: ") &&
      !part.startsWith("Entrega estimada: ")
  )

  return {
    vendedor: vendedor || "No informado",
    canal: canal || "No informado",
    entrega: entrega || "No informada",
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
      entregaEstimada ? `Entrega estimada: ${entregaEstimada}` : null,
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
                          updateLineItem(item.id, "descuento", parseFloat(event.target.value) || 0)
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">{item.alicuotaIvaPct.toFixed(2)}%</TableCell>
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
              El legado contemplaba aprobaciones, reserva de stock, seguimiento por preparación y
              posterior transformación a remito o factura. Esta etapa deja la emisión documental
              real si el backend expone tipos de pedido, y preserva el contexto operativo en
              observaciones.
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
    { label: "Entrega estimada", value: operationalContext.entrega },
    {
      label: "Items / unidades",
      value: `${order.items.length} renglones · ${order.items.reduce((total, item) => total + item.cantidad, 0)} unidades`,
    },
    {
      label: "Saldo asociado",
      value: order.saldo > 0 ? formatMoney(order.saldo) : "Sin saldo pendiente",
    },
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
              <Landmark className="h-4 w-4" /> Pendientes del circuito clásico
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm text-muted-foreground md:grid-cols-2">
            <div className="rounded-lg border p-4">
              Esta etapa ya deja visible compromiso, contexto comercial y volumen pedido; reserva,
              preparación y seguimiento por área siguen reservados.
            </div>
            <div className="rounded-lg border p-4">
              Conversión formal del pedido a remito o factura con trazabilidad de cumplimiento queda
              reservada para la siguiente fase.
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
  const [statusFilter, setStatusFilter] = useState("todos")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Comprobante | null>(null)
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

      const matchesStatus = statusFilter === "todos" || order.estado === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [orders, searchTerm, statusFilter, getCustomerName, getTypeName])

  const kpis = useMemo(
    () => ({
      total: orders.length,
      borradores: orders.filter((order) => order.estado === "BORRADOR").length,
      confirmados: orders.filter((order) => order.estado === "EMITIDO").length,
      cerrados: orders.filter((order) => order.estado === "PAGADO").length,
      conCompromiso: orders.filter((order) => Boolean(order.fechaVto)).length,
      conSaldoPendiente: orders.filter((order) => order.saldo > 0 && order.estado !== "ANULADO")
        .length,
    }),
    [orders]
  )

  useEffect(() => {
    if (!selectedOrder) return

    const nextSelected = comprobantes.find((order) => order.id === selectedOrder.id) ?? null

    if (!nextSelected) {
      setSelectedOrder(null)
      setIsDetailOpen(false)
      setDetailOrder(null)
      return
    }

    if (nextSelected !== selectedOrder) {
      setSelectedOrder(nextSelected)
    }
  }, [comprobantes, selectedOrder])

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
        { label: "Canal", value: highlightedContext?.canal ?? "No informado" },
      ]
    : []

  const openDetail = async (order: Comprobante) => {
    setSelectedOrder(order)
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

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="mt-2 text-2xl font-bold">{kpis.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Borradores</p>
            <p className="mt-2 text-2xl font-bold text-slate-600">{kpis.borradores}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Confirmados</p>
            <p className="mt-2 text-2xl font-bold text-emerald-600">{kpis.confirmados}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Cerrados</p>
            <p className="mt-2 text-2xl font-bold text-primary">{kpis.cerrados}</p>
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
                      <TableCell className="max-w-65 text-sm text-muted-foreground">
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
              <UserRound className="h-4 w-4" /> Contexto comercial
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {kpis.total} pedidos detectados sobre tipos reales; el detalle ya expone vendedor, canal
            y notas operativas desde la información actual.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4" /> Seguimiento
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {kpis.conCompromiso} pedidos ya muestran compromiso y {kpis.conSaldoPendiente} conservan
            saldo pendiente visible dentro del circuito actual.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Landmark className="h-4 w-4" /> Próxima fase
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {kpis.confirmados} confirmados y {kpis.cerrados} cerrados ya quedan controlados; reserva
            de stock, preparación, aprobaciones y transformación formal siguen pendientes.
          </CardContent>
        </Card>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
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
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
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
        </DialogContent>
      </Dialog>
    </div>
  )
}
