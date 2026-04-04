"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import {
  AlertCircle,
  ArrowRightLeft,
  CircleDollarSign,
  Edit,
  Eye,
  Filter,
  GitCompareArrows,
  Landmark,
  Layers3,
  ReceiptText,
  RefreshCw,
  Search,
  ShieldAlert,
  Wallet,
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
import { useCobros } from "@/lib/hooks/useCobros"
import { useComprobantes } from "@/lib/hooks/useComprobantes"
import { useImputacionesHistorial } from "@/lib/hooks/useImputaciones"
import { useLegacyLocalCollection } from "@/lib/hooks/useLegacyLocalCollection"
import { useDefaultSucursalId, useSucursales } from "@/lib/hooks/useSucursales"
import { useTerceros } from "@/lib/hooks/useTerceros"
import type { Cobro } from "@/lib/types/cobros"
import type { Comprobante } from "@/lib/types/comprobantes"
import type { ImputacionDto } from "@/lib/types/imputaciones"
import type { LegacySalesAllocation } from "@/lib/ventas-legacy-data"
import {
  buildLegacyAllocationProfile,
  type LegacyAllocationLine,
  type LegacyAllocationProfile,
} from "@/lib/ventas-imputaciones-legacy"

function formatMoney(value: number) {
  return value.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  })
}

function formatDate(value?: string | null) {
  if (!value) return "Sin fecha"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString("es-AR")
}

function parseMoneyInput(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".").trim()
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

function statusBadge(status: LegacySalesAllocation["estado"]) {
  if (status === "PENDIENTE") return <Badge variant="secondary">Pendiente</Badge>
  if (status === "IMPUTADA") return <Badge>Imputada</Badge>
  return <Badge variant="destructive">Observada</Badge>
}

function createAllocationLine(): LegacyAllocationLine {
  return {
    id: `allocation-line-${globalThis.crypto.randomUUID()}`,
    referencia: "",
    tipo: "",
    importe: "",
  }
}

function formatCobroLabel(cobro: Cobro, customerName: string) {
  return `Cobro #${cobro.id} · ${customerName} · ${formatDate(cobro.fecha)} · ${formatMoney(cobro.total)}`
}

function formatComprobanteLabel(comprobante: Comprobante) {
  const header = comprobante.nroComprobante ?? `#${comprobante.id}`
  const type = comprobante.tipoComprobanteDescripcion ?? "Comprobante"
  return `${type} · ${header}`
}

function buildLocalAllocationRow(profile: LegacyAllocationProfile): LegacySalesAllocation {
  return {
    id: profile.allocationId,
    cliente: profile.cliente || "Cliente sin asignar",
    comprobante:
      profile.comprobanteOrigen || profile.comprobanteDestino || "Documento sin referencia",
    cuenta: profile.cuentaPuente || "Cuenta corriente ventas",
    centroCosto: profile.origen || "Mesa de imputación",
    estado: profile.estado,
    fecha: profile.fechaAplicacion,
    importe: parseMoneyInput(profile.importeAplicado),
  }
}

function buildSearchableText(row: LegacySalesAllocation, profile: LegacyAllocationProfile) {
  return [
    row.cliente,
    row.comprobante,
    row.cuenta,
    row.centroCosto,
    profile.modalidad,
    profile.origen,
    profile.operador,
    profile.comprobanteOrigen,
    profile.comprobanteDestino,
    profile.observaciones,
  ]
    .join(" ")
    .toLowerCase()
}

function buildLiveAllocationRow(
  entry: ImputacionDto,
  comprobanteById: Map<number, Comprobante>
): LegacySalesAllocation {
  const origin = comprobanteById.get(entry.comprobanteOrigenId)
  const destination = comprobanteById.get(entry.comprobanteDestinoId)

  return {
    id: `backend-${entry.id}`,
    cliente: "Cliente backend",
    comprobante: `${entry.tipoComprobanteOrigen} ${entry.numeroOrigen}`,
    cuenta:
      destination?.tipoComprobanteDescripcion ??
      origin?.tipoComprobanteDescripcion ??
      "Cuenta corriente ventas",
    centroCosto: entry.rolComprobante === "DESTINO" ? "Aplicación recibida" : "Aplicación emitida",
    estado: entry.anulada ? "OBSERVADA" : "IMPUTADA",
    fecha: entry.fecha,
    importe: Number(entry.importe ?? 0),
  }
}

