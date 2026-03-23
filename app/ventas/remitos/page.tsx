"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
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
  Truck,
  Package,
  MapPin,
  Landmark,
  ClipboardList,
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

function formatCustomerAddress(customer?: Tercero) {
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

function getDaysOffset(value?: string | null) {
  if (!value) return null
  const targetDate = new Date(value)
  const today = new Date()
  targetDate.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  return Math.floor((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function getCommitmentStatus(remito: ComprobanteDetalle) {
  if (!remito.fechaVto) return "Sin fecha compromiso informada"

  const offset = getDaysOffset(remito.fechaVto)
  if (offset === null) return "Sin fecha compromiso informada"
  if (offset < 0) return `Compromiso vencido hace ${Math.abs(offset)} días`
  if (offset === 0) return "Compromiso previsto para hoy"
  return `Compromiso previsto en ${offset} días`
}

function getDeliveryDocumentStatus(remito: ComprobanteDetalle) {
  if (remito.estado === "ANULADO") return "Documento logístico anulado"
  if (remito.estado === "BORRADOR") return "Pendiente de emisión definitiva"
  if (remito.estado === "PAGADO") return "Circuito documental cerrado"
  if (remito.estado === "PAGADO_PARCIAL") return "Cierre parcial informado"
  return "Documento emitido para seguimiento logístico"
}

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  BORRADOR: { label: "Borrador", variant: "secondary" },
  EMITIDO: { label: "Emitido", variant: "default" },
  PAGADO: { label: "Cerrado", variant: "outline" },
  PAGADO_PARCIAL: { label: "Cierre parcial", variant: "outline" },
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

type DeliveryFormItem = {
  id: string
  itemId: number
  descripcion: string
  cantidad: number
  precioUnitario: number
  descuento: number
  alicuotaIvaId: number
  alicuotaIvaPct: number
}

interface DeliveryNoteFormProps {
  tipoComprobanteId: number | null
  onClose: () => void
  onSaved: () => void
  emitir: (dto: EmitirComprobanteDto) => Promise<boolean>
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

function DeliveryNoteForm({ tipoComprobanteId, onClose, onSaved, emitir }: DeliveryNoteFormProps) {
  const defaultSucursalId = useDefaultSucursalId()
  const { sucursales } = useSucursales()
  const { terceros: clientes } = useTerceros()
  const { items } = useItems()
  const [tab, setTab] = useState("principal")
  const [form, setForm] = useState<EmitirComprobanteDto>(() =>
    createDeliveryNoteFormState(defaultSucursalId, tipoComprobanteId)
  )
  const [lineItems, setLineItems] = useState<DeliveryFormItem[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  const updateLineItem = (id: string, key: keyof DeliveryFormItem, value: string | number) => {
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
      setError("Sucursal, cliente, tipo de remito e ítems son obligatorios")
      return
    }

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
      observacion: form.observacion || null,
      fechaVto: form.fechaVto || null,
    }

    setSaving(true)
    setError(null)
    const ok = await emitir(payload)
    setSaving(false)

    if (ok) onSaved()
    else setError("No se pudo emitir el remito")
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
              <Label>Tipo de remito</Label>
              <Input value={form.tipoComprobanteId || ""} readOnly />
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
              <Label>Fecha compromiso</Label>
              <Input
                type="date"
                value={form.fechaVto ?? ""}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, fechaVto: event.target.value || null }))
                }
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Observación logística</Label>
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
                    Agregue productos para emitir el remito.
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
              <CardTitle className="text-base">Resumen del remito</CardTitle>
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
              El circuito legado contemplaba chofer, transporte, hoja de ruta, bultos, control de
              entrega parcial y vinculación con facturación posterior. Esta etapa deja estable la
              emisión documental real y reserva ese circuito ampliado para la siguiente fase.
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
          {saving ? "Emitiendo..." : "Emitir remito"}
        </Button>
      </div>
    </div>
  )
}

