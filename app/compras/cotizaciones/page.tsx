"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Eye,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShoppingCart,
  Trash2,
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
import { useCotizacionesCompra, useRequisicionesCompra } from "@/lib/hooks/useCompras"
import { useItems } from "@/lib/hooks/useItems"
import { useLegacyLocalCollection } from "@/lib/hooks/useLegacyLocalCollection"
import { useOrdenesCompra } from "@/lib/hooks/useOrdenesCompra"
import { useSucursales } from "@/lib/hooks/useSucursales"
import { useProveedores } from "@/lib/hooks/useTerceros"
import type {
  CotizacionCompraDetalle,
  CotizacionCompraListItem,
  RequisicionCompraDetalle,
} from "@/lib/types/compras-operativa"

type TrackerStage = "sin_revisar" | "en_analisis" | "en_espera_proveedor" | "lista_para_orden"

type LocalQuotationTracker = {
  quotationId: number
  stage: TrackerStage
  buyer: string
  nextStep: string
  updatedAt: string
}

type DraftQuotationItem = {
  itemId: string
  descripcion: string
  cantidad: string
  precioUnitario: string
}

const QUOTATION_TRACKER_STORAGE_KEY = "zuluia_compras_quotation_trackers"

function createDraftQuotationItem(): DraftQuotationItem {
  return {
    itemId: "manual",
    descripcion: "",
    cantidad: "1",
    precioUnitario: "0",
  }
}

function mapRequisitionItemsToDraftItems(
  requisition: RequisicionCompraDetalle
): DraftQuotationItem[] {
  if (requisition.items.length === 0) {
    return [createDraftQuotationItem()]
  }

  return requisition.items.map((item) => ({
    itemId: item.itemId ? String(item.itemId) : "manual",
    descripcion: item.descripcion,
    cantidad: String(item.cantidad),
    precioUnitario: "0",
  }))
}

const TRACKER_STAGE_CONFIG: Record<
  TrackerStage,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  sin_revisar: { label: "Sin revisar", variant: "outline" },
  en_analisis: { label: "En análisis", variant: "secondary" },
  en_espera_proveedor: { label: "En espera proveedor", variant: "outline" },
  lista_para_orden: { label: "Lista para orden", variant: "default" },
}

function formatMoney(value: number, currency = "ARS") {
  return value.toLocaleString("es-AR", { style: "currency", currency })
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString("es-AR") : "-"
}

