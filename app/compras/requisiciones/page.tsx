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
import { useEmpleados } from "@/lib/hooks/useEmpleados"
import { useCotizacionesCompra, useRequisicionesCompra } from "@/lib/hooks/useCompras"
import { useItems } from "@/lib/hooks/useItems"
import { useLegacyLocalCollection } from "@/lib/hooks/useLegacyLocalCollection"
import { useOrdenesCompra } from "@/lib/hooks/useOrdenesCompra"
import { useSucursales } from "@/lib/hooks/useSucursales"
import type {
  RequisicionCompraDetalle,
  RequisicionCompraListItem,
} from "@/lib/types/compras-operativa"

type RequisitionStage = "sin_revisar" | "en_preparacion" | "lista_para_cotizar" | "derivada"

type LocalRequisitionTracker = {
  requisitionId: number
  stage: RequisitionStage
  buyer: string
  nextStep: string
  updatedAt: string
  statusSnapshot?: string
  manualStage?: boolean
  manualNextStep?: boolean
}

type RequisitionEmployeeOption = {
  id: number
  razonSocial?: string
  sucursalId: number
}

type DraftRequisitionItem = {
  itemId: string
  descripcion: string
  cantidad: string
  unidadMedida: string
  observacion: string
}

const REQUISITION_TRACKER_STORAGE_KEY = "zuluia_compras_requisition_trackers"

function createDraftItem(): DraftRequisitionItem {
  return {
    itemId: "manual",
    descripcion: "",
    cantidad: "1",
    unidadMedida: "u.",
    observacion: "",
  }
}

const STAGE_CONFIG: Record<
  RequisitionStage,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  sin_revisar: { label: "Sin revisar", variant: "outline" },
  en_preparacion: { label: "En preparación", variant: "secondary" },
  lista_para_cotizar: { label: "Lista para cotizar", variant: "default" },
  derivada: { label: "Derivada", variant: "default" },
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString("es-AR") : "-"
}

function getDaysFromCreated(value: string) {
  const target = new Date(value)
  const today = new Date()
  target.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  return Math.floor((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24))
}

function getStatusMeta(status: string) {
  const value = status.toUpperCase()
  switch (value) {
    case "BORRADOR":
      return { label: "Borrador", variant: "outline" as const }
    case "ENVIADA":
      return { label: "Enviada", variant: "secondary" as const }
    case "APROBADA":
      return { label: "Aprobada", variant: "default" as const }
    case "RECHAZADA":
      return { label: "Rechazada", variant: "destructive" as const }
    case "CANCELADA":
      return { label: "Cancelada", variant: "destructive" as const }
    default:
      return { label: status, variant: "outline" as const }
  }
}

function getOperationalStatus(
  requisition: Pick<RequisicionCompraListItem, "estado" | "estadoLegacy">
) {
  return (requisition.estado || requisition.estadoLegacy || "").toUpperCase()
}

function matchesTerm(requisition: RequisicionCompraListItem, term: string) {
  if (term === "") return true

  return [
    requisition.solicitante,
    requisition.solicitanteNombre,
    requisition.descripcion,
    requisition.motivo,
    requisition.estado,
    requisition.estadoLegacy,
    requisition.requisicionReferencia,
    String(requisition.id),
  ]
    .join(" ")
    .toLowerCase()
    .includes(term)
}

