"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import {
  AlertCircle,
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  Eye,
  FileSpreadsheet,
  Filter,
  Pencil,
  ReceiptText,
  RefreshCw,
  Scale,
  Search,
  ShieldCheck,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
import { Switch } from "@/components/ui/switch"
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
import { apiGet } from "@/lib/api"
import { useConfiguracion } from "@/lib/hooks/useConfiguracion"
import { useComprobantes, useComprobantesConfig } from "@/lib/hooks/useComprobantes"
import { useLegacyLocalCollection } from "@/lib/hooks/useLegacyLocalCollection"
import { useDefaultSucursalId, useSucursales } from "@/lib/hooks/useSucursales"
import { useTerceros } from "@/lib/hooks/useTerceros"
import { useMotivosDebito, useVentasDocumentos } from "@/lib/hooks/useVentasDocumentos"
import type { Comprobante, TipoComprobante } from "@/lib/types/comprobantes"
import type { Tercero } from "@/lib/types/terceros"
import type { MotivoDebitoVenta } from "@/lib/types/ventas"
import type { LegacySalesAdjustment } from "@/lib/ventas-legacy-data"
import {
  buildLegacyAdjustmentProfile,
  type LegacyAdjustmentAction,
  type LegacyAdjustmentProfile,
} from "@/lib/ventas-ajustes-legacy"

type AdjustmentKind = "Crédito" | "Débito"
type AdjustmentStatus = "BORRADOR" | "EMITIDO" | "APLICADO" | "ANULADO"

type AdjustmentCase = {
  id: string
  source: "backend" | "local"
  documentId?: number
  code: string
  customer: string
  customerId?: number
  kind: AdjustmentKind
  motive: string
  status: AdjustmentStatus
  date: string
  amount: number
  balance: number
  documentLabel: string
  backendStatus?: string
  note?: Comprobante
}

const LEGACY_ADJUSTMENT_SEED_IDS = new Set(["adj-001", "adj-002"])

function formatMoney(value: number) {
  return value.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  })
}

function formatDate(value?: string | null) {
  if (!value) return "-"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString("es-AR")
}

function normalizeText(value?: string | null) {
  return (value ?? "").toLowerCase()
}

function normalizeDocumentNumber(value?: string | null) {
  return (value ?? "").replace(/\s+/g, "").toUpperCase()
}

function formatCustomerAddress(customer?: Tercero | null) {
  if (!customer) return "Sin domicilio visible"

  const parts = [
    [customer.calle, customer.nro].filter(Boolean).join(" "),
    customer.localidadDescripcion,
    customer.codigoPostal,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(" · ") : "Sin domicilio visible"
}

function isCreditType(tipo: TipoComprobante) {
  const text = `${normalizeText(tipo.codigo)} ${normalizeText(tipo.descripcion)}`
  return text.includes("credito") || /(^|\W)nc($|\W)/.test(text)
}

function isDebitType(tipo: TipoComprobante) {
  const text = `${normalizeText(tipo.codigo)} ${normalizeText(tipo.descripcion)}`
  return text.includes("debito") || /(^|\W)nd($|\W)/.test(text)
}

function normalizeBackendStatus(status: string): AdjustmentStatus {
  if (status === "ANULADO") return "ANULADO"
  if (status === "PAGADO" || status === "PAGADO_PARCIAL") return "APLICADO"
  if (status === "BORRADOR") return "BORRADOR"
  return "EMITIDO"
}

function statusBadge(status: AdjustmentStatus) {
  if (status === "BORRADOR") return <Badge variant="secondary">Borrador</Badge>
  if (status === "EMITIDO") return <Badge>Emitido</Badge>
  if (status === "ANULADO") return <Badge variant="destructive">Anulado</Badge>
  return <Badge variant="outline">Aplicado</Badge>
}

function kindBadge(kind: AdjustmentKind) {
  return kind === "Débito" ? (
    <Badge variant="default">Débito</Badge>
  ) : (
    <Badge variant="outline">Crédito</Badge>
  )
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
    motivo: motivo || "Sin motivo explícito",
    alcance: alcance || "Sin alcance informado",
    referencia: referencia || "Sin documento de referencia",
    detalle: detalle.length > 0 ? detalle.join(" | ") : "Sin detalle operativo",
  }
}

function inferOriginFromObservation(
  observation?: string | null
): LegacyAdjustmentProfile["origen"] {
  const text = normalizeText(observation)
  if (text.includes("fiscal") || text.includes("iva") || text.includes("cae")) return "Fiscal"
  if (text.includes("log") || text.includes("flete") || text.includes("remito")) return "Logístico"
  if (text.includes("punto de venta") || text.includes("mostrador")) return "Punto de venta"
  return "Comercial"
}

function createAdjustmentAction(): LegacyAdjustmentAction {
  return {
    id: `adjustment-action-${globalThis.crypto.randomUUID()}`,
    descripcion: "",
    destino: "",
    importe: "",
  }
}

function createNewLocalCase(): LegacySalesAdjustment {
  return {
    id: `adj-local-${globalThis.crypto.randomUUID()}`,
    cliente: "",
    tipo: "Crédito",
    motivo: "",
    estado: "BORRADOR",
    fecha: new Date().toISOString().slice(0, 10),
    total: 0,
  }
}