function buildLiveAllocationProfile(
  entry: ImputacionDto,
  row: LegacySalesAllocation,
  comprobanteById: Map<number, Comprobante>,
  customerById: Map<number, { razonSocial: string }>,
  sucursalById: Map<number, { descripcion: string }>
): LegacyAllocationProfile {
  const origin = comprobanteById.get(entry.comprobanteOrigenId)
  const destination = comprobanteById.get(entry.comprobanteDestinoId)
  const customer =
    customerById.get(destination?.terceroId ?? origin?.terceroId ?? 0)?.razonSocial ?? row.cliente
  const sucursal =
    sucursalById.get(destination?.sucursalId ?? origin?.sucursalId ?? 0)?.descripcion ??
    "Sucursal no informada"

  return {
    allocationId: row.id,
    cliente: customer,
    terceroId: destination?.terceroId ?? origin?.terceroId ?? null,
    sucursalId: destination?.sucursalId ?? origin?.sucursalId ?? null,
    estado: row.estado,
    modalidad: entry.anulada ? "Desimputación" : "Manual",
    fechaAplicacion: entry.fecha,
    fechaOrigen: origin?.fecha ?? entry.fecha,
    fechaDestino: destination?.fecha ?? entry.fecha,
    origen: entry.rolComprobante === "DESTINO" ? "Historial recibido" : "Historial emitido",
    sucursal,
    prioridad: entry.anulada ? "Media" : "Alta",
    conciliado: !entry.anulada,
    permiteDesimputar: !entry.anulada,
    cuentaPuente: row.cuenta,
    comprobanteOrigen: `${entry.tipoComprobanteOrigen} ${entry.numeroOrigen}`,
    comprobanteDestino: `${entry.tipoComprobanteDestino} ${entry.numeroDestino}`,
    saldoComprobante: String(origin?.saldo ?? entry.importe),
    saldoDestino: String(destination?.saldo ?? entry.importe),
    importeAplicado: String(entry.importe),
    operador: "Backend",
    lote: "",
    observaciones: entry.motivoDesimputacion ?? "Imputación registrada en backend.",
    lineas: [
      {
        id: `allocation-line-backend-${entry.id}`,
        referencia: `${entry.tipoComprobanteOrigen} ${entry.numeroOrigen} -> ${entry.tipoComprobanteDestino} ${entry.numeroDestino}`,
        tipo: entry.anulada ? "Reversa" : "Aplicación",
        importe: String(entry.importe),
      },
    ],
  }
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

function LegacyAllocationDialog({
  initialProfile,
  onClose,
  onSave,
}: {
  initialProfile: LegacyAllocationProfile
  onClose: () => void
  onSave: (profile: LegacyAllocationProfile) => void
}) {
  const [profile, setProfile] = useState<LegacyAllocationProfile>(initialProfile)

  const setField = <K extends keyof LegacyAllocationProfile>(
    key: K,
    value: LegacyAllocationProfile[K]
  ) => {
    setProfile((prev) => ({ ...prev, [key]: value }))
  }

  const updateLine = (id: string, patch: Partial<LegacyAllocationLine>) => {
    setProfile((prev) => ({
      ...prev,
      lineas: prev.lineas.map((linea) => (linea.id === id ? { ...linea, ...patch } : linea)),
    }))
  }

  const removeLine = (id: string) => {
    setProfile((prev) => ({
      ...prev,
      lineas: prev.lineas.filter((linea) => linea.id !== id),
    }))
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="space-y-1.5 xl:col-span-2">
          <Label>Cliente</Label>
          <Input
            value={profile.cliente}
            onChange={(event) => setField("cliente", event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Estado</Label>
          <Select
            value={profile.estado}
            onValueChange={(value) => setField("estado", value as LegacySalesAllocation["estado"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDIENTE">Pendiente</SelectItem>
              <SelectItem value="IMPUTADA">Imputada</SelectItem>
              <SelectItem value="OBSERVADA">Observada</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Modalidad</Label>
          <Select
            value={profile.modalidad}
            onValueChange={(value) =>
              setField("modalidad", value as LegacyAllocationProfile["modalidad"])
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Manual">Manual</SelectItem>
              <SelectItem value="Masiva">Masiva</SelectItem>
              <SelectItem value="Desimputación">Desimputación</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Fecha de aplicación</Label>
          <Input
            type="date"
            value={profile.fechaAplicacion}
            onChange={(event) => setField("fechaAplicacion", event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Prioridad</Label>
          <Select
            value={profile.prioridad}
            onValueChange={(value) =>
              setField("prioridad", value as LegacyAllocationProfile["prioridad"])
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
        </div>
        <div className="space-y-1.5">
          <Label>Origen operativo</Label>
          <Input
            value={profile.origen}
            onChange={(event) => setField("origen", event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Sucursal</Label>
          <Input
            value={profile.sucursal}
            onChange={(event) => setField("sucursal", event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Cuenta puente</Label>
          <Input
            value={profile.cuentaPuente}
            onChange={(event) => setField("cuentaPuente", event.target.value)}
          />
        </div>
        <div className="space-y-1.5 xl:col-span-2">
          <Label>Documento origen</Label>
          <Input
            value={profile.comprobanteOrigen}
            onChange={(event) => setField("comprobanteOrigen", event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Fecha origen</Label>
          <Input
            value={profile.fechaOrigen}
            onChange={(event) => setField("fechaOrigen", event.target.value)}
          />
        </div>
        <div className="space-y-1.5 xl:col-span-2">
          <Label>Documento destino</Label>
          <Input
            value={profile.comprobanteDestino}
            onChange={(event) => setField("comprobanteDestino", event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Fecha destino</Label>
          <Input
            value={profile.fechaDestino}
            onChange={(event) => setField("fechaDestino", event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Saldo origen</Label>
          <Input
            value={profile.saldoComprobante}
            onChange={(event) => setField("saldoComprobante", event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Saldo destino</Label>
          <Input
            value={profile.saldoDestino}
            onChange={(event) => setField("saldoDestino", event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Importe aplicado</Label>
          <Input
            value={profile.importeAplicado}
            onChange={(event) => setField("importeAplicado", event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Operador</Label>
          <Input
            value={profile.operador}
            onChange={(event) => setField("operador", event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Lote</Label>
          <Input value={profile.lote} onChange={(event) => setField("lote", event.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="font-medium">Conciliado</p>
            <p className="text-sm text-muted-foreground">
              Marca conciliación del lote o aplicación.
            </p>
          </div>
          <Switch
            checked={profile.conciliado}
            onCheckedChange={(value) => setField("conciliado", value)}
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="font-medium">Permite desimputar</p>
            <p className="text-sm text-muted-foreground">
              Habilita el circuito de reversa disponible para la imputación.
            </p>
          </div>
          <Switch
            checked={profile.permiteDesimputar}
            onCheckedChange={(value) => setField("permiteDesimputar", value)}
          />
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Líneas de imputación</CardTitle>
            <CardDescription>
              Aplicaciones parciales, masivas o reversas documentadas localmente.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            className="bg-transparent"
            onClick={() => setField("lineas", [...profile.lineas, createAllocationLine()])}
          >
            Agregar línea
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {profile.lineas.length > 0 ? (
            profile.lineas.map((linea) => (
              <div
                key={linea.id}
                className="grid gap-3 rounded-lg border p-3 md:grid-cols-[1.4fr_1fr_140px_auto]"
              >
                <Input
                  value={linea.referencia}
                  onChange={(event) => updateLine(linea.id, { referencia: event.target.value })}
                  placeholder="Referencia"
                />
                <Input
                  value={linea.tipo}
                  onChange={(event) => updateLine(linea.id, { tipo: event.target.value })}
                  placeholder="Tipo"
                />
                <Input
                  value={linea.importe}
                  onChange={(event) => updateLine(linea.id, { importe: event.target.value })}
                  placeholder="Importe"
                />
                <Button type="button" variant="ghost" onClick={() => removeLine(linea.id)}>
                  Quitar
                </Button>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Sin líneas documentadas.</p>
          )}
        </CardContent>
      </Card>

      <div className="space-y-1.5">
        <Label>Observaciones</Label>
        <Textarea
          value={profile.observaciones}
          onChange={(event) => setField("observaciones", event.target.value)}
          rows={4}
        />
      </div>

      <DialogFooter>
        <Button variant="outline" className="bg-transparent" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={() => onSave(profile)}>Guardar circuito</Button>
      </DialogFooter>
    </div>
  )
}

export default function VentasImputacionesPage() {
  const defaultSucursalId = useDefaultSucursalId()
  const {
    cobros,
    error: cobrosError,
    refetch: refetchCobros,
  } = useCobros({
    sucursalId: defaultSucursalId,
  })
  const {
    comprobantes,
    error: comprobantesError,
    refetch: refetchComprobantes,
  } = useComprobantes({ esVenta: true, sucursalId: defaultSucursalId })
  const { terceros: clientes } = useTerceros({ sucursalId: defaultSucursalId ?? null })
  const { sucursales } = useSucursales()
  const {
    imputaciones,
    error: imputacionesError,
    desimputar,
  } = useImputacionesHistorial(comprobantes.map((row) => row.id))
  const { rows: legacyProfiles, setRows: setLegacyProfiles } =
    useLegacyLocalCollection<LegacyAllocationProfile>("ventas-imputaciones-legacy", [])

  const [selected, setSelected] = useState<LegacySalesAllocation | null>(null)
  const [editing, setEditing] = useState<LegacySalesAllocation | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterEstado, setFilterEstado] = useState("todos")
  const [filterModalidad, setFilterModalidad] = useState("todos")
  const [filterClienteId, setFilterClienteId] = useState("todos")
  const [filterSucursalId, setFilterSucursalId] = useState("todos")
  const [draftClienteId, setDraftClienteId] = useState("")
  const [draftSucursalId, setDraftSucursalId] = useState("")
  const [draftCobroId, setDraftCobroId] = useState("")
  const [draftComprobanteId, setDraftComprobanteId] = useState("")
  const [draftFechaAplicacion, setDraftFechaAplicacion] = useState(
    new Date().toISOString().slice(0, 10)
  )
  const [draftModalidad, setDraftModalidad] =
    useState<LegacyAllocationProfile["modalidad"]>("Manual")
  const [draftOperador, setDraftOperador] = useState("")
  const [draftImporte, setDraftImporte] = useState("")
  const [draftObservaciones, setDraftObservaciones] = useState("")
  const effectiveDraftSucursalId =
    draftSucursalId || (defaultSucursalId ? String(defaultSucursalId) : "")

  const customerById = useMemo(
    () => new Map(clientes.map((cliente) => [cliente.id, cliente])),
    [clientes]
  )
  const sucursalById = useMemo(
    () => new Map(sucursales.map((sucursal) => [sucursal.id, sucursal])),
    [sucursales]
  )
  const comprobanteById = useMemo(
    () => new Map(comprobantes.map((row) => [row.id, row])),
    [comprobantes]
  )
  const profileById = useMemo(
    () => new Map(legacyProfiles.map((profile) => [profile.allocationId, profile])),
    [legacyProfiles]
  )
  const liveRows = useMemo(
    () => imputaciones.map((entry) => buildLiveAllocationRow(entry, comprobanteById)),
    [imputaciones, comprobanteById]
  )
  const liveProfileById = useMemo(
    () =>
      new Map(
        imputaciones.map((entry) => {
          const row = buildLiveAllocationRow(entry, comprobanteById)
          return [
            row.id,
            buildLiveAllocationProfile(entry, row, comprobanteById, customerById, sucursalById),
          ]
        })
      ),
    [imputaciones, comprobanteById, customerById, sucursalById]
  )

  const localOnlyRows = useMemo(
    () =>
      legacyProfiles
        .filter((profile) => !profile.allocationId.startsWith("backend-"))
        .map(buildLocalAllocationRow),
    [legacyProfiles]
  )

  const allocations = useMemo(
    () =>
      [...localOnlyRows, ...liveRows].sort((left, right) =>
        `${right.fecha}-${right.id}`.localeCompare(`${left.fecha}-${left.id}`)
      ),
    [liveRows, localOnlyRows]
  )

  const getProfile = (row: LegacySalesAllocation) => {
    return (
      liveProfileById.get(row.id) ?? profileById.get(row.id) ?? buildLegacyAllocationProfile(row)
    )
  }

  const isLiveRow = (row: LegacySalesAllocation) => liveProfileById.has(row.id)

  const saveProfile = (profile: LegacyAllocationProfile) => {
    setLegacyProfiles((prev) => {
      const index = prev.findIndex((row) => row.allocationId === profile.allocationId)
      if (index === -1) return [profile, ...prev]
      return prev.map((row) => (row.allocationId === profile.allocationId ? profile : row))
    })
    setEditing(null)
  }

  const pendingDocuments = useMemo(
    () => comprobantes.filter((row) => row.saldo > 0 && row.estado !== "ANULADO"),
    [comprobantes]
  )

  const selectedDraftCliente = draftClienteId
    ? (customerById.get(Number(draftClienteId)) ?? null)
    : null
  const selectedDraftSucursal = effectiveDraftSucursalId
    ? (sucursalById.get(Number(effectiveDraftSucursalId)) ?? null)
    : null
  const availableCobros = useMemo(
    () =>
      cobros.filter((row) => {
        const matchesCliente = !draftClienteId || row.terceroId === Number(draftClienteId)
        const matchesSucursal =
          !effectiveDraftSucursalId || row.sucursalId === Number(effectiveDraftSucursalId)
        return matchesCliente && matchesSucursal
      }),
    [cobros, draftClienteId, effectiveDraftSucursalId]
  )
  const availableComprobantes = useMemo(
    () =>
      pendingDocuments.filter((row) => {
        const matchesCliente = !draftClienteId || row.terceroId === Number(draftClienteId)
        const matchesSucursal =
          !effectiveDraftSucursalId || row.sucursalId === Number(effectiveDraftSucursalId)
        return matchesCliente && matchesSucursal
      }),
    [pendingDocuments, draftClienteId, effectiveDraftSucursalId]
  )
  const selectedCobro = availableCobros.find((row) => String(row.id) === draftCobroId) ?? null
  const selectedComprobante =
    availableComprobantes.find((row) => String(row.id) === draftComprobanteId) ?? null
  const draftImporteValue = parseMoneyInput(draftImporte)

  const draftWarnings = useMemo(() => {
    const warnings: string[] = []
    if (!draftClienteId) warnings.push("Seleccioná el cliente antes de imputar.")
    if (!selectedCobro) warnings.push("Definí el cobro origen a aplicar.")
    if (!selectedComprobante) warnings.push("Elegí el comprobante destino con saldo.")
    if (draftImporteValue <= 0) warnings.push("Indicá un importe mayor a cero.")
    if (selectedCobro && draftImporteValue > selectedCobro.total) {
      warnings.push("El importe supera el total del cobro origen seleccionado.")
    }
    if (selectedComprobante && draftImporteValue > selectedComprobante.saldo) {
      warnings.push("El importe supera el saldo pendiente del comprobante destino.")
    }
    return warnings
  }, [draftClienteId, draftImporteValue, selectedCobro, selectedComprobante])

  const handleRegisterDraft = () => {
    if (!selectedCobro || !selectedComprobante || !selectedDraftCliente) return

    const allocationId = `local-${globalThis.crypto.randomUUID()}`
    const importe = draftImporteValue
    const profile: LegacyAllocationProfile = {
      allocationId,
      cliente: selectedDraftCliente.razonSocial,
      terceroId: selectedDraftCliente.id,
      sucursalId: selectedComprobante.sucursalId,
      estado: importe >= selectedComprobante.saldo ? "IMPUTADA" : "PENDIENTE",
      modalidad: draftModalidad,
      fechaAplicacion: draftFechaAplicacion,
      fechaOrigen: selectedCobro.fecha,
      fechaDestino: selectedComprobante.fecha,
      origen: "Mesa de imputación ventas",
      sucursal: selectedDraftSucursal?.descripcion ?? `Sucursal #${selectedComprobante.sucursalId}`,
      prioridad: importe >= selectedComprobante.saldo ? "Alta" : "Media",
      conciliado: false,
      permiteDesimputar: true,
      cuentaPuente: selectedComprobante.tipoComprobanteDescripcion ?? "Cuenta corriente ventas",
      comprobanteOrigen: formatCobroLabel(selectedCobro, selectedDraftCliente.razonSocial),
      comprobanteDestino: formatComprobanteLabel(selectedComprobante),
      saldoComprobante: String(selectedCobro.total),
      saldoDestino: String(selectedComprobante.saldo),
      importeAplicado: String(importe),
      operador: draftOperador,
      lote: draftModalidad === "Masiva" ? `LOTE-${new Date().getTime()}` : "",
      observaciones: draftObservaciones,
      lineas: [
        {
          id: `allocation-line-${allocationId}-1`,
          referencia: `${formatCobroLabel(selectedCobro, selectedDraftCliente.razonSocial)} -> ${formatComprobanteLabel(selectedComprobante)}`,
          tipo: draftModalidad === "Desimputación" ? "Reversa" : "Aplicación",
          importe: String(importe),
        },
      ],
    }

    saveProfile(profile)
    setSelected(buildLocalAllocationRow(profile))
    setDraftCobroId("")
    setDraftComprobanteId("")
    setDraftImporte("")
    setDraftObservaciones("")
    setDraftOperador("")
  }

  const normalizedSearchTerm = searchTerm.toLowerCase().trim()
  const filtered = allocations.filter((row) => {
    const profile = getProfile(row)
    const matchesSearch =
      normalizedSearchTerm === "" ||
      buildSearchableText(row, profile).includes(normalizedSearchTerm)
    const matchesEstado = filterEstado === "todos" || profile.estado === filterEstado
    const matchesModalidad = filterModalidad === "todos" || profile.modalidad === filterModalidad
    const matchesCliente =
      filterClienteId === "todos" || profile.terceroId === Number(filterClienteId)
    const matchesSucursal =
      filterSucursalId === "todos" || profile.sucursalId === Number(filterSucursalId)

    return matchesSearch && matchesEstado && matchesModalidad && matchesCliente && matchesSucursal
  })

  const highlighted =
    filtered.find((row) => getProfile(row).estado === "PENDIENTE") ??
    filtered[0] ??
    allocations[0] ??
    null

  const totals = {
    total: allocations.length,
    pendientes: allocations.filter((row) => getProfile(row).estado === "PENDIENTE").length,
    imputadas: allocations.filter((row) => getProfile(row).estado === "IMPUTADA").length,
    monto: allocations.reduce((sum, row) => sum + row.importe, 0),
  }

  const pendingLiveDocs = pendingDocuments.length
  const livePendingTotal = pendingDocuments.reduce((sum, row) => sum + row.saldo, 0)
  const configured = legacyProfiles.length
  const localCreated = localOnlyRows.length
  const masivas = legacyProfiles.filter((profile) => profile.modalidad === "Masiva").length
  const reversables = legacyProfiles.filter((profile) => profile.permiteDesimputar).length
  const highlightedProfile = highlighted ? getProfile(highlighted) : null
  const highlightedFields =
    highlighted && highlightedProfile
      ? [
          { label: "Cliente", value: highlightedProfile.cliente || highlighted.cliente },
          { label: "Monto imputado", value: formatMoney(highlighted.importe) },
          { label: "Fecha aplicación", value: formatDate(highlightedProfile.fechaAplicacion) },
          {
            label: "Documento origen",
            value: highlightedProfile.comprobanteOrigen || highlighted.comprobante,
          },
          {
            label: "Documento destino",
            value: highlightedProfile.comprobanteDestino || "Pendiente de definición",
          },
          { label: "Modalidad", value: highlightedProfile.modalidad },
          { label: "Cuenta puente", value: highlightedProfile.cuentaPuente || highlighted.cuenta },
          { label: "Operador", value: highlightedProfile.operador || "Sin operador asignado" },
        ]
      : []

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Imputaciones</h1>
          <p className="mt-1 text-muted-foreground">
            Mesa operativa para seguir imputaciones reales del backend y documentar armados sobre
            cobros cuando la aplicación definitiva depende del alta del cobro.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="bg-transparent"
            onClick={() => {
              void refetchCobros()
              void refetchComprobantes()
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Recargar
          </Button>
          <Link href="/ventas/cobros">
            <Button variant="outline" className="bg-transparent">
              Cobros
            </Button>
          </Link>
          <Link href="/ventas/cuenta-corriente">
            <Button>Cuenta corriente</Button>
          </Link>
        </div>
      </div>

      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertDescription>
          El historial de imputaciones y la desimputación ya se leen contra backend. La mesa de
          cobros conserva la trazabilidad local para planificar aplicaciones que nacen desde el
          registro del cobro.
        </AlertDescription>
      </Alert>

      {cobrosError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{cobrosError}</AlertDescription>
        </Alert>
      )}
      {comprobantesError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{comprobantesError}</AlertDescription>
        </Alert>
      )}
      {imputacionesError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{imputacionesError}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-slate-200 bg-slate-50/70">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Trayectos</p>
            <p className="mt-2 text-2xl font-bold text-slate-950">{totals.total}</p>
            <p className="mt-1 text-xs text-slate-600">
              Filas visibles entre historial backend y armados locales documentados.
            </p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/80">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs uppercase tracking-[0.18em] text-amber-700">Pendientes</p>
            <p className="mt-2 text-2xl font-bold text-amber-950">{totals.pendientes}</p>
            <p className="mt-1 text-xs text-amber-800">
              Requieren cierre o aplicación parcial adicional.
            </p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50/80">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs uppercase tracking-[0.18em] text-emerald-700">Saldo vivo</p>
            <p className="mt-2 text-2xl font-bold text-emerald-950">{pendingLiveDocs}</p>
            <p className="mt-1 text-xs text-emerald-800">
              Comprobantes de venta con saldo aún aplicable.
            </p>
          </CardContent>
        </Card>
        <Card className="border-sky-200 bg-sky-50/80">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs uppercase tracking-[0.18em] text-sky-700">Monto visible</p>
            <p className="mt-2 text-2xl font-bold text-sky-950">{formatMoney(totals.monto)}</p>
            <p className="mt-1 text-xs text-sky-800">
              Con {formatMoney(livePendingTotal)} pendientes desde backend.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
        <Card className="border-primary/15 bg-primary/5">
          <CardHeader>
            <CardDescription>Mesa de imputación</CardDescription>
            <CardTitle className="mt-1 flex items-center gap-2 text-xl">
              <ArrowRightLeft className="h-5 w-5" /> Armar origen y destino
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {draftWarnings.length > 0 ? (
              <div className="grid gap-2 md:grid-cols-2">
                {draftWarnings.map((warning) => (
                  <div
                    key={warning}
                    className="rounded-lg border border-amber-200 bg-background/80 px-3 py-2 text-sm text-slate-700"
                  >
                    {warning}
                  </div>
                ))}
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-1.5 xl:col-span-2">
                <Label>Cliente</Label>
                <Select value={draftClienteId} onValueChange={setDraftClienteId}>
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
                <Label>Sucursal</Label>
                <Select value={effectiveDraftSucursalId} onValueChange={setDraftSucursalId}>
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
              <div className="space-y-1.5 xl:col-span-3">
                <Label>Cobro origen</Label>
                <Select value={draftCobroId} onValueChange={setDraftCobroId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cobro" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCobros.map((cobro) => (
                      <SelectItem key={cobro.id} value={String(cobro.id)}>
                        {formatCobroLabel(
                          cobro,
                          customerById.get(cobro.terceroId)?.razonSocial ??
                            `Cliente #${cobro.terceroId}`
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 xl:col-span-3">
                <Label>Comprobante destino</Label>
                <Select value={draftComprobanteId} onValueChange={setDraftComprobanteId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar comprobante con saldo" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableComprobantes.map((row) => (
                      <SelectItem key={row.id} value={String(row.id)}>
                        {`${formatComprobanteLabel(row)} · Saldo ${formatMoney(row.saldo)}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Fecha de aplicación</Label>
                <Input
                  type="date"
                  value={draftFechaAplicacion}
                  onChange={(event) => setDraftFechaAplicacion(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Modalidad</Label>
                <Select
                  value={draftModalidad}
                  onValueChange={(value) =>
                    setDraftModalidad(value as LegacyAllocationProfile["modalidad"])
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Manual">Manual</SelectItem>
                    <SelectItem value="Masiva">Masiva</SelectItem>
                    <SelectItem value="Desimputación">Desimputación</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Importe a imputar</Label>
                <Input
                  value={draftImporte}
                  onChange={(event) => setDraftImporte(event.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5 xl:col-span-2">
                <Label>Operador</Label>
                <Input
                  value={draftOperador}
                  onChange={(event) => setDraftOperador(event.target.value)}
                  placeholder="Responsable de la imputación"
                />
              </div>
              <div className="space-y-1.5 xl:col-span-3">
                <Label>Observaciones</Label>
                <Textarea
                  rows={3}
                  value={draftObservaciones}
                  onChange={(event) => setDraftObservaciones(event.target.value)}
                  placeholder="Notas operativas, acuerdo con el cliente o criterio de aplicación"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border bg-background/70 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Cliente</p>
                <p className="mt-1 font-medium wrap-break-word">
                  {selectedDraftCliente?.razonSocial ?? "Sin cliente seleccionado"}
                </p>
              </div>
              <div className="rounded-lg border bg-background/70 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Cobro origen
                </p>
                <p className="mt-1 font-medium wrap-break-word">
                  {selectedCobro ? formatMoney(selectedCobro.total) : "Sin cobro seleccionado"}
                </p>
              </div>
              <div className="rounded-lg border bg-background/70 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Saldo destino
                </p>
                <p className="mt-1 font-medium wrap-break-word">
                  {selectedComprobante
                    ? formatMoney(selectedComprobante.saldo)
                    : "Sin comprobante destino"}
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleRegisterDraft} disabled={draftWarnings.length > 0}>
                Documentar imputación
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardHeader>
            <CardDescription>Aplicación prioritaria</CardDescription>
            <CardTitle className="mt-1 text-xl">
              {highlightedProfile?.comprobanteOrigen ??
                highlighted?.comprobante ??
                "Sin imputación destacada"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {highlighted ? <DetailFieldGrid fields={highlightedFields} /> : null}
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                <div className="flex items-center gap-2 font-medium">
                  <Layers3 className="h-4 w-4" /> Cobertura local
                </div>
                <p className="mt-2 text-muted-foreground">
                  {configured} circuitos documentados y {localCreated} armados directamente desde
                  esta mesa.
                </p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                <div className="flex items-center gap-2 font-medium">
                  <GitCompareArrows className="h-4 w-4" /> Reversa y lote
                </div>
                <p className="mt-2 text-muted-foreground">
                  {masivas} perfiles masivos y {reversables} con desimputación prevista.
                </p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                <div className="flex items-center gap-2 font-medium">
                  <Wallet className="h-4 w-4" /> Contexto vivo
                </div>
                <p className="mt-2 text-muted-foreground">
                  {cobros.length} cobros visibles y {pendingLiveDocs} comprobantes con saldo desde
                  backend.
                </p>
              </div>
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
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_220px_220px_240px_240px]">
            <div className="relative md:col-span-2 xl:col-span-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, origen, destino, cuenta u operador..."
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
                <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                <SelectItem value="IMPUTADA">Imputada</SelectItem>
                <SelectItem value="OBSERVADA">Observada</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterModalidad} onValueChange={setFilterModalidad}>
              <SelectTrigger>
                <SelectValue placeholder="Modalidad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                <SelectItem value="Manual">Manual</SelectItem>
                <SelectItem value="Masiva">Masiva</SelectItem>
                <SelectItem value="Desimputación">Desimputación</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterClienteId} onValueChange={setFilterClienteId}>
              <SelectTrigger>
                <SelectValue placeholder="Cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los clientes</SelectItem>
                {clientes.map((cliente) => (
                  <SelectItem key={cliente.id} value={String(cliente.id)}>
                    {cliente.razonSocial}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterSucursalId} onValueChange={setFilterSucursalId}>
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
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Landmark className="h-4 w-4" /> Mesa documentada ({filtered.length})
            </CardTitle>
            <CardDescription>
              Vista unificada de origen, destino, importe y estado de imputación sobre la operatoria
              vigente.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Origen</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead>Modalidad</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Importe</TableHead>
                    <TableHead className="text-right">Detalle</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                        No hay imputaciones para los filtros actuales.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((row) => {
                      const profile = getProfile(row)
                      return (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium">
                            {profile.cliente || row.cliente}
                          </TableCell>
                          <TableCell>{formatDate(profile.fechaAplicacion)}</TableCell>
                          <TableCell className="max-w-72 text-sm wrap-break-word">
                            {profile.comprobanteOrigen || row.comprobante}
                          </TableCell>
                          <TableCell className="max-w-72 text-sm wrap-break-word">
                            {profile.comprobanteDestino || "Pendiente de asignación"}
                          </TableCell>
                          <TableCell>{profile.modalidad}</TableCell>
                          <TableCell>{statusBadge(profile.estado)}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatMoney(parseMoneyInput(profile.importeAplicado) || row.importe)}
                          </TableCell>
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
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contexto vivo</CardTitle>
              <CardDescription>
                Señales reales del backend relacionadas con la aplicación.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Wallet className="h-4 w-4" /> Cobros visibles
                </div>
                <p className="mt-2 text-2xl font-bold">{cobros.length}</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ReceiptText className="h-4 w-4" /> Documentos con saldo
                </div>
                <p className="mt-2 text-2xl font-bold">{pendingLiveDocs}</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <CircleDollarSign className="h-4 w-4" /> Pendiente visible
                </div>
                <p className="mt-2 text-2xl font-bold">{formatMoney(livePendingTotal)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cobertura operativa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-lg border bg-muted/30 p-3">
                {configured} perfiles guardados sostienen trazabilidad local para los armados sobre
                cobros mientras las imputaciones formales ya se recuperan desde backend.
              </div>
              <div className="rounded-lg border bg-muted/30 p-3">
                {totals.imputadas} filas ya figuran imputadas y {totals.pendientes} siguen en
                trabajo o cierre parcial.
              </div>
              <div className="rounded-lg border bg-muted/30 p-3">
                Las reversas backend quedan habilitadas sobre historial real. La aplicación masiva
                vinculada al cobro sigue dependiendo del circuito que la genera de origen.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Accesos relacionados</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Link href="/ventas/cobros">
                <Button variant="outline" className="w-full justify-start bg-transparent">
                  <Wallet className="mr-2 h-4 w-4" /> Revisar cobros
                </Button>
              </Link>
              <Link href="/ventas/cuenta-corriente">
                <Button variant="outline" className="w-full justify-start bg-transparent">
                  <ReceiptText className="mr-2 h-4 w-4" /> Ver cuenta corriente
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Detalle de imputación</DialogTitle>
            <DialogDescription>
              Lectura de origen, destino, modalidad y líneas hasta contar con el servicio formal.
            </DialogDescription>
          </DialogHeader>
          {selected ? (
            <Tabs defaultValue="principal" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="principal">Principal</TabsTrigger>
                <TabsTrigger value="circuito">Circuito</TabsTrigger>
                <TabsTrigger value="lineas">Líneas</TabsTrigger>
              </TabsList>
              <TabsContent value="principal" className="space-y-4 pt-4">
                <DetailFieldGrid
                  fields={[
                    { label: "Cliente", value: getProfile(selected).cliente || selected.cliente },
                    { label: "Estado", value: getProfile(selected).estado },
                    { label: "Modalidad", value: getProfile(selected).modalidad },
                    {
                      label: "Fecha de aplicación",
                      value: formatDate(getProfile(selected).fechaAplicacion),
                    },
                    {
                      label: "Importe imputado",
                      value: formatMoney(
                        parseMoneyInput(getProfile(selected).importeAplicado) || selected.importe
                      ),
                    },
                    { label: "Prioridad", value: getProfile(selected).prioridad },
                  ]}
                />
              </TabsContent>
              <TabsContent value="circuito" className="space-y-4 pt-4">
                <DetailFieldGrid
                  fields={[
                    {
                      label: "Documento origen",
                      value: getProfile(selected).comprobanteOrigen || selected.comprobante,
                    },
                    {
                      label: "Documento destino",
                      value: getProfile(selected).comprobanteDestino || "Pendiente de asignación",
                    },
                    { label: "Fecha origen", value: formatDate(getProfile(selected).fechaOrigen) },
                    {
                      label: "Fecha destino",
                      value: formatDate(getProfile(selected).fechaDestino),
                    },
                    { label: "Sucursal", value: getProfile(selected).sucursal || "Sin sucursal" },
                    {
                      label: "Cuenta puente",
                      value: getProfile(selected).cuentaPuente || selected.cuenta,
                    },
                    {
                      label: "Saldo origen",
                      value: formatMoney(parseMoneyInput(getProfile(selected).saldoComprobante)),
                    },
                    {
                      label: "Saldo destino",
                      value: formatMoney(parseMoneyInput(getProfile(selected).saldoDestino)),
                    },
                    { label: "Conciliado", value: getProfile(selected).conciliado ? "Sí" : "No" },
                    {
                      label: "Permite desimputar",
                      value: getProfile(selected).permiteDesimputar ? "Sí" : "No",
                    },
                    { label: "Operador", value: getProfile(selected).operador || "Pendiente" },
                    { label: "Lote", value: getProfile(selected).lote || "No asignado" },
                  ]}
                />
              </TabsContent>
              <TabsContent value="lineas" className="space-y-4 pt-4">
                <div className="space-y-2">
                  {getProfile(selected).lineas.map((linea) => (
                    <div key={linea.id} className="rounded-lg border bg-muted/30 p-3">
                      <p className="font-medium">{linea.referencia || "Línea sin referencia"}</p>
                      <p className="text-sm text-muted-foreground">
                        Tipo: {linea.tipo || "No informado"} · Importe: {linea.importe || "0"}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                  {getProfile(selected).observaciones || "Sin observaciones registradas."}
                </div>
                {isLiveRow(selected) && getProfile(selected).permiteDesimputar ? (
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      className="bg-transparent"
                      onClick={async () => {
                        const backendId = Number(selected.id.replace("backend-", ""))
                        if (!Number.isFinite(backendId)) return
                        const ok = await desimputar({
                          imputacionId: backendId,
                          fecha: new Date().toISOString().slice(0, 10),
                          motivo: "Reversa solicitada desde mesa de imputaciones",
                        })
                        if (ok) setSelected(null)
                      }}
                    >
                      Desimputar en backend
                    </Button>
                  </div>
                ) : null}
              </TabsContent>
            </Tabs>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar circuito de imputación</DialogTitle>
            <DialogDescription>
              Ajustá modalidad, origen, destino, saldos y trazabilidad para circuitos todavía
              documentados localmente.
            </DialogDescription>
          </DialogHeader>
          {editing ? (
            <LegacyAllocationDialog
              initialProfile={getProfile(editing)}
              onClose={() => setEditing(null)}
              onSave={saveProfile}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