function buildDefaultTracker(requisition: RequisicionCompraListItem): LocalRequisitionTracker {
  const status = getOperationalStatus(requisition)
  const isProcessed = status === "PROCESADA"

  return {
    requisitionId: requisition.id,
    stage: isProcessed
      ? "derivada"
      : status === "APROBADA"
        ? "lista_para_cotizar"
        : status === "ENVIADA"
          ? "en_preparacion"
          : status === "RECHAZADA" || status === "CANCELADA"
            ? "derivada"
            : "sin_revisar",
    buyer: "Compras",
    nextStep: isProcessed
      ? "La continuidad ya quedó fuera del tramo inicial. Revisar su avance en cotizaciones."
      : status === "APROBADA"
        ? "Tomar la requisición aprobada y abrir la cotización correspondiente."
        : status === "ENVIADA"
          ? "Completar la revisión interna y decidir aprobación o rechazo."
          : status === "RECHAZADA" || status === "CANCELADA"
            ? "Caso cerrado. Revisar si requiere nueva solicitud origen."
            : "Validar alcance, prioridad y asignación antes de enviarla.",
    updatedAt: requisition.createdAt,
    statusSnapshot: status,
    manualStage: false,
    manualNextStep: false,
  }
}

function mergeTrackerWithRequisition(
  requisition: RequisicionCompraListItem,
  tracker?: LocalRequisitionTracker | null
) {
  const defaultTracker = buildDefaultTracker(requisition)
  if (!tracker) return defaultTracker

  const statusChanged = (tracker.statusSnapshot ?? "") !== defaultTracker.statusSnapshot

  return {
    ...defaultTracker,
    ...tracker,
    stage: statusChanged || !tracker.manualStage ? defaultTracker.stage : tracker.stage,
    nextStep: tracker.manualNextStep && !statusChanged ? tracker.nextStep : defaultTracker.nextStep,
    buyer: tracker.buyer || defaultTracker.buyer,
    updatedAt: tracker.updatedAt || defaultTracker.updatedAt,
    statusSnapshot: defaultTracker.statusSnapshot,
    manualStage: statusChanged ? false : (tracker.manualStage ?? false),
    manualNextStep: tracker.manualNextStep ?? false,
  }
}

