"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertCircle,
  Building2,
  CheckCircle,
  Copy,
  Eye,
  Fingerprint,
  MapPin,
  PenSquare,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  XCircle,
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
import { useComprobantesConfig } from "@/lib/hooks/useComprobantes"
import { usePuntosFacturacion, useTiposPuntoFacturacion } from "@/lib/hooks/usePuntosFacturacion"
import { useDefaultSucursalId, useSucursales } from "@/lib/hooks/useSucursales"
import type {
  CreatePuntoFacturacionDto,
  PuntoFacturacion,
  TipoPuntoFacturacion,
} from "@/lib/types/puntos-facturacion"

const EMPTY_FORM: CreatePuntoFacturacionDto = {
  sucursalId: 0,
  numero: 0,
  descripcion: "",
  tipoPuntoFacturacionId: 0,
}

function formatPointNumber(numero: number) {
  return String(numero).padStart(4, "0")
}

function getOperationalStatus(punto: PuntoFacturacion) {
  if (!punto.activo) return "Punto inactivo"
  if (!punto.tipoPuntoFacturacionId) return "Activo, pero sin tipo definido"
  return "Punto listo para emisión"
}

function getNumberingStatus(nextNumber: number | null, loading: boolean, punto: PuntoFacturacion) {
  if (!punto.activo) return "Numeración detenida por baja"
  if (loading) return "Consultando numeración"
  if (nextNumber === null) return "Sin vista previa disponible"
  return `Próximo comprobante ${nextNumber}`
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

function DashboardKpi({
  icon: Icon,
  label,
  value,
  description,
}: {
  icon: typeof MapPin
  label: string
  value: string
  description: string
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="rounded-xl border bg-muted/40 p-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
          <p className="truncate text-lg font-semibold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  )
}

interface PuntoFormProps {
  punto: PuntoFacturacion | null
  sucursalId?: number
  onClose: () => void
  onSaved: () => void
}

function createPuntoFormState(
  punto: PuntoFacturacion | null,
  sucursalId: number | undefined,
  tipos: TipoPuntoFacturacion[]
): CreatePuntoFacturacionDto {
  if (punto) {
    return {
      sucursalId: punto.sucursalId,
      numero: punto.numero,
      descripcion: punto.descripcion,
      tipoPuntoFacturacionId: punto.tipoPuntoFacturacionId ?? 0,
    }
  }

  return {
    ...EMPTY_FORM,
    sucursalId: sucursalId ?? 0,
    tipoPuntoFacturacionId: tipos.find((tipo) => tipo.porDefecto)?.id ?? tipos[0]?.id ?? 0,
  }
}

function PuntoForm({ punto, sucursalId, onClose, onSaved }: PuntoFormProps) {
  const { sucursales } = useSucursales()
  const { tipos } = useTiposPuntoFacturacion()
  const { tipos: tiposComprobante } = useComprobantesConfig()
  const { crear, actualizar, getProximoNumero } = usePuntosFacturacion(sucursalId)
  const [form, setForm] = useState<CreatePuntoFacturacionDto>(() =>
    createPuntoFormState(punto, sucursalId, tipos)
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewTipoId, setPreviewTipoId] = useState<number>(0)
  const [nextNumber, setNextNumber] = useState<number | null>(null)
  const [loadingNextNumber, setLoadingNextNumber] = useState(false)
  const ventaTypes = useMemo(
    () => tiposComprobante.filter((tipo) => tipo.esVenta),
    [tiposComprobante]
  )
  const effectivePreviewTipoId = previewTipoId || ventaTypes[0]?.id || 0
  const selectedTipo = tipos.find((tipo) => tipo.id === form.tipoPuntoFacturacionId)
  const selectedSucursal = sucursales.find((entry) => entry.id === form.sucursalId)

  useEffect(() => {
    let cancelled = false

    async function loadPreview() {
      if (!punto || !effectivePreviewTipoId) {
        setNextNumber(null)
        setLoadingNextNumber(false)
        return
      }

      setLoadingNextNumber(true)
      const value = await getProximoNumero(punto.id, effectivePreviewTipoId)
      if (!cancelled) {
        setNextNumber(value)
        setLoadingNextNumber(false)
      }
    }

    void loadPreview()

    return () => {
      cancelled = true
    }
  }, [effectivePreviewTipoId, getProximoNumero, punto])

  const setField = <K extends keyof CreatePuntoFacturacionDto>(
    key: K,
    value: CreatePuntoFacturacionDto[K]
  ) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const validate = () => {
    if (!form.sucursalId) return "Debe seleccionar una sucursal"
    if (!form.numero || form.numero <= 0) return "El número del punto debe ser mayor a cero"
    if (!form.descripcion.trim()) return "La descripción es obligatoria"
    if (!form.tipoPuntoFacturacionId) return "Debe seleccionar un tipo"
    return null
  }

  const handleSave = async () => {
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)
    setError(null)
    const ok = punto
      ? await actualizar(punto.id, {
          descripcion: form.descripcion.trim(),
          tipoPuntoFacturacionId: form.tipoPuntoFacturacionId,
        })
      : await crear({
          ...form,
          descripcion: form.descripcion.trim(),
        })
    setSaving(false)

    if (ok) onSaved()
    else setError("No se pudo guardar el punto de facturación")
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        <DashboardKpi
          icon={MapPin}
          label="Punto"
          value={form.numero ? formatPointNumber(form.numero) : "Pendiente"}
          description={form.descripcion || "Definí una descripción clara para el operador"}
        />
        <DashboardKpi
          icon={ReceiptText}
          label="Tipo"
          value={selectedTipo?.descripcion ?? "Pendiente"}
          description={
            selectedTipo?.porDefecto ? "Tipo sugerido por defecto" : "Tipo operativo elegido"
          }
        />
        <DashboardKpi
          icon={Fingerprint}
          label="Numeración"
          value={
            punto
              ? loadingNextNumber
                ? "Consultando..."
                : nextNumber !== null
                  ? `#${nextNumber}`
                  : "Sin vista previa"
              : "Se habilita al guardar"
          }
          description={
            punto
              ? "Vista previa sobre el punto ya existente"
              : "El backend expone próximo número una vez creado"
          }
        />
      </div>

      <Tabs defaultValue="ficha" className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-3 gap-2">
          <TabsTrigger value="ficha" className="py-2 text-xs">
            Ficha
          </TabsTrigger>
          <TabsTrigger value="numeracion" className="py-2 text-xs">
            Numeración
          </TabsTrigger>
          <TabsTrigger value="operacion" className="py-2 text-xs">
            Operación
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ficha" className="mt-4 space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_320px]">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Identificación del punto</CardTitle>
                <CardDescription>
                  Los únicos datos persistibles hoy son sucursal, número, descripción y tipo.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Sucursal</Label>
                  <Select
                    value={form.sucursalId ? String(form.sucursalId) : "__none__"}
                    onValueChange={(value) =>
                      setField("sucursalId", value === "__none__" ? 0 : Number(value))
                    }
                    disabled={Boolean(punto)}
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
                  {punto ? (
                    <p className="text-xs text-muted-foreground">
                      La sucursal no es editable sobre el contrato actual.
                    </p>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  <Label>Número</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.numero || ""}
                    onChange={(event) => setField("numero", Number(event.target.value) || 0)}
                    readOnly={Boolean(punto)}
                  />
                  {punto ? (
                    <p className="text-xs text-muted-foreground">
                      El número queda fijo luego del alta para no romper la trazabilidad.
                    </p>
                  ) : null}
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Descripción visible</Label>
                  <Input
                    placeholder="Ej. Casa central, mostrador, ecommerce, sucursal norte"
                    value={form.descripcion}
                    onChange={(event) => setField("descripcion", event.target.value)}
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Tipo de punto</Label>
                  <Select
                    value={
                      form.tipoPuntoFacturacionId ? String(form.tipoPuntoFacturacionId) : "__none__"
                    }
                    onValueChange={(value) =>
                      setField("tipoPuntoFacturacionId", value === "__none__" ? 0 : Number(value))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Seleccionar tipo</SelectItem>
                      {tipos.map((tipo) => (
                        <SelectItem key={tipo.id} value={String(tipo.id)}>
                          {tipo.descripcion}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Lectura rápida</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-xl border bg-muted/30 p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Sucursal
                  </p>
                  <p className="mt-1 text-sm font-semibold wrap-break-word text-foreground">
                    {selectedSucursal?.descripcion ?? "Sin sucursal definida"}
                  </p>
                </div>
                <div className="rounded-xl border bg-muted/30 p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Estado
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {punto ? getOperationalStatus(punto) : "Alta pendiente"}
                  </p>
                </div>
                <div className="rounded-xl border bg-muted/30 p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Punto visible
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {form.numero ? formatPointNumber(form.numero) : "Sin numeración"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="numeracion" className="mt-4 space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_340px]">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Vista previa de numeración</CardTitle>
                <CardDescription>
                  El backend actual solo permite consultar el próximo número para puntos ya
                  existentes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                  <div className="space-y-1.5">
                    <Label>Tipo de comprobante para control</Label>
                    <Select
                      value={effectivePreviewTipoId ? String(effectivePreviewTipoId) : "__none__"}
                      onValueChange={(value) =>
                        setPreviewTipoId(value === "__none__" ? 0 : Number(value))
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
                  <div className="rounded-xl border bg-muted/30 px-3 py-2">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Próximo número
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {punto
                        ? loadingNextNumber
                          ? "Consultando..."
                          : nextNumber !== null
                            ? `#${nextNumber}`
                            : "No disponible"
                        : "Disponible luego del alta"}
                    </p>
                  </div>
                </div>
                <DetailFieldGrid
                  fields={[
                    {
                      label: "Modo de numeración",
                      value: punto
                        ? "Consulta en vivo por API"
                        : "Se habilita al persistir el punto",
                    },
                    {
                      label: "Control por sucursal",
                      value: selectedSucursal?.descripcion ?? "Sin sucursal asignada",
                    },
                    {
                      label: "Tipo visible",
                      value: selectedTipo?.descripcion ?? "Sin tipo seleccionado",
                    },
                  ]}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Alcance actual</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  La configuración contable, reportes de impresión, copias y cierres periódicos
                  sigue fuera del contrato expuesto por la API.
                </p>
                <p>
                  Esta vista cubre el núcleo operativo real: sucursal, número, tipo y consulta de
                  próximo comprobante.
                </p>
                <p>No se simulan campos no persistibles para evitar una ficha engañosa.</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="operacion" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Resumen operativo</CardTitle>
            </CardHeader>
            <CardContent>
              <DetailFieldGrid
                fields={[
                  {
                    label: "Alta o mantenimiento",
                    value: punto ? "Mantenimiento de punto existente" : "Alta de nuevo punto",
                  },
                  {
                    label: "Tipificación",
                    value: selectedTipo?.porDefecto
                      ? "Tipo sugerido por defecto"
                      : "Tipo manual seleccionado",
                  },
                  {
                    label: "Integridad mínima",
                    value:
                      form.sucursalId &&
                      form.numero &&
                      form.descripcion.trim() &&
                      form.tipoPuntoFacturacionId
                        ? "Lista para guardar"
                        : "Faltan datos obligatorios",
                  },
                ]}
              />
            </CardContent>
          </Card>
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
          {saving ? "Guardando..." : punto ? "Guardar cambios" : "Crear punto"}
        </Button>
      </div>
    </div>
  )
}

export default function PuntosFacturacionPage() {
  const defaultSucursalId = useDefaultSucursalId()
  const { sucursales } = useSucursales()
  const { tipos } = useTiposPuntoFacturacion()
  const { tipos: tiposComprobante } = useComprobantesConfig()
  const [selectedSucursalId, setSelectedSucursalId] = useState<number | undefined>()
  const currentSucursalId = selectedSucursalId ?? defaultSucursalId
  const { puntos, loading, error, eliminar, getProximoNumero, refetch } =
    usePuntosFacturacion(currentSucursalId)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("todos")
  const [typeFilter, setTypeFilter] = useState("todos")
  const [selected, setSelected] = useState<PuntoFacturacion | null>(null)
  const [editing, setEditing] = useState<PuntoFacturacion | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [detailPreviewTypeId, setDetailPreviewTypeId] = useState<number>(0)
  const [nextNumber, setNextNumber] = useState<number | null>(null)
  const [loadingNextNumber, setLoadingNextNumber] = useState(false)
  const ventaTypes = useMemo(
    () => tiposComprobante.filter((tipo) => tipo.esVenta),
    [tiposComprobante]
  )
  const effectiveDetailPreviewTypeId = detailPreviewTypeId || ventaTypes[0]?.id || 0
  const tipoDescripcionById = useMemo(
    () => new Map(tipos.map((tipo) => [tipo.id, tipo.descripcion])),
    [tipos]
  )

  const getTipoDescripcion = useCallback(
    (id?: number) => (id ? (tipoDescripcionById.get(id) ?? String(id)) : "Sin tipo"),
    [tipoDescripcionById]
  )

  const getSucursalDescripcion = useCallback(
    (id?: number) =>
      sucursales.find((sucursal) => sucursal.id === id)?.descripcion ?? `#${id ?? "-"}`,
    [sucursales]
  )

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase().trim()

    return puntos.filter((punto) => {
      const matchesSearch =
        term === "" ||
        punto.descripcion.toLowerCase().includes(term) ||
        formatPointNumber(punto.numero).includes(term) ||
        getTipoDescripcion(punto.tipoPuntoFacturacionId).toLowerCase().includes(term)

      const matchesStatus =
        statusFilter === "todos" ||
        (statusFilter === "activos" && punto.activo) ||
        (statusFilter === "inactivos" && !punto.activo)

      const matchesType =
        typeFilter === "todos" || String(punto.tipoPuntoFacturacionId ?? 0) === typeFilter

      return matchesSearch && matchesStatus && matchesType
    })
  }, [getTipoDescripcion, puntos, searchTerm, statusFilter, typeFilter])

  const activos = puntos.filter((punto) => punto.activo).length
  const inactivos = puntos.filter((punto) => !punto.activo).length
  const conTipo = puntos.filter((punto) => Boolean(punto.tipoPuntoFacturacionId)).length
  const highlightedPoint = useMemo(
    () =>
      [...filtered]
        .sort((left, right) => {
          if (Number(right.activo) !== Number(left.activo)) {
            return Number(right.activo) - Number(left.activo)
          }
          return left.numero - right.numero
        })
        .at(0) ?? null,
    [filtered]
  )

  const typeCoverage = useMemo(
    () =>
      Array.from(
        puntos.reduce((acc, punto) => {
          const key = getTipoDescripcion(punto.tipoPuntoFacturacionId)
          acc.set(key, (acc.get(key) ?? 0) + 1)
          return acc
        }, new Map<string, number>())
      )
        .map(([tipo, cantidad]) => ({ tipo, cantidad }))
        .sort((left, right) => right.cantidad - left.cantidad)
        .slice(0, 6),
    [getTipoDescripcion, puntos]
  )

  useEffect(() => {
    let cancelled = false

    async function loadPreview() {
      if (!selected || !effectiveDetailPreviewTypeId) {
        setNextNumber(null)
        setLoadingNextNumber(false)
        return
      }

      setLoadingNextNumber(true)
      const value = await getProximoNumero(selected.id, effectiveDetailPreviewTypeId)
      if (!cancelled) {
        setNextNumber(value)
        setLoadingNextNumber(false)
      }
    }

    void loadPreview()

    return () => {
      cancelled = true
    }
  }, [effectiveDetailPreviewTypeId, getProximoNumero, selected])

  const handleDeactivate = async (id: number) => {
    await eliminar(id)
    await refetch()
  }

  const openDetail = (punto: PuntoFacturacion) => {
    setSelected(punto)
    setNextNumber(null)
    setIsDetailOpen(true)
  }

  const detailFields = selected
    ? [
        { label: "Número", value: formatPointNumber(selected.numero) },
        { label: "Descripción", value: selected.descripcion },
        { label: "Sucursal", value: getSucursalDescripcion(selected.sucursalId) },
        { label: "Tipo", value: getTipoDescripcion(selected.tipoPuntoFacturacionId) },
        { label: "Estado", value: selected.activo ? "Activo" : "Inactivo" },
        { label: "ID interno", value: String(selected.id) },
      ]
    : []

  const operationFields = selected
    ? [
        { label: "Estado operativo", value: getOperationalStatus(selected) },
        {
          label: "Numeración actual",
          value: getNumberingStatus(nextNumber, loadingNextNumber, selected),
        },
        {
          label: "Tipo consultado",
          value:
            ventaTypes.find((tipo) => tipo.id === effectiveDetailPreviewTypeId)?.descripcion ??
            "Sin tipo de control",
        },
      ]
    : []

  return (
    <div className="space-y-6 pb-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Ventas</Badge>
            <Badge variant="secondary">Puntos de facturación</Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Puntos de facturación</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Consola operativa para administrar puntos por sucursal, revisar tipificación y validar
            la numeración disponible para emisión sin inventar configuraciones que todavía no expone
            la API.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null)
            setIsFormOpen(true)
          }}
          disabled={!currentSucursalId}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nuevo punto
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <DashboardKpi
          icon={MapPin}
          label="Puntos"
          value={String(puntos.length)}
          description="Configurados en la sucursal actual"
        />
        <DashboardKpi
          icon={CheckCircle}
          label="Activos"
          value={String(activos)}
          description="Disponibles para operar"
        />
        <DashboardKpi
          icon={XCircle}
          label="Inactivos"
          value={String(inactivos)}
          description="Fuera de circulación"
        />
        <DashboardKpi
          icon={Settings2}
          label="Tipificados"
          value={String(conTipo)}
          description="Con tipo explícito asignado"
        />
        <DashboardKpi
          icon={Building2}
          label="Sucursal"
          value={currentSucursalId ? getSucursalDescripcion(currentSucursalId) : "Pendiente"}
          description="Contexto de trabajo actual"
        />
      </div>

      {highlightedPoint ? (
        <Card className="overflow-hidden border-border/70 bg-linear-to-r from-slate-50 to-white">
          <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <CardDescription>Punto destacado</CardDescription>
              <CardTitle className="text-xl wrap-break-word">
                {formatPointNumber(highlightedPoint.numero)} · {highlightedPoint.descripcion}
              </CardTitle>
              <p className="max-w-3xl text-sm text-muted-foreground wrap-break-word">
                {getTipoDescripcion(highlightedPoint.tipoPuntoFacturacionId)} en{" "}
                {getSucursalDescripcion(highlightedPoint.sucursalId)}. Se prioriza como referencia
                por estar más listo para operación dentro de la selección actual.
              </p>
            </div>
            <Badge variant={highlightedPoint.activo ? "default" : "secondary"}>
              {highlightedPoint.activo ? "Activo" : "Inactivo"}
            </Badge>
          </CardHeader>
          <CardContent>
            <DetailFieldGrid
              fields={[
                { label: "Estado", value: getOperationalStatus(highlightedPoint) },
                {
                  label: "Cobertura",
                  value: highlightedPoint.tipoPuntoFacturacionId
                    ? "Tipificado para emitir"
                    : "Requiere tipificación",
                },
                { label: "Sucursal", value: getSucursalDescripcion(highlightedPoint.sucursalId) },
              ]}
            />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Cruzá sucursal, estado, tipo y búsqueda libre para revisar el maestro operativo sin
            ruido.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[260px_220px_260px_minmax(0,1fr)_auto]">
            <Select
              value={currentSucursalId ? String(currentSucursalId) : "__none__"}
              onValueChange={(value) =>
                setSelectedSucursalId(value === "__none__" ? undefined : Number(value))
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="activos">Activos</SelectItem>
                <SelectItem value="inactivos">Inactivos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los tipos</SelectItem>
                {tipos.map((tipo) => (
                  <SelectItem key={tipo.id} value={String(tipo.id)}>
                    {tipo.descripcion}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-10"
                placeholder="Buscar por número, descripción o tipo..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            <Button variant="outline" className="bg-transparent" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Recargar
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Puntos visibles ({filtered.length})</CardTitle>
            <CardDescription>
              Maestro operativo de la sucursal con foco en número, descripción, tipo y estado real.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="w-full whitespace-nowrap rounded-b-xl border-t">
              <div className="min-w-220">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Lectura</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                          <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin" />
                          Cargando puntos de facturación...
                        </TableCell>
                      </TableRow>
                    ) : !currentSucursalId ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                          Seleccioná una sucursal para operar el maestro.
                        </TableCell>
                      </TableRow>
                    ) : filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                          No hay puntos visibles para los filtros elegidos.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((punto) => (
                        <TableRow
                          key={punto.id}
                          className="cursor-pointer hover:bg-muted/40"
                          onClick={() => openDetail(punto)}
                        >
                          <TableCell className="font-mono font-semibold">
                            {formatPointNumber(punto.numero)}
                          </TableCell>
                          <TableCell className="max-w-70 whitespace-normal wrap-break-word font-medium">
                            {punto.descripcion}
                          </TableCell>
                          <TableCell className="max-w-55 whitespace-normal wrap-break-word text-sm text-muted-foreground">
                            {getTipoDescripcion(punto.tipoPuntoFacturacionId)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={punto.activo ? "default" : "secondary"}>
                              {punto.activo ? "Activo" : "Inactivo"}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-60 whitespace-normal wrap-break-word text-sm text-muted-foreground">
                            {getOperationalStatus(punto)}
                          </TableCell>
                          <TableCell
                            className="text-right"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openDetail(punto)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditing(punto)
                                  setIsFormOpen(true)
                                }}
                              >
                                <PenSquare className="h-4 w-4" />
                              </Button>
                              {punto.activo ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeactivate(punto.id)}
                                >
                                  Baja
                                </Button>
                              ) : null}
                            </div>
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Panel operativo</CardTitle>
            <CardDescription>
              Lectura rápida del estado actual y de lo que realmente cubre la API hoy.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="rounded-xl border bg-muted/30 p-4">
              <div className="flex items-start gap-3">
                <Building2 className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-semibold text-foreground">Cobertura por sucursal</p>
                  <p className="wrap-break-word">
                    {currentSucursalId
                      ? `${filtered.length} punto(s) visibles en ${getSucursalDescripcion(currentSucursalId)}.`
                      : "Sin sucursal seleccionada."}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border bg-muted/30 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-semibold text-foreground">Tipificación</p>
                  <p>{conTipo} punto(s) tienen tipo operativo explícito cargado.</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border bg-muted/30 p-4">
              <div className="flex items-start gap-3">
                <Copy className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-semibold text-foreground">Configuraciones avanzadas</p>
                  <p>
                    Prefijos contables, reportes, copias y cierres siguen siendo materia de backend.
                    Esta vista no los simula para no prometer persistencia que hoy no existe.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Distribución por tipo</CardTitle>
          <CardDescription>
            Cómo se reparte el maestro visible según la tipificación cargada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            {typeCoverage.length > 0 ? (
              typeCoverage.map((row) => (
                <div key={row.tipo} className="rounded-xl border bg-muted/30 p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    {row.tipo}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-foreground">{row.cantidad}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No hay puntos tipificados en la selección actual.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-h-[92vh] max-w-6xl overflow-hidden p-0">
          <div className="flex h-full max-h-[92vh] flex-col">
            <DialogHeader className="border-b px-6 py-5">
              <DialogTitle>
                {editing ? "Editar punto de facturación" : "Nuevo punto de facturación"}
              </DialogTitle>
              <DialogDescription>
                Ficha operativa del punto, con soporte real del contrato actual y lectura de
                numeración en vivo.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="flex-1 px-6 py-5">
              <PuntoForm
                key={editing ? `edit-${editing.id}` : `new-${currentSucursalId ?? 0}`}
                punto={editing}
                sucursalId={currentSucursalId}
                onClose={() => setIsFormOpen(false)}
                onSaved={async () => {
                  setIsFormOpen(false)
                  setEditing(null)
                  await refetch()
                }}
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
            setSelected(null)
            setNextNumber(null)
          }
        }}
      >
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-hidden p-0">
          <div className="flex h-full max-h-[92vh] flex-col">
            <DialogHeader className="border-b px-6 py-5">
              <DialogTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                {selected ? `Punto ${formatPointNumber(selected.numero)}` : "Detalle del punto"}
              </DialogTitle>
              <DialogDescription>{selected?.descripcion ?? "Cargando..."}</DialogDescription>
            </DialogHeader>

            <ScrollArea className="flex-1 px-6 py-5">
              {selected ? (
                <Tabs defaultValue="ficha" className="w-full">
                  <TabsList className="grid h-auto w-full grid-cols-3 gap-2">
                    <TabsTrigger value="ficha">Ficha</TabsTrigger>
                    <TabsTrigger value="numeracion">Numeración</TabsTrigger>
                    <TabsTrigger value="operacion">Operación</TabsTrigger>
                  </TabsList>

                  <TabsContent value="ficha" className="space-y-4 pt-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Datos del punto</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <DetailFieldGrid fields={detailFields} />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="numeracion" className="space-y-4 pt-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Vista previa de numeración</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                          <div className="space-y-1.5">
                            <Label>Tipo de comprobante</Label>
                            <Select
                              value={
                                effectiveDetailPreviewTypeId
                                  ? String(effectiveDetailPreviewTypeId)
                                  : "__none__"
                              }
                              onValueChange={(value) =>
                                setDetailPreviewTypeId(value === "__none__" ? 0 : Number(value))
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
                          <div className="rounded-xl border bg-muted/30 px-3 py-2">
                            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                              Próximo número
                            </p>
                            <p className="mt-1 text-sm font-semibold text-foreground">
                              {loadingNextNumber
                                ? "Consultando..."
                                : nextNumber !== null
                                  ? `#${nextNumber}`
                                  : "No disponible"}
                            </p>
                          </div>
                        </div>
                        <DetailFieldGrid fields={operationFields} />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="operacion" className="space-y-4 pt-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Lectura operativa</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <DetailFieldGrid
                          fields={[
                            {
                              label: "Circuito",
                              value: selected.activo
                                ? "Disponible para emisión"
                                : "Punto fuera de operación",
                            },
                            {
                              label: "Tipificación",
                              value: selected.tipoPuntoFacturacionId ? "Definida" : "Pendiente",
                            },
                            {
                              label: "Alcance de la API",
                              value:
                                "Alta, edición básica, baja lógica y consulta de próximo número",
                            },
                          ]}
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              ) : (
                <p className="py-8 text-center text-muted-foreground">
                  No se pudo cargar el detalle del punto.
                </p>
              )}
            </ScrollArea>

            <DialogFooter className="border-t px-6 py-4">
              <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
                Cerrar
              </Button>
              {selected ? (
                <Button
                  onClick={() => {
                    setIsDetailOpen(false)
                    setEditing(selected)
                    setIsFormOpen(true)
                  }}
                >
                  <PenSquare className="mr-2 h-4 w-4" />
                  Editar punto
                </Button>
              ) : null}
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
