"use client"

import { Suspense, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertCircle,
  ArrowRightLeft,
  CalendarDays,
  Eye,
  FileText,
  GitBranch,
  Plus,
  RefreshCcw,
  Scale,
  Search,
  Trash2,
} from "lucide-react"
import Loading from "./loading"
import { useAsientos, usePlanCuentas } from "@/lib/hooks/useAsientos"
import { useEjercicioVigente } from "@/lib/hooks/useEjercicios"
import { useDefaultSucursalId } from "@/lib/hooks/useSucursales"
import type { Asiento, AsientoDetalle } from "@/lib/types/asientos"

function fmtARS(value?: number | null) {
  return Number(value ?? 0).toLocaleString("es-AR", { minimumFractionDigits: 2 })
}

function hasAsientoPublishedTotals(entry: Pick<Asiento, "totalDebe" | "totalHaber">) {
  return (
    typeof entry.totalDebe === "number" &&
    Number.isFinite(entry.totalDebe) &&
    typeof entry.totalHaber === "number" &&
    Number.isFinite(entry.totalHaber)
  )
}

function formatAsientoTotal(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? `$${fmtARS(value)}` : "N/D"
}

function todayInputValue() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function normalizeAsientoEstado(status?: string) {
  return (status ?? "").trim().toLowerCase()
}

function isConsolidatedAsientoStatus(status?: string) {
  const normalized = normalizeAsientoEstado(status)
  return normalized === "publicado" || normalized === "contabilizado"
}

function isDraftAsientoStatus(status?: string) {
  return normalizeAsientoEstado(status) === "borrador"
}

function isCancelledAsientoStatus(status?: string) {
  return normalizeAsientoEstado(status) === "anulado"
}