function getRequisitionHealth(status: string, tracker: LocalRequisitionTracker) {
  if (tracker.stage === "derivada") return "La requisición salió del flujo activo actual"
  if (tracker.stage === "lista_para_cotizar") return "Lista para abrir o completar cotización"
  if (status === "BORRADOR") return "Todavía no fue enviada al circuito formal"
  if (status === "ENVIADA") return "En revisión para aprobación de compras"
  return "Pendiente de análisis operativo"
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

export default function RequisicionesCompraPage() {
  const { sucursales } = useSucursales()
  const defaultSucursalId = sucursales[0]?.id
  const { empleados } = useEmpleados()
  const { ordenes, loading: loadingOrders, error: ordersError } = useOrdenesCompra()
  const { cotizaciones, loading: loadingQuotes, error: quotesError } = useCotizacionesCompra()
  const {
    requisiciones,
    loading,
    error,
    getById,
    crear,
    enviar,
    aprobar,
    rechazar,
    cancelar,
    refetch,
  } = useRequisicionesCompra()
  const {
    rows: trackers,
    setRows: setTrackers,
    reset: resetTrackers,
  } = useLegacyLocalCollection<LocalRequisitionTracker>(REQUISITION_TRACKER_STORAGE_KEY, [])

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("todas")
  const [stageFilter, setStageFilter] = useState<"todas" | RequisitionStage>("todas")
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selectedDetail, setSelectedDetail] = useState<RequisicionCompraDetalle | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<
    "enviar" | "aprobar" | "rechazar" | "cancelar" | null
  >(null)
  const { items } = useItems({ enabled: createOpen })
  const [createForm, setCreateForm] = useState({
    sucursalId: "",
    solicitanteId: "",
    fecha: new Date().toISOString().slice(0, 10),
    descripcion: "",
    observacion: "",
    items: [createDraftItem()],
  })
  const createSucursalValue =
    createForm.sucursalId || (defaultSucursalId ? String(defaultSucursalId) : "")

  const defaultTrackers = useMemo(() => requisiciones.map(buildDefaultTracker), [requisiciones])
  const trackerMap = useMemo(
    () => new Map(trackers.map((tracker) => [tracker.requisitionId, tracker])),
    [trackers]
  )

  const requisitionRows = useMemo(
    () =>
      requisiciones.map((requisition) => ({
        ...requisition,
        displayStatus: getOperationalStatus(requisition),
        tracker: mergeTrackerWithRequisition(requisition, trackerMap.get(requisition.id)),
        ageInDays: getDaysFromCreated(requisition.fecha || requisition.createdAt),
      })),
    [requisiciones, trackerMap]
  )

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim()
    return requisitionRows.filter((requisition) => {
      const matchesSearch = matchesTerm(requisition, term)
      const matchesStatus = statusFilter === "todas" || requisition.displayStatus === statusFilter
      const matchesStage = stageFilter === "todas" || requisition.tracker.stage === stageFilter
      return matchesSearch && matchesStatus && matchesStage
    })
  }, [requisitionRows, search, stageFilter, statusFilter])

  const selectedBase = requisitionRows.find((row) => row.id === selectedId) ?? null

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
    const ready = requisitionRows.filter((row) => row.tracker.stage === "lista_para_cotizar").length
    const sent = requisitionRows.filter((row) => row.displayStatus === "ENVIADA").length
    const approved = requisitionRows.filter((row) => row.displayStatus === "APROBADA").length
    const active = requisitionRows.filter(
      (row) =>
        row.displayStatus !== "RECHAZADA" &&
        row.displayStatus !== "CANCELADA" &&
        row.displayStatus !== "PROCESADA"
    ).length
    return { ready, sent, approved, active }
  }, [requisitionRows])

  const queue = useMemo(() => {
    const stageOrder: Record<RequisitionStage, number> = {
      lista_para_cotizar: 0,
      en_preparacion: 1,
      sin_revisar: 2,
      derivada: 3,
    }

    return [...filtered]
      .sort((left, right) => {
        if (stageOrder[left.tracker.stage] !== stageOrder[right.tracker.stage]) {
          return stageOrder[left.tracker.stage] - stageOrder[right.tracker.stage]
        }
        return right.ageInDays - left.ageInDays
      })
      .slice(0, 5)
  }, [filtered])

  const employeeOptions = useMemo<RequisitionEmployeeOption[]>(() => {
    const selectedSucursalId = createForm.sucursalId ? Number(createForm.sucursalId) : null
    const matchesSucursal = (sucursalId: number) =>
      selectedSucursalId === null || sucursalId === selectedSucursalId

    const liveEmployees = empleados.filter((empleado) => matchesSucursal(empleado.sucursalId))
    if (liveEmployees.length > 0) return liveEmployees

    return Array.from(
      new Map(
        requisiciones
          .filter((requisition) => matchesSucursal(requisition.sucursalId))
          .map((requisition) => [
            requisition.solicitanteId,
            {
              id: requisition.solicitanteId,
              razonSocial:
                requisition.solicitanteNombre ||
                requisition.solicitante ||
                `Solicitante ${requisition.solicitanteId}`,
              sucursalId: requisition.sucursalId,
            },
          ])
      ).values()
    )
  }, [createForm.sucursalId, empleados, requisiciones])

  const usingEmployeeFallback = empleados.length === 0 && employeeOptions.length > 0
  const createSolicitanteValue =
    createForm.solicitanteId || (employeeOptions[0] ? String(employeeOptions[0].id) : "")

  const itemOptions = useMemo(() => items.filter((item) => item.activo), [items])

  const updateTracker = useCallback(
    (requisitionId: number, patch: Partial<LocalRequisitionTracker>) => {
      setTrackers((current) => {
        const index = current.findIndex((row) => row.requisitionId === requisitionId)
        const requisition = requisiciones.find((row) => row.id === requisitionId)
        const fallbackTracker = requisition
          ? mergeTrackerWithRequisition(requisition, current[index] ?? null)
          : index >= 0
            ? current[index]
            : defaultTrackers.find((row) => row.requisitionId === requisitionId)!
        const nextRow = {
          ...fallbackTracker,
          ...patch,
          updatedAt: new Date().toISOString(),
          manualStage: patch.stage !== undefined ? true : (fallbackTracker.manualStage ?? false),
          manualNextStep:
            patch.nextStep !== undefined ? true : (fallbackTracker.manualNextStep ?? false),
          statusSnapshot: fallbackTracker.statusSnapshot,
        }

        if (index >= 0) {
          return current.map((row, rowIndex) => (rowIndex === index ? nextRow : row))
        }

        return [...current, nextRow]
      })
    },
    [defaultTrackers, requisiciones, setTrackers]
  )

  const openDetail = useCallback((id: number) => {
    setSelectedDetail(null)
    setDetailLoading(true)
    setSelectedId(id)
  }, [])

  const refreshSelection = useCallback(
    async (id: number) => {
      await refetch()
      if (selectedId === id) {
        const detail = await getById(id).catch(() => null)
        setSelectedDetail(detail)
      }
    },
    [getById, refetch, selectedId]
  )

  const runAction = useCallback(
    async (mode: "enviar" | "aprobar" | "rechazar" | "cancelar", id: number) => {
      setActionLoading(mode)
      let ok = false
      if (mode === "enviar") ok = await enviar(id)
      if (mode === "aprobar") ok = await aprobar(id)
      if (mode === "rechazar") ok = await rechazar(id, null)
      if (mode === "cancelar") ok = await cancelar(id)
      setActionLoading(null)

      if (ok) {
        await refreshSelection(id)
      }
    },
    [aprobar, cancelar, enviar, rechazar, refreshSelection]
  )

  const updateCreateItem = useCallback((index: number, patch: Partial<DraftRequisitionItem>) => {
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
        updateCreateItem(index, { itemId: value, descripcion: "", unidadMedida: "u." })
        return
      }

      const selectedItem = itemOptions.find((item) => item.id === Number(value))
      updateCreateItem(index, {
        itemId: value,
        descripcion: selectedItem?.descripcion ?? "",
        unidadMedida: selectedItem?.unidadMedidaDescripcion ?? "u.",
      })
    },
    [itemOptions, updateCreateItem]
  )

  const addCreateItem = useCallback(() => {
    setCreateForm((current) => ({ ...current, items: [...current.items, createDraftItem()] }))
  }, [])

  const removeCreateItem = useCallback((index: number) => {
    setCreateForm((current) => ({
      ...current,
      items:
        current.items.length === 1 ? current.items : current.items.filter((_, i) => i !== index),
    }))
  }, [])

  const resetCreateForm = useCallback(() => {
    setCreateError(null)
    setCreateForm({
      sucursalId: defaultSucursalId ? String(defaultSucursalId) : "",
      solicitanteId: "",
      fecha: new Date().toISOString().slice(0, 10),
      descripcion: "",
      observacion: "",
      items: [createDraftItem()],
    })
  }, [defaultSucursalId])

  const submitCreate = useCallback(async () => {
    setCreateError(null)

    const validItems = createForm.items
      .map((item) => ({
        itemId: item.itemId === "manual" || item.itemId === "" ? null : Number(item.itemId),
        descripcion: item.descripcion.trim(),
        cantidad: Number(item.cantidad),
        unidadMedida: item.unidadMedida.trim() || "u.",
        observacion: item.observacion.trim() || null,
      }))
      .filter(
        (item) => item.descripcion !== "" && Number.isFinite(item.cantidad) && item.cantidad > 0
      )

    if (!createSucursalValue || !createSolicitanteValue || !createForm.descripcion.trim()) {
      setCreateError("Complete sucursal, solicitante y descripción general.")
      return
    }

    if (validItems.length === 0) {
      setCreateError("Agregue al menos un ítem válido con cantidad mayor a cero.")
      return
    }

    setCreateLoading(true)
    const ok = await crear({
      sucursalId: Number(createSucursalValue),
      solicitanteId: Number(createSolicitanteValue),
      fecha: createForm.fecha,
      descripcion: createForm.descripcion.trim(),
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
      setCreateError("No se pudo crear la requisición. Revise los datos e intente nuevamente.")
    }
  }, [crear, createForm, createSolicitanteValue, createSucursalValue, refetch, resetCreateForm])

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Requisiciones de compra</h1>
          <p className="text-muted-foreground">
            Consola real del origen del circuito: solicitud, revisión, aprobación y pase a
            cotización.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="bg-transparent" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nueva requisición
          </Button>
          <Button variant="outline" className="bg-transparent" asChild>
            <Link href="/compras/solicitudes">
              <ClipboardList className="mr-2 h-4 w-4" /> Ver solicitudes
            </Link>
          </Button>
          <Button asChild>
            <Link href="/compras/cotizaciones">
              <ArrowRight className="mr-2 h-4 w-4" /> Ir a cotizaciones
            </Link>
          </Button>
        </div>
      </div>

      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertDescription>
          Esta vista usa requisiciones reales del backend. El tablero local sólo agrega
          priorización, responsable y próximos pasos del equipo de compras.
        </AlertDescription>
      </Alert>

      {(error || ordersError || quotesError) && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || ordersError || quotesError}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Activas</p>
            <p className="mt-2 text-2xl font-bold">{loading ? "..." : kpis.active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Enviadas</p>
            <p className="mt-2 text-2xl font-bold">{loading ? "..." : kpis.sent}</p>
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
            <p className="text-xs text-muted-foreground">Listas para cotizar</p>
            <p className="mt-2 text-2xl font-bold text-sky-600">{loading ? "..." : kpis.ready}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">Continuidad del circuito</CardTitle>
            <CardDescription>
              Las requisiciones aprobadas deben continuar en cotizaciones. El tablero permite
              ordenar el trabajo sin duplicar datos del backend.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/compras/cotizaciones">
                <ArrowRight className="mr-2 h-4 w-4" /> Abrir cotizaciones
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
            <CardDescription>Indicadores del resto del circuito de compras.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Cotizaciones visibles</p>
              <p className="mt-1 text-2xl font-bold">
                {loadingQuotes ? "..." : cotizaciones.length}
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
                placeholder="Buscar solicitante, descripción, motivo o referencia..."
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
                <SelectItem value="APROBADA">Aprobada</SelectItem>
                <SelectItem value="RECHAZADA">Rechazada</SelectItem>
                <SelectItem value="CANCELADA">Cancelada</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={stageFilter}
              onValueChange={(value) => setStageFilter(value as "todas" | RequisitionStage)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seguimiento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todo el seguimiento</SelectItem>
                <SelectItem value="sin_revisar">Sin revisar</SelectItem>
                <SelectItem value="en_preparacion">En preparación</SelectItem>
                <SelectItem value="lista_para_cotizar">Lista para cotizar</SelectItem>
                <SelectItem value="derivada">Derivada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.8fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lote de requisiciones</CardTitle>
            <CardDescription>
              Listado real de requisiciones con estado formal y seguimiento interno.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Solicitante</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Seguimiento</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((requisition) => {
                  const statusMeta = getStatusMeta(requisition.displayStatus)
                  return (
                    <TableRow key={requisition.id}>
                      <TableCell className="font-medium">REQ-{requisition.id}</TableCell>
                      <TableCell>{requisition.solicitante}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p>{requisition.descripcion}</p>
                          <p className="text-xs text-muted-foreground">
                            {requisition.requisicionReferencia}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(requisition.fecha)}</TableCell>
                      <TableCell>{requisition.cantidadItems}</TableCell>
                      <TableCell>
                        <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={STAGE_CONFIG[requisition.tracker.stage].variant}>
                          {STAGE_CONFIG[requisition.tracker.stage].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDetail(requisition.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                      {loading
                        ? "Cargando requisiciones reales..."
                        : "No hay requisiciones que coincidan con los filtros actuales."}
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
              Se priorizan las que ya están listas para pasar a cotización.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {queue.map((requisition) => (
              <button
                key={requisition.id}
                type="button"
                onClick={() => openDetail(requisition.id)}
                className="w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">REQ-{requisition.id}</p>
                    <p className="text-sm text-muted-foreground">{requisition.solicitante}</p>
                  </div>
                  <Badge variant={STAGE_CONFIG[requisition.tracker.stage].variant}>
                    {STAGE_CONFIG[requisition.tracker.stage].label}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {getRequisitionHealth(requisition.displayStatus, requisition.tracker)}
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
              {selectedBase ? `Requisición REQ-${selectedBase.id}` : "Requisición"}
            </DialogTitle>
            <DialogDescription>
              {selectedBase
                ? `${selectedBase.solicitante} · ${selectedBase.requisicionReferencia}`
                : "Detalle de requisición"}
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
                      <CardTitle className="text-base">Cabecera operativa</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <DetailFieldGrid
                        fields={[
                          { label: "Solicitante", value: selectedBase.solicitante },
                          { label: "Referencia", value: selectedBase.requisicionReferencia },
                          { label: "Fecha", value: formatDate(selectedBase.fecha) },
                          {
                            label: "Estado",
                            value: getStatusMeta(selectedBase.displayStatus).label,
                          },
                          { label: "Motivo", value: selectedBase.motivo },
                          { label: "Descripción", value: selectedBase.descripcion },
                          { label: "Items", value: String(selectedBase.cantidadItems) },
                          {
                            label: "Seguimiento local",
                            value: STAGE_CONFIG[selectedBase.tracker.stage].label,
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
                          onClick={() => void runAction("enviar", selectedBase.id)}
                          disabled={
                            actionLoading !== null || selectedBase.displayStatus !== "BORRADOR"
                          }
                        >
                          <ArrowRight className="mr-2 h-4 w-4" /> Enviar
                        </Button>
                        <Button
                          onClick={() => void runAction("aprobar", selectedBase.id)}
                          disabled={
                            actionLoading !== null || selectedBase.displayStatus !== "ENVIADA"
                          }
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" /> Aprobar
                        </Button>
                        <Button
                          variant="outline"
                          className="bg-transparent"
                          onClick={() => void runAction("rechazar", selectedBase.id)}
                          disabled={
                            actionLoading !== null ||
                            ["RECHAZADA", "CANCELADA"].includes(selectedBase.displayStatus)
                          }
                        >
                          <XCircle className="mr-2 h-4 w-4" /> Rechazar
                        </Button>
                        <Button
                          variant="outline"
                          className="bg-transparent"
                          onClick={() => void runAction("cancelar", selectedBase.id)}
                          disabled={
                            actionLoading !== null ||
                            ["CANCELADA", "RECHAZADA"].includes(selectedBase.displayStatus)
                          }
                        >
                          Cancelar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="items" className="pt-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Renglones solicitados</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Código</TableHead>
                          <TableHead>Descripción</TableHead>
                          <TableHead>Cantidad</TableHead>
                          <TableHead>Unidad</TableHead>
                          <TableHead>Observación</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailLoading && (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="py-8 text-center text-muted-foreground"
                            >
                              Cargando detalle de requisición...
                            </TableCell>
                          </TableRow>
                        )}
                        {!detailLoading &&
                          (selectedDetail?.items ?? []).map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">{item.codigo}</TableCell>
                              <TableCell>{item.descripcion}</TableCell>
                              <TableCell>{item.cantidad}</TableCell>
                              <TableCell>{item.unidadMedida}</TableCell>
                              <TableCell>{item.observacion || "-"}</TableCell>
                            </TableRow>
                          ))}
                        {!detailLoading && (selectedDetail?.items ?? []).length === 0 && (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="py-8 text-center text-muted-foreground"
                            >
                              No hay renglones visibles para esta requisición.
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
                    Esta capa queda sólo en el navegador actual para ordenar prioridades del equipo
                    y no reemplaza el workflow del backend.
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
                            updateTracker(selectedBase.id, { stage: value as RequisitionStage })
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Seleccionar estado" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sin_revisar">Sin revisar</SelectItem>
                            <SelectItem value="en_preparacion">En preparación</SelectItem>
                            <SelectItem value="lista_para_cotizar">Lista para cotizar</SelectItem>
                            <SelectItem value="derivada">Derivada</SelectItem>
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
                      <CardTitle className="text-base">Contexto del circuito</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">Lectura operativa</p>
                        <p className="mt-1 font-medium">
                          {getRequisitionHealth(selectedBase.displayStatus, selectedBase.tracker)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">Última actualización local</p>
                        <p className="mt-1 font-medium">
                          {formatDate(selectedBase.tracker.updatedAt)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">Próximo paso sugerido</p>
                        <p className="mt-1 font-medium">{selectedBase.tracker.nextStep}</p>
                      </div>
                      <Button className="w-full" asChild>
                        <Link href="/compras/cotizaciones">
                          <ArrowRight className="mr-2 h-4 w-4" /> Continuar en cotizaciones
                        </Link>
                      </Button>
                      <Button variant="outline" className="w-full bg-transparent" asChild>
                        <Link href="/compras/ordenes">
                          <ShoppingCart className="mr-2 h-4 w-4" /> Ver órdenes
                        </Link>
                      </Button>
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
            <DialogTitle>Nueva requisición de compra</DialogTitle>
            <DialogDescription>
              Alta real sobre el backend de compras para iniciar el circuito desde frontend.
            </DialogDescription>
          </DialogHeader>

          {createError && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{createError}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Sucursal</label>
              <Select
                value={createSucursalValue}
                onValueChange={(value) =>
                  setCreateForm((current) => ({ ...current, sucursalId: value, solicitanteId: "" }))
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
              <label className="text-sm font-medium">Solicitante</label>
              <Select
                value={createSolicitanteValue}
                onValueChange={(value) =>
                  setCreateForm((current) => ({ ...current, solicitanteId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar solicitante" />
                </SelectTrigger>
                <SelectContent>
                  {employeeOptions.map((empleado) => (
                    <SelectItem key={empleado.id} value={String(empleado.id)}>
                      {empleado.razonSocial ?? `Empleado ${empleado.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {usingEmployeeFallback ? (
                <p className="text-xs text-muted-foreground">
                  Sin empleados publicados en el maestro local; se ofrecen solicitantes detectados
                  en requisiciones reales para destrabar el alta.
                </p>
              ) : null}
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
              <label className="text-sm font-medium">Descripción general</label>
              <Input
                value={createForm.descripcion}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, descripcion: event.target.value }))
                }
                placeholder="Ej. reposición crítica de insumos de mantenimiento"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Observación</label>
            <Textarea
              rows={3}
              value={createForm.observacion}
              onChange={(event) =>
                setCreateForm((current) => ({ ...current, observacion: event.target.value }))
              }
              placeholder="Contexto operativo, urgencia o alcance interno"
            />
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Items solicitados</CardTitle>
                  <CardDescription>
                    Puede vincular un ítem existente o cargar una descripción manual.
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
                  className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1.5fr_1.5fr_120px_120px_auto]"
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

                  <div className="space-y-2 md:col-span-1">
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
                    <label className="text-sm font-medium">Unidad</label>
                    <Input
                      value={item.unidadMedida}
                      onChange={(event) =>
                        updateCreateItem(index, { unidadMedida: event.target.value })
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

                  <div className="space-y-2 md:col-span-5">
                    <label className="text-sm font-medium">Observación del ítem</label>
                    <Input
                      value={item.observacion}
                      onChange={(event) =>
                        updateCreateItem(index, { observacion: event.target.value })
                      }
                      placeholder="Opcional"
                    />
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
              <Plus className="mr-2 h-4 w-4" /> {createLoading ? "Creando..." : "Crear requisición"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