function getDaysUntil(value?: string | null) {
  if (!value) return null
  const target = new Date(value)
  const today = new Date()
  target.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  return Math.floor((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function getStatusMeta(status: string) {
  const value = status.toUpperCase()
  switch (value) {
    case "BORRADOR":
      return { label: "Borrador", variant: "outline" as const }
    case "ENVIADA":
      return { label: "Enviada", variant: "secondary" as const }
    case "NEGOCIACION":
      return { label: "Negociación", variant: "secondary" as const }
    case "APROBADA":
    case "ACEPTADA":
      return { label: "Aprobada", variant: "default" as const }
    case "RECHAZADA":
      return { label: "Rechazada", variant: "destructive" as const }
    default:
      return { label: status, variant: "outline" as const }
  }
}

function matchesTerm(quote: CotizacionCompraListItem, term: string) {
  if (term === "") return true

  return [
    quote.proveedor,
    quote.proveedorRazonSocial,
    quote.requisicionReferencia ?? "",
    quote.estado,
    quote.estadoLegacy,
    String(quote.id),
  ]
    .join(" ")
    .toLowerCase()
    .includes(term)
}

function getQuotationHealth(status: string, tracker: LocalQuotationTracker) {
  if (tracker.stage === "lista_para_orden") return "Lista para pasar al circuito real de órdenes"
  if (status === "BORRADOR") return "Pendiente de revisión comercial inicial"
  if (status === "RECHAZADA") return "Fuera de circuito por rechazo comercial"
  if (tracker.stage === "en_espera_proveedor")
    return "Se espera definición o respuesta del proveedor"
  return "En evaluación comercial"
}

function buildDefaultTracker(quote: CotizacionCompraListItem): LocalQuotationTracker {
  const status = (quote.estadoLegacy || quote.estado || "").toUpperCase()
  return {
    quotationId: quote.id,
    stage:
      status === "APROBADA"
        ? "lista_para_orden"
        : status === "BORRADOR"
          ? "sin_revisar"
          : "en_analisis",
    buyer: "Compras",
    nextStep:
      status === "APROBADA"
        ? "Emitir orden de compra sobre la cotización aprobada."
        : status === "BORRADOR"
          ? "Revisar el alcance y validar condiciones comerciales."
          : "Completar la decisión comercial y definir si pasa a orden.",
    updatedAt: quote.createdAt,
  }
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

export default function CotizacionesCompraPage() {
  const { sucursales } = useSucursales()
  const defaultSucursalId = sucursales[0]?.id
  const {
    terceros: proveedores,
    loading: loadingProviders,
    error: providersError,
  } = useProveedores()
  const { ordenes, loading: loadingOrders, error: ordersError } = useOrdenesCompra()
  const { requisiciones, getById: getRequisitionById } = useRequisicionesCompra()
  const { cotizaciones, loading, error, getById, crear, aceptar, rechazar, refetch } =
    useCotizacionesCompra()
  const {
    rows: trackers,
    setRows: setTrackers,
    reset: resetTrackers,
  } = useLegacyLocalCollection<LocalQuotationTracker>(QUOTATION_TRACKER_STORAGE_KEY, [])

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("todas")
  const [stageFilter, setStageFilter] = useState<"todas" | TrackerStage>("todas")
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selectedDetail, setSelectedDetail] = useState<CotizacionCompraDetalle | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [prefillLoading, setPrefillLoading] = useState(false)
  const [prefillError, setPrefillError] = useState<string | null>(null)
  const [selectedRequisitionDetail, setSelectedRequisitionDetail] =
    useState<RequisicionCompraDetalle | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<"aceptar" | "rechazar" | null>(null)
  const { items } = useItems({ enabled: createOpen })
  const [createForm, setCreateForm] = useState({
    sucursalId: "",
    proveedorId: "",
    requisicionId: "sin_requisicion",
    fecha: new Date().toISOString().slice(0, 10),
    fechaVencimiento: "",
    observacion: "",
    items: [createDraftQuotationItem()],
  })
  const createSucursalValue =
    createForm.sucursalId || (defaultSucursalId ? String(defaultSucursalId) : "")

  const defaultTrackers = useMemo(() => cotizaciones.map(buildDefaultTracker), [cotizaciones])
  const trackerMap = useMemo(
    () => new Map(trackers.map((tracker) => [tracker.quotationId, tracker])),
    [trackers]
  )

  const quotes = useMemo(
    () =>
      cotizaciones.map((quote) => ({
        ...quote,
        displayStatus: (quote.estadoLegacy || quote.estado || "").toUpperCase(),
        tracker:
          trackerMap.get(quote.id) ?? defaultTrackers.find((row) => row.quotationId === quote.id)!,
        daysToExpire: getDaysUntil(quote.fechaVencimiento),
      })),
    [cotizaciones, defaultTrackers, trackerMap]
  )

  const filteredQuotes = useMemo(() => {
    const term = search.toLowerCase().trim()
    return quotes.filter((quote) => {
      const matchesSearch = matchesTerm(quote, term)
      const matchesStatus = statusFilter === "todas" || quote.displayStatus === statusFilter
      const matchesStage = stageFilter === "todas" || quote.tracker.stage === stageFilter
      return matchesSearch && matchesStatus && matchesStage
    })
  }, [quotes, search, stageFilter, statusFilter])

  const selectedBase = quotes.find((quote) => quote.id === selectedId) ?? filteredQuotes[0] ?? null

  useEffect(() => {
    if (!selectedId) {
      return
    }

    let cancelled = false
    getById(selectedId)
      .then((detail) => {
        if (!cancelled) setSelectedDetail(detail)
      })
      .catch(() => {
        if (!cancelled) setSelectedDetail(null)
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [getById, selectedId])

  const kpis = useMemo(() => {
    const approved = quotes.filter((quote) => quote.displayStatus === "APROBADA").length
    const open = quotes.filter((quote) => quote.displayStatus !== "APROBADA").length
    const expiringSoon = quotes.filter(
      (quote) => quote.daysToExpire !== null && quote.daysToExpire <= 5
    ).length
    const total = quotes.reduce((acc, quote) => acc + quote.total, 0)
    return { approved, open, expiringSoon, total }
  }, [quotes])

  const queue = useMemo(() => {
    const stageOrder: Record<TrackerStage, number> = {
      lista_para_orden: 0,
      en_analisis: 1,
      en_espera_proveedor: 2,
      sin_revisar: 3,
    }

    return [...filteredQuotes]
      .sort((left, right) => {
        if (stageOrder[left.tracker.stage] !== stageOrder[right.tracker.stage]) {
          return stageOrder[left.tracker.stage] - stageOrder[right.tracker.stage]
        }
        return (left.daysToExpire ?? 9999) - (right.daysToExpire ?? 9999)
      })
      .slice(0, 5)
  }, [filteredQuotes])

  const requisitionOptions = useMemo(
    () =>
      requisiciones.filter(
        (requisition) =>
          requisition.estadoLegacy?.toUpperCase() === "APROBADA" ||
          requisition.estado?.toUpperCase() === "APROBADA"
      ),
    [requisiciones]
  )

  const itemOptions = useMemo(() => items.filter((item) => item.activo), [items])

  const updateTracker = useCallback(
    (quotationId: number, patch: Partial<LocalQuotationTracker>) => {
      setTrackers((current) => {
        const index = current.findIndex((row) => row.quotationId === quotationId)
        const nextRow = {
          ...(index >= 0
            ? current[index]
            : defaultTrackers.find((row) => row.quotationId === quotationId)!),
          ...patch,
          updatedAt: new Date().toISOString(),
        }

        if (index >= 0) {
          return current.map((row, rowIndex) => (rowIndex === index ? nextRow : row))
        }

        return [...current, nextRow]
      })
    },
    [defaultTrackers, setTrackers]
  )

  const openDetail = useCallback((id: number) => {
    setSelectedDetail(null)
    setDetailLoading(true)
    setSelectedId(id)
  }, [])

  const runAction = useCallback(
    async (mode: "aceptar" | "rechazar", id: number) => {
      setActionLoading(mode)
      const ok = mode === "aceptar" ? await aceptar(id) : await rechazar(id)
      setActionLoading(null)

      if (ok) {
        await refetch()
        if (selectedId === id) {
          const detail = await getById(id).catch(() => null)
          setSelectedDetail(detail)
        }
      }
    },
    [aceptar, getById, rechazar, refetch, selectedId]
  )

  const updateCreateItem = useCallback((index: number, patch: Partial<DraftQuotationItem>) => {
    setCreateForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      ),
    }))
  }, [])

  const handleSelectCatalogItem = useCallback(
    (index: number, value: string) => {
      if (value === "manual") {
        updateCreateItem(index, { itemId: value, descripcion: "", precioUnitario: "0" })
        return
      }

      const selectedItem = itemOptions.find((item) => item.id === Number(value))
      updateCreateItem(index, {
        itemId: value,
        descripcion: selectedItem?.descripcion ?? "",
        precioUnitario: String(selectedItem?.precioCosto ?? 0),
      })
    },
    [itemOptions, updateCreateItem]
  )

  const addCreateItem = useCallback(() => {
    setCreateForm((current) => ({
      ...current,
      items: [...current.items, createDraftQuotationItem()],
    }))
  }, [])

  const applyRequisitionPrefill = useCallback(
    async (value: string) => {
      setPrefillError(null)

      if (value === "sin_requisicion") {
        setSelectedRequisitionDetail(null)
        setCreateForm((current) => ({ ...current, requisicionId: value }))
        return
      }

      const requisitionId = Number(value)
      if (!Number.isFinite(requisitionId)) {
        setPrefillError("No se pudo interpretar la requisición seleccionada.")
        return
      }

      setPrefillLoading(true)
      try {
        const detail = await getRequisitionById(requisitionId)
        setSelectedRequisitionDetail(detail)
        setCreateForm((current) => ({
          ...current,
          requisicionId: value,
          sucursalId: String(detail.sucursalId),
          observacion:
            current.observacion.trim() !== ""
              ? current.observacion
              : detail.observacion?.trim() || detail.descripcion,
          items: mapRequisitionItemsToDraftItems(detail),
        }))
      } catch (loadError) {
        setSelectedRequisitionDetail(null)
        setPrefillError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudo cargar el detalle de la requisición."
        )
      } finally {
        setPrefillLoading(false)
      }
    },
    [getRequisitionById]
  )

  const removeCreateItem = useCallback((index: number) => {
    setCreateForm((current) => ({
      ...current,
      items:
        current.items.length === 1 ? current.items : current.items.filter((_, i) => i !== index),
    }))
  }, [])

  const resetCreateForm = useCallback(() => {
    setCreateError(null)
    setPrefillError(null)
    setPrefillLoading(false)
    setSelectedRequisitionDetail(null)
    setCreateForm({
      sucursalId: defaultSucursalId ? String(defaultSucursalId) : "",
      proveedorId: "",
      requisicionId: "sin_requisicion",
      fecha: new Date().toISOString().slice(0, 10),
      fechaVencimiento: "",
      observacion: "",
      items: [createDraftQuotationItem()],
    })
  }, [defaultSucursalId])

  const submitCreate = useCallback(async () => {
    setCreateError(null)

    const validItems = createForm.items
      .map((item) => ({
        itemId: item.itemId === "manual" || item.itemId === "" ? null : Number(item.itemId),
        descripcion: item.descripcion.trim(),
        cantidad: Number(item.cantidad),
        precioUnitario: Number(item.precioUnitario),
      }))
      .filter(
        (item) =>
          item.descripcion !== "" &&
          Number.isFinite(item.cantidad) &&
          item.cantidad > 0 &&
          Number.isFinite(item.precioUnitario) &&
          item.precioUnitario >= 0
      )

    if (!createSucursalValue || !createForm.proveedorId || !createForm.fecha) {
      setCreateError("Complete sucursal, proveedor y fecha de la cotización.")
      return
    }

    if (validItems.length === 0) {
      setCreateError("Agregue al menos un ítem válido para la cotización.")
      return
    }

    setCreateLoading(true)
    const ok = await crear({
      sucursalId: Number(createSucursalValue),
      requisicionId:
        createForm.requisicionId === "sin_requisicion" ? null : Number(createForm.requisicionId),
      proveedorId: Number(createForm.proveedorId),
      fecha: createForm.fecha,
      fechaVencimiento: createForm.fechaVencimiento || null,
      observacion: createForm.observacion.trim() || null,
      items: validItems,
    })
    setCreateLoading(false)

    if (ok) {
      await refetch()
      setCreateOpen(false)
      resetCreateForm()
      setStatusFilter("BORRADOR")
    } else {
      setCreateError("No se pudo crear la cotización. Revise los datos e intente nuevamente.")
    }
  }, [crear, createForm, createSucursalValue, refetch, resetCreateForm])

  const activeProviders = proveedores.filter((provider) => provider.activo).length

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cotizaciones de compra</h1>
          <p className="text-muted-foreground">
            Consola real de cotizaciones, su estado comercial y el pase al circuito de órdenes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="bg-transparent" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nueva cotización
          </Button>
          <Button variant="outline" className="bg-transparent" asChild>
            <Link href="/compras/requisiciones">
              <ClipboardList className="mr-2 h-4 w-4" /> Ver requisiciones
            </Link>
          </Button>
          <Button asChild>
            <Link href="/compras/ordenes">
              <ShoppingCart className="mr-2 h-4 w-4" /> Ir a órdenes
            </Link>
          </Button>
        </div>
      </div>

      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertDescription>
          Esta vista ya trabaja sobre cotizaciones reales del backend. El seguimiento local queda
          como capa interna para priorización y notas operativas.
        </AlertDescription>
      </Alert>

      {(error || providersError || ordersError) && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || providersError || ordersError}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Abiertas</p>
            <p className="mt-2 text-2xl font-bold">{loading ? "..." : kpis.open}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Aprobadas</p>
            <p className="mt-2 text-2xl font-bold text-emerald-600">
              {loading ? "..." : kpis.approved}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Vencen en 5 días</p>
            <p className="mt-2 text-2xl font-bold text-amber-600">
              {loading ? "..." : kpis.expiringSoon}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Monto visible</p>
            <p className="mt-2 text-2xl font-bold">{loading ? "..." : formatMoney(kpis.total)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">Origen del circuito</CardTitle>
            <CardDescription>
              Las cotizaciones toman como base requisiciones y terminan en órdenes cuando la
              decisión comercial ya está cerrada.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/compras/requisiciones">
                <ArrowRight className="mr-2 h-4 w-4" /> Ver requisiciones reales
              </Link>
            </Button>
            <Button variant="outline" className="bg-transparent" onClick={() => resetTrackers()}>
              <RefreshCw className="mr-2 h-4 w-4" /> Restablecer seguimiento local
            </Button>
          </CardContent>
        </Card>
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">Cobertura real</CardTitle>
            <CardDescription>Señales del circuito disponible hoy para compras.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Proveedores activos</p>
              <p className="mt-1 text-2xl font-bold">
                {loadingProviders ? "..." : activeProviders}
              </p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Órdenes visibles</p>
              <p className="mt-1 text-2xl font-bold">{loadingOrders ? "..." : ordenes.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 lg:grid-cols-[1.7fr_repeat(2,minmax(0,1fr))]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-10"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar proveedor, requisición o estado..."
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todos los estados</SelectItem>
                <SelectItem value="BORRADOR">Borrador</SelectItem>
                <SelectItem value="ENVIADA">Enviada</SelectItem>
                <SelectItem value="NEGOCIACION">Negociación</SelectItem>
                <SelectItem value="APROBADA">Aprobada</SelectItem>
                <SelectItem value="RECHAZADA">Rechazada</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={stageFilter}
              onValueChange={(value) => setStageFilter(value as "todas" | TrackerStage)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seguimiento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todo el seguimiento</SelectItem>
                <SelectItem value="sin_revisar">Sin revisar</SelectItem>
                <SelectItem value="en_analisis">En análisis</SelectItem>
                <SelectItem value="en_espera_proveedor">En espera proveedor</SelectItem>
                <SelectItem value="lista_para_orden">Lista para orden</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.8fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lote de cotizaciones</CardTitle>
            <CardDescription>
              Vista operativa de cotizaciones reales con estado comercial y vencimiento.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Requisición</TableHead>
                  <TableHead>Vigencia</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Seguimiento</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuotes.map((quote) => {
                  const statusMeta = getStatusMeta(quote.displayStatus)
                  return (
                    <TableRow key={quote.id}>
                      <TableCell className="font-medium">COT-{quote.id}</TableCell>
                      <TableCell>{quote.proveedor}</TableCell>
                      <TableCell>{quote.requisicionReferencia ?? "Sin origen visible"}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p>{formatDate(quote.fechaVencimiento)}</p>
                          <p className="text-xs text-muted-foreground">
                            {quote.daysToExpire === null
                              ? "Sin vencimiento"
                              : quote.daysToExpire < 0
                                ? `Vencida hace ${Math.abs(quote.daysToExpire)} días`
                                : `Vence en ${quote.daysToExpire} días`}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{formatMoney(quote.total)}</TableCell>
                      <TableCell>
                        <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={TRACKER_STAGE_CONFIG[quote.tracker.stage].variant}>
                          {TRACKER_STAGE_CONFIG[quote.tracker.stage].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openDetail(quote.id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {filteredQuotes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                      {loading
                        ? "Cargando cotizaciones reales..."
                        : "No hay cotizaciones que coincidan con los filtros actuales."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cola operativa</CardTitle>
            <CardDescription>
              Se priorizan primero las listas para orden y luego las que vencen antes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {queue.map((quote) => (
              <button
                key={quote.id}
                type="button"
                onClick={() => openDetail(quote.id)}
                className="w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">COT-{quote.id}</p>
                    <p className="text-sm text-muted-foreground">{quote.proveedor}</p>
                  </div>
                  <Badge variant={TRACKER_STAGE_CONFIG[quote.tracker.stage].variant}>
                    {TRACKER_STAGE_CONFIG[quote.tracker.stage].label}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {getQuotationHealth(quote.displayStatus, quote.tracker)}
                </p>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={selectedBase !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedId(null)
            setSelectedDetail(null)
          }
        }}
      >
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>
              {selectedBase ? `Cotización COT-${selectedBase.id}` : "Cotización"}
            </DialogTitle>
            <DialogDescription>
              {selectedBase
                ? `${selectedBase.proveedor} · ${selectedBase.requisicionReferencia ?? "sin requisición"}`
                : "Detalle de cotización"}
            </DialogDescription>
          </DialogHeader>

          {selectedBase && (
            <Tabs defaultValue="circuito">
              <TabsList className="grid h-auto w-full grid-cols-3">
                <TabsTrigger value="circuito">Circuito</TabsTrigger>
                <TabsTrigger value="items">Items</TabsTrigger>
                <TabsTrigger value="seguimiento">Seguimiento</TabsTrigger>
              </TabsList>

              <TabsContent value="circuito" className="space-y-4 pt-2">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Cabecera comercial</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <DetailFieldGrid
                        fields={[
                          { label: "Proveedor", value: selectedBase.proveedor },
                          {
                            label: "Requisición",
                            value: selectedBase.requisicionReferencia ?? "Sin origen visible",
                          },
                          { label: "Fecha", value: formatDate(selectedBase.fecha) },
                          {
                            label: "Vencimiento",
                            value: formatDate(selectedBase.fechaVencimiento),
                          },
                          {
                            label: "Estado",
                            value: getStatusMeta(selectedBase.displayStatus).label,
                          },
                          {
                            label: "Seguimiento local",
                            value: TRACKER_STAGE_CONFIG[selectedBase.tracker.stage].label,
                          },
                          { label: "Total", value: formatMoney(selectedBase.total) },
                          {
                            label: "Salud del circuito",
                            value: getQuotationHealth(
                              selectedBase.displayStatus,
                              selectedBase.tracker
                            ),
                          },
                        ]}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Acciones reales</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">Observación</p>
                        <p className="mt-1 font-medium">
                          {detailLoading
                            ? "Cargando detalle..."
                            : selectedDetail?.observacion || "Sin observaciones registradas."}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          onClick={() => void runAction("aceptar", selectedBase.id)}
                          disabled={
                            actionLoading !== null || selectedBase.displayStatus === "APROBADA"
                          }
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" /> Aprobar
                        </Button>
                        <Button
                          variant="outline"
                          className="bg-transparent"
                          onClick={() => void runAction("rechazar", selectedBase.id)}
                          disabled={
                            actionLoading !== null || selectedBase.displayStatus === "RECHAZADA"
                          }
                        >
                          <XCircle className="mr-2 h-4 w-4" /> Rechazar
                        </Button>
                        <Button variant="outline" className="bg-transparent" asChild>
                          <Link
                            href={`/compras/ordenes?crear=1&cotizacionId=${selectedBase.id}&proveedorId=${selectedBase.proveedorId}`}
                          >
                            <ShoppingCart className="mr-2 h-4 w-4" /> Ir a órdenes
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="items" className="pt-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Renglones cotizados</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Código</TableHead>
                          <TableHead>Descripción</TableHead>
                          <TableHead>Cantidad</TableHead>
                          <TableHead>Precio unitario</TableHead>
                          <TableHead>Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailLoading && (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="py-8 text-center text-muted-foreground"
                            >
                              Cargando detalle de cotización...
                            </TableCell>
                          </TableRow>
                        )}
                        {!detailLoading &&
                          (selectedDetail?.items ?? []).map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">{item.codigo}</TableCell>
                              <TableCell>{item.descripcion}</TableCell>
                              <TableCell>{item.cantidad}</TableCell>
                              <TableCell>{formatMoney(item.precioUnitario)}</TableCell>
                              <TableCell>{formatMoney(item.subtotal)}</TableCell>
                            </TableRow>
                          ))}
                        {!detailLoading && (selectedDetail?.items ?? []).length === 0 && (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="py-8 text-center text-muted-foreground"
                            >
                              No hay renglones visibles para esta cotización.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="seguimiento" className="space-y-4 pt-2">
                <Alert>
                  <ShieldAlert className="h-4 w-4" />
                  <AlertDescription>
                    Este seguimiento queda sólo en el navegador actual para cubrir notas del equipo
                    y prioridades internas.
                  </AlertDescription>
                </Alert>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Seguimiento local</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Estado operativo</label>
                        <Select
                          value={selectedBase.tracker.stage}
                          onValueChange={(value) =>
                            updateTracker(selectedBase.id, { stage: value as TrackerStage })
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Seleccionar estado" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sin_revisar">Sin revisar</SelectItem>
                            <SelectItem value="en_analisis">En análisis</SelectItem>
                            <SelectItem value="en_espera_proveedor">En espera proveedor</SelectItem>
                            <SelectItem value="lista_para_orden">Lista para orden</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Responsable</label>
                        <Input
                          value={selectedBase.tracker.buyer}
                          onChange={(event) =>
                            updateTracker(selectedBase.id, { buyer: event.target.value })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Próximo paso</label>
                        <Textarea
                          rows={5}
                          value={selectedBase.tracker.nextStep}
                          onChange={(event) =>
                            updateTracker(selectedBase.id, { nextStep: event.target.value })
                          }
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Continuidad</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">Estado actual</p>
                        <p className="mt-1 font-medium">
                          {getQuotationHealth(selectedBase.displayStatus, selectedBase.tracker)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">Última actualización local</p>
                        <p className="mt-1 font-medium">
                          {formatDate(selectedBase.tracker.updatedAt)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">Paso sugerido</p>
                        <p className="mt-1 font-medium">{selectedBase.tracker.nextStep}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open)
          if (!open) resetCreateForm()
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva cotización de compra</DialogTitle>
            <DialogDescription>
              Alta real de cotización para continuar el circuito comercial de compras.
            </DialogDescription>
          </DialogHeader>

          {createError && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{createError}</AlertDescription>
            </Alert>
          )}

          {prefillError && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{prefillError}</AlertDescription>
            </Alert>
          )}

          {selectedRequisitionDetail && (
            <Card className="border-dashed bg-muted/20">
              <CardContent className="grid gap-3 pt-4 md:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">Requisición base</p>
                  <p className="mt-1 text-sm font-medium">
                    {selectedRequisitionDetail.requisicionReferencia}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Solicitante</p>
                  <p className="mt-1 text-sm font-medium">
                    {selectedRequisitionDetail.solicitanteNombre ||
                      selectedRequisitionDetail.solicitante}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Renglones copiados</p>
                  <p className="mt-1 text-sm font-medium">
                    {selectedRequisitionDetail.items.length}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Descripción base</p>
                  <p className="mt-1 line-clamp-2 text-sm font-medium">
                    {selectedRequisitionDetail.descripcion}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Sucursal</label>
              <Select
                value={createSucursalValue}
                onValueChange={(value) =>
                  setCreateForm((current) => ({ ...current, sucursalId: value }))
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

            <div className="space-y-2">
              <label className="text-sm font-medium">Proveedor</label>
              <Select
                value={createForm.proveedorId}
                onValueChange={(value) =>
                  setCreateForm((current) => ({ ...current, proveedorId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar proveedor" />
                </SelectTrigger>
                <SelectContent>
                  {proveedores.map((proveedor) => (
                    <SelectItem key={proveedor.id} value={String(proveedor.id)}>
                      {proveedor.razonSocial ??
                        proveedor.nombreFantasia ??
                        `Proveedor ${proveedor.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Requisición origen</label>
              <Select
                value={createForm.requisicionId}
                onValueChange={(value) => void applyRequisitionPrefill(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar requisición" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sin_requisicion">Sin requisición vinculada</SelectItem>
                  {requisitionOptions.map((requisition) => (
                    <SelectItem key={requisition.id} value={String(requisition.id)}>
                      {requisition.requisicionReferencia} · {requisition.descripcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {prefillLoading
                  ? "Cargando renglones y cabecera de la requisición seleccionada..."
                  : "Si la requisición está aprobada, se copiarán sus renglones al borrador de cotización."}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha</label>
              <Input
                type="date"
                value={createForm.fecha}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, fecha: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Vencimiento</label>
              <Input
                type="date"
                value={createForm.fechaVencimiento}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, fechaVencimiento: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Observación</label>
              <Textarea
                rows={3}
                value={createForm.observacion}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, observacion: event.target.value }))
                }
                placeholder="Condiciones comerciales, alcance o aclaraciones internas"
              />
            </div>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Items cotizados</CardTitle>
                  <CardDescription>
                    Cargue manualmente o apoyándose en el catálogo existente.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="bg-transparent"
                  onClick={addCreateItem}
                >
                  <Plus className="mr-2 h-4 w-4" /> Agregar ítem
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {createForm.items.map((item, index) => (
                <div
                  key={`${index}-${item.itemId}`}
                  className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1.6fr_1.6fr_120px_140px_auto]"
                >
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Catálogo</label>
                    <Select
                      value={item.itemId}
                      onValueChange={(value) => handleSelectCatalogItem(index, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Manual o catálogo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Carga manual</SelectItem>
                        {itemOptions.map((catalogItem) => (
                          <SelectItem key={catalogItem.id} value={String(catalogItem.id)}>
                            {catalogItem.codigo} · {catalogItem.descripcion}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Descripción</label>
                    <Input
                      value={item.descripcion}
                      onChange={(event) =>
                        updateCreateItem(index, { descripcion: event.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Cantidad</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.cantidad}
                      onChange={(event) =>
                        updateCreateItem(index, { cantidad: event.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Precio unitario</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.precioUnitario}
                      onChange={(event) =>
                        updateCreateItem(index, { precioUnitario: event.target.value })
                      }
                    />
                  </div>

                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCreateItem(index)}
                      disabled={createForm.items.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <DialogFooter>
            <Button
              variant="outline"
              className="bg-transparent"
              onClick={() => setCreateOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={() => void submitCreate()} disabled={createLoading}>
              <Plus className="mr-2 h-4 w-4" /> {createLoading ? "Creando..." : "Crear cotización"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