function DeliveryNoteDetail({
  remito,
  customerName,
  customer,
  typeName,
  sucursalName,
}: {
  remito: ComprobanteDetalle
  customerName: string
  customer?: Tercero
  typeName: string
  sucursalName: string
}) {
  const principalFields = [
    { label: "Comprobante", value: remito.nroComprobante ?? `#${remito.id}` },
    { label: "Tipo", value: typeName },
    { label: "Cliente", value: customerName },
    { label: "Sucursal", value: sucursalName },
    { label: "Fecha", value: formatDate(remito.fecha) },
    { label: "Fecha compromiso", value: formatDate(remito.fechaVto) },
    { label: "Estado", value: STATUS_CONFIG[remito.estado]?.label ?? remito.estado },
    { label: "Observación", value: remito.observacion ?? "-" },
  ]

  const customerFields = [
    { label: "Razón social", value: customerName },
    { label: "Nombre fantasía", value: customer?.nombreFantasia ?? "-" },
    { label: "CUIT / Documento", value: customer?.nroDocumento ?? "-" },
    { label: "Condición IVA", value: customer?.condicionIvaDescripcion ?? "-" },
    { label: "Domicilio", value: formatCustomerAddress(customer) },
    {
      label: "Canales",
      value:
        [customer?.telefono, customer?.celular, customer?.email].filter(Boolean).join(" · ") ||
        "Sin contacto visible",
    },
  ]

  const totalsFields = [
    { label: "Neto Gravado", value: formatMoney(remito.netoGravado) },
    { label: "Neto No Gravado", value: formatMoney(remito.netoNoGravado) },
    { label: "IVA RI", value: formatMoney(remito.ivaRi) },
    { label: "IVA RNI", value: formatMoney(remito.ivaRni) },
    { label: "Saldo", value: formatMoney(remito.saldo) },
    { label: "Total", value: formatMoney(remito.total) },
  ]

  const circuitFields = [
    { label: "Estado documental", value: getDeliveryDocumentStatus(remito) },
    { label: "Estado del compromiso", value: getCommitmentStatus(remito) },
    { label: "Renglones informados", value: String(remito.items.length) },
    {
      label: "Unidades a entregar",
      value: String(remito.items.reduce((total, item) => total + item.cantidad, 0)),
    },
    {
      label: "Saldo asociado",
      value: remito.saldo > 0 ? formatMoney(remito.saldo) : "Sin saldo pendiente",
    },
    {
      label: "Observación logística",
      value: remito.observacion ?? "Sin observaciones logísticas",
    },
    {
      label: "Cliente facturable",
      value: customer ? (customer.facturable ? "Sí" : "No") : "Sin dato",
    },
    {
      label: "Límite de crédito",
      value: customer?.limiteCredito ? formatMoney(customer.limiteCredito) : "Sin límite visible",
    },
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
              <ClipboardList className="h-4 w-4" /> Cabecera logística
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DetailFieldGrid fields={principalFields} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Landmark className="h-4 w-4" /> Cliente vinculado
            </CardTitle>
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
            {remito.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Este remito no devolvió detalle de ítems.
                </TableCell>
              </TableRow>
            ) : (
              remito.items.map((item) => (
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
            <DetailFieldGrid fields={totalsFields} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="circuito" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4" /> Estado operativo
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
              Esta etapa ya deja visible el estado documental, fecha compromiso y volumen informado
              por renglones; transporte, chofer, patente y zonas de reparto siguen reservados.
            </div>
            <div className="rounded-lg border p-4">
              Relación remito-factura, firma de recepción y auditoría documental ampliada quedan
              reservadas para la siguiente fase.
            </div>
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
  const { terceros: clientes } = useTerceros()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("todos")
  const [typeFilter, setTypeFilter] = useState("todos")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedRemito, setSelectedRemito] = useState<Comprobante | null>(null)
  const [detailRemito, setDetailRemito] = useState<ComprobanteDetalle | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const remitoTypes = useMemo(
    () => tipos.filter((tipo) => tipo.esVenta && tipo.afectaStock),
    [tipos]
  )

  const visibleRemitos = useMemo(() => {
    const validTypeIds = new Set(remitoTypes.map((tipo) => tipo.id))
    return comprobantes.filter((invoice) => validTypeIds.has(invoice.tipoComprobanteId))
  }, [comprobantes, remitoTypes])

  const defaultRemitoTypeId = remitoTypes[0]?.id ?? null

  const getCustomerName = useCallback(
    (terceroId: number) =>
      clientes.find((cliente) => cliente.id === terceroId)?.razonSocial ?? `#${terceroId}`,
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
    return visibleRemitos.filter((remito) => {
      const customerName = getCustomerName(remito.terceroId).toLowerCase()
      const typeName = getTypeName(
        remito.tipoComprobanteId,
        remito.tipoComprobanteDescripcion
      ).toLowerCase()
      const matchesSearch =
        term === "" ||
        (remito.nroComprobante ?? String(remito.id)).toLowerCase().includes(term) ||
        customerName.includes(term) ||
        typeName.includes(term)

      const matchesStatus = statusFilter === "todos" || remito.estado === statusFilter
      const matchesType = typeFilter === "todos" || String(remito.tipoComprobanteId) === typeFilter
      return matchesSearch && matchesStatus && matchesType
    })
  }, [visibleRemitos, searchTerm, statusFilter, typeFilter, getCustomerName, getTypeName])

  const kpis = {
    total: visibleRemitos.length,
    borradores: visibleRemitos.filter((remito) => remito.estado === "BORRADOR").length,
    emitidos: visibleRemitos.filter((remito) => remito.estado === "EMITIDO").length,
    anulados: visibleRemitos.filter((remito) => remito.estado === "ANULADO").length,
    conCompromiso: visibleRemitos.filter((remito) => Boolean(remito.fechaVto)).length,
  }

  const highlightedRemito =
    selectedRemito && filtered.some((remito) => remito.id === selectedRemito.id)
      ? selectedRemito
      : (filtered[0] ?? null)
  const highlightedCustomer = highlightedRemito
    ? clientes.find((cliente) => cliente.id === highlightedRemito.terceroId)
    : null
  const highlightedTypeName = highlightedRemito
    ? getTypeName(highlightedRemito.tipoComprobanteId, highlightedRemito.tipoComprobanteDescripcion)
    : "-"
  const highlightedFields = highlightedRemito
    ? [
        {
          label: "Cliente",
          value: highlightedCustomer?.razonSocial ?? `#${highlightedRemito.terceroId}`,
        },
        { label: "Tipo", value: highlightedTypeName },
        { label: "Compromiso", value: formatDate(highlightedRemito.fechaVto) },
        {
          label: "Saldo",
          value: highlightedRemito.saldo > 0 ? formatMoney(highlightedRemito.saldo) : "Sin saldo",
        },
        {
          label: "Circuito",
          value: getDeliveryDocumentStatus(highlightedRemito as ComprobanteDetalle),
        },
        {
          label: "Domicilio cliente",
          value: formatCustomerAddress(highlightedCustomer ?? undefined),
        },
      ]
    : []
  const highlightedCommitment = highlightedRemito
    ? getCommitmentStatus(highlightedRemito as ComprobanteDetalle)
    : "Sin remitos"
  const saldoPendienteTotal = filtered.reduce((total, remito) => total + remito.saldo, 0)
  const vencidos = filtered.filter((remito) => {
    const offset = getDaysOffset(remito.fechaVto)
    return offset !== null && offset < 0 && remito.estado !== "ANULADO"
  }).length

  const loadDetail = async (remito: Comprobante) => {
    setSelectedRemito(remito)
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
    if (selectedRemito?.id === remito.id) {
      const detail = await getById(remito.id)
      setDetailRemito(detail)
    }
  }

  useEffect(() => {
    if (!selectedRemito) return

    const nextSelected = comprobantes.find((remito) => remito.id === selectedRemito.id) ?? null

    if (!nextSelected) {
      setSelectedRemito(null)
      setIsDetailOpen(false)
      setDetailRemito(null)
      return
    }

    if (nextSelected !== selectedRemito) {
      setSelectedRemito(nextSelected)
    }
  }, [comprobantes, selectedRemito])

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Remitos de Venta</h1>
          <p className="text-muted-foreground">
            Emisión real de documentos con impacto logístico y base preparada para el circuito de
            entrega del sistema legado.
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)} disabled={!defaultRemitoTypeId}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Remito
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
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
            <CardTitle className="text-sm font-medium">Borradores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-600">{kpis.borradores}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Emitidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{kpis.emitidos}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Anulados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{kpis.anulados}</div>
          </CardContent>
        </Card>
      </div>

      {highlightedRemito ? (
        <Card>
          <CardHeader>
            <CardTitle>Remito destacado</CardTitle>
            <CardDescription>
              {highlightedRemito.nroComprobante ?? `#${highlightedRemito.id}`} ·{" "}
              {highlightedCustomer?.razonSocial ?? `Cliente #${highlightedRemito.terceroId}`}
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
              >
                {STATUS_CONFIG[highlightedRemito.estado]?.label ?? highlightedRemito.estado}
              </Badge>
              <Badge variant="outline">{highlightedTypeName}</Badge>
              <Badge variant="outline">{highlightedCommitment}</Badge>
            </div>

            <DetailFieldGrid fields={highlightedFields} />

            <div className="grid gap-4 md:grid-cols-3 text-sm text-muted-foreground">
              <div className="rounded-lg border p-4">
                Estado documental:{" "}
                {getDeliveryDocumentStatus(highlightedRemito as ComprobanteDetalle)}
              </div>
              <div className="rounded-lg border p-4">
                Compromisos vencidos visibles: {vencidos}. Saldo pendiente del conjunto filtrado:{" "}
                {formatMoney(saldoPendienteTotal)}.
              </div>
              <div className="rounded-lg border p-4">
                Cliente facturable:{" "}
                {highlightedCustomer ? (highlightedCustomer.facturable ? "Sí" : "No") : "Sin dato"}.
                Observación del maestro: {highlightedCustomer?.observacion ?? "Sin observaciones"}.
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
          <div className="grid gap-4 md:grid-cols-[1fr_240px_220px_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por remito, cliente o tipo..."
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
                <SelectItem value="PAGADO">Cerrado</SelectItem>
                <SelectItem value="PAGADO_PARCIAL">Cierre parcial</SelectItem>
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
          <CardTitle>Documentos logísticos ({filtered.length})</CardTitle>
          <CardDescription>
            Solo se listan comprobantes de venta con impacto de stock detectados desde la metadata
            real del backend.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Comprobante</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Compromiso</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin" />
                    Cargando remitos...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    <Truck className="mx-auto mb-2 h-8 w-8 opacity-50" />
                    No se encontraron remitos.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((remito) => {
                  const status = STATUS_CONFIG[remito.estado] ?? {
                    label: remito.estado,
                    variant: "outline" as const,
                  }

                  return (
                    <TableRow
                      key={remito.id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => loadDetail(remito)}
                    >
                      <TableCell className="font-mono font-semibold">
                        {remito.nroComprobante ?? `#${remito.id}`}
                      </TableCell>
                      <TableCell>
                        {getTypeName(remito.tipoComprobanteId, remito.tipoComprobanteDescripcion)}
                      </TableCell>
                      <TableCell>{getCustomerName(remito.terceroId)}</TableCell>
                      <TableCell>{formatDate(remito.fecha)}</TableCell>
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
                          {remito.estado !== "ANULADO" && (
                            <Button variant="ghost" size="icon" onClick={() => handleAnnul(remito)}>
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
              <Truck className="h-4 w-4" /> Emisión documental
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {kpis.total} remitos detectados sobre tipos reales con impacto de stock y{" "}
            {kpis.emitidos} ya emitidos dentro del flujo documental actual.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4" /> Seguimiento logístico
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {kpis.conCompromiso} remitos ya exponen fecha compromiso en pantalla y el detalle ahora
            resume estado documental, volumen y observaciones logísticas.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Landmark className="h-4 w-4" /> Circuito legado
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {kpis.anulados} anulados siguen visibles como control documental; transporte, hoja de
            ruta, entrega parcial, firma y vínculo con la facturación posterior quedan reservados.
          </CardContent>
        </Card>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo remito</DialogTitle>
            <DialogDescription>
              Emisión real de un comprobante logístico usando tipos de venta con impacto de stock.
            </DialogDescription>
          </DialogHeader>
          <DeliveryNoteForm
            key={`${defaultRemitoTypeId ?? 0}-${isFormOpen ? "open" : "closed"}`}
            tipoComprobanteId={defaultRemitoTypeId}
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
              {selectedRemito?.nroComprobante ?? "Detalle de remito"}
            </DialogTitle>
            <DialogDescription>
              {selectedRemito ? getCustomerName(selectedRemito.terceroId) : "Cargando..."}
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
              customerName={getCustomerName(selectedRemito.terceroId)}
              customer={clientes.find((cliente) => cliente.id === selectedRemito.terceroId)}
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
            {selectedRemito && selectedRemito.estado !== "ANULADO" && (
              <Button variant="destructive" onClick={() => handleAnnul(selectedRemito)}>
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