function getStatusBadge(status: string) {
  const normalized = normalizeAsientoEstado(status)

  switch (normalized) {
    case "borrador":
      return <Badge variant="secondary">Borrador</Badge>
    case "contabilizado":
      return (
        <Badge className="bg-green-500/10 text-green-700 hover:bg-green-500/10">
          Contabilizado
        </Badge>
      )
    case "publicado":
      return (
        <Badge className="bg-green-500/10 text-green-700 hover:bg-green-500/10">Publicado</Badge>
      )
    case "anulado":
      return <Badge variant="destructive">Anulado</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function SummaryCard({
  title,
  value,
  description,
}: {
  title: string
  value: string
  description: string
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

function DetailFieldGrid({ fields }: { fields: Array<{ label: string; value: string }> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {fields.map((field) => (
        <div key={field.label} className="rounded-lg border p-3">
          <p className="text-sm text-muted-foreground">{field.label}</p>
          <p className="mt-2 font-medium wrap-break-word">{field.value}</p>
        </div>
      ))}
    </div>
  )
}

function formatDate(value?: string) {
  if (!value) return "-"
  const leadingDateMatch = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(value)
  if (leadingDateMatch) {
    const [, year, month, day] = leadingDateMatch
    return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString("es-AR")
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("es-AR")
}

function formatDateTime(value?: string) {
  return value
    ? new Date(value).toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-"
}

function getEntryAgeLabel(value?: string) {
  if (!value) return "Sin alta visible"

  const created = new Date(value)
  const now = new Date()
  const diff = now.getTime() - created.getTime()
  const days = Math.floor(diff / 86400000)

  if (days <= 0) return "Alta del día"
  if (days === 1) return "Alta de ayer"
  return `${days} días desde el alta`
}

function getAsientoCircuit(entry: Asiento) {
  if (isConsolidatedAsientoStatus(entry.estado)) {
    return {
      label: "Libro consolidado",
      detail: "El asiento ya quedó incorporado al circuito principal del libro diario.",
    }
  }

  if (isDraftAsientoStatus(entry.estado)) {
    return {
      label: "Pendiente de consolidación",
      detail: "El asiento sigue editable o a validar antes de publicarse.",
    }
  }

  return {
    label: "Fuera de circuito",
    detail: "El asiento fue anulado y queda sólo para trazabilidad histórica.",
  }
}

function getBalanceReading(entry: Asiento) {
  if (!hasAsientoPublishedTotals(entry)) {
    return {
      label: "Pendiente de detalle",
      detail: "La consulta actual no publica totales de debe y haber para este asiento.",
    }
  }

  const difference = Math.abs(Number(entry.totalDebe ?? 0) - Number(entry.totalHaber ?? 0))

  if (difference <= 0.005) {
    return {
      label: "Balanceado",
      detail: "Debe y haber coinciden dentro del lote visible devuelto por backend.",
    }
  }

  return {
    label: "A revisar",
    detail: "El total deudor no coincide con el acreedor y conviene revisar el asiento visible.",
  }
}

function getLegacyCoverage(entry: Asiento) {
  const available = [
    entry.numero ? 1 : 0,
    entry.sucursalId ? 1 : 0,
    entry.createdAt ? 1 : 0,
    entry.descripcion ? 1 : 0,
  ].reduce((sum, value) => sum + value, 0)

  if (available >= 4) {
    return {
      label: "Cobertura amplia",
      detail: "El asiento visible ya expone numeración, sucursal, alta y totales del libro diario.",
    }
  }

  return {
    label: "Cobertura base",
    detail:
      "La API actual cubre el libro diario esencial; autorizaciones y circuitos ampliados siguen fuera del contrato.",
  }
}

type DraftLine = {
  cuentaId: string
  debe: string
  haber: string
  observacion: string
}

function emptyLine(): DraftLine {
  return {
    cuentaId: "",
    debe: "",
    haber: "",
    observacion: "",
  }
}

function AsientosContent() {
  const [todayTimestamp] = useState(() => Date.now())
  const sucursalId = useDefaultSucursalId() ?? 1
  const { ejercicio } = useEjercicioVigente()
  const { cuentas, loading: loadingCuentas } = usePlanCuentas(ejercicio?.id)
  const {
    asientos,
    loading,
    error,
    totalCount,
    totalPages,
    page,
    setPage,
    estado,
    setEstado,
    desde,
    setDesde,
    hasta,
    setHasta,
    getById,
    getByOrigen,
    crear,
    refetch,
  } = useAsientos({ ejercicioId: ejercicio?.id, sucursalId })

  const [search, setSearch] = useState("")
  const [selectedEntryId, setSelectedEntryId] = useState<number | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [selectedAsiento, setSelectedAsiento] = useState<AsientoDetalle | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [originOpen, setOriginOpen] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createSuccess, setCreateSuccess] = useState<string | null>(null)
  const [originError, setOriginError] = useState<string | null>(null)
  const [originLoading, setOriginLoading] = useState(false)
  const [originTabla, setOriginTabla] = useState("")
  const [originId, setOriginId] = useState("")
  const [originResults, setOriginResults] = useState<Asiento[]>([])
  const [saving, setSaving] = useState(false)
  const [fecha, setFecha] = useState(todayInputValue())
  const [descripcion, setDescripcion] = useState("")
  const [lineas, setLineas] = useState<DraftLine[]>([emptyLine(), emptyLine()])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return asientos

    return asientos.filter((entry) => {
      const description = entry.descripcion?.toLowerCase() ?? ""
      const number = String(entry.numero ?? entry.id)
      const date = new Date(entry.fecha).toLocaleDateString("es-AR")

      return description.includes(term) || number.includes(term) || date.includes(term)
    })
  }, [asientos, search])

  const stats = useMemo(() => {
    const publicados = filtered.filter((entry) => isConsolidatedAsientoStatus(entry.estado))
    const borradores = filtered.filter((entry) => isDraftAsientoStatus(entry.estado))
    const anulados = filtered.filter((entry) => isCancelledAsientoStatus(entry.estado))
    const entriesWithTotals = filtered.filter(hasAsientoPublishedTotals)
    const totalDebe = entriesWithTotals.reduce(
      (acc, entry) => acc + Number(entry.totalDebe ?? 0),
      0
    )
    const totalHaber = entriesWithTotals.reduce(
      (acc, entry) => acc + Number(entry.totalHaber ?? 0),
      0
    )

    return {
      publicados: publicados.length,
      borradores: borradores.length,
      anulados: anulados.length,
      entriesWithTotals: entriesWithTotals.length,
      hasVisibleTotals: entriesWithTotals.length > 0,
      totalDebe,
      totalHaber,
    }
  }, [filtered])

  const activeEntry = useMemo(
    () => filtered.find((entry) => entry.id === selectedEntryId) ?? filtered[0] ?? null,
    [filtered, selectedEntryId]
  )

  const activeEntryCircuit = activeEntry ? getAsientoCircuit(activeEntry) : null
  const activeEntryBalance = activeEntry ? getBalanceReading(activeEntry) : null
  const activeEntryCoverage = activeEntry ? getLegacyCoverage(activeEntry) : null
  const recentCreatedCount = filtered.filter((entry) => {
    if (!entry.createdAt) return false
    const diff = todayTimestamp - new Date(entry.createdAt).getTime()
    return diff <= 7 * 86400000
  }).length
  const averageEntryAmount = stats.entriesWithTotals ? stats.totalDebe / stats.entriesWithTotals : 0

  const draftTotals = useMemo(() => {
    const totalDebe = lineas.reduce((acc, linea) => acc + Number(linea.debe || 0), 0)
    const totalHaber = lineas.reduce((acc, linea) => acc + Number(linea.haber || 0), 0)

    return {
      totalDebe,
      totalHaber,
      diferencia: Math.abs(totalDebe - totalHaber),
    }
  }, [lineas])

  const planCuentaById = useMemo(
    () => new Map(cuentas.map((cuenta) => [cuenta.id, cuenta])),
    [cuentas]
  )

  const selectedAsientoTotals = useMemo(() => {
    if (!selectedAsiento) return null
    if (hasAsientoPublishedTotals(selectedAsiento)) {
      return {
        totalDebe: Number(selectedAsiento.totalDebe ?? 0),
        totalHaber: Number(selectedAsiento.totalHaber ?? 0),
        sourcedFromLines: false,
      }
    }

    const totalDebe = selectedAsiento.lineas.reduce(
      (acc, linea) => acc + Number(linea.debe || 0),
      0
    )
    const totalHaber = selectedAsiento.lineas.reduce(
      (acc, linea) => acc + Number(linea.haber || 0),
      0
    )

    return {
      totalDebe,
      totalHaber,
      sourcedFromLines: true,
    }
  }, [selectedAsiento])

  const resetCreateForm = () => {
    setFecha(todayInputValue())
    setDescripcion("")
    setLineas([emptyLine(), emptyLine()])
    setCreateError(null)
  }

  const handleViewDetail = async (id: number) => {
    setDetailOpen(true)
    setDetailLoading(true)
    const detail = await getById(id)
    setSelectedAsiento(detail)
    setDetailLoading(false)
  }

  const updateLine = (index: number, field: keyof DraftLine, value: string) => {
    setLineas((current) =>
      current.map((linea, lineIndex) =>
        lineIndex === index ? { ...linea, [field]: value } : linea
      )
    )
  }

  const addLine = () => {
    setLineas((current) => [...current, emptyLine()])
  }

  const removeLine = (index: number) => {
    setLineas((current) => current.filter((_, lineIndex) => lineIndex !== index))
  }

  const clearFilters = () => {
    setSearch("")
    setEstado("")
    setDesde("")
    setHasta("")
    setPage(1)
  }

  const resetOriginLookup = () => {
    setOriginTabla("")
    setOriginId("")
    setOriginResults([])
    setOriginError(null)
  }

  const handleLookupByOrigin = async () => {
    setOriginError(null)

    const normalizedTabla = originTabla.trim()
    const normalizedId = Number(originId)

    if (!normalizedTabla) {
      setOriginError("Ingresá la tabla de origen a consultar.")
      return
    }

    if (!normalizedId || Number.isNaN(normalizedId)) {
      setOriginError("Ingresá un identificador de origen válido.")
      return
    }

    setOriginLoading(true)
    const result = await getByOrigen(normalizedTabla, normalizedId)
    setOriginLoading(false)

    if (!result) {
      setOriginError("No se pudieron consultar los asientos vinculados al origen indicado.")
      return
    }

    setOriginResults(result)
  }

  const handleOriginOpenChange = (open: boolean) => {
    setOriginOpen(open)
    if (!open) {
      setOriginError(null)
    }
  }

  const handleCreateOpenChange = (open: boolean) => {
    setCreateOpen(open)
    if (!open) {
      setCreateError(null)
    }
  }

  const handleCreate = async () => {
    setCreateError(null)
    setCreateSuccess(null)

    if (!ejercicio?.id) {
      setCreateError("No hay ejercicio vigente para registrar el asiento.")
      return
    }

    if (!descripcion.trim()) {
      setCreateError("Ingresá una descripción contable para el asiento.")
      return
    }

    const validLines = lineas
      .map((linea) => ({
        cuentaId: Number(linea.cuentaId),
        debe: Number(linea.debe || 0),
        haber: Number(linea.haber || 0),
        observacion: linea.observacion.trim() || undefined,
      }))
      .filter((linea) => linea.cuentaId && (linea.debe > 0 || linea.haber > 0))

    if (validLines.length < 2) {
      setCreateError("El asiento debe contener al menos dos líneas imputadas.")
      return
    }

    if (draftTotals.totalDebe <= 0 || draftTotals.totalHaber <= 0) {
      setCreateError("El asiento debe tener importes en debe y haber.")
      return
    }

    if (draftTotals.diferencia > 0.005) {
      setCreateError("El asiento no está balanceado. Debe y Haber deben coincidir.")
      return
    }

    setSaving(true)
    const ok = await crear({
      ejercicioId: ejercicio.id,
      sucursalId,
      fecha,
      descripcion: descripcion.trim(),
      lineas: validLines,
    })
    setSaving(false)

    if (!ok) {
      setCreateError("No se pudo registrar el asiento. Revisá los datos e intentá nuevamente.")
      return
    }

    setCreateSuccess("Asiento registrado correctamente en el backend.")
    await refetch()
    resetCreateForm()
    setCreateOpen(false)
  }

  const originTotals = useMemo(() => {
    const withTotals = originResults.filter(hasAsientoPublishedTotals)

    return {
      totalDebe: withTotals.reduce((acc, asiento) => acc + Number(asiento.totalDebe ?? 0), 0),
      totalHaber: withTotals.reduce((acc, asiento) => acc + Number(asiento.totalHaber ?? 0), 0),
      hasVisibleTotals: withTotals.length > 0,
    }
  }, [originResults])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Asientos Contables</h1>
          <p className="text-muted-foreground">
            Consola operativa del libro diario con filtros reales, alta manual y detalle contable
            sobre el backend actual.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={loading}>
            <RefreshCcw className="h-4 w-4" />
            Actualizar
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              resetOriginLookup()
              handleOriginOpenChange(true)
            }}
          >
            <GitBranch className="h-4 w-4" />
            Buscar por origen
          </Button>
          <Button
            onClick={() => handleCreateOpenChange(true)}
            disabled={!ejercicio?.id || loadingCuentas}
          >
            <Plus className="h-4 w-4" />
            Nuevo Asiento
          </Button>
        </div>
      </div>

      {createSuccess && (
        <Alert>
          <FileText className="h-4 w-4" />
          <AlertDescription>{createSuccess}</AlertDescription>
        </Alert>
      )}

      {!ejercicio && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No se detectó un ejercicio vigente. La consulta funciona, pero el alta manual queda
            deshabilitada hasta que exista uno activo.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Asientos visibles"
          value={String(filtered.length)}
          description={`Página ${page} de ${totalPages}. Total backend: ${totalCount}.`}
        />
        <SummaryCard
          title="Consolidados / borrador"
          value={`${stats.publicados}/${stats.borradores}`}
          description={`${stats.anulados} anulados dentro del conjunto filtrado.`}
        />
        <SummaryCard
          title="Debe acumulado"
          value={stats.hasVisibleTotals ? `$${fmtARS(stats.totalDebe)}` : "No informado"}
          description={
            stats.hasVisibleTotals
              ? "Suma de débitos de los asientos actualmente visibles."
              : "La consulta paginada actual no publica débitos agregados para esta vista."
          }
        />
        <SummaryCard
          title="Diferencia"
          value={
            stats.hasVisibleTotals
              ? `$${fmtARS(Math.abs(stats.totalDebe - stats.totalHaber))}`
              : "No informado"
          }
          description={
            stats.hasVisibleTotals
              ? "Control rápido entre debe y haber del conjunto consultado."
              : "Los totales de la página no vienen informados por el endpoint actual."
          }
        />
        <SummaryCard
          title="Con totales visibles"
          value={String(stats.entriesWithTotals)}
          description="Asientos de la página actual que ya publican debe y haber desde backend."
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SummaryCard
          title="Altas recientes"
          value={String(recentCreatedCount)}
          description="Asientos con alta visible dentro de los últimos siete días del lote cargado."
        />
        <SummaryCard
          title="Promedio por asiento"
          value={stats.hasVisibleTotals ? `$${fmtARS(averageEntryAmount)}` : "No informado"}
          description={
            stats.hasVisibleTotals
              ? "Promedio del debe acumulado sobre la selección visible."
              : "El promedio queda pendiente hasta que la API publique totales por asiento."
          }
        />
        <SummaryCard
          title="Cobertura actual"
          value={ejercicio ? "Consulta + alta" : "Sólo consulta"}
          description="El módulo usa endpoints reales de libro diario, detalle, origen y alta manual."
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros operativos</CardTitle>
          <CardDescription>
            Filtrá por estado, rango y texto libre. Los filtros de estado y fecha consultan al
            backend; la búsqueda textual refina la página ya cargada.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_220px_180px_180px_auto]">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número, fecha o descripción..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <Select
              value={estado || "all"}
              onValueChange={(value) => {
                setEstado(value === "all" ? "" : value)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="BORRADOR">Borrador</SelectItem>
                <SelectItem value="CONTABILIZADO">Contabilizado</SelectItem>
                <SelectItem value="PUBLICADO">Publicado</SelectItem>
                <SelectItem value="ANULADO">Anulado</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={desde}
              onChange={(e) => {
                setDesde(e.target.value)
                setPage(1)
              }}
            />
            <Input
              type="date"
              value={hasta}
              onChange={(e) => {
                setHasta(e.target.value)
                setPage(1)
              }}
            />

            <Button type="button" variant="outline" onClick={clearFilters}>
              Limpiar
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            <span>Ejercicio: {ejercicio?.descripcion ?? "no disponible"}</span>
            <span>·</span>
            <span>Sucursal: {sucursalId}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Libro diario operativo</CardTitle>
          <CardDescription>
            Se muestran los asientos devueltos por el backend. En esta etapa quedan activas sólo la
            consulta detallada y el alta manual balanceada.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeEntry && (
            <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
              <div className="rounded-lg border p-4">
                <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <ArrowRightLeft className="h-4 w-4" /> Asiento destacado
                </div>
                <DetailFieldGrid
                  fields={[
                    {
                      label: "Número",
                      value: String(activeEntry.numero ?? `AS-${activeEntry.id}`),
                    },
                    { label: "Fecha", value: formatDate(activeEntry.fecha) },
                    { label: "Descripción", value: activeEntry.descripcion },
                    {
                      label: "Sucursal",
                      value: activeEntry.sucursalId
                        ? String(activeEntry.sucursalId)
                        : "Sin sucursal",
                    },
                    { label: "Alta", value: formatDateTime(activeEntry.createdAt) },
                    { label: "Antigüedad", value: getEntryAgeLabel(activeEntry.createdAt) },
                  ]}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Circuito</p>
                  <p className="mt-3 font-semibold">{activeEntryCircuit?.label}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{activeEntryCircuit?.detail}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Balance</p>
                  <p className="mt-3 font-semibold">{activeEntryBalance?.label}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{activeEntryBalance?.detail}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Cobertura legacy</p>
                  <p className="mt-3 font-semibold">{activeEntryCoverage?.label}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {activeEntryCoverage?.detail}
                  </p>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Scale className="mb-3 h-10 w-10 opacity-30" />
              <p>No hay asientos para los filtros actuales.</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Circuito</TableHead>
                    <TableHead className="text-right">Debe</TableHead>
                    <TableHead className="text-right">Haber</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((entry) => {
                    const circuit = getAsientoCircuit(entry)

                    return (
                      <TableRow
                        key={entry.id}
                        className={activeEntry?.id === entry.id ? "bg-accent/40" : undefined}
                        onClick={() => setSelectedEntryId(entry.id)}
                      >
                        <TableCell className="font-mono text-sm">
                          {entry.numero ?? `AS-${entry.id}`}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(entry.fecha)}
                        </TableCell>
                        <TableCell className="max-w-105 text-sm font-medium">
                          <div className="truncate">{entry.descripcion}</div>
                        </TableCell>
                        <TableCell>{getStatusBadge(entry.estado)}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{circuit.label}</p>
                            <p className="text-xs text-muted-foreground">{circuit.detail}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatAsientoTotal(entry.totalDebe)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatAsientoTotal(entry.totalHaber)}
                        </TableCell>
                        <TableCell
                          className="text-right"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetail(entry.id)}
                          >
                            <Eye className="h-4 w-4" />
                            Ver detalle
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Página {page} de {Math.max(totalPages, 1)}.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Detalle de asiento</DialogTitle>
            <DialogDescription>
              Consulta completa del asiento seleccionado con sus líneas imputadas.
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex justify-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : !selectedAsiento ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>No se pudo recuperar el detalle del asiento.</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <SummaryCard
                  title="Número"
                  value={String(selectedAsiento.numero ?? selectedAsiento.id)}
                  description={selectedAsiento.descripcion}
                />
                <SummaryCard
                  title="Fecha"
                  value={formatDate(selectedAsiento.fecha)}
                  description={`Estado: ${selectedAsiento.estado}`}
                />
                <SummaryCard
                  title="Debe"
                  value={`$${fmtARS(selectedAsientoTotals?.totalDebe)}`}
                  description={
                    selectedAsientoTotals?.sourcedFromLines
                      ? "Total deudor calculado desde las líneas del asiento."
                      : "Total deudor del asiento."
                  }
                />
                <SummaryCard
                  title="Haber"
                  value={`$${fmtARS(selectedAsientoTotals?.totalHaber)}`}
                  description={
                    selectedAsientoTotals?.sourcedFromLines
                      ? "Total acreedor calculado desde las líneas del asiento."
                      : "Total acreedor del asiento."
                  }
                />
              </div>

              <Tabs defaultValue="lineas" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="lineas">Lineas</TabsTrigger>
                  <TabsTrigger value="circuito">Circuito</TabsTrigger>
                </TabsList>

                <TabsContent value="lineas" className="pt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cuenta</TableHead>
                        <TableHead>Denominación</TableHead>
                        <TableHead className="text-right">Debe</TableHead>
                        <TableHead className="text-right">Haber</TableHead>
                        <TableHead>Observación</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedAsiento.lineas.map((linea) => {
                        const fallbackCuenta = planCuentaById.get(linea.cuentaId)
                        const codigoCuenta =
                          linea.codigoCuenta?.trim() ||
                          fallbackCuenta?.codigoCuenta ||
                          `#${linea.cuentaId}`
                        const denominacion =
                          linea.denominacion?.trim() ||
                          fallbackCuenta?.denominacion ||
                          `Cuenta #${linea.cuentaId}`

                        return (
                          <TableRow key={linea.id}>
                            <TableCell className="font-mono text-sm">{codigoCuenta}</TableCell>
                            <TableCell className="text-sm">{denominacion}</TableCell>
                            <TableCell className="text-right text-sm">
                              ${fmtARS(linea.debe)}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              ${fmtARS(linea.haber)}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {linea.observacion || "-"}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </TabsContent>

                <TabsContent value="circuito" className="space-y-4 pt-4">
                  <DetailFieldGrid
                    fields={[
                      { label: "Circuito", value: getAsientoCircuit(selectedAsiento).label },
                      { label: "Balance", value: getBalanceReading(selectedAsiento).label },
                      {
                        label: "Cobertura legacy",
                        value: getLegacyCoverage(selectedAsiento).label,
                      },
                      { label: "Alta", value: formatDateTime(selectedAsiento.createdAt) },
                      { label: "Antiguedad", value: getEntryAgeLabel(selectedAsiento.createdAt) },
                      { label: "Lineas", value: String(selectedAsiento.lineas.length) },
                    ]}
                  />
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      El backend actual expone libro diario y alta manual balanceada, pero no
                      autorizaciones ampliadas ni distribucion de centros de costo del legado.
                    </AlertDescription>
                  </Alert>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={originOpen} onOpenChange={handleOriginOpenChange}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Asientos por origen</DialogTitle>
            <DialogDescription>
              Consulta la trazabilidad contable por tabla e identificador usando el endpoint ya
              expuesto por backend.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {originError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{originError}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px_auto]">
              <div className="space-y-2">
                <Label htmlFor="origin-tabla">Tabla de origen</Label>
                <Input
                  id="origin-tabla"
                  value={originTabla}
                  onChange={(e) => setOriginTabla(e.target.value)}
                  placeholder="Ej.: comprobantes, pagos, cobros"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="origin-id">ID de origen</Label>
                <Input
                  id="origin-id"
                  type="number"
                  min="1"
                  value={originId}
                  onChange={(e) => setOriginId(e.target.value)}
                  placeholder="Ej.: 123"
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  className="w-full"
                  onClick={() => void handleLookupByOrigin()}
                  disabled={originLoading}
                >
                  {originLoading ? "Consultando..." : "Buscar asientos"}
                </Button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <SummaryCard
                title="Resultados"
                value={String(originResults.length)}
                description="Asientos devueltos para el origen consultado."
              />
              <SummaryCard
                title="Debe acumulado"
                value={
                  originTotals.hasVisibleTotals
                    ? `$${fmtARS(originTotals.totalDebe)}`
                    : "No informado"
                }
                description={
                  originTotals.hasVisibleTotals
                    ? "Suma de los débitos de los asientos encontrados."
                    : "La consulta por origen devolvió asientos sin totales agregados publicados."
                }
              />
              <SummaryCard
                title="Haber acumulado"
                value={
                  originTotals.hasVisibleTotals
                    ? `$${fmtARS(originTotals.totalHaber)}`
                    : "No informado"
                }
                description={
                  originTotals.hasVisibleTotals
                    ? "Suma de los créditos de los asientos encontrados."
                    : "La consulta por origen devolvió asientos sin totales agregados publicados."
                }
              />
            </div>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Debe</TableHead>
                    <TableHead className="text-right">Haber</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {originLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                        Consultando asientos vinculados...
                      </TableCell>
                    </TableRow>
                  ) : originResults.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                        Ejecutá una búsqueda para revisar la trazabilidad por origen.
                      </TableCell>
                    </TableRow>
                  ) : (
                    originResults.map((entry) => (
                      <TableRow key={`origin-${entry.id}`}>
                        <TableCell className="font-mono text-sm">
                          {entry.numero ?? `AS-${entry.id}`}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(entry.fecha).toLocaleDateString("es-AR")}
                        </TableCell>
                        <TableCell className="max-w-105 text-sm font-medium">
                          <div className="truncate">{entry.descripcion}</div>
                        </TableCell>
                        <TableCell>{getStatusBadge(entry.estado)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatAsientoTotal(entry.totalDebe)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatAsientoTotal(entry.totalHaber)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              handleOriginOpenChange(false)
                              await handleViewDetail(entry.id)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                            Ver detalle
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  handleOriginOpenChange(false)
                  resetOriginLookup()
                }}
              >
                Cerrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={handleCreateOpenChange}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Nuevo asiento manual</DialogTitle>
            <DialogDescription>
              Alta mínima soportada por el backend actual. El asiento debe quedar balanceado antes
              de enviarse.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {createError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{createError}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fecha-asiento">Fecha</Label>
                <Input
                  id="fecha-asiento"
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ejercicio-asiento">Ejercicio</Label>
                <Input
                  id="ejercicio-asiento"
                  value={ejercicio?.descripcion ?? "Sin ejercicio"}
                  disabled
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion-asiento">Descripción</Label>
              <Textarea
                id="descripcion-asiento"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Ej.: Devengamiento de gastos, ajuste por cierre, reclasificación contable..."
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium">Líneas del asiento</h3>
                  <p className="text-sm text-muted-foreground">
                    Elegí cuenta imputable y cargá debe u haber en cada renglón.
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addLine}>
                  <Plus className="h-4 w-4" />
                  Agregar línea
                </Button>
              </div>

              <div className="space-y-3">
                {lineas.map((linea, index) => (
                  <div
                    key={index}
                    className="grid gap-3 rounded-lg border p-3 lg:grid-cols-[minmax(0,2fr)_140px_140px_minmax(0,1.2fr)_auto]"
                  >
                    <div className="space-y-2">
                      <Label>Cuenta</Label>
                      <Select
                        value={linea.cuentaId || undefined}
                        onValueChange={(value) => updateLine(index, "cuentaId", value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={
                              loadingCuentas ? "Cargando cuentas..." : "Seleccionar cuenta"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {cuentas.map((cuenta) => (
                            <SelectItem key={cuenta.id} value={String(cuenta.id)}>
                              {cuenta.codigoCuenta} · {cuenta.denominacion}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Debe</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={linea.debe}
                        onChange={(e) => updateLine(index, "debe", e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Haber</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={linea.haber}
                        onChange={(e) => updateLine(index, "haber", e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Observación</Label>
                      <Input
                        value={linea.observacion}
                        onChange={(e) => updateLine(index, "observacion", e.target.value)}
                        placeholder="Referencia opcional"
                      />
                    </div>

                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLine(index)}
                        disabled={lineas.length <= 2}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <SummaryCard
                title="Debe"
                value={`$${fmtARS(draftTotals.totalDebe)}`}
                description="Total de líneas deudoras cargadas."
              />
              <SummaryCard
                title="Haber"
                value={`$${fmtARS(draftTotals.totalHaber)}`}
                description="Total de líneas acreedoras cargadas."
              />
              <SummaryCard
                title="Diferencia"
                value={`$${fmtARS(draftTotals.diferencia)}`}
                description="Debe ser cero para habilitar un asiento válido."
              />
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                La distribucion por centros de costo y las autorizaciones ampliadas del legado
                siguen fuera del DTO actual. Si ese circuito vuelve a exponerse, debe venir desde
                backend y no desde notas persistidas solo en este navegador.
              </AlertDescription>
            </Alert>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  handleCreateOpenChange(false)
                  resetCreateForm()
                }}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleCreate}
                disabled={saving || loadingCuentas || !ejercicio?.id}
              >
                {saving ? "Guardando..." : "Registrar asiento"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function AsientosPage() {
  return (
    <Suspense fallback={<Loading />}>
      <AsientosContent />
    </Suspense>
  )
}
