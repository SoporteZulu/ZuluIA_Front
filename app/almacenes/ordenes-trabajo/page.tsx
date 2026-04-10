"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { AlertCircle, Eye, Play, Plus, RefreshCcw, Search, Square, XCircle } from "lucide-react"

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { useDepositos } from "@/lib/hooks/useDepositos"
import { useFormulasProduccion } from "@/lib/hooks/useFormulasProduccion"
import { useOrdenesTrabajo } from "@/lib/hooks/useOrdenesTrabajo"
import { useDefaultSucursalId } from "@/lib/hooks/useSucursales"
import type { OrdenTrabajo } from "@/lib/types/ordenes-trabajo"
import { toast } from "@/hooks/use-toast"

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleDateString("es-AR") : "-"
}

function formatDateTime(value?: string) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"

  return new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(date)
}

function getDaysOffset(value?: string) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return Math.floor((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function estadoVariant(estado: string) {
  switch ((estado ?? "").toUpperCase()) {
    case "PENDIENTE":
      return "secondary" as const
    case "EN_PROCESO":
      return "default" as const
    case "COMPLETADO":
      return "default" as const
    case "CANCELADO":
      return "destructive" as const
    default:
      return "outline" as const
  }
}

function getOperationalStatus(orden: OrdenTrabajo) {
  const finPrevistoOffset = getDaysOffset(orden.fechaFinPrevista)
  if (orden.estado === "COMPLETADO") return "Finalizada"
  if (orden.estado === "CANCELADO") return "Cancelada"
  if (orden.estado === "EN_PROCESO") return "En producción"
  if (finPrevistoOffset !== null && finPrevistoOffset < 0) return "Pendiente vencida"
  return "Programada"
}

function getPlanningStatus(orden: OrdenTrabajo) {
  if (orden.depositoOrigenId && orden.depositoDestinoId) return "Circuito completo"
  if (orden.depositoOrigenId || orden.depositoDestinoId) return "Circuito parcial"
  return "Sin depósitos definidos"
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

export default function OrdenesTrabajPage() {
  const defaultSucursalId = useDefaultSucursalId() ?? 1
  const [estado, setEstado] = useState("")
  const [desde, setDesde] = useState("")
  const [hasta, setHasta] = useState("")
  const [formulaFiltro, setFormulaFiltro] = useState<number | undefined>()
  const {
    ordenes,
    loading,
    error,
    page,
    setPage,
    totalCount,
    totalPages,
    getById,
    crear,
    iniciar,
    finalizar,
    cancelar,
    refetch,
  } = useOrdenesTrabajo({
    sucursalId: defaultSucursalId,
    formulaId: formulaFiltro,
    estado: estado || undefined,
    desde: desde || undefined,
    hasta: hasta || undefined,
  })
  const { formulas } = useFormulasProduccion(true)
  const { depositos } = useDepositos(defaultSucursalId)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detail, setDetail] = useState<OrdenTrabajo | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [finalizeOpen, setFinalizeOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [draft, setDraft] = useState({
    formulaId: "",
    depositoOrigenId: "none",
    depositoDestinoId: "none",
    fecha: new Date().toISOString().slice(0, 10),
    fechaFinPrevista: "",
    cantidad: "",
    observacion: "",
  })
  const [finalizeDraft, setFinalizeDraft] = useState({
    fechaFinReal: new Date().toISOString().slice(0, 10),
    cantidadProducida: "",
  })

  const filtered = useMemo(
    () =>
      ordenes.filter((orden) => {
        const term = searchTerm.trim().toLowerCase()
        return (
          !term ||
          String(orden.id).includes(term) ||
          String(orden.formulaId).includes(term) ||
          (orden.estado ?? "").toLowerCase().includes(term) ||
          (orden.observacion ?? "").toLowerCase().includes(term)
        )
      }),
    [ordenes, searchTerm]
  )

  const pendientes = ordenes.filter((orden) => orden.estado === "PENDIENTE").length
  const enProceso = ordenes.filter((orden) => orden.estado === "EN_PROCESO").length
  const completados = ordenes.filter((orden) => orden.estado === "COMPLETADO").length
  const conCircuitoCompleto = ordenes.filter((orden) =>
    Boolean(orden.depositoOrigenId && orden.depositoDestinoId)
  ).length
  const conObservacion = ordenes.filter((orden) => Boolean(orden.observacion)).length
  const vencidas = ordenes.filter(
    (orden) =>
      ["PENDIENTE", "EN_PROCESO"].includes(orden.estado) &&
      (getDaysOffset(orden.fechaFinPrevista) ?? 1) < 0
  ).length

  const selected = useMemo(
    () => filtered.find((orden) => orden.id === selectedId) ?? filtered[0] ?? null,
    [filtered, selectedId]
  )

  const getFormulaName = (formulaId: number) =>
    formulas.find((formula) => formula.id === formulaId)?.descripcion ?? `Fórmula #${formulaId}`
  const getDepositoName = (depositoId?: number) =>
    depositos.find((deposito) => deposito.id === depositoId)?.descripcion ??
    (depositoId ? `Depósito #${depositoId}` : "No definido")

  const handleOpenDetail = async (id: number) => {
    setDetailOpen(true)
    setDetailLoading(true)
    const data = await getById(id)
    setDetail(data)
    setDetailLoading(false)
  }

  const handleCreate = async () => {
    setActionError(null)
    if (!draft.formulaId || !draft.fecha || !draft.cantidad) {
      setActionError("Completá fórmula, fecha y cantidad para generar la orden.")
      return
    }

    setSaving(true)
    const ok = await crear({
      sucursalId: defaultSucursalId,
      formulaId: Number(draft.formulaId),
      depositoOrigenId:
        draft.depositoOrigenId === "none" ? undefined : Number(draft.depositoOrigenId),
      depositoDestinoId:
        draft.depositoDestinoId === "none" ? undefined : Number(draft.depositoDestinoId),
      fecha: draft.fecha,
      fechaFinPrevista: draft.fechaFinPrevista || undefined,
      cantidad: Number(draft.cantidad),
      observacion: draft.observacion || undefined,
    })
    setSaving(false)

    if (!ok) {
      setActionError("No se pudo crear la orden de trabajo.")
      return
    }

    setCreateOpen(false)
    setDraft({
      formulaId: "",
      depositoOrigenId: "none",
      depositoDestinoId: "none",
      fecha: new Date().toISOString().slice(0, 10),
      fechaFinPrevista: "",
      cantidad: "",
      observacion: "",
    })
    toast({ title: "Orden creada", description: "La orden de trabajo quedó registrada." })
  }

  const handleIniciar = async () => {
    if (!selected) return
    setSaving(true)
    const ok = await iniciar(selected.id)
    setSaving(false)
    if (!ok) return
    toast({ title: "Orden iniciada", description: `La OT #${selected.id} pasó a En proceso.` })
    void handleOpenDetail(selected.id)
  }

  const handleCancelar = async () => {
    if (!selected) return
    setSaving(true)
    const ok = await cancelar(selected.id)
    setSaving(false)
    if (!ok) return
    toast({ title: "Orden cancelada", description: `La OT #${selected.id} fue cancelada.` })
    void handleOpenDetail(selected.id)
  }

  const handleFinalizar = async () => {
    if (!selected) return
    setSaving(true)
    const ok = await finalizar(selected.id, {
      fechaFinReal: finalizeDraft.fechaFinReal,
      cantidadProducida: finalizeDraft.cantidadProducida
        ? Number(finalizeDraft.cantidadProducida)
        : undefined,
    })
    setSaving(false)
    if (!ok) return

    setFinalizeOpen(false)
    toast({ title: "Orden finalizada", description: `La OT #${selected.id} quedó cerrada.` })
    void handleOpenDetail(selected.id)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Órdenes de trabajo</h1>
          <p className="text-muted-foreground">
            Consola operativa de producción con alta y mutaciones reales de workflow sobre backend.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void refetch()} disabled={loading}>
            <RefreshCcw className="h-4 w-4" /> Actualizar
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Nueva orden
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
          title="Totales"
          value={String(totalCount)}
          description={`Sucursal ${defaultSucursalId} con filtros aplicados.`}
        />
        <SummaryCard
          title="Pendientes"
          value={String(pendientes)}
          description="Órdenes esperando inicio de producción."
        />
        <SummaryCard
          title="En proceso"
          value={String(enProceso)}
          description="Órdenes actualmente en ejecución."
        />
        <SummaryCard
          title="Completadas"
          value={String(completados)}
          description="Órdenes ya finalizadas o cerradas."
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Circuito completo"
          value={String(conCircuitoCompleto)}
          description="Órdenes con depósito origen y destino visibles."
        />
        <SummaryCard
          title="Con observación"
          value={String(conObservacion)}
          description="Órdenes con contexto operativo registrado."
        />
        <SummaryCard
          title="Vencidas"
          value={String(vencidas)}
          description="Pendientes o en proceso con fin previsto vencido."
        />
        <SummaryCard
          title="Estado seleccionado"
          value={selected ? getOperationalStatus(selected) : "-"}
          description="Lectura operativa de la orden actualmente seleccionada."
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros operativos</CardTitle>
          <CardDescription>
            El estado, la fórmula y el rango de fechas consultan backend; la búsqueda textual refina
            la página cargada.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_200px_180px_180px_200px]">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por ID, fórmula, estado u observación..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select
              value={formulaFiltro ? String(formulaFiltro) : "all"}
              onValueChange={(value) => {
                setFormulaFiltro(value === "all" ? undefined : Number(value))
                setPage(1)
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Todas las fórmulas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las fórmulas</SelectItem>
                {formulas.map((formula) => (
                  <SelectItem key={formula.id} value={String(formula.id)}>
                    {formula.descripcion}
                  </SelectItem>
                ))}
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
            <Select
              value={estado || "all"}
              onValueChange={(value) => {
                setEstado(value === "all" ? "" : value)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                <SelectItem value="EN_PROCESO">En proceso</SelectItem>
                <SelectItem value="COMPLETADO">Completado</SelectItem>
                <SelectItem value="CANCELADO">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.95fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Programación de órdenes</CardTitle>
            <CardDescription>
              {filtered.length} órdenes en la página actual. Seleccioná una fila para revisar su
              detalle.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Fórmula</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Fin previsto</TableHead>
                  <TableHead>Circuito</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      Cargando órdenes...
                    </TableCell>
                  </TableRow>
                )}
                {!loading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No hay órdenes para los filtros actuales.
                    </TableCell>
                  </TableRow>
                )}
                {!loading &&
                  filtered.map((orden) => (
                    <TableRow
                      key={orden.id}
                      className={orden.id === selected?.id ? "bg-accent/40" : undefined}
                      onClick={() => setSelectedId(orden.id)}
                    >
                      <TableCell className="font-mono text-sm">#{orden.id}</TableCell>
                      <TableCell>{getFormulaName(orden.formulaId)}</TableCell>
                      <TableCell>{orden.cantidad}</TableCell>
                      <TableCell>{formatDate(orden.fecha)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p>{formatDate(orden.fechaFinPrevista)}</p>
                          <p className="text-xs text-muted-foreground">
                            {orden.fechaFinPrevista
                              ? `${getDaysOffset(orden.fechaFinPrevista) ?? 0} días`
                              : "Sin fecha"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant="outline" className="text-xs">
                            {getPlanningStatus(orden)}
                          </Badge>
                          <p className="text-xs text-muted-foreground">
                            {getOperationalStatus(orden)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={estadoVariant(orden.estado ?? "")}>
                          {orden.estado ?? "-"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between border-t px-4 py-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
              >
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                {page}/{Math.max(totalPages, 1)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
              >
                Siguiente
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {selected ? `Orden #${selected.id}` : "Detalle de orden"}
            </CardTitle>
            <CardDescription>
              {selected
                ? `${getFormulaName(selected.formulaId)} · ${selected.estado}`
                : "Seleccioná una orden para revisar planificación y workflow."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selected ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Depósito origen</p>
                    <p className="mt-2 font-medium">{getDepositoName(selected.depositoOrigenId)}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Depósito destino</p>
                    <p className="mt-2 font-medium">
                      {getDepositoName(selected.depositoDestinoId)}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Cantidad</p>
                    <p className="mt-2 text-lg font-semibold">{selected.cantidad}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Fin real</p>
                    <p className="mt-2 font-medium">{formatDate(selected.fechaFinReal)}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Estado operativo</p>
                    <p className="mt-2 font-medium">{getOperationalStatus(selected)}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Planificación</p>
                    <p className="mt-2 font-medium">{getPlanningStatus(selected)}</p>
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Observación</p>
                  <p className="mt-2 font-medium">
                    {selected.observacion ?? "Sin observaciones registradas."}
                  </p>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {selected.estado === "PENDIENTE" ? (
                    <Button
                      className="w-full"
                      onClick={() => void handleIniciar()}
                      disabled={saving}
                    >
                      <Play className="h-4 w-4" /> Iniciar orden
                    </Button>
                  ) : null}
                  {selected.estado === "EN_PROCESO" ? (
                    <Button
                      className="w-full"
                      onClick={() => setFinalizeOpen(true)}
                      disabled={saving}
                    >
                      <Square className="h-4 w-4" /> Finalizar orden
                    </Button>
                  ) : null}
                  {["PENDIENTE", "EN_PROCESO"].includes(selected.estado) ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => void handleCancelar()}
                      disabled={saving}
                    >
                      <XCircle className="h-4 w-4" /> Cancelar orden
                    </Button>
                  ) : null}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => void handleOpenDetail(selected.id)}
                  >
                    <Eye className="h-4 w-4" /> Ver detalle completo
                  </Button>
                  <Button asChild className="w-full">
                    <Link href={`/almacenes/produccion?orden=${selected.id}`}>
                      Abrir circuito productivo
                    </Link>
                  </Button>
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No hay orden seleccionada.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalle de orden de trabajo</DialogTitle>
            <DialogDescription>
              Consulta puntual del registro operativo recuperado desde backend.
            </DialogDescription>
          </DialogHeader>
          {detailLoading ? (
            <p className="text-sm text-muted-foreground">Cargando detalle...</p>
          ) : detail ? (
            <Tabs defaultValue="general">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="circuito">Circuito</TabsTrigger>
                <TabsTrigger value="fechas">Fechas</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-muted/40 p-3">
                  <span className="mb-1 block text-xs text-muted-foreground">Fórmula</span>
                  <p className="text-sm font-medium">{getFormulaName(detail.formulaId)}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <span className="mb-1 block text-xs text-muted-foreground">Estado</span>
                  <p className="text-sm font-medium">{detail.estado}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <span className="mb-1 block text-xs text-muted-foreground">Cantidad</span>
                  <p className="text-sm font-medium">{detail.cantidad}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <span className="mb-1 block text-xs text-muted-foreground">Estado operativo</span>
                  <p className="text-sm font-medium">{getOperationalStatus(detail)}</p>
                </div>
              </TabsContent>

              <TabsContent value="circuito" className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-muted/40 p-3">
                  <span className="mb-1 block text-xs text-muted-foreground">Depósito origen</span>
                  <p className="text-sm font-medium">{getDepositoName(detail.depositoOrigenId)}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <span className="mb-1 block text-xs text-muted-foreground">Depósito destino</span>
                  <p className="text-sm font-medium">{getDepositoName(detail.depositoDestinoId)}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3 sm:col-span-2">
                  <span className="mb-1 block text-xs text-muted-foreground">Planificación</span>
                  <p className="text-sm font-medium">{getPlanningStatus(detail)}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3 sm:col-span-2">
                  <span className="mb-1 block text-xs text-muted-foreground">Observación</span>
                  <p className="text-sm font-medium">{detail.observacion ?? "Sin observación"}</p>
                </div>
              </TabsContent>

              <TabsContent value="fechas" className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-muted/40 p-3">
                  <span className="mb-1 block text-xs text-muted-foreground">Fecha inicio</span>
                  <p className="text-sm font-medium">{formatDateTime(detail.fecha)}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <span className="mb-1 block text-xs text-muted-foreground">Fin previsto</span>
                  <p className="text-sm font-medium">{formatDateTime(detail.fechaFinPrevista)}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <span className="mb-1 block text-xs text-muted-foreground">Fin real</span>
                  <p className="text-sm font-medium">{formatDateTime(detail.fechaFinReal)}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <span className="mb-1 block text-xs text-muted-foreground">Desvío</span>
                  <p className="text-sm font-medium">
                    {detail.fechaFinPrevista
                      ? `${getDaysOffset(detail.fechaFinPrevista) ?? 0} días`
                      : "Sin fecha prevista"}
                  </p>
                </div>
                <div className="rounded-lg border p-3 sm:col-span-2">
                  <p className="text-sm text-muted-foreground">Circuito productivo ampliado</p>
                  <p className="mt-2 text-sm font-medium">
                    Consumos, cierre y empaques ya se gestionan desde la consola de producción
                    usando endpoints reales.
                  </p>
                  <Button asChild variant="outline" className="mt-3 bg-transparent">
                    <Link href={`/almacenes/produccion?orden=${detail.id}`}>Ir a producción</Link>
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <p className="text-sm text-muted-foreground">
              No se pudo recuperar el detalle solicitado.
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva orden de trabajo</DialogTitle>
            <DialogDescription>
              Generá una orden productiva usando las fórmulas y depósitos disponibles para la
              sucursal activa.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="formula">Fórmula</Label>
              <Select
                value={draft.formulaId}
                onValueChange={(value) => setDraft((prev) => ({ ...prev, formulaId: value }))}
              >
                <SelectTrigger id="formula" className="w-full">
                  <SelectValue placeholder="Seleccionar fórmula" />
                </SelectTrigger>
                <SelectContent>
                  {formulas.map((formula) => (
                    <SelectItem key={formula.id} value={String(formula.id)}>
                      {formula.descripcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fecha">Fecha</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={draft.fecha}
                  onChange={(e) => setDraft((prev) => ({ ...prev, fecha: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fin-previsto">Fin previsto</Label>
                <Input
                  id="fin-previsto"
                  type="date"
                  value={draft.fechaFinPrevista}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, fechaFinPrevista: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="deposito-origen">Depósito origen</Label>
                <Select
                  value={draft.depositoOrigenId}
                  onValueChange={(value) =>
                    setDraft((prev) => ({ ...prev, depositoOrigenId: value }))
                  }
                >
                  <SelectTrigger id="deposito-origen" className="w-full">
                    <SelectValue placeholder="Sin definir" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin definir</SelectItem>
                    {depositos.map((deposito) => (
                      <SelectItem key={deposito.id} value={String(deposito.id)}>
                        {deposito.descripcion}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="deposito-destino">Depósito destino</Label>
                <Select
                  value={draft.depositoDestinoId}
                  onValueChange={(value) =>
                    setDraft((prev) => ({ ...prev, depositoDestinoId: value }))
                  }
                >
                  <SelectTrigger id="deposito-destino" className="w-full">
                    <SelectValue placeholder="Sin definir" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin definir</SelectItem>
                    {depositos.map((deposito) => (
                      <SelectItem key={deposito.id} value={String(deposito.id)}>
                        {deposito.descripcion}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-[160px_minmax(0,1fr)]">
              <div className="space-y-2">
                <Label htmlFor="cantidad">Cantidad</Label>
                <Input
                  id="cantidad"
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.cantidad}
                  onChange={(e) => setDraft((prev) => ({ ...prev, cantidad: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="observacion">Observación</Label>
                <Textarea
                  id="observacion"
                  rows={3}
                  value={draft.observacion}
                  onChange={(e) => setDraft((prev) => ({ ...prev, observacion: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void handleCreate()} disabled={saving}>
              {saving ? "Guardando..." : "Crear orden"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={finalizeOpen} onOpenChange={setFinalizeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalizar orden</DialogTitle>
            <DialogDescription>
              Cerrá la orden en backend con fecha real y cantidad producida opcional.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fecha-fin-real">Fecha fin real</Label>
              <Input
                id="fecha-fin-real"
                type="date"
                value={finalizeDraft.fechaFinReal}
                onChange={(event) =>
                  setFinalizeDraft((prev) => ({ ...prev, fechaFinReal: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cantidad-producida">Cantidad producida</Label>
              <Input
                id="cantidad-producida"
                type="number"
                min="0"
                step="0.01"
                value={finalizeDraft.cantidadProducida}
                onChange={(event) =>
                  setFinalizeDraft((prev) => ({ ...prev, cantidadProducida: event.target.value }))
                }
                placeholder="Opcional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFinalizeOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void handleFinalizar()} disabled={saving}>
              {saving ? "Guardando..." : "Finalizar orden"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
