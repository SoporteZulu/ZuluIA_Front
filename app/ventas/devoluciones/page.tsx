"use client"

import Link from "next/link"
import { useCallback, useMemo, useState } from "react"
import { Eye, FileText, RotateCcw, Search, Filter, Edit, ClipboardCheck, Undo2 } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { apiGet } from "@/lib/api"
import { useConfiguracion } from "@/lib/hooks/useConfiguracion"
import { useLegacyLocalCollection } from "@/lib/hooks/useLegacyLocalCollection"
import { useComprobantes } from "@/lib/hooks/useComprobantes"
import { usePuntosFacturacion } from "@/lib/hooks/usePuntosFacturacion"
import { useDefaultSucursalId, useSucursales } from "@/lib/hooks/useSucursales"
import { useTerceros } from "@/lib/hooks/useTerceros"
import { useVentasDevoluciones } from "@/lib/hooks/useVentasDevoluciones"
import type { Comprobante, ComprobanteDetalle, TipoComprobante } from "@/lib/types/comprobantes"
import type { Tercero } from "@/lib/types/terceros"
import type { LegacySalesReturn } from "@/lib/ventas-legacy-data"
import {
  buildLegacyReturnProfile,
  type LegacyReturnProfile,
  type LegacyReturnResolutionLine,
} from "@/lib/ventas-devoluciones-legacy"

const INVOICE_AFIP_TYPES = new Set(["1", "6", "11"])

function formatMoney(value: number) {
  return value.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  })
}

function statusBadge(status: LegacySalesReturn["estado"]) {
  if (status === "ABIERTA") return <Badge variant="secondary">Abierta</Badge>
  if (status === "APROBADA") return <Badge>Aprobada</Badge>
  return <Badge variant="outline">Cerrada</Badge>
}

function priorityBadge(priority: LegacyReturnProfile["prioridad"]) {
  if (priority === "Alta") return <Badge variant="destructive">Alta</Badge>
  if (priority === "Media") return <Badge variant="secondary">Media</Badge>
  return <Badge variant="outline">Baja</Badge>
}

function createResolutionLine(): LegacyReturnResolutionLine {
  return {
    id: `return-line-${globalThis.crypto.randomUUID()}`,
    descripcion: "",
    accion: "",
    cantidad: "1",
  }
}

function normalizeText(value?: string | null) {
  return (value ?? "").trim().toLowerCase()
}

function normalizeDocumentNumber(value?: string | null) {
  return (value ?? "").replace(/\s+/g, "").toUpperCase()
}

function isInvoiceType(tipo?: TipoComprobante | null, fallbackLabel?: string | null) {
  if (tipo && !tipo.esVenta) return false

  const afipType = String(tipo?.tipoAfip ?? "").trim()
  const normalizedLabel = `${normalizeText(tipo?.codigo)} ${normalizeText(tipo?.descripcion)} ${normalizeText(fallbackLabel)}`

  return INVOICE_AFIP_TYPES.has(afipType) || normalizedLabel.includes("factura")
}

function isDeliveryNoteType(tipo?: TipoComprobante | null, fallbackLabel?: string | null) {
  if (tipo && !tipo.esVenta) return false

  const code = normalizeText(tipo?.codigo)
  const description = `${normalizeText(tipo?.descripcion)} ${normalizeText(fallbackLabel)}`

  return description.includes("remito") || code.startsWith("rem")
}

function mapBackendEstado(estado: string): LegacySalesReturn["estado"] {
  if (estado === "BORRADOR") return "ABIERTA"
  if (estado === "ANULADO") return "CERRADA"
  return "APROBADA"
}

function resolveModalidad(
  reingresaStock?: boolean,
  acreditaCuentaCorriente?: boolean
): LegacyReturnProfile["modalidad"] {
  if (reingresaStock && acreditaCuentaCorriente) return "Mixta"
  if (reingresaStock) return "Con stock"
  return "No valorizada"
}

function buildLiveReturnRow(record: {
  detalle: ComprobanteDetalle
  cliente: string
  deposito: string
}): LegacySalesReturn {
  return {
    id: `backend-${record.detalle.id}`,
    cliente: record.cliente,
    factura: record.detalle.comprobanteOrigenNumero ?? "-",
    remito: record.detalle.comprobanteOrigenTipo?.toLowerCase().includes("remito")
      ? (record.detalle.comprobanteOrigenNumero ?? "-")
      : "-",
    motivo:
      record.detalle.motivoDevolucionDescripcion ??
      record.detalle.observacionDevolucion ??
      "Devolución registrada",
    estado: mapBackendEstado(record.detalle.estado),
    fecha: record.detalle.fecha,
    deposito: record.deposito,
    total: Number(record.detalle.total ?? 0),
  }
}