function createProfileForNewCase(id: string): LegacyAdjustmentProfile {
  return {
    adjustmentId: id,
    origen: "Comercial",
    prioridad: "Media",
    resolucion: "Nota de crédito",
    puntoVenta: "",
    canal: "",
    autorizadoPor: "",
    requiereAprobacion: true,
    conciliado: false,
    documentoReferencia: "",
    observaciones: "",
    acciones: [createAdjustmentAction()],
  }
}

function composeAdjustmentObservation(
  row: LegacySalesAdjustment,
  profile: LegacyAdjustmentProfile
) {
  return [
    `Motivo: ${row.motivo}`,
    `Origen: ${profile.origen}`,
    `Resolución: ${profile.resolucion}`,
    profile.canal ? `Canal: ${profile.canal}` : null,
    profile.puntoVenta ? `Punto de venta: ${profile.puntoVenta}` : null,
    profile.documentoReferencia ? `Comprobante referencia: ${profile.documentoReferencia}` : null,
    profile.observaciones || null,
  ]
    .filter(Boolean)
    .join(" | ")
}

function resolveDebitoMotive(motivos: MotivoDebitoVenta[], row: LegacySalesAdjustment) {
  const normalized = normalizeText(row.motivo)
  const exact = motivos.find((motivo) => normalizeText(motivo.descripcion) === normalized)
  if (exact) return exact
  const partial = motivos.find(
    (motivo) =>
      normalized.includes(normalizeText(motivo.descripcion)) ||
      normalizeText(motivo.descripcion).includes(normalized)
  )
  return partial ?? motivos[0] ?? null
}

function buildBackendProfile(note: Comprobante, kind: AdjustmentKind): LegacyAdjustmentProfile {
  const parsed = parseOperationalObservation(note.observacion)
  return {
    adjustmentId: `backend-${note.id}`,
    origen: inferOriginFromObservation(note.observacion),
    prioridad: note.estado === "BORRADOR" ? "Alta" : note.saldo > 0 ? "Media" : "Baja",
    resolucion: kind === "Débito" ? "Nota de débito" : "Nota de crédito",
    puntoVenta: "",
    canal: "",
    autorizadoPor: "",
    requiereAprobacion: note.estado === "BORRADOR" || note.total >= 250000,
    conciliado: note.saldo <= 0 || note.estado === "PAGADO",
    documentoReferencia: parsed.referencia,
    observaciones: parsed.detalle,
    acciones: [
      {
        id: `adjustment-action-backend-${note.id}-1`,
        descripcion: parsed.motivo,
        destino: kind === "Débito" ? "Emitir nota de débito" : "Emitir nota de crédito",
        importe: String(note.total),
      },
    ],
  }
}

function buildBackendCase(
  note: Comprobante,
  kind: AdjustmentKind,
  customerName: string
): AdjustmentCase {
  const parsed = parseOperationalObservation(note.observacion)
  return {
    id: `backend-${note.id}`,
    source: "backend",
    documentId: note.id,
    code: note.nroComprobante ?? `#${note.id}`,
    customer: customerName,
    customerId: note.terceroId,
    kind,
    motive: parsed.motivo,
    status: normalizeBackendStatus(note.estado),
    date: note.fecha,
    amount: note.total,
    balance: note.saldo,
    documentLabel:
      note.tipoComprobanteDescripcion ?? (kind === "Débito" ? "Nota de débito" : "Nota de crédito"),
    backendStatus: note.estado,
    note,
  }
}

function buildLocalCase(row: LegacySalesAdjustment): AdjustmentCase {
  return {
    id: row.id,
    source: "local",
    code: row.id.toUpperCase(),
    customer: row.cliente,
    kind: row.tipo,
    motive: row.motivo,
    status: row.estado,
    date: row.fecha,
    amount: row.total,
    balance: row.estado === "APLICADO" ? 0 : row.total,
    documentLabel:
      row.tipo === "Débito"
        ? "Ajuste a documentar en nota de débito"
        : "Ajuste a documentar en nota de crédito",
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
          <span className="mb-1 block text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {field.label}
          </span>
          <p className="text-sm font-medium wrap-break-word">{field.value}</p>
        </div>
      ))}
    </div>
  )
}

