"use client"

import { useCallback, useMemo, useState } from "react"
import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  Play,
  Plus,
  RefreshCcw,
  Search,
  Truck,
  XCircle,
} from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
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
import { Tabs, TabsContent, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  WmsDetailFieldGrid,
  WmsDialogContent,
  WmsTabsList,
} from "@/components/almacenes/wms-responsive"
import { toast } from "@/hooks/use-toast"
import { useDepositos } from "@/lib/hooks/useDepositos"
import { useItems } from "@/lib/hooks/useItems"
import { useOrdenesPreparacion } from "@/lib/hooks/useOrdenesPreparacion"
import { useDefaultSucursalId } from "@/lib/hooks/useSucursales"
import { useTerceros } from "@/lib/hooks/useTerceros"
import type {
  CreateOrdenPreparacionDetalleDto,
  OrdenPreparacion,
  OrdenPreparacionEvento,
  OrdenPreparacionTrazabilidad,
} from "@/lib/types/ordenes-preparacion"

type DetailDraft = {
  key: string
  itemId: string
  depositoId: string
  cantidad: string
  observacion: string
}

function createEmptyDetailDraft(): DetailDraft {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    itemId: "",
    depositoId: "",
    cantidad: "",
    observacion: "",
  }
}

function formatDate(value?: string) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "short" }).format(date)
}

function formatDateTime(value?: string) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(date)
}

function formatQuantity(value?: number) {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(Number(value ?? 0))
}

function getDaysOpen(value?: string) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)))
}

function estadoVariant(estado?: string) {
  switch ((estado ?? "").toUpperCase()) {
    case "PENDIENTE":
      return "secondary" as const
    case "EN_PROCESO":
      return "default" as const
    case "COMPLETADA":
      return "outline" as const
    case "ANULADA":
      return "destructive" as const
    default:
      return "outline" as const
  }
}

function getEstadoLabel(estado?: string) {
  switch ((estado ?? "").toUpperCase()) {
    case "PENDIENTE":
      return "Pendiente"
    case "EN_PROCESO":
      return "En proceso"
    case "COMPLETADA":
      return "Completada"
    case "ANULADA":
      return "Anulada"
    default:
      return estado ?? "-"
  }
}