function buildLiveReturnProfile(record: {
  detalle: ComprobanteDetalle
  cliente: string
  sucursal: string
  deposito: string
}): LegacyReturnProfile {
  const detalle = record.detalle
  return {
    returnId: `backend-${detalle.id}`,
    modalidad: resolveModalidad(detalle.reingresaStock, detalle.acreditaCuentaCorriente),
    tipoComprobante: detalle.tipoComprobanteDescripcion ?? "Nota de crédito",
    numeroComprobante: detalle.nroComprobante ?? `#${detalle.id}`,
    canalIngreso: "Backend ventas",
    prioridad: detalle.autorizadorDevolucionId ? "Media" : "Alta",
    sectorResponsable: "Ventas / Postventa",
    sucursal: record.sucursal,
    condicionVenta: "Cuenta corriente",
    listaPrecios: "Origen comercial",
    fechaVencimiento: detalle.fechaVto ?? detalle.fecha,
    condicionIva: "No informada",
    cuit: "No informado",
    calle: "No informada",
    localidad: "No informada",
    provincia: "No informada",
    codigoPostal: "",
    telefono: "",
    observacionComprobante: detalle.observacion ?? "",
    condicionMercaderia: detalle.reingresaStock ? "Con reintegro" : "Sin reintegro",
    depositoDestino: record.deposito,
    requiereRetiro: false,
    generaNotaCredito: Boolean(detalle.acreditaCuentaCorriente),
    notaCreditoReferencia: detalle.nroComprobante ?? "",
    reingresaStock: Boolean(detalle.reingresaStock),
    autorizadoPor: detalle.autorizadorDevolucionNombre ?? "",
    causaRaiz:
      detalle.observacionDevolucion ??
      detalle.motivoDevolucionDescripcion ??
      "Devolución registrada en backend",
    observaciones: detalle.observacionDevolucion ?? "",
    items: detalle.items.map((item) => ({
      id: `return-line-backend-${detalle.id}-${item.id}`,
      descripcion: item.descripcion,
      accion: detalle.reingresaStock ? "Reingreso" : "Acreditación",
      cantidad: String(item.cantidad),
    })),
  }
}

function isReturnCandidateDocument(document: Comprobante, tipo?: TipoComprobante | null) {
  if (document.estado === "ANULADO" || document.estado === "BORRADOR") return false
  if (!normalizeDocumentNumber(document.nroComprobante)) return false

  const visibleAmount = Number(document.saldo > 0 ? document.saldo : (document.total ?? 0))
  if (visibleAmount <= 0) return false

  return (
    isInvoiceType(tipo, document.tipoComprobanteDescripcion) ||
    isDeliveryNoteType(tipo, document.tipoComprobanteDescripcion)
  )
}

function buildCandidateReturnRow(document: Comprobante, customerName: string): LegacySalesReturn {
  const type = (document.tipoComprobanteDescripcion ?? "").toLowerCase()
  const number = document.nroComprobante ?? `#${document.id}`
  return {
    id: `candidate-${document.id}`,
    cliente: customerName,
    factura: type.includes("factura") ? number : "-",
    remito: type.includes("remito") ? number : "-",
    motivo: "Pendiente de clasificar para devolución",
    estado: "ABIERTA",
    fecha: document.fecha,
    deposito: "Depósito a definir",
    total: Number(document.saldo > 0 ? document.saldo : (document.total ?? 0)),
  }
}

function buildCandidateReturnProfile(
  document: Comprobante,
  customer: Tercero | null,
  sucursal: string
): LegacyReturnProfile {
  return {
    returnId: `candidate-${document.id}`,
    modalidad: "No valorizada",
    tipoComprobante: document.tipoComprobanteDescripcion ?? "Documento origen",
    numeroComprobante: document.nroComprobante ?? `#${document.id}`,
    canalIngreso: "Mesa comercial",
    prioridad: document.saldo > 0 ? "Alta" : "Media",
    sectorResponsable: "Ventas / Postventa",
    sucursal,
    condicionVenta: customer?.perfilComercial?.condicionVenta ?? "Origen comercial",
    listaPrecios: "Origen comercial",
    fechaVencimiento: document.fechaVto ?? document.fecha,
    condicionIva: customer?.condicionIvaDescripcion ?? "No informada",
    cuit: customer?.nroDocumento ?? "No informado",
    calle: [customer?.calle, customer?.nro].filter(Boolean).join(" ") || "No informada",
    localidad: customer?.localidadDescripcion ?? "No informada",
    provincia: customer?.paisDescripcion ?? "No informada",
    codigoPostal: customer?.codigoPostal ?? "",
    telefono: customer?.telefono ?? customer?.celular ?? "",
    observacionComprobante: document.observacion ?? "",
    condicionMercaderia: "Pendiente de inspección",
    depositoDestino: "Depósito a definir",
    requiereRetiro: false,
    generaNotaCredito: true,
    notaCreditoReferencia: "",
    reingresaStock: false,
    autorizadoPor: "",
    causaRaiz: "Pendiente de clasificar",
    observaciones: "",
    items: [
      {
        id: `return-line-candidate-${document.id}`,
        descripcion:
          document.observacion || document.tipoComprobanteDescripcion || "Devolución pendiente",
        accion: "Inspección",
        cantidad: "1",
      },
    ],
  }
}