function OperationsField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function AdjustmentEditor({
  initialCase,
  initialProfile,
  customers,
  onClose,
  onSave,
}: {
  initialCase: LegacySalesAdjustment
  initialProfile: LegacyAdjustmentProfile
  customers: Tercero[]
  onClose: () => void
  onSave: (
    row: LegacySalesAdjustment,
    profile: LegacyAdjustmentProfile,
    options?: { formalize?: boolean }
  ) => void | Promise<void>
}) {
  const [draftCase, setDraftCase] = useState(initialCase)
  const [draftProfile, setDraftProfile] = useState(initialProfile)

  const setCase = (patch: Partial<LegacySalesAdjustment>) => {
    setDraftCase((prev) => ({ ...prev, ...patch }))
  }

  const setProfile = (patch: Partial<LegacyAdjustmentProfile>) => {
    setDraftProfile((prev) => ({ ...prev, ...patch }))
  }

  const updateAction = (id: string, patch: Partial<LegacyAdjustmentAction>) => {
    setDraftProfile((prev) => ({
      ...prev,
      acciones: prev.acciones.map((action) =>
        action.id === id ? { ...action, ...patch } : action
      ),
    }))
  }

  const removeAction = (id: string) => {
    setDraftProfile((prev) => ({
      ...prev,
      acciones: prev.acciones.filter((action) => action.id !== id),
    }))
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="caso" className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-3">
          <TabsTrigger value="caso">Caso</TabsTrigger>
          <TabsTrigger value="circuito">Circuito</TabsTrigger>
          <TabsTrigger value="acciones">Acciones</TabsTrigger>
        </TabsList>

        <TabsContent value="caso" className="space-y-4 pt-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <OperationsField label="Cliente">
              <Select
                value={draftCase.cliente}
                onValueChange={(value) => setCase({ cliente: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cliente" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.razonSocial}>
                      {customer.razonSocial}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </OperationsField>
            <OperationsField label="Tipo">
              <Select
                value={draftCase.tipo}
                onValueChange={(value) => {
                  const kind = value as AdjustmentKind
                  setCase({ tipo: kind })
                  setProfile({
                    resolucion: kind === "Débito" ? "Nota de débito" : "Nota de crédito",
                  })
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Crédito">Crédito</SelectItem>
                  <SelectItem value="Débito">Débito</SelectItem>
                </SelectContent>
              </Select>
            </OperationsField>
            <OperationsField label="Estado">
              <Select
                value={draftCase.estado}
                onValueChange={(value) =>
                  setCase({ estado: value as LegacySalesAdjustment["estado"] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BORRADOR">Borrador</SelectItem>
                  <SelectItem value="EMITIDO">Emitido</SelectItem>
                  <SelectItem value="APLICADO">Aplicado</SelectItem>
                </SelectContent>
              </Select>
            </OperationsField>
            <OperationsField label="Fecha">
              <Input
                type="date"
                value={draftCase.fecha}
                onChange={(event) => setCase({ fecha: event.target.value })}
              />
            </OperationsField>
            <OperationsField label="Importe total">
              <Input
                type="number"
                min={0}
                step="0.01"
                value={draftCase.total}
                onChange={(event) => setCase({ total: Number(event.target.value) || 0 })}
              />
            </OperationsField>
            <OperationsField label="Documento referencia">
              <Input
                value={draftProfile.documentoReferencia}
                onChange={(event) => setProfile({ documentoReferencia: event.target.value })}
              />
            </OperationsField>
            <div className="space-y-1.5 md:col-span-2 xl:col-span-3">
              <Label>Motivo</Label>
              <Textarea
                value={draftCase.motivo}
                onChange={(event) => setCase({ motivo: event.target.value })}
                rows={3}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="circuito" className="space-y-4 pt-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <OperationsField label="Origen">
              <Select
                value={draftProfile.origen}
                onValueChange={(value) =>
                  setProfile({ origen: value as LegacyAdjustmentProfile["origen"] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Punto de venta">Punto de venta</SelectItem>
                  <SelectItem value="Comercial">Comercial</SelectItem>
                  <SelectItem value="Fiscal">Fiscal</SelectItem>
                  <SelectItem value="Logístico">Logístico</SelectItem>
                </SelectContent>
              </Select>
            </OperationsField>
            <OperationsField label="Prioridad">
              <Select
                value={draftProfile.prioridad}
                onValueChange={(value) =>
                  setProfile({ prioridad: value as LegacyAdjustmentProfile["prioridad"] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Alta">Alta</SelectItem>
                  <SelectItem value="Media">Media</SelectItem>
                  <SelectItem value="Baja">Baja</SelectItem>
                </SelectContent>
              </Select>
            </OperationsField>
            <OperationsField label="Resolución">
              <Select
                value={draftProfile.resolucion}
                onValueChange={(value) =>
                  setProfile({ resolucion: value as LegacyAdjustmentProfile["resolucion"] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Nota de crédito">Nota de crédito</SelectItem>
                  <SelectItem value="Nota de débito">Nota de débito</SelectItem>
                  <SelectItem value="Ajuste interno">Ajuste interno</SelectItem>
                </SelectContent>
              </Select>
            </OperationsField>
            <OperationsField label="Punto de venta">
              <Input
                value={draftProfile.puntoVenta}
                onChange={(event) => setProfile({ puntoVenta: event.target.value })}
              />
            </OperationsField>
            <OperationsField label="Canal">
              <Input
                value={draftProfile.canal}
                onChange={(event) => setProfile({ canal: event.target.value })}
              />
            </OperationsField>
            <OperationsField label="Autorizado por">
              <Input
                value={draftProfile.autorizadoPor}
                onChange={(event) => setProfile({ autorizadoPor: event.target.value })}
              />
            </OperationsField>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-between rounded-xl border p-4">
              <div>
                <p className="font-medium">Requiere aprobación</p>
                <p className="text-sm text-muted-foreground">
                  Control comercial/fiscal antes de emitir o cerrar.
                </p>
              </div>
              <Switch
                checked={draftProfile.requiereAprobacion}
                onCheckedChange={(value) => setProfile({ requiereAprobacion: value })}
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border p-4">
              <div>
                <p className="font-medium">Conciliado</p>
                <p className="text-sm text-muted-foreground">Marca cierre operativo del caso.</p>
              </div>
              <Switch
                checked={draftProfile.conciliado}
                onCheckedChange={(value) => setProfile({ conciliado: value })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Observaciones</Label>
            <Textarea
              value={draftProfile.observaciones}
              onChange={(event) => setProfile({ observaciones: event.target.value })}
              rows={4}
            />
          </div>
        </TabsContent>

        <TabsContent value="acciones" className="space-y-4 pt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base">Acciones operativas</CardTitle>
                <CardDescription>
                  Pasos documentales o comerciales necesarios para cerrar el ajuste.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                className="bg-transparent"
                onClick={() =>
                  setProfile({ acciones: [...draftProfile.acciones, createAdjustmentAction()] })
                }
              >
                Agregar acción
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {draftProfile.acciones.length > 0 ? (
                draftProfile.acciones.map((action) => (
                  <div
                    key={action.id}
                    className="grid gap-3 rounded-xl border p-3 md:grid-cols-[1.35fr_1.2fr_150px_auto]"
                  >
                    <Input
                      value={action.descripcion}
                      onChange={(event) =>
                        updateAction(action.id, { descripcion: event.target.value })
                      }
                      placeholder="Descripción"
                    />
                    <Input
                      value={action.destino}
                      onChange={(event) => updateAction(action.id, { destino: event.target.value })}
                      placeholder="Destino"
                    />
                    <Input
                      value={action.importe}
                      onChange={(event) => updateAction(action.id, { importe: event.target.value })}
                      placeholder="Importe"
                    />
                    <Button type="button" variant="ghost" onClick={() => removeAction(action.id)}>
                      Quitar
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Sin acciones documentadas para este caso.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <DialogFooter>
        <Button variant="outline" className="bg-transparent" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          variant="outline"
          className="bg-transparent"
          onClick={() => onSave(draftCase, draftProfile)}
        >
          Guardar ajuste
        </Button>
        {draftProfile.resolucion !== "Ajuste interno" ? (
          <Button onClick={() => onSave(draftCase, draftProfile, { formalize: true })}>
            Formalizar en backend
          </Button>
        ) : null}
      </DialogFooter>
    </div>
  )
}

export default function VentasAjustesPage() {
  const defaultSucursalId = useDefaultSucursalId()
  const { comprobantes, loading, error, totalPages, page, setPage, refetch, emitir } =
    useComprobantes({
      esVenta: true,
      sucursalId: defaultSucursalId,
    })
  const { tipos } = useComprobantesConfig()
  const { alicuotasIva } = useConfiguracion()
  const { crearNotaDebito, error: ventasDocumentosError } = useVentasDocumentos()
  const { motivos: motivosDebito } = useMotivosDebito()
  const { terceros } = useTerceros({ sucursalId: defaultSucursalId ?? null, soloActivos: false })
  const { sucursales } = useSucursales()
  const { rows: localCases, setRows: setLocalCases } =
    useLegacyLocalCollection<LegacySalesAdjustment>("ventas-ajustes-cases", [])
  const { rows: profiles, setRows: setProfiles } =
    useLegacyLocalCollection<LegacyAdjustmentProfile>("ventas-ajustes-profiles", [])

  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("todos")
  const [kindFilter, setKindFilter] = useState("todos")
  const [sourceFilter, setSourceFilter] = useState("todos")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false)
  const [formalizationError, setFormalizationError] = useState<string | null>(null)

  useEffect(() => {
    if (localCases.some((row) => LEGACY_ADJUSTMENT_SEED_IDS.has(row.id))) {
      setLocalCases((prev) => prev.filter((row) => !LEGACY_ADJUSTMENT_SEED_IDS.has(row.id)))
    }
    if (profiles.some((profile) => LEGACY_ADJUSTMENT_SEED_IDS.has(profile.adjustmentId))) {
      setProfiles((prev) =>
        prev.filter((profile) => !LEGACY_ADJUSTMENT_SEED_IDS.has(profile.adjustmentId))
      )
    }
  }, [localCases, profiles, setLocalCases, setProfiles])

  const activeLocalCases = useMemo(
    () => localCases.filter((row) => !LEGACY_ADJUSTMENT_SEED_IDS.has(row.id)),
    [localCases]
  )
  const activeProfiles = useMemo(
    () => profiles.filter((profile) => !LEGACY_ADJUSTMENT_SEED_IDS.has(profile.adjustmentId)),
    [profiles]
  )

  const customers = useMemo(() => terceros.filter((row) => row.esCliente), [terceros])
  const customerMap = useMemo(() => new Map(customers.map((row) => [row.id, row])), [customers])
  const sucursalMap = useMemo(
    () => new Map(sucursales.map((row) => [row.id, row.descripcion])),
    [sucursales]
  )
  const profileById = useMemo(
    () => new Map(activeProfiles.map((profile) => [profile.adjustmentId, profile])),
    [activeProfiles]
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

  const creditTypeIds = useMemo(
    () =>
      new Set(tipos.filter((tipo) => tipo.esVenta && isCreditType(tipo)).map((tipo) => tipo.id)),
    [tipos]
  )
  const debitTypeIds = useMemo(
    () => new Set(tipos.filter((tipo) => tipo.esVenta && isDebitType(tipo)).map((tipo) => tipo.id)),
    [tipos]
  )

  const liveCases = useMemo(() => {
    const creditCases = comprobantes
      .filter((row) => creditTypeIds.has(row.tipoComprobanteId))
      .map((row) =>
        buildBackendCase(
          row,
          "Crédito",
          customerMap.get(row.terceroId)?.razonSocial ?? `Cliente #${row.terceroId}`
        )
      )

    const debitCases = comprobantes
      .filter((row) => debitTypeIds.has(row.tipoComprobanteId))
      .map((row) =>
        buildBackendCase(
          row,
          "Débito",
          customerMap.get(row.terceroId)?.razonSocial ?? `Cliente #${row.terceroId}`
        )
      )

    return [...creditCases, ...debitCases].sort((a, b) =>
      `${b.date}-${b.id}`.localeCompare(`${a.date}-${a.id}`)
    )
  }, [comprobantes, creditTypeIds, customerMap, debitTypeIds])

  const localWorkbenchCases = useMemo(
    () =>
      activeLocalCases
        .map(buildLocalCase)
        .sort((a, b) => `${b.date}-${b.id}`.localeCompare(`${a.date}-${a.id}`)),
    [activeLocalCases]
  )

  const cases = useMemo(
    () => [...liveCases, ...localWorkbenchCases],
    [liveCases, localWorkbenchCases]
  )

  const getProfile = useCallback(
    (row: AdjustmentCase) => {
      if (row.source === "backend") {
        return profileById.get(row.id) ?? buildBackendProfile(row.note as Comprobante, row.kind)
      }

      const localRow = activeLocalCases.find((item) => item.id === row.id)
      return (
        profileById.get(row.id) ??
        (localRow ? buildLegacyAdjustmentProfile(localRow) : createProfileForNewCase(row.id))
      )
    },
    [activeLocalCases, profileById]
  )

  const filtered = useMemo(() => {
    const normalized = searchTerm.toLowerCase().trim()

    return cases.filter((row) => {
      const profile = getProfile(row)
      const matchesSearch =
        normalized === "" ||
        [
          row.code,
          row.customer,
          row.motive,
          row.documentLabel,
          profile.origen,
          profile.documentoReferencia,
          profile.canal,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalized)
      const matchesStatus = statusFilter === "todos" || row.status === statusFilter
      const matchesKind = kindFilter === "todos" || row.kind === kindFilter
      const matchesSource = sourceFilter === "todos" || row.source === sourceFilter

      return matchesSearch && matchesStatus && matchesKind && matchesSource
    })
  }, [cases, getProfile, kindFilter, searchTerm, sourceFilter, statusFilter])

  const highlighted = useMemo(
    () =>
      filtered.find((row) => row.status === "BORRADOR" || row.status === "EMITIDO") ??
      filtered[0] ??
      null,
    [filtered]
  )
  const highlightedProfile = highlighted ? getProfile(highlighted) : null
  const highlightedCustomer = highlighted?.customerId
    ? (customerMap.get(highlighted.customerId) ?? null)
    : null

  const totals = {
    backend: liveCases.length,
    local: localWorkbenchCases.length,
    amount: filtered.reduce((sum, row) => sum + row.amount, 0),
    pending: filtered.filter((row) => row.status === "BORRADOR" || row.status === "EMITIDO").length,
    approvals: cases.filter((row) => getProfile(row).requiereAprobacion).length,
    conciliated: cases.filter((row) => getProfile(row).conciliado).length,
  }

  const selected = selectedId ? (cases.find((row) => row.id === selectedId) ?? null) : null
  const selectedProfile = selected ? getProfile(selected) : null
  const editingLocalCase = editingId
    ? (activeLocalCases.find((row) => row.id === editingId) ?? null)
    : null
  const editingLocalProfile = editingId ? (profileById.get(editingId) ?? null) : null
  const currentSucursal = defaultSucursalId ? (sucursalMap.get(defaultSucursalId) ?? null) : null

  const saveCaseAndProfile = async (
    row: LegacySalesAdjustment,
    profile: LegacyAdjustmentProfile,
    options?: { formalize?: boolean }
  ) => {
    setFormalizationError(null)

    if (options?.formalize) {
      const customer = customers.find((entry) => entry.razonSocial === row.cliente) ?? null
      if (!customer) {
        setFormalizationError("Seleccioná un cliente válido antes de formalizar el ajuste.")
        return
      }

      const reference =
        comprobanteByNumber.get(normalizeDocumentNumber(profile.documentoReferencia)) ?? null
      if (!reference) {
        setFormalizationError(
          "Indicá un comprobante de referencia visible para formalizar el ajuste."
        )
        return
      }

      const referenceDetailWithItems = await apiGet<{
        id: number
        sucursalId: number
        terceroId: number
        fecha: string
        fechaVto?: string | null
        items: Array<{
          itemId: number
          descripcion: string
          cantidad: number
          precioUnitario: number
          descuento?: number
          alicuotaIvaId?: number | null
        }>
      }>(`/api/ventas/documentos/${reference.id}`)

      const baseItem = referenceDetailWithItems.items.find((item) => item.itemId > 0) ?? null
      if (!baseItem) {
        setFormalizationError(
          "El comprobante de referencia no tiene ítems utilizables para generar la nota."
        )
        return
      }

      const fallbackAlicuotaId =
        baseItem.alicuotaIvaId ??
        alicuotasIva.find((entry) => Number(entry.porcentaje) === 21)?.id ??
        alicuotasIva[0]?.id ??
        0
      if (!fallbackAlicuotaId) {
        setFormalizationError("No hay alícuotas IVA disponibles para formalizar el ajuste.")
        return
      }

      const observation = composeAdjustmentObservation(row, profile) || null
      const commonItem = {
        itemId: baseItem.itemId,
        descripcion: row.motivo || baseItem.descripcion,
        cantidad: 1,
        precioUnitario: Math.round(row.total),
        descuento: 0,
        alicuotaIvaId: fallbackAlicuotaId,
      }

      let ok = false
      if (row.tipo === "Débito") {
        const debitType = tipos.find((tipo) => debitTypeIds.has(tipo.id)) ?? null
        const debitMotive = resolveDebitoMotive(motivosDebito, row)
        if (!debitType || !debitMotive) {
          setFormalizationError(
            "No hay tipo o motivo de nota de débito disponible para formalizar el ajuste."
          )
          return
        }

        ok = await crearNotaDebito({
          sucursalId: reference.sucursalId,
          puntoFacturacionId: null,
          tipoComprobanteId: debitType.id,
          fecha: row.fecha,
          fechaVencimiento: null,
          terceroId: customer.id,
          monedaId: customer.monedaId ?? 1,
          cotizacion: 1,
          percepciones: 0,
          observacion: observation,
          comprobanteOrigenId: reference.id,
          motivoDebitoId: debitMotive.id,
          motivoDebitoObservacion: profile.observaciones || row.motivo || null,
          items: [
            {
              itemId: commonItem.itemId,
              descripcion: commonItem.descripcion,
              cantidad: commonItem.cantidad,
              precioUnitario: commonItem.precioUnitario,
              descuentoPct: 0,
              alicuotaIvaId: commonItem.alicuotaIvaId,
              comprobanteItemOrigenId: null,
            },
          ],
          listaPreciosId: null,
          vendedorId: customer.vendedorId ?? null,
          canalVentaId: null,
          condicionPagoId: null,
          plazoDias: null,
          emitir: true,
        })
      } else {
        const creditType = tipos.find((tipo) => creditTypeIds.has(tipo.id)) ?? null
        if (!creditType) {
          setFormalizationError(
            "No hay tipo de nota de crédito disponible para formalizar el ajuste."
          )
          return
        }

        ok = await emitir({
          sucursalId: reference.sucursalId,
          terceroId: customer.id,
          tipoComprobanteId: creditType.id,
          fecha: row.fecha,
          fechaVto: null,
          observacion: observation,
          items: [commonItem],
        })
      }

      if (!ok) {
        setFormalizationError(
          ventasDocumentosError ?? "No se pudo formalizar el ajuste en backend."
        )
        return
      }

      setLocalCases((prev) => prev.filter((item) => item.id !== row.id))
      setProfiles((prev) => prev.filter((item) => item.adjustmentId !== profile.adjustmentId))
      setEditingId(null)
      setIsNewDialogOpen(false)
      await refetch()
      return
    }

    setLocalCases((prev) => {
      const index = prev.findIndex((item) => item.id === row.id)
      if (index === -1) return [row, ...prev]
      return prev.map((item) => (item.id === row.id ? row : item))
    })
    setProfiles((prev) => {
      const index = prev.findIndex((item) => item.adjustmentId === profile.adjustmentId)
      if (index === -1) return [profile, ...prev]
      return prev.map((item) => (item.adjustmentId === profile.adjustmentId ? profile : item))
    })
    setEditingId(null)
    setIsNewDialogOpen(false)
  }

  const newCase = createNewLocalCase()
  const newProfile = createProfileForNewCase(newCase.id)

  return (
    <div className="space-y-6 pb-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-4xl space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Ajustes</h1>
          <p className="text-muted-foreground">
            Mesa de desvíos comerciales y documentales. Combina notas de crédito y débito reales del
            backend con un workbench local para casos todavía no documentados, manteniendo visibles
            diferencias de cotización, saldos y ajustes por punto de venta sin sembrar casos
            ficticios.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="bg-transparent" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Recargar
          </Button>
          <Button onClick={() => setIsNewDialogOpen(true)}>
            <CirclePlus className="mr-2 h-4 w-4" />
            Nuevo ajuste interno
          </Button>
        </div>
      </div>

      <Alert>
        <AlertTitle>Alcance actual</AlertTitle>
        <AlertDescription>
          El circuito histórico generaba ajustes automáticos desde imputaciones y diferencias de
          cotización. El backend actual ya expone notas reales, pero todavía no publica un módulo de
          ajustes como circuito autónomo; por eso esta vista mezcla comprobantes vivos con
          planificación local.
        </AlertDescription>
      </Alert>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {formalizationError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{formalizationError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Casos backend"
          value={totals.backend}
          description="Notas de crédito y débito reales detectadas en ventas."
        />
        <MetricCard
          title="Workbench local"
          value={totals.local}
          description="Casos pendientes de formalizar en documentación real."
        />
        <MetricCard
          title="Pendientes"
          value={totals.pending}
          description="Ajustes en borrador o emitidos sin cierre completo."
        />
        <MetricCard
          title="Monto visible"
          value={formatMoney(totals.amount)}
          description="Importe agregado del conjunto actualmente filtrado."
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Requieren aprobación"
          value={totals.approvals}
          description="Casos con validación comercial/fiscal todavía abierta."
        />
        <MetricCard
          title="Conciliados"
          value={totals.conciliated}
          description="Ajustes con cierre operativo ya marcado en la mesa."
        />
        <MetricCard
          title="Comprobantes ventas"
          value={comprobantes.filter((row) => row.estado !== "ANULADO").length}
          description="Contexto documental disponible para soporte del ajuste."
        />
        <MetricCard
          title="Sucursal operativa"
          value={currentSucursal ?? "Sin sucursal"}
          description="Base de lectura actual para notas y seguimiento."
        />
      </div>

      {highlighted && highlightedProfile ? (
        <Card className="overflow-hidden border-none bg-linear-to-br from-slate-950 via-stone-900 to-zinc-900 text-slate-50 shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl">Ajuste destacado</CardTitle>
            <CardDescription className="text-slate-300">
              {highlighted.code} · {highlighted.customer}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-[1.2fr_0.9fr]">
            <div className="grid gap-3 md:grid-cols-2">
              {[
                { label: "Tipo", value: highlighted.kind },
                { label: "Estado", value: highlighted.status },
                { label: "Origen", value: highlightedProfile.origen },
                { label: "Resolución", value: highlightedProfile.resolucion },
                { label: "Documento", value: highlighted.documentLabel },
                { label: "Importe", value: formatMoney(highlighted.amount) },
              ].map((field) => (
                <div key={field.label} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                    {field.label}
                  </p>
                  <p className="mt-2 text-sm font-medium wrap-break-word text-slate-100">
                    {field.value}
                  </p>
                </div>
              ))}
            </div>
            <div className="grid gap-3 text-sm text-slate-200">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                Motivo: {highlighted.motive}.
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                Documento de referencia:{" "}
                {highlightedProfile.documentoReferencia || "Sin referencia específica"}.
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                Cliente: {highlightedCustomer?.razonSocial ?? highlighted.customer}. Domicilio:{" "}
                {formatCustomerAddress(highlightedCustomer)}.
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                {highlighted.source === "backend"
                  ? "Caso respaldado por nota real del backend."
                  : "Caso mantenido en workbench local hasta formalizarlo en nota o ajuste interno."}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowRightLeft className="h-4 w-4" /> Herencia operativa
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Reproduce el criterio operativo para diferencias comerciales, fiscales y de cotización,
            separando qué ya está respaldado por comprobantes reales y qué sigue en workbench.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4" /> Aprobación y cierre
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Las aprobaciones, prioridades, canales y acciones siguen persistidas localmente hasta
            contar con servicio backend específico.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ReceiptText className="h-4 w-4" /> Salida documental
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <Button asChild variant="outline" className="bg-transparent">
              <Link href="/ventas/notas-credito">Notas de crédito</Link>
            </Button>
            <Button asChild variant="outline" className="bg-transparent">
              <Link href="/ventas/notas-debito">Notas de débito</Link>
            </Button>
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
          <div className="grid gap-4 xl:grid-cols-[1fr_220px_220px_220px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, motivo, origen, canal o documento..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-10"
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
                <SelectItem value="APLICADO">Aplicado</SelectItem>
                <SelectItem value="ANULADO">Anulado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={kindFilter} onValueChange={setKindFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="Crédito">Crédito</SelectItem>
                <SelectItem value="Débito">Débito</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Origen datos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="backend">Backend</SelectItem>
                <SelectItem value="local">Workbench local</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-4 w-4" /> Ajustes visibles ({filtered.length})
          </CardTitle>
          <CardDescription>
            Casos reales y workbench interno en una sola mesa operativa.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="w-full whitespace-nowrap">
            <Table className="min-w-7xl">
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Fuente</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Origen</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Importe</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-12 text-center text-muted-foreground">
                      Cargando ajustes...
                    </TableCell>
                  </TableRow>
                ) : null}
                {!loading && filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-12 text-center text-muted-foreground">
                      No se encontraron ajustes con los filtros actuales.
                    </TableCell>
                  </TableRow>
                ) : null}
                {filtered.map((row) => {
                  const profile = getProfile(row)
                  return (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => setSelectedId(row.id)}
                    >
                      <TableCell className="font-medium">{row.code}</TableCell>
                      <TableCell>
                        <Badge variant={row.source === "backend" ? "default" : "outline"}>
                          {row.source === "backend" ? "Backend" : "Local"}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-55 whitespace-normal">{row.customer}</TableCell>
                      <TableCell>{kindBadge(row.kind)}</TableCell>
                      <TableCell className="max-w-55 whitespace-normal">
                        {row.documentLabel}
                      </TableCell>
                      <TableCell>{profile.origen}</TableCell>
                      <TableCell>{statusBadge(row.status)}</TableCell>
                      <TableCell>{formatDate(row.date)}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatMoney(row.amount)}
                      </TableCell>
                      <TableCell
                        className="text-right"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setSelectedId(row.id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {row.source === "local" ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingId(row.id)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
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

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected?.code ?? "Detalle de ajuste"}</DialogTitle>
            <DialogDescription>
              Vista operativa del caso, su resolución y el respaldo documental disponible.
            </DialogDescription>
          </DialogHeader>
          {selected && selectedProfile ? (
            <Tabs defaultValue="principal" className="w-full">
              <TabsList className="grid h-auto w-full grid-cols-3">
                <TabsTrigger value="principal">Principal</TabsTrigger>
                <TabsTrigger value="circuito">Circuito</TabsTrigger>
                <TabsTrigger value="acciones">Acciones</TabsTrigger>
              </TabsList>

              <TabsContent value="principal" className="space-y-4 pt-4">
                <DetailFieldGrid
                  fields={[
                    { label: "Cliente", value: selected.customer },
                    { label: "Tipo", value: selected.kind },
                    { label: "Estado", value: selected.status },
                    { label: "Fecha", value: formatDate(selected.date) },
                    { label: "Importe", value: formatMoney(selected.amount) },
                    { label: "Saldo", value: formatMoney(selected.balance) },
                    { label: "Documento", value: selected.documentLabel },
                    { label: "Motivo", value: selected.motive },
                    {
                      label: "Sucursal",
                      value:
                        selected.note?.sucursalId !== undefined
                          ? (sucursalMap.get(selected.note.sucursalId) ??
                            `#${selected.note.sucursalId}`)
                          : (currentSucursal ?? "Sin sucursal"),
                    },
                  ]}
                />
              </TabsContent>

              <TabsContent value="circuito" className="space-y-4 pt-4">
                <DetailFieldGrid
                  fields={[
                    { label: "Origen", value: selectedProfile.origen },
                    { label: "Prioridad", value: selectedProfile.prioridad },
                    { label: "Resolución", value: selectedProfile.resolucion },
                    {
                      label: "Punto de venta",
                      value: selectedProfile.puntoVenta || "No informado",
                    },
                    { label: "Canal", value: selectedProfile.canal || "No informado" },
                    {
                      label: "Autorización",
                      value: selectedProfile.requiereAprobacion
                        ? selectedProfile.autorizadoPor || "Pendiente"
                        : "No requerida",
                    },
                    { label: "Conciliado", value: selectedProfile.conciliado ? "Sí" : "No" },
                    {
                      label: "Documento referencia",
                      value: selectedProfile.documentoReferencia || "Sin referencia específica",
                    },
                    {
                      label: "Observaciones",
                      value: selectedProfile.observaciones || "Sin observaciones adicionales",
                    },
                  ]}
                />
              </TabsContent>

              <TabsContent value="acciones" className="space-y-4 pt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FileSpreadsheet className="h-4 w-4" /> Acciones operativas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedProfile.acciones.length > 0 ? (
                      selectedProfile.acciones.map((action) => (
                        <div key={action.id} className="rounded-xl border p-3">
                          <p className="font-medium">
                            {action.descripcion || "Acción sin descripción"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Destino: {action.destino || "No informado"} · Importe:{" "}
                            {action.importe || "0"}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Sin acciones cargadas para este caso.
                      </p>
                    )}
                  </CardContent>
                </Card>

                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" className="bg-transparent">
                    <Link href="/ventas/notas-credito">Abrir notas de crédito</Link>
                  </Button>
                  <Button asChild variant="outline" className="bg-transparent">
                    <Link href="/ventas/notas-debito">Abrir notas de débito</Link>
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              className="bg-transparent"
              onClick={() => setSelectedId(null)}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editingLocalCase !== null} onOpenChange={(open) => !open && setEditingId(null)}>
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar ajuste interno</DialogTitle>
            <DialogDescription>
              Circuito persistido en el workbench y ahora formalizable como nota real usando el
              documento de referencia visible.
            </DialogDescription>
          </DialogHeader>
          {formalizationError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {formalizationError}
            </div>
          ) : null}
          {editingLocalCase && editingLocalProfile ? (
            <AdjustmentEditor
              initialCase={editingLocalCase}
              initialProfile={editingLocalProfile}
              customers={customers}
              onClose={() => setEditingId(null)}
              onSave={saveCaseAndProfile}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo ajuste interno</DialogTitle>
            <DialogDescription>
              Caso local para diferencias comerciales o fiscales, con salida directa a nota real si
              ya existe un comprobante de referencia visible.
            </DialogDescription>
          </DialogHeader>
          {formalizationError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {formalizationError}
            </div>
          ) : null}
          {isNewDialogOpen ? (
            <AdjustmentEditor
              initialCase={newCase}
              initialProfile={newProfile}
              customers={customers}
              onClose={() => setIsNewDialogOpen(false)}
              onSave={saveCaseAndProfile}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