function getOperationalStatus(orden?: OrdenPreparacion | null, hasActiveTransfer = false) {
  if (!orden) return "-"
  if (orden.estado === "COMPLETADA" && hasActiveTransfer) return "Transferencia ya generada"
  const daysOpen = getDaysOpen(orden.fecha)
  if (orden.estado === "COMPLETADA") return "Lista para despacho"
  if (orden.estado === "ANULADA") return "Fuera de circuito"
  if (orden.estado === "EN_PROCESO") return "Picking en ejecución"
  if ((daysOpen ?? 0) >= 7) return "Pendiente con antigüedad"
  return "Pendiente vigente"
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

export default function PickingPage() {
  const defaultSucursalId = useDefaultSucursalId() ?? 1
  const [filterEstado, setFilterEstado] = useState("")
  const [desde, setDesde] = useState("")
  const [hasta, setHasta] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedOrdenId, setSelectedOrdenId] = useState<number | null>(null)
  const [selectedDetail, setSelectedDetail] = useState<OrdenPreparacion | null>(null)
  const [selectedEventos, setSelectedEventos] = useState<OrdenPreparacionEvento[]>([])
  const [selectedTrazabilidad, setSelectedTrazabilidad] =
    useState<OrdenPreparacionTrazabilidad | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isPickingOpen, setIsPickingOpen] = useState(false)
  const [isDispatchOpen, setIsDispatchOpen] = useState(false)
  const [createDraft, setCreateDraft] = useState({
    terceroId: "",
    comprobanteOrigenId: "",
    fecha: new Date().toISOString().slice(0, 10),
    observacion: "",
    detalles: [createEmptyDetailDraft()],
  })
  const [pickingDraft, setPickingDraft] = useState<Record<number, string>>({})
  const [dispatchDraft, setDispatchDraft] = useState({
    depositoDestinoId: "",
    fecha: new Date().toISOString().slice(0, 10),
    observacion: "",
  })

  const {
    ordenes,
    loading,
    summaryLoading,
    error,
    page,
    setPage,
    totalCount,
    totalPages,
    resumen,
    crear,
    getById,
    getEventos,
    getTrazabilidad,
    iniciar,
    registrarPicking,
    confirmar,
    despachar,
    anular,
    refetch,
  } = useOrdenesPreparacion({
    sucursalId: defaultSucursalId,
    estado: filterEstado || undefined,
    desde: desde || undefined,
    hasta: hasta || undefined,
  })
  const { terceros } = useTerceros({ sucursalId: defaultSucursalId })
  const { depositos } = useDepositos(defaultSucursalId)
  const {
    items,
    loading: itemsLoading,
    search: itemSearch,
    setSearch: setItemSearch,
  } = useItems({ enabled: isCreateOpen })

  const terceroNameById = useMemo(
    () => new Map(terceros.map((tercero) => [tercero.id, tercero.razonSocial])),
    [terceros]
  )
  const depositoNameById = useMemo(
    () => new Map(depositos.map((deposito) => [deposito.id, deposito.descripcion])),
    [depositos]
  )
  const itemById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items])

  const getTerceroName = useCallback(
    (id?: number) => (id ? (terceroNameById.get(id) ?? `#${id}`) : "-"),
    [terceroNameById]
  )

  const filteredOrdenes = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return ordenes.filter((orden) => {
      if (!term) return true
      const tercero = getTerceroName(orden.terceroId).toLowerCase()
      return (
        String(orden.id).includes(term) ||
        tercero.includes(term) ||
        getEstadoLabel(orden.estado).toLowerCase().includes(term) ||
        (orden.observacion ?? "").toLowerCase().includes(term)
      )
    })
  }, [getTerceroName, ordenes, searchTerm])

  const selectedOrden = useMemo(
    () => filteredOrdenes.find((orden) => orden.id === selectedOrdenId) ?? null,
    [filteredOrdenes, selectedOrdenId]
  )

  const activeTransfer = useMemo(
    () =>
      (selectedTrazabilidad?.transferencias ?? []).find(
        (transferencia) => transferencia.estado.toUpperCase() !== "ANULADA"
      ) ?? null,
    [selectedTrazabilidad]
  )

  const timelineEntries = useMemo(() => {
    const seen = new Set<string>()

    return (selectedTrazabilidad?.timeline ?? []).filter((evento) => {
      const key = [
        evento.id,
        evento.ordenPreparacionId ?? 0,
        evento.transferenciaDepositoId ?? 0,
        evento.tipo,
        evento.fecha,
        evento.descripcion ?? "",
      ].join("|")

      if (seen.has(key)) {
        return false
      }

      seen.add(key)
      return true
    })
  }, [selectedTrazabilidad])

  const reloadSelectedData = useCallback(
    async (ordenId: number) => {
      setDetailLoading(true)
      const [detail, eventos, trazabilidad] = await Promise.all([
        getById(ordenId),
        getEventos(ordenId),
        getTrazabilidad(ordenId),
      ])
      setSelectedDetail(detail)
      setSelectedEventos(eventos)
      setSelectedTrazabilidad(trazabilidad)
      setDetailLoading(false)
    },
    [getById, getEventos, getTrazabilidad]
  )

  const pendingCount =
    resumen?.pendientes ?? ordenes.filter((orden) => orden.estado === "PENDIENTE").length
  const inProgressCount =
    resumen?.enProceso ?? ordenes.filter((orden) => orden.estado === "EN_PROCESO").length
  const deliveredRate =
    (resumen?.cantidadSolicitada ?? 0) > 0
      ? `${Math.round(((resumen?.cantidadEntregada ?? 0) / (resumen?.cantidadSolicitada ?? 1)) * 100)}%`
      : "0%"

  const handleSelectOrden = async (ordenId: number) => {
    setSelectedOrdenId(ordenId)
    await reloadSelectedData(ordenId)
  }

  const resetCreateDraft = () => {
    setCreateDraft({
      terceroId: "",
      comprobanteOrigenId: "",
      fecha: new Date().toISOString().slice(0, 10),
      observacion: "",
      detalles: [createEmptyDetailDraft()],
    })
    setItemSearch("")
  }

  const resetPickingDialog = () => {
    setPickingDraft({})
    setActionError(null)
  }

  const resetDispatchDialog = () => {
    setDispatchDraft({
      depositoDestinoId: "",
      fecha: new Date().toISOString().slice(0, 10),
      observacion: "",
    })
    setActionError(null)
  }

  const handleRefresh = async () => {
    setActionError(null)
    await refetch()
    if (selectedOrden) {
      await reloadSelectedData(selectedOrden.id)
    }
  }

  const runOrderAction = async (
    actionKey: string,
    callback: () => Promise<boolean>,
    successTitle: string,
    successDescription: string
  ) => {
    setActionError(null)
    setBusyAction(actionKey)
    const ok = await callback()
    if (!ok) {
      setActionError("La acción no pudo completarse con el backend actual.")
      setBusyAction(null)
      return
    }

    if (selectedOrden) {
      await reloadSelectedData(selectedOrden.id)
    }
    toast({ title: successTitle, description: successDescription })
    setBusyAction(null)
  }

  const handleOpenPicking = () => {
    if (!selectedDetail?.detalles?.length) {
      setActionError("La orden no tiene renglones disponibles para registrar picking.")
      return
    }

    const nextDraft = Object.fromEntries(
      selectedDetail.detalles.map((detalle) => [detalle.id, String(detalle.cantidadEntregada ?? 0)])
    )
    setPickingDraft(nextDraft)
    setIsPickingOpen(true)
  }

  const handlePickingSubmit = async () => {
    if (!selectedDetail?.detalles?.length) return

    const payload = selectedDetail.detalles.map((detalle) => ({
      detalleId: detalle.id,
      cantidadEntregada: Number(pickingDraft[detalle.id] ?? detalle.cantidadEntregada ?? 0),
    }))

    if (
      payload.some(
        (detalle) => Number.isNaN(detalle.cantidadEntregada) || detalle.cantidadEntregada < 0
      )
    ) {
      setActionError("Las cantidades entregadas deben ser numéricas y no negativas.")
      return
    }

    const requestedByDetailId = new Map(
      selectedDetail.detalles.map((detalle) => [detalle.id, Number(detalle.cantidad ?? 0)])
    )

    if (
      payload.some(
        (detalle) =>
          detalle.cantidadEntregada > (requestedByDetailId.get(detalle.detalleId) ?? 0)
      )
    ) {
      setActionError("La cantidad entregada no puede superar la cantidad solicitada del renglón.")
      return
    }

    setBusyAction("picking")
    const ok = await registrarPicking(selectedDetail.id, { detalles: payload })
    if (!ok) {
      setActionError("No se pudo registrar el picking de la orden seleccionada.")
      setBusyAction(null)
      return
    }

    await reloadSelectedData(selectedDetail.id)
    setIsPickingOpen(false)
    toast({
      title: "Picking registrado",
      description: `La orden #${selectedDetail.id} actualizó sus cantidades entregadas.`,
    })
    setBusyAction(null)
  }

  const handleDispatchSubmit = async () => {
    if (!selectedDetail) return
    if (!dispatchDraft.depositoDestinoId) {
      setActionError("Seleccioná el depósito destino para generar el despacho.")
      return
    }
    if (!dispatchDraft.fecha) {
      setActionError("Informá la fecha del despacho.")
      return
    }

    setBusyAction("despachar")
    const ok = await despachar(selectedDetail.id, {
      depositoDestinoId: Number(dispatchDraft.depositoDestinoId),
      fecha: dispatchDraft.fecha,
      observacion: dispatchDraft.observacion || undefined,
    })

    if (!ok) {
      setActionError("No se pudo despachar la orden seleccionada.")
      setBusyAction(null)
      return
    }

    await reloadSelectedData(selectedDetail.id)
    setIsDispatchOpen(false)
    setDispatchDraft({
      depositoDestinoId: "",
      fecha: new Date().toISOString().slice(0, 10),
      observacion: "",
    })
    toast({
      title: "Despacho generado",
      description: `La orden #${selectedDetail.id} quedó ligada a una transferencia de depósito.`,
    })
    setBusyAction(null)
  }

  const handleCreateSubmit = async () => {
    if (!createDraft.fecha) {
      setActionError("Informá la fecha de la orden de preparación.")
      return
    }

    const incompleteRows = createDraft.detalles.filter((detalle) => {
      const started = Boolean(
        detalle.itemId || detalle.depositoId || detalle.cantidad || detalle.observacion.trim()
      )

      if (!started) {
        return false
      }

      const cantidad = Number(detalle.cantidad)
      return (
        !detalle.itemId ||
        !detalle.depositoId ||
        !detalle.cantidad ||
        Number.isNaN(cantidad) ||
        cantidad <= 0
      )
    })

    if (incompleteRows.length > 0) {
      setActionError(
        "Revisá los renglones de picking: cada línea iniciada debe tener ítem, depósito y cantidad válida."
      )
      return
    }

    const detalles: CreateOrdenPreparacionDetalleDto[] = createDraft.detalles
      .filter((detalle) => detalle.itemId && detalle.depositoId && detalle.cantidad)
      .map((detalle) => ({
        itemId: Number(detalle.itemId),
        depositoId: Number(detalle.depositoId),
        cantidad: Number(detalle.cantidad),
        observacion: detalle.observacion || undefined,
      }))
      .filter((detalle) => detalle.itemId > 0 && detalle.depositoId > 0 && detalle.cantidad > 0)

    if (detalles.length === 0) {
      setActionError("Cargá al menos un renglón válido con item, depósito y cantidad.")
      return
    }

    setBusyAction("crear")
    const createdId = await crear({
      sucursalId: defaultSucursalId,
      comprobanteOrigenId: createDraft.comprobanteOrigenId
        ? Number(createDraft.comprobanteOrigenId)
        : undefined,
      terceroId: createDraft.terceroId ? Number(createDraft.terceroId) : undefined,
      fecha: createDraft.fecha,
      observacion: createDraft.observacion || undefined,
      detalles,
    })

    if (!createdId) {
      setActionError("No se pudo crear la orden de preparación.")
      setBusyAction(null)
      return
    }

    setIsCreateOpen(false)
    resetCreateDraft()
    setSelectedOrdenId(createdId)
    await reloadSelectedData(createdId)
    toast({
      title: "Orden creada",
      description: `La orden de picking #${createdId} quedó registrada.`,
    })
    setBusyAction(null)
  }

  const canStart = selectedDetail?.estado === "PENDIENTE"
  const canPick = selectedDetail?.estado === "PENDIENTE" || selectedDetail?.estado === "EN_PROCESO"
  const canConfirm = selectedDetail?.estado === "EN_PROCESO"
  const canDispatch = selectedDetail?.estado === "COMPLETADA" && !activeTransfer
  const canCancel =
    selectedDetail?.estado === "PENDIENTE" || selectedDetail?.estado === "EN_PROCESO"

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Picking y preparación</h1>
          <p className="text-muted-foreground">
            Consola operativa conectada al workflow real: alta con renglones, inicio, captura de
            picking, confirmación, despacho y trazabilidad de transferencias.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => void handleRefresh()}
            disabled={loading || detailLoading}
          >
            <RefreshCcw className="h-4 w-4" />
            Actualizar
          </Button>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Nueva orden
          </Button>
        </div>
      </div>

      {(error || actionError) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{actionError || error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Órdenes"
          value={summaryLoading ? "..." : String(resumen?.cantidad ?? totalCount)}
          description={`Sucursal ${defaultSucursalId} con resumen real de backend.`}
        />
        <SummaryCard
          title="Pendientes"
          value={summaryLoading ? "..." : String(pendingCount)}
          description="Aún no iniciadas para picking operativo."
        />
        <SummaryCard
          title="En proceso"
          value={summaryLoading ? "..." : String(inProgressCount)}
          description="Órdenes abiertas y con captura de preparación disponible."
        />
        <SummaryCard
          title="Cumplimiento"
          value={summaryLoading ? "..." : deliveredRate}
          description="Cantidad entregada sobre solicitado en el resumen global."
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros operativos</CardTitle>
          <CardDescription>
            Estado y fechas filtran en backend; la búsqueda textual refina el lote descargado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_180px_180px_200px]">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Buscar por tercero, estado, observación o ID..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            <Input
              type="date"
              value={desde}
              onChange={(event) => {
                setDesde(event.target.value)
                setPage(1)
              }}
            />
            <Input
              type="date"
              value={hasta}
              onChange={(event) => {
                setHasta(event.target.value)
                setPage(1)
              }}
            />
            <Select
              value={filterEstado || "todos"}
              onValueChange={(value) => {
                setFilterEstado(value === "todos" ? "" : value)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                <SelectItem value="EN_PROCESO">En proceso</SelectItem>
                <SelectItem value="COMPLETADA">Completada</SelectItem>
                <SelectItem value="ANULADA">Anulada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Órdenes de preparación</CardTitle>
            <CardDescription>{filteredOrdenes.length} órdenes en la página actual</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Tercero</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Renglones</TableHead>
                  <TableHead>Observación</TableHead>
                  <TableHead className="text-right">Detalle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      Cargando órdenes...
                    </TableCell>
                  </TableRow>
                ) : filteredOrdenes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No hay órdenes de preparación para los filtros actuales.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrdenes.map((orden) => {
                    const isSelected = selectedOrden?.id === orden.id
                    return (
                      <TableRow
                        key={orden.id}
                        className={isSelected ? "bg-muted/40" : undefined}
                        onClick={() => void handleSelectOrden(orden.id)}
                      >
                        <TableCell className="font-medium">{orden.id}</TableCell>
                        <TableCell>{getTerceroName(orden.terceroId)}</TableCell>
                        <TableCell>
                          <Badge variant={estadoVariant(orden.estado)}>
                            {getEstadoLabel(orden.estado)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm">
                            <p>{formatDate(orden.fecha)}</p>
                            <p className="text-xs text-muted-foreground">
                              {getDaysOpen(orden.fecha) ?? 0} días abiertos
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {orden.cantidadRenglones ?? orden.detalles?.length ?? "-"}
                        </TableCell>
                        <TableCell className="max-w-55 truncate text-sm text-muted-foreground">
                          {orden.observacion ?? "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => void handleSelectOrden(orden.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Página {page} de {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    disabled={page >= totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {selectedOrden ? `Orden #${selectedOrden.id}` : "Detalle operativo"}
            </CardTitle>
            <CardDescription>
              {selectedOrden
                ? `${getTerceroName(selectedOrden.terceroId)} · ${getOperationalStatus(selectedDetail ?? selectedOrden, Boolean(activeTransfer))}`
                : "Seleccioná una orden para operar el circuito de preparación."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedOrden ? (
              <>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      selectedDetail &&
                      void runOrderAction(
                        "iniciar",
                        () => iniciar(selectedDetail.id),
                        "Orden iniciada",
                        `La orden #${selectedDetail.id} pasó a En proceso.`
                      )
                    }
                    disabled={!canStart || busyAction !== null}
                  >
                    <Play className="h-4 w-4" />
                    Iniciar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenPicking}
                    disabled={!canPick || busyAction !== null}
                  >
                    <Check className="h-4 w-4" />
                    Registrar picking
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      selectedDetail &&
                      void runOrderAction(
                        "confirmar",
                        () => confirmar(selectedDetail.id),
                        "Orden confirmada",
                        `La orden #${selectedDetail.id} quedó completada.`
                      )
                    }
                    disabled={!canConfirm || busyAction !== null}
                  >
                    <Check className="h-4 w-4" />
                    Confirmar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsDispatchOpen(true)}
                    disabled={!canDispatch || busyAction !== null}
                  >
                    <Truck className="h-4 w-4" />
                    Despachar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() =>
                      selectedDetail &&
                      void runOrderAction(
                        "anular",
                        () => anular(selectedDetail.id),
                        "Orden anulada",
                        `La orden #${selectedDetail.id} fue anulada en backend.`
                      )
                    }
                    disabled={!canCancel || busyAction !== null}
                  >
                    <XCircle className="h-4 w-4" />
                    Anular
                  </Button>
                </div>

                {activeTransfer ? (
                  <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                    La orden ya tiene asociada la transferencia #{activeTransfer.id} en estado {activeTransfer.estado}. Revisá la pestaña de trazabilidad para continuar el circuito.
                  </div>
                ) : null}

                {detailLoading ? (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    Cargando detalle, eventos y trazabilidad...
                  </div>
                ) : selectedDetail ? (
                  <Tabs defaultValue="general" className="space-y-4">
                    <WmsTabsList className="md:grid-cols-4">
                      <TabsTrigger value="general">General</TabsTrigger>
                      <TabsTrigger value="renglones">Renglones</TabsTrigger>
                      <TabsTrigger value="eventos">Eventos</TabsTrigger>
                      <TabsTrigger value="trazabilidad">Trazabilidad</TabsTrigger>
                    </WmsTabsList>

                    <TabsContent value="general" className="space-y-4">
                      <WmsDetailFieldGrid
                        fields={[
                          {
                            label: "Estado",
                            value: (
                              <Badge variant={estadoVariant(selectedDetail.estado)}>
                                {getEstadoLabel(selectedDetail.estado)}
                              </Badge>
                            ),
                          },
                          { label: "Fecha", value: formatDate(selectedDetail.fecha) },
                          {
                            label: "Fecha confirmación",
                            value: formatDate(selectedDetail.fechaConfirmacion),
                          },
                          {
                            label: "Tercero",
                            value: getTerceroName(selectedDetail.terceroId),
                          },
                          {
                            label: "Comprobante origen",
                            value: selectedDetail.comprobanteOrigenId ?? "Sin vincular",
                          },
                          {
                            label: "Días abiertos",
                            value: `${getDaysOpen(selectedDetail.fecha) ?? 0} día(s)`,
                          },
                          {
                            label: "Renglones",
                            value:
                              selectedTrazabilidad?.cantidadRenglones ??
                              selectedDetail.detalles?.length ??
                              0,
                          },
                          {
                            label: "Solicitado",
                            value: formatQuantity(
                              selectedTrazabilidad?.cantidadSolicitada ??
                                selectedDetail.detalles?.reduce(
                                  (acc, detalle) => acc + detalle.cantidad,
                                  0
                                )
                            ),
                          },
                          {
                            label: "Entregado",
                            value: formatQuantity(
                              selectedTrazabilidad?.cantidadEntregada ??
                                selectedDetail.detalles?.reduce(
                                  (acc, detalle) => acc + detalle.cantidadEntregada,
                                  0
                                )
                            ),
                          },
                        ]}
                      />

                      <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">Observación</p>
                        <p className="mt-2 font-medium">
                          {selectedDetail.observacion ??
                            "Sin observaciones registradas para la orden."}
                        </p>
                      </div>
                    </TabsContent>

                    <TabsContent value="renglones" className="space-y-4">
                      <div className="rounded-lg border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Detalle</TableHead>
                              <TableHead>Item</TableHead>
                              <TableHead>Depósito</TableHead>
                              <TableHead>Solicitado</TableHead>
                              <TableHead>Entregado</TableHead>
                              <TableHead>Estado</TableHead>
                              <TableHead>Observación</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedDetail.detalles?.length ? (
                              selectedDetail.detalles.map((detalle) => {
                                const item = itemById.get(detalle.itemId)
                                return (
                                  <TableRow key={detalle.id}>
                                    <TableCell className="font-medium">{detalle.id}</TableCell>
                                    <TableCell>
                                      <div className="space-y-1">
                                        <p>{item?.descripcion ?? `Item #${detalle.itemId}`}</p>
                                        <p className="text-xs text-muted-foreground">
                                          Código {item?.codigo ?? detalle.itemId}
                                        </p>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      {depositoNameById.get(detalle.depositoId) ??
                                        `#${detalle.depositoId}`}
                                    </TableCell>
                                    <TableCell>{formatQuantity(detalle.cantidad)}</TableCell>
                                    <TableCell>
                                      {formatQuantity(detalle.cantidadEntregada)}
                                    </TableCell>
                                    <TableCell>
                                      <Badge
                                        variant={detalle.estaCompleto ? "outline" : "secondary"}
                                      >
                                        {detalle.estaCompleto ? "Completo" : "Pendiente"}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="max-w-55 text-sm text-muted-foreground">
                                      {detalle.observacion ?? "-"}
                                    </TableCell>
                                  </TableRow>
                                )
                              })
                            ) : (
                              <TableRow>
                                <TableCell
                                  colSpan={7}
                                  className="py-6 text-center text-muted-foreground"
                                >
                                  La orden no tiene renglones cargados.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>

                    <TabsContent value="eventos" className="space-y-3">
                      {selectedEventos.length ? (
                        selectedEventos.map((evento) => (
                          <div key={evento.id} className="rounded-lg border p-3">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="font-medium">{evento.tipo}</p>
                                <p className="text-sm text-muted-foreground">
                                  {evento.descripcion ?? "Sin descripción operativa."}
                                </p>
                              </div>
                              <div className="text-right text-xs text-muted-foreground">
                                <p>{formatDateTime(evento.fecha)}</p>
                                <p>Registro {formatDateTime(evento.createdAt)}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                          No hay eventos visibles para la orden seleccionada.
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="trazabilidad" className="space-y-4">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-lg border p-3">
                          <p className="text-sm text-muted-foreground">Solicitado</p>
                          <p className="mt-2 text-lg font-semibold">
                            {formatQuantity(selectedTrazabilidad?.cantidadSolicitada)}
                          </p>
                        </div>
                        <div className="rounded-lg border p-3">
                          <p className="text-sm text-muted-foreground">Entregado</p>
                          <p className="mt-2 text-lg font-semibold">
                            {formatQuantity(selectedTrazabilidad?.cantidadEntregada)}
                          </p>
                        </div>
                        <div className="rounded-lg border p-3">
                          <p className="text-sm text-muted-foreground">Transferencias</p>
                          <p className="mt-2 text-lg font-semibold">
                            {selectedTrazabilidad?.transferencias.length ?? 0}
                          </p>
                        </div>
                      </div>

                      {(selectedTrazabilidad?.transferencias ?? []).length ? (
                        <div className="grid gap-3 lg:grid-cols-2">
                          {selectedTrazabilidad?.transferencias.map((transferencia) => (
                            <div key={transferencia.id} className="rounded-xl border bg-muted/20 p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-medium">Transferencia #{transferencia.id}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {depositoNameById.get(transferencia.depositoOrigenId) ?? `#${transferencia.depositoOrigenId}`}{" -> "}{depositoNameById.get(transferencia.depositoDestinoId) ?? `#${transferencia.depositoDestinoId}`}
                                  </p>
                                </div>
                                <Badge variant="outline">{transferencia.estado}</Badge>
                              </div>
                              <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                                <div>
                                  <p className="text-muted-foreground">Fecha</p>
                                  <p className="font-medium">{formatDate(transferencia.fecha)}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Confirmación</p>
                                  <p className="font-medium">
                                    {formatDate(transferencia.fechaConfirmacion)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      <div className="space-y-3">
                        {timelineEntries.length ? (
                          timelineEntries.map((evento, index) => (
                            <div
                              key={`${evento.id}-${evento.transferenciaDepositoId ?? evento.ordenPreparacionId ?? 0}-${index}`}
                              className="rounded-lg border p-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-medium">{evento.tipo}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {evento.descripcion ?? "Sin detalle adicional."}
                                  </p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {evento.transferenciaDepositoId
                                      ? `Transferencia #${evento.transferenciaDepositoId}`
                                      : `Orden #${evento.ordenPreparacionId ?? selectedDetail.id}`}
                                  </p>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {formatDateTime(evento.fecha)}
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                            Todavía no hay trazabilidad extendida para esta orden.
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                ) : (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    No fue posible cargar el detalle de la orden seleccionada.
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No hay orden seleccionada en la vista actual.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open)
          if (!open) {
            resetCreateDraft()
            setActionError(null)
          }
        }}
      >
        <WmsDialogContent size="xl">
          <DialogHeader>
            <DialogTitle>Nueva orden de preparación</DialogTitle>
            <DialogDescription>
              La creación ahora respeta el contrato real del backend: cabecera más renglones de
              picking con item, depósito y cantidad.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="tercero">Tercero</Label>
                <Select
                  value={createDraft.terceroId || "none"}
                  onValueChange={(value) =>
                    setCreateDraft((current) => ({
                      ...current,
                      terceroId: value === "none" ? "" : value,
                    }))
                  }
                >
                  <SelectTrigger id="tercero">
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin tercero</SelectItem>
                    {terceros.map((tercero) => (
                      <SelectItem key={tercero.id} value={String(tercero.id)}>
                        {tercero.razonSocial}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="comprobante">Comprobante origen</Label>
                <Input
                  id="comprobante"
                  type="number"
                  min={1}
                  value={createDraft.comprobanteOrigenId}
                  onChange={(event) =>
                    setCreateDraft((current) => ({
                      ...current,
                      comprobanteOrigenId: event.target.value,
                    }))
                  }
                  placeholder="Opcional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fecha">Fecha</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={createDraft.fecha}
                  onChange={(event) =>
                    setCreateDraft((current) => ({ ...current, fecha: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="observacion">Observación</Label>
                <Input
                  id="observacion"
                  value={createDraft.observacion}
                  onChange={(event) =>
                    setCreateDraft((current) => ({ ...current, observacion: event.target.value }))
                  }
                  placeholder="Turno, referencia o prioridad"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="font-semibold">Renglones</h3>
                  <p className="text-sm text-muted-foreground">
                    Buscá ítems activos para facilitar la carga y definí desde qué depósito se toma
                    cada uno.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={itemSearch}
                    onChange={(event) => setItemSearch(event.target.value)}
                    placeholder="Buscar item para los selectores..."
                    className="w-64"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setCreateDraft((current) => ({
                        ...current,
                        detalles: [...current.detalles, createEmptyDetailDraft()],
                      }))
                    }
                  >
                    <Plus className="h-4 w-4" />
                    Agregar renglón
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {createDraft.detalles.map((detalle, index) => (
                  <div
                    key={detalle.key}
                    className="grid gap-3 rounded-lg border p-3 lg:grid-cols-[1.4fr_1.1fr_140px_1fr_auto]"
                  >
                    <div className="space-y-2">
                      <Label>Item</Label>
                      <Select
                        value={detalle.itemId || "none"}
                        onValueChange={(value) =>
                          setCreateDraft((current) => ({
                            ...current,
                            detalles: current.detalles.map((row) =>
                              row.key === detalle.key
                                ? { ...row, itemId: value === "none" ? "" : value }
                                : row
                            ),
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={itemsLoading ? "Cargando items..." : "Seleccionar item"}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin item</SelectItem>
                          {items.map((item) => (
                            <SelectItem key={item.id} value={String(item.id)}>
                              {item.codigo} · {item.descripcion}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Depósito origen</Label>
                      <Select
                        value={detalle.depositoId || "none"}
                        onValueChange={(value) =>
                          setCreateDraft((current) => ({
                            ...current,
                            detalles: current.detalles.map((row) =>
                              row.key === detalle.key
                                ? { ...row, depositoId: value === "none" ? "" : value }
                                : row
                            ),
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar depósito" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin depósito</SelectItem>
                          {depositos.map((deposito) => (
                            <SelectItem key={deposito.id} value={String(deposito.id)}>
                              {deposito.descripcion}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Cantidad</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={detalle.cantidad}
                        onChange={(event) =>
                          setCreateDraft((current) => ({
                            ...current,
                            detalles: current.detalles.map((row) =>
                              row.key === detalle.key
                                ? { ...row, cantidad: event.target.value }
                                : row
                            ),
                          }))
                        }
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Observación</Label>
                      <Input
                        value={detalle.observacion}
                        onChange={(event) =>
                          setCreateDraft((current) => ({
                            ...current,
                            detalles: current.detalles.map((row) =>
                              row.key === detalle.key
                                ? { ...row, observacion: event.target.value }
                                : row
                            ),
                          }))
                        }
                        placeholder={`Renglón ${index + 1}`}
                      />
                    </div>
                    <div className="flex items-end justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setCreateDraft((current) => ({
                            ...current,
                            detalles:
                              current.detalles.length === 1
                                ? [createEmptyDetailDraft()]
                                : current.detalles.filter((row) => row.key !== detalle.key),
                          }))
                        }
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false)
                resetCreateDraft()
              }}
            >
              Cancelar
            </Button>
            <Button onClick={() => void handleCreateSubmit()} disabled={busyAction === "crear"}>
              {busyAction === "crear" ? "Guardando..." : "Crear orden"}
            </Button>
          </DialogFooter>
        </WmsDialogContent>
      </Dialog>

      <Dialog
        open={isPickingOpen}
        onOpenChange={(open) => {
          setIsPickingOpen(open)
          if (!open) {
            resetPickingDialog()
          }
        }}
      >
        <WmsDialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Registrar picking</DialogTitle>
            <DialogDescription>
              Las cantidades se envían como valores entregados acumulados por renglón y no pueden
              superar lo solicitado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {selectedDetail?.detalles?.map((detalle) => {
              const item = itemById.get(detalle.itemId)
              return (
                <div
                  key={detalle.id}
                  className="grid gap-3 rounded-lg border p-3 md:grid-cols-[1.4fr_140px_140px_140px]"
                >
                  <div>
                    <p className="font-medium">{item?.descripcion ?? `Item #${detalle.itemId}`}</p>
                    <p className="text-sm text-muted-foreground">
                      Depósito{" "}
                      {depositoNameById.get(detalle.depositoId) ?? `#${detalle.depositoId}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Solicitado</p>
                    <p className="font-medium">{formatQuantity(detalle.cantidad)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Entregado actual</p>
                    <p className="font-medium">{formatQuantity(detalle.cantidadEntregada)}</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Cantidad entregada</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={pickingDraft[detalle.id] ?? "0"}
                      onChange={(event) =>
                        setPickingDraft((current) => ({
                          ...current,
                          [detalle.id]: event.target.value,
                        }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Máximo visible: {formatQuantity(detalle.cantidad)}.
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPickingOpen(false)}>
              Cerrar
            </Button>
            <Button onClick={() => void handlePickingSubmit()} disabled={busyAction === "picking"}>
              {busyAction === "picking" ? "Guardando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </WmsDialogContent>
      </Dialog>

      <Dialog
        open={isDispatchOpen}
        onOpenChange={(open) => {
          setIsDispatchOpen(open)
          if (!open) {
            resetDispatchDialog()
          }
        }}
      >
        <WmsDialogContent size="md">
          <DialogHeader>
            <DialogTitle>Despachar orden</DialogTitle>
            <DialogDescription>
              El backend genera la transferencia de depósito asociada al picking confirmado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Depósito destino</Label>
              <Select
                value={dispatchDraft.depositoDestinoId || "none"}
                onValueChange={(value) =>
                  setDispatchDraft((current) => ({
                    ...current,
                    depositoDestinoId: value === "none" ? "" : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar depósito" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin depósito</SelectItem>
                  {depositos.map((deposito) => (
                    <SelectItem key={deposito.id} value={String(deposito.id)}>
                      {deposito.descripcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input
                type="date"
                value={dispatchDraft.fecha}
                onChange={(event) =>
                  setDispatchDraft((current) => ({ ...current, fecha: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Observación</Label>
              <Textarea
                value={dispatchDraft.observacion}
                onChange={(event) =>
                  setDispatchDraft((current) => ({ ...current, observacion: event.target.value }))
                }
                placeholder="Destino físico, prioridad de salida o referencia logística"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDispatchOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => void handleDispatchSubmit()}
              disabled={busyAction === "despachar"}
            >
              {busyAction === "despachar" ? "Despachando..." : "Generar despacho"}
            </Button>
          </DialogFooter>
        </WmsDialogContent>
      </Dialog>
    </div>
  )
}