function resolveMotivoDevolucion(text: string) {
  const normalized = text.toLowerCase()
  if (normalized.includes("garant")) return 7
  if (normalized.includes("precio")) return 5
  if (normalized.includes("invent")) return 10
  if (normalized.includes("defect") || normalized.includes("falla")) return 1
  if (normalized.includes("entrega") || normalized.includes("equivoc")) return 2
  if (normalized.includes("desist")) return 3
  if (normalized.includes("venc")) return 4
  if (/tr[aá]nsito/.test(normalized) || normalized.includes("dañ")) return 6
  if (normalized.includes("sobrante") || normalized.includes("excedente")) return 8
  if (normalized.includes("cambio")) return 9
  return 99
}

function requiresAuthorization(motivoDevolucion: number) {
  return motivoDevolucion === 5 || motivoDevolucion === 7 || motivoDevolucion === 10
}

function resolveTipoComprobanteDevolucion(
  tiposComprobante: TipoComprobante[],
  origen?: ComprobanteDetalle | null
) {
  const candidates = tiposComprobante.filter(
    (tipo) => tipo.esVenta && tipo.descripcion.toLowerCase().includes("credito")
  )
  if (candidates.length === 0) return null

  const origenTipo = origen
    ? tiposComprobante.find((tipo) => tipo.id === origen.tipoComprobanteId)
    : null
  if (origenTipo?.letraAfip) {
    const sameLetter = candidates.find((tipo) => tipo.letraAfip === origenTipo.letraAfip)
    if (sameLetter) return sameLetter
  }

  return candidates[0]
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

function LegacyReturnDialog({
  row,
  initialProfile,
  onClose,
  onSave,
}: {
  row: LegacySalesReturn
  initialProfile: LegacyReturnProfile
  onClose: () => void
  onSave: (profile: LegacyReturnProfile) => void
}) {
  const [profile, setProfile] = useState<LegacyReturnProfile>(initialProfile)

  const set = (
    key: keyof LegacyReturnProfile,
    value: string | boolean | LegacyReturnResolutionLine[]
  ) => {
    setProfile((prev) => ({ ...prev, [key]: value }))
  }

  const updateItem = (id: string, patch: Partial<LegacyReturnResolutionLine>) => {
    setProfile((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }))
  }

  const removeItem = (id: string) => {
    setProfile((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }))
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
        La cabecera comercial, fiscal y logística de la devolución {row.id.toUpperCase()} se
        completa localmente hasta contar con un endpoint específico de gestión por ítem y
        resolución.
      </div>

      <Tabs defaultValue="cliente" className="w-full">
        <SalesTabsList className="md:grid-cols-3">
          <TabsTrigger value="cliente">Cliente</TabsTrigger>
          <TabsTrigger value="comprobante">Comprobante</TabsTrigger>
          <TabsTrigger value="resolucion">Resolución</TabsTrigger>
        </SalesTabsList>

        <TabsContent value="cliente" className="space-y-4 pt-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Sucursal</Label>
              <Input
                value={profile.sucursal}
                onChange={(event) => set("sucursal", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Condición IVA</Label>
              <Input
                value={profile.condicionIva}
                onChange={(event) => set("condicionIva", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>CUIT</Label>
              <Input value={profile.cuit} onChange={(event) => set("cuit", event.target.value)} />
            </div>
            <div className="space-y-1.5 xl:col-span-2">
              <Label>Calle</Label>
              <Input value={profile.calle} onChange={(event) => set("calle", event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Teléfono</Label>
              <Input
                value={profile.telefono}
                onChange={(event) => set("telefono", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Localidad</Label>
              <Input
                value={profile.localidad}
                onChange={(event) => set("localidad", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Provincia</Label>
              <Input
                value={profile.provincia}
                onChange={(event) => set("provincia", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Código postal</Label>
              <Input
                value={profile.codigoPostal}
                onChange={(event) => set("codigoPostal", event.target.value)}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="comprobante" className="space-y-4 pt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Tipo de comprobante</Label>
              <Input
                value={profile.tipoComprobante}
                onChange={(event) => set("tipoComprobante", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Número</Label>
              <Input
                value={profile.numeroComprobante}
                onChange={(event) => set("numeroComprobante", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Modalidad</Label>
              <Select value={profile.modalidad} onValueChange={(value) => set("modalidad", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="No valorizada">No valorizada</SelectItem>
                  <SelectItem value="Con stock">Con stock</SelectItem>
                  <SelectItem value="Mixta">Mixta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Prioridad</Label>
              <Select value={profile.prioridad} onValueChange={(value) => set("prioridad", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Alta">Alta</SelectItem>
                  <SelectItem value="Media">Media</SelectItem>
                  <SelectItem value="Baja">Baja</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Condición de venta</Label>
              <Input
                value={profile.condicionVenta}
                onChange={(event) => set("condicionVenta", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha de vencimiento</Label>
              <Input
                type="date"
                value={profile.fechaVencimiento}
                onChange={(event) => set("fechaVencimiento", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Lista de precios</Label>
              <Input
                value={profile.listaPrecios}
                onChange={(event) => set("listaPrecios", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Canal de ingreso</Label>
              <Input
                value={profile.canalIngreso}
                onChange={(event) => set("canalIngreso", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Sector responsable</Label>
              <Input
                value={profile.sectorResponsable}
                onChange={(event) => set("sectorResponsable", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Depósito destino</Label>
              <Input
                value={profile.depositoDestino}
                onChange={(event) => set("depositoDestino", event.target.value)}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Observación del comprobante</Label>
              <Textarea
                value={profile.observacionComprobante}
                onChange={(event) => set("observacionComprobante", event.target.value)}
                rows={3}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="resolucion" className="space-y-4 pt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Condición de mercadería</Label>
              <Input
                value={profile.condicionMercaderia}
                onChange={(event) => set("condicionMercaderia", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Autorizado por</Label>
              <Input
                value={profile.autorizadoPor}
                onChange={(event) => set("autorizadoPor", event.target.value)}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Referencia de nota de crédito</Label>
              <Input
                value={profile.notaCreditoReferencia}
                onChange={(event) => set("notaCreditoReferencia", event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium">Requiere retiro</p>
                <p className="text-sm text-muted-foreground">
                  Retiro coordinado con transporte o cliente.
                </p>
              </div>
              <Switch
                checked={profile.requiereRetiro}
                onCheckedChange={(value) => set("requiereRetiro", value)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium">Genera nota de crédito</p>
                <p className="text-sm text-muted-foreground">Resolución comercial asociada.</p>
              </div>
              <Switch
                checked={profile.generaNotaCredito}
                onCheckedChange={(value) => set("generaNotaCredito", value)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium">Reingresa stock</p>
                <p className="text-sm text-muted-foreground">Impacto logístico visible.</p>
              </div>
              <Switch
                checked={profile.reingresaStock}
                onCheckedChange={(value) => set("reingresaStock", value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Causa raíz</Label>
            <Textarea
              value={profile.causaRaiz}
              onChange={(event) => set("causaRaiz", event.target.value)}
              rows={3}
            />
          </div>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Ítems y resolución</CardTitle>
            <CardDescription>
              Detalle local del circuito de inspección y resolución.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            className="bg-transparent"
            onClick={() => set("items", [...profile.items, createResolutionLine()])}
          >
            Agregar línea
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {profile.items.length > 0 ? (
            profile.items.map((item) => (
              <div
                key={item.id}
                className="grid gap-3 rounded-lg border p-3 md:grid-cols-[1.4fr_1fr_120px_auto]"
              >
                <Input
                  value={item.descripcion}
                  onChange={(event) => updateItem(item.id, { descripcion: event.target.value })}
                  placeholder="Descripción"
                />
                <Input
                  value={item.accion}
                  onChange={(event) => updateItem(item.id, { accion: event.target.value })}
                  placeholder="Acción"
                />
                <Input
                  value={item.cantidad}
                  onChange={(event) => updateItem(item.id, { cantidad: event.target.value })}
                  placeholder="Cantidad"
                />
                <Button type="button" variant="ghost" onClick={() => removeItem(item.id)}>
                  Quitar
                </Button>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Sin líneas cargadas.</p>
          )}
        </CardContent>
      </Card>

      <div className="space-y-1.5">
        <Label>Observaciones</Label>
        <Textarea
          value={profile.observaciones}
          onChange={(event) => set("observaciones", event.target.value)}
          rows={4}
        />
      </div>

      <DialogFooter>
        <Button variant="outline" className="bg-transparent" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={() => onSave(profile)}>Guardar devolución</Button>
      </DialogFooter>
    </div>
  )
}

export default function VentasDevolucionesPage() {
  const defaultSucursalId = useDefaultSucursalId()
  const { comprobantes } = useComprobantes({ esVenta: true, sucursalId: defaultSucursalId })
  const { terceros: clientes } = useTerceros({ sucursalId: defaultSucursalId ?? null })
  const { sucursales } = useSucursales()
  const { puntos } = usePuntosFacturacion(defaultSucursalId)
  const { tiposComprobante } = useConfiguracion()
  const { rows: legacyProfiles, setRows: setLegacyProfiles } =
    useLegacyLocalCollection<LegacyReturnProfile>("ventas-devoluciones-legacy", [])
  const tipoComprobanteById = useMemo(
    () => new Map(tiposComprobante.map((tipo) => [tipo.id, tipo])),
    [tiposComprobante]
  )
  const customerById = useMemo(
    () => new Map(clientes.map((cliente) => [cliente.id, cliente])),
    [clientes]
  )
  const customerNameById = useMemo(
    () => new Map(clientes.map((cliente) => [cliente.id, cliente.razonSocial])),
    [clientes]
  )
  const sucursalNameById = useMemo(
    () => new Map(sucursales.map((sucursal) => [sucursal.id, sucursal.descripcion])),
    [sucursales]
  )
  const {
    devoluciones,
    error: devolucionesError,
    registrar,
  } = useVentasDevoluciones(comprobantes, customerNameById, sucursalNameById)
  const [selected, setSelected] = useState<LegacySalesReturn | null>(null)
  const [editing, setEditing] = useState<LegacySalesReturn | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterEstado, setFilterEstado] = useState("todos")
  const [filterModalidad, setFilterModalidad] = useState("todos")
  const [submitError, setSubmitError] = useState<string | null>(null)

  const normalizedSearchTerm = searchTerm.toLowerCase().trim()
  const legacyById = useMemo(
    () => new Map(legacyProfiles.map((profile) => [profile.returnId, profile])),
    [legacyProfiles]
  )
  const liveRows = useMemo(() => devoluciones.map(buildLiveReturnRow), [devoluciones])
  const liveProfileById = useMemo(
    () =>
      new Map(liveRows.map((row, index) => [row.id, buildLiveReturnProfile(devoluciones[index])])),
    [devoluciones, liveRows]
  )
  const liveOriginIds = useMemo(
    () => new Set(devoluciones.map((record) => record.detalle.comprobanteOrigenId).filter(Boolean)),
    [devoluciones]
  )
  const candidateSourceDocuments = useMemo(
    () =>
      comprobantes
        .filter(
          (row) =>
            isReturnCandidateDocument(row, tipoComprobanteById.get(row.tipoComprobanteId)) &&
            !liveOriginIds.has(row.id)
        )
        .slice(0, 40),
    [comprobantes, liveOriginIds, tipoComprobanteById]
  )
  const candidateRows = useMemo(
    () =>
      candidateSourceDocuments.map((row) =>
        buildCandidateReturnRow(
          row,
          customerNameById.get(row.terceroId) ?? `Cliente #${row.terceroId}`
        )
      ),
    [candidateSourceDocuments, customerNameById]
  )
  const candidateProfileById = useMemo(
    () =>
      new Map(
        candidateSourceDocuments.map((row) => [
          `candidate-${row.id}`,
          buildCandidateReturnProfile(
            row,
            customerById.get(row.terceroId) ?? null,
            sucursalNameById.get(row.sucursalId) ?? `Sucursal #${row.sucursalId}`
          ),
        ])
      ),
    [candidateSourceDocuments, customerById, sucursalNameById]
  )
  const visibleRows = useMemo(
    () =>
      [...liveRows, ...candidateRows].sort((left, right) =>
        `${right.fecha}-${right.id}`.localeCompare(`${left.fecha}-${left.id}`)
      ),
    [candidateRows, liveRows]
  )
  const comprobanteByNumber = useMemo(
    () =>
      new Map(
        comprobantes
          .filter((row) => normalizeDocumentNumber(row.nroComprobante) !== "")
          .map((row) => [normalizeDocumentNumber(row.nroComprobante), row])
      ),
    [comprobantes]
  )

  const getProfile = useCallback(
    (row: LegacySalesReturn) => {
      return (
        liveProfileById.get(row.id) ??
        candidateProfileById.get(row.id) ??
        legacyById.get(row.id) ??
        buildLegacyReturnProfile(row)
      )
    },
    [candidateProfileById, legacyById, liveProfileById]
  )

  const isLiveRow = (row: LegacySalesReturn) => liveProfileById.has(row.id)

  const saveProfile = async (profile: LegacyReturnProfile) => {
    setSubmitError(null)
    if (profile.returnId.startsWith("backend-")) {
      setEditing(null)
      return
    }

    const sourceRow = editing ?? visibleRows.find((row) => row.id === profile.returnId) ?? null
    if (!sourceRow) {
      setSubmitError("No se encontró la devolución base para registrar en backend.")
      return
    }

    const candidateDocumentId = sourceRow.id.startsWith("candidate-")
      ? Number(sourceRow.id.replace("candidate-", ""))
      : null
    const originComprobante =
      (candidateDocumentId !== null
        ? (comprobantes.find((row) => row.id === candidateDocumentId) ?? null)
        : null) ??
      comprobanteByNumber.get(normalizeDocumentNumber(sourceRow.factura)) ??
      comprobanteByNumber.get(normalizeDocumentNumber(sourceRow.remito)) ??
      null
    if (!originComprobante) {
      setSubmitError("No se pudo relacionar la devolución con un comprobante origen visible.")
      return
    }

    const originDetail = await apiGet<ComprobanteDetalle>(
      `/api/ventas/documentos/${originComprobante.id}`
    )
    const tipoComprobante = resolveTipoComprobanteDevolucion(tiposComprobante, originDetail)
    if (!tipoComprobante) {
      setSubmitError("No hay un tipo de comprobante de nota de crédito configurado para ventas.")
      return
    }

    const motivoDevolucion = resolveMotivoDevolucion(profile.causaRaiz || sourceRow.motivo)
    const autorizadorId = /^\d+$/.test(profile.autorizadoPor.trim())
      ? Number(profile.autorizadoPor.trim())
      : null
    if (requiresAuthorization(motivoDevolucion) && !autorizadorId) {
      setSubmitError(
        "Este motivo requiere un ID numérico de autorizador en el campo 'Autorizado por'."
      )
      return
    }

    const items = originDetail.items
      .filter(
        (item) =>
          item.itemId > 0 && Number(item.cantidad ?? 0) > 0 && Number(item.alicuotaIvaId ?? 0) > 0
      )
      .map((item) => ({
        itemId: item.itemId,
        descripcion: item.descripcion,
        cantidad: Number(item.cantidad ?? 0),
        precioUnitario: Number(item.precioUnitario ?? 0),
        descuento: Number(item.descuento ?? 0),
        alicuotaIvaId: Number(item.alicuotaIvaId ?? 0),
      }))
    if (items.length === 0) {
      setSubmitError("El comprobante origen no tiene ítems válidos para registrar la devolución.")
      return
    }

    const selectedCustomer =
      clientes.find((cliente) => cliente.id === originDetail.terceroId) ?? null
    const ok = await registrar({
      sucursalId: originDetail.sucursalId,
      puntoFacturacionId: puntos[0]?.id ?? null,
      tipoComprobanteId: tipoComprobante.id,
      fecha: sourceRow.fecha,
      fechaVencimiento: profile.fechaVencimiento || null,
      terceroId: originDetail.terceroId,
      monedaId: selectedCustomer?.monedaId ?? 1,
      cotizacion: 1,
      percepciones: 0,
      observacion: profile.observacionComprobante || null,
      comprobanteOrigenId: originDetail.id,
      items,
      reingresaStock: profile.reingresaStock,
      acreditaCuentaCorriente: profile.generaNotaCredito,
      motivoDevolucion,
      observacionDevolucion: profile.causaRaiz || sourceRow.motivo,
      autorizadorDevolucionId: autorizadorId,
    })

    if (!ok) return

    setLegacyProfiles((prev) => {
      const index = prev.findIndex((row) => row.returnId === profile.returnId)
      if (index === -1) return [...prev, profile]
      return prev.map((row) => (row.returnId === profile.returnId ? profile : row))
    })
    setEditing(null)
  }

  const filtered = useMemo(
    () =>
      visibleRows.filter((row) => {
        const profile = getProfile(row)
        const matchesSearch =
          normalizedSearchTerm === "" ||
          row.id.toLowerCase().includes(normalizedSearchTerm) ||
          row.cliente.toLowerCase().includes(normalizedSearchTerm) ||
          row.factura.toLowerCase().includes(normalizedSearchTerm) ||
          row.remito.toLowerCase().includes(normalizedSearchTerm) ||
          row.motivo.toLowerCase().includes(normalizedSearchTerm) ||
          profile.canalIngreso.toLowerCase().includes(normalizedSearchTerm) ||
          profile.sectorResponsable.toLowerCase().includes(normalizedSearchTerm)

        const matchesEstado = filterEstado === "todos" || row.estado === filterEstado
        const matchesModalidad =
          filterModalidad === "todos" || profile.modalidad === filterModalidad

        return matchesSearch && matchesEstado && matchesModalidad
      }),
    [filterEstado, filterModalidad, getProfile, normalizedSearchTerm, visibleRows]
  )

  const hasActiveFilters =
    normalizedSearchTerm !== "" || filterEstado !== "todos" || filterModalidad !== "todos"

  const highlighted = filtered.find((row) => row.estado === "ABIERTA") ?? filtered[0] ?? null

  const totals = useMemo(
    () => ({
      total: filtered.length,
      abiertas: filtered.filter((row) => row.estado === "ABIERTA").length,
      aprobadas: filtered.filter((row) => row.estado === "APROBADA").length,
      importe: filtered.reduce((sum, row) => sum + row.total, 0),
    }),
    [filtered]
  )
  const configured = useMemo(
    () => filtered.filter((row) => legacyById.has(row.id)).length,
    [filtered, legacyById]
  )
  const withCreditNote = useMemo(
    () => filtered.filter((row) => getProfile(row).generaNotaCredito).length,
    [filtered, getProfile]
  )
  const withStockReentry = useMemo(
    () => filtered.filter((row) => getProfile(row).reingresaStock).length,
    [filtered, getProfile]
  )
  const linkedDocuments = candidateSourceDocuments.length
  const highlightedProfile = highlighted ? getProfile(highlighted) : null
  const highlightedFields =
    highlighted && highlightedProfile
      ? [
          { label: "Comprobante", value: highlightedProfile.tipoComprobante },
          { label: "Número", value: highlightedProfile.numeroComprobante },
          { label: "Cliente", value: highlighted.cliente },
          { label: "Factura origen", value: highlighted.factura },
          { label: "Remito asociado", value: highlighted.remito },
          { label: "Modalidad", value: highlightedProfile.modalidad },
          { label: "Prioridad", value: highlightedProfile.prioridad },
          { label: "Canal", value: highlightedProfile.canalIngreso || "No informado" },
          { label: "Sector", value: highlightedProfile.sectorResponsable || "No informado" },
          {
            label: "Resolución",
            value: highlightedProfile.generaNotaCredito
              ? highlightedProfile.notaCreditoReferencia || "Genera nota de crédito"
              : "Sin nota de crédito",
          },
          {
            label: "Logística",
            value: highlightedProfile.reingresaStock
              ? `Reingresa a ${highlightedProfile.depositoDestino || highlighted.deposito}`
              : "Sin reingreso de stock",
          },
        ]
      : []

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Devoluciones</h1>
          <p className="mt-1 text-muted-foreground">
            Gestión comercial y logística de devoluciones con cabecera documental, cliente,
            resolución e impacto en stock visibles en una sola vista. Cuando existen devoluciones
            registradas, esta vista las toma desde backend sin alterar el layout actual.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/ventas/notas-credito">
            <Button variant="outline" className="bg-transparent">
              Notas de crédito
            </Button>
          </Link>
          <Link href="/ventas/remitos">
            <Button className="bg-slate-900 text-white hover:bg-slate-800">Ver remitos</Button>
          </Link>
        </div>
      </div>

      {devolucionesError && (
        <Alert variant="destructive">
          <AlertDescription>{devolucionesError}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Devoluciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.total}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {hasActiveFilters ? "Vista filtrada" : "Visibles en la mesa actual"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Abiertas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{totals.abiertas}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {hasActiveFilters ? "Pendientes dentro del filtro" : "Pendientes de resolución"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Aprobadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{totals.aprobadas}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {hasActiveFilters
                ? "Aprobadas dentro del filtro"
                : "Respaldadas o listas para cierre"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Importe visible</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(totals.importe)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Fichas locales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-sky-700">{configured}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Con nota de crédito</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">{withCreditNote}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Con reingreso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-700">{withStockReentry}</div>
          </CardContent>
        </Card>
      </div>

      {highlighted ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardDescription>Devolución prioritaria</CardDescription>
              <CardTitle className="mt-1 text-xl">
                {highlighted.cliente} · {highlighted.id.toUpperCase()}
              </CardTitle>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                {highlighted.motivo}. La devolución se procesa como{" "}
                {highlightedProfile?.modalidad.toLowerCase() ?? "modalidad no informada"}, con
                comprobante {highlightedProfile?.tipoComprobante ?? "sin tipo"} y depósito destino{" "}
                {highlightedProfile?.depositoDestino || highlighted.deposito}.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {statusBadge(highlighted.estado)}
                {highlightedProfile ? priorityBadge(highlightedProfile.prioridad) : null}
                <Badge variant="outline">{formatMoney(highlighted.total)}</Badge>
                <Badge variant="outline">
                  {highlightedProfile?.generaNotaCredito
                    ? highlightedProfile.notaCreditoReferencia || "Con nota de crédito"
                    : "Sin nota de crédito"}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <DetailFieldGrid fields={highlightedFields} />
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardCheck className="h-4 w-4" /> Cobertura operativa
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {configured > 0
              ? `${configured} fichas locales cargadas complementan el contexto operativo de la vista actual.`
              : "No hay fichas locales cargadas en la vista actual."}{" "}
            La grilla usa devoluciones backend o documentos reales candidatos en lugar de filas
            semilla.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" /> Resolución comercial
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {withCreditNote} devoluciones marcan emisión de nota de crédito y {withStockReentry}{" "}
            prevén reingreso a stock.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Undo2 className="h-4 w-4" /> Contexto vivo
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Hay {linkedDocuments} comprobantes origen candidatos visibles para cruzar el circuito
            documental y registrar nuevas devoluciones contra el servicio real.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cabecera documental</CardTitle>
            <CardDescription>
              Campos visibles inspirados en el formulario histórico de devolución de ventas.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-muted-foreground md:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Cliente y fiscal
              </p>
              <p className="mt-1 font-medium text-foreground wrap-break-word">
                {highlightedProfile
                  ? `${highlighted.cliente} · ${highlightedProfile.condicionIva}`
                  : "Sin devolución destacada"}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Comprobante
              </p>
              <p className="mt-1 font-medium text-foreground wrap-break-word">
                {highlightedProfile
                  ? `${highlightedProfile.tipoComprobante} ${highlightedProfile.numeroComprobante}`
                  : "Sin cabecera"}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Condición comercial
              </p>
              <p className="mt-1 font-medium text-foreground wrap-break-word">
                {highlightedProfile
                  ? `${highlightedProfile.condicionVenta} · ${highlightedProfile.listaPrecios}`
                  : "Sin condición comercial"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" /> Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-[1fr_220px_220px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, factura, remito o canal..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterEstado} onValueChange={setFilterEstado}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="ABIERTA">Abierta</SelectItem>
                <SelectItem value="APROBADA">Aprobada</SelectItem>
                <SelectItem value="CERRADA">Cerrada</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterModalidad} onValueChange={setFilterModalidad}>
              <SelectTrigger>
                <SelectValue placeholder="Modalidad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                <SelectItem value="No valorizada">No valorizada</SelectItem>
                <SelectItem value="Con stock">Con stock</SelectItem>
                <SelectItem value="Mixta">Mixta</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4" /> Devoluciones visibles
          </CardTitle>
          <CardDescription>
            Vista operativa inspirada en los formularios históricos de devolución no valorizada y
            con stock.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Comprobante</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Factura</TableHead>
                  <TableHead>Remito</TableHead>
                  <TableHead>Modalidad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Detalle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                      No hay devoluciones ni documentos candidatos para los filtros actuales.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.id.toUpperCase()}</TableCell>
                      <TableCell className="wrap-break-word">
                        {getProfile(row).tipoComprobante} {getProfile(row).numeroComprobante}
                      </TableCell>
                      <TableCell>{row.cliente}</TableCell>
                      <TableCell>{row.factura}</TableCell>
                      <TableCell>{row.remito}</TableCell>
                      <TableCell>{getProfile(row).modalidad}</TableCell>
                      <TableCell>{statusBadge(row.estado)}</TableCell>
                      <TableCell className="text-right">{formatMoney(row.total)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => setSelected(row)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {!isLiveRow(row) ? (
                          <Button variant="ghost" size="icon" onClick={() => setEditing(row)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <SalesDialogContent size="md">
          <DialogHeader>
            <DialogTitle>Detalle de devolución</DialogTitle>
            <DialogDescription>
              Cabecera documental, circuito comercial y resolución visible de la devolución.
            </DialogDescription>
          </DialogHeader>
          {selected ? (
            <Tabs defaultValue="principal" className="w-full">
              <SalesTabsList className="md:grid-cols-3">
                <TabsTrigger value="principal">Cliente</TabsTrigger>
                <TabsTrigger value="circuito">Comprobante</TabsTrigger>
                <TabsTrigger value="resolucion">Resolución</TabsTrigger>
              </SalesTabsList>
              <TabsContent value="principal" className="space-y-4 pt-4">
                <DetailFieldGrid
                  fields={[
                    { label: "Cliente", value: selected.cliente },
                    { label: "Sucursal", value: getProfile(selected).sucursal || "No informada" },
                    {
                      label: "Condición IVA",
                      value: getProfile(selected).condicionIva || "No informada",
                    },
                    { label: "CUIT", value: getProfile(selected).cuit || "No informado" },
                    {
                      label: "Dirección",
                      value:
                        [
                          getProfile(selected).calle,
                          getProfile(selected).localidad,
                          getProfile(selected).provincia,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "No informada",
                    },
                    { label: "Teléfono", value: getProfile(selected).telefono || "No informado" },
                  ]}
                />
              </TabsContent>
              <TabsContent value="circuito" className="space-y-4 pt-4">
                <DetailFieldGrid
                  fields={[
                    { label: "Fecha", value: selected.fecha },
                    { label: "Comprobante", value: getProfile(selected).tipoComprobante },
                    { label: "Número", value: getProfile(selected).numeroComprobante },
                    { label: "Total", value: formatMoney(selected.total) },
                    { label: "Factura origen", value: selected.factura },
                    { label: "Remito asociado", value: selected.remito },
                    { label: "Modalidad", value: getProfile(selected).modalidad },
                    {
                      label: "Condición de venta",
                      value: getProfile(selected).condicionVenta || "No informada",
                    },
                    {
                      label: "Lista de precios",
                      value: getProfile(selected).listaPrecios || "No informada",
                    },
                    {
                      label: "Fecha de vencimiento",
                      value: getProfile(selected).fechaVencimiento || "No informada",
                    },
                    { label: "Canal", value: getProfile(selected).canalIngreso || "No informado" },
                    {
                      label: "Sector",
                      value: getProfile(selected).sectorResponsable || "No informado",
                    },
                    {
                      label: "Condición",
                      value: getProfile(selected).condicionMercaderia || "No informada",
                    },
                    {
                      label: "Depósito destino",
                      value: getProfile(selected).depositoDestino || selected.deposito,
                    },
                    {
                      label: "Autorizado por",
                      value: getProfile(selected).autorizadoPor || "Pendiente",
                    },
                  ]}
                />
              </TabsContent>
              <TabsContent value="resolucion" className="space-y-4 pt-4">
                <DetailFieldGrid
                  fields={[
                    { label: "Motivo", value: selected.motivo },
                    {
                      label: "Causa raíz",
                      value: getProfile(selected).causaRaiz || selected.motivo,
                    },
                    {
                      label: "Nota de crédito",
                      value: getProfile(selected).generaNotaCredito
                        ? getProfile(selected).notaCreditoReferencia || "Sí, pendiente de emisión"
                        : "No",
                    },
                    {
                      label: "Reingresa stock",
                      value: getProfile(selected).reingresaStock ? "Sí" : "No",
                    },
                  ]}
                />
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Líneas de resolución</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {getProfile(selected).items.map((item) => (
                      <div key={item.id} className="rounded-lg border bg-muted/30 p-3">
                        <p className="font-medium">{item.descripcion || "Línea sin descripción"}</p>
                        <p className="text-sm text-muted-foreground">
                          Acción: {item.accion || "Sin acción"} · Cantidad: {item.cantidad || "-"}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <div className="flex flex-wrap gap-2">
                  <Link href="/ventas/facturas">
                    <Button variant="outline" className="bg-transparent">
                      Ir a facturas
                    </Button>
                  </Link>
                  <Link href="/ventas/remitos">
                    <Button variant="outline" className="bg-transparent">
                      Ir a remitos
                    </Button>
                  </Link>
                  <Link href="/ventas/notas-credito">
                    <Button>Resolver con nota de crédito</Button>
                  </Link>
                </div>
              </TabsContent>
            </Tabs>
          ) : null}
        </SalesDialogContent>
      </Dialog>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <SalesDialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Editar devolución</DialogTitle>
            <DialogDescription>
              La ficha conserva el mismo formato visual y ahora puede registrar la devolución en el
              backend cuando parte de una referencia documental visible.
            </DialogDescription>
          </DialogHeader>
          {submitError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {submitError}
            </div>
          ) : null}
          {editing ? (
            <LegacyReturnDialog
              row={editing}
              initialProfile={getProfile(editing)}
              onClose={() => setEditing(null)}
              onSave={saveProfile}
            />
          ) : null}
        </SalesDialogContent>
      </Dialog>
    </div>
  )
}
