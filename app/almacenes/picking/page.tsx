"use client"

import { useMemo, useState } from "react"
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
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Plus,
  RefreshCcw,
  Search,
  Truck,
  AlertCircle,
} from "lucide-react"
import { useOrdenesPreparacion } from "@/lib/hooks/useOrdenesPreparacion"
import { useTerceros } from "@/lib/hooks/useTerceros"
import { useDefaultSucursalId } from "@/lib/hooks/useSucursales"
import type { OrdenPreparacion } from "@/lib/types/ordenes-preparacion"

const estadoBadgeVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  PENDIENTE: "secondary",
  EN_PROCESO: "default",
  COMPLETADA: "outline",
  CANCELADA: "destructive",
}

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleDateString("es-AR") : "-"
}

function formatDateTime(value?: string) {
  if (!value) return "-"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date)
}

function getDaysOpen(value?: string) {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  const diff = Date.now() - date.getTime()
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

function getOperationalStatus(orden: OrdenPreparacion) {
  const daysOpen = getDaysOpen(orden.fecha)

  if (orden.estado === "COMPLETADA") return "Cerrada"
  if (orden.estado === "CANCELADA") return "Cancelada"
  if (orden.estado === "EN_PROCESO") return "En preparacion"
  if (daysOpen !== null && daysOpen >= 7) return "Pendiente con antiguedad"
  return "Pendiente vigente"
}

function getTraceabilityStatus(orden: OrdenPreparacion) {
  if (orden.terceroId && orden.observacion) return "Referencia completa"
  if (orden.terceroId || orden.observacion) return "Referencia parcial"
  return "Referencia basica"
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
  const { ordenes, loading, error, page, setPage, totalCount, totalPages, crear, refetch } =
    useOrdenesPreparacion({
      sucursalId: defaultSucursalId,
      estado: filterEstado || undefined,
      desde: desde || undefined,
      hasta: hasta || undefined,
    })
  const { terceros } = useTerceros()
  const [selectedOrden, setSelectedOrden] = useState<OrdenPreparacion | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [draft, setDraft] = useState({
    terceroId: "",
    fecha: new Date().toISOString().slice(0, 10),
    observacion: "",
  })
  const terceroNameById = useMemo(
    () => new Map(terceros.map((tercero) => [tercero.id, tercero.razonSocial])),
    [terceros]
  )

  const getTerceroName = (id?: number) =>
    id ? (terceros.find((tercero) => tercero.id === id)?.razonSocial ?? `#${id}`) : "-"

  const filteredOrdenes = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return ordenes.filter((orden) => {
      const terceroName = orden.terceroId
        ? (terceroNameById.get(orden.terceroId) ?? `#${orden.terceroId}`).toLowerCase()
        : "-"
      if (!term) return true
      return (
        String(orden.id).includes(term) ||
        terceroName.includes(term) ||
        (orden.estado ?? "").toLowerCase().includes(term) ||
        (orden.observacion ?? "").toLowerCase().includes(term)
      )
    })
  }, [ordenes, searchTerm, terceroNameById])

  const pendientes = ordenes.filter((orden) => orden.estado === "PENDIENTE").length
  const enProceso = ordenes.filter((orden) => orden.estado === "EN_PROCESO").length
  const completadas = ordenes.filter((orden) => orden.estado === "COMPLETADA").length
  const conTercero = ordenes.filter((orden) => Boolean(orden.terceroId)).length
  const conObservacion = ordenes.filter((orden) => Boolean(orden.observacion)).length
  const conAntiguedad = ordenes.filter(
    (orden) =>
      ["PENDIENTE", "EN_PROCESO"].includes(orden.estado) && (getDaysOpen(orden.fecha) ?? 0) >= 7
  ).length

  const handleOpenDetail = (orden: OrdenPreparacion) => {
    setSelectedOrden(orden)
    setIsDetailOpen(true)
  }

  const handleCreate = async () => {
    setActionError(null)

    if (!draft.fecha) {
      setActionError("Informá la fecha de la orden de preparación.")
      return
    }

    setSaving(true)
    const ok = await crear({
      sucursalId: defaultSucursalId,
      terceroId: draft.terceroId ? Number(draft.terceroId) : undefined,
      fecha: draft.fecha,
      observacion: draft.observacion || undefined,
    })
    setSaving(false)

    if (!ok) {
      setActionError("No se pudo crear la orden de preparación.")
      return
    }

    setIsCreateOpen(false)
    setDraft({
      terceroId: "",
      fecha: new Date().toISOString().slice(0, 10),
      observacion: "",
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Picking y preparación</h1>
          <p className="text-muted-foreground">
            Consola operativa para gestionar órdenes de picking con filtros reales, alta soportada y
            consulta inmediata de los registros cargados en backend.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={refetch} disabled={loading}>
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
          title="Total"
          value={String(totalCount)}
          description={`Sucursal ${defaultSucursalId} con filtros aplicados.`}
        />
        <SummaryCard
          title="Pendientes"
          value={String(pendientes)}
          description="Órdenes aún no iniciadas."
        />
        <SummaryCard
          title="En proceso"
          value={String(enProceso)}
          description="Preparaciones actualmente activas."
        />
        <SummaryCard
          title="Completadas"
          value={String(completadas)}
          description="Listas para despacho o cierre."
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Con tercero"
          value={String(conTercero)}
          description="Ordenes con cliente o referencia comercial visible."
        />
        <SummaryCard
          title="Con observacion"
          value={String(conObservacion)}
          description="Ordenes con detalle operativo registrado."
        />
        <SummaryCard
          title="Con antiguedad"
          value={String(conAntiguedad)}
          description="Pendientes o en proceso con 7 dias o mas desde la fecha."
        />
        <SummaryCard
          title="Trazabilidad"
          value={selectedOrden ? getTraceabilityStatus(selectedOrden) : "-"}
          description="Estado visible de referencia para la orden seleccionada."
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros operativos</CardTitle>
          <CardDescription>
            Estado y rango de fechas consultan backend; la búsqueda textual refina la página
            descargada.
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
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
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
                <SelectItem value="CANCELADA">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
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
                  <TableHead>Circuito</TableHead>
                  <TableHead>Observación</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
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
                  filteredOrdenes.map((orden) => (
                    <TableRow key={orden.id}>
                      <TableCell className="font-medium">{orden.id}</TableCell>
                      <TableCell>{getTerceroName(orden.terceroId)}</TableCell>
                      <TableCell>
                        <Badge variant={estadoBadgeVariant[orden.estado] ?? "outline"}>
                          {orden.estado}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="space-y-1">
                          <p>{formatDate(orden.fecha)}</p>
                          <p className="text-xs text-muted-foreground">
                            {getDaysOpen(orden.fecha) ?? 0} dias
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant="outline" className="text-xs">
                            {getOperationalStatus(orden)}
                          </Badge>
                          <p className="text-xs text-muted-foreground">
                            {getTraceabilityStatus(orden)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {orden.observacion ?? "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDetail(orden)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
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
              {selectedOrden ? `Orden #${selectedOrden.id}` : "Detalle de preparación"}
            </CardTitle>
            <CardDescription>
              {selectedOrden
                ? `${getTerceroName(selectedOrden.terceroId)} · ${selectedOrden.estado}`
                : "Seleccioná una orden para revisar su resumen operativo."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedOrden ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Sucursal</p>
                    <p className="mt-2 text-lg font-semibold">{selectedOrden.sucursalId}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Fecha</p>
                    <p className="mt-2 font-medium">{formatDate(selectedOrden.fecha)}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Estado operativo</p>
                    <p className="mt-2 font-medium">{getOperationalStatus(selectedOrden)}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Trazabilidad</p>
                    <p className="mt-2 font-medium">{getTraceabilityStatus(selectedOrden)}</p>
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Observación</p>
                  <p className="mt-2 font-medium">
                    {selectedOrden.observacion ?? "Sin observaciones registradas."}
                  </p>
                </div>
                <Button variant="outline" className="w-full" onClick={() => setIsDetailOpen(true)}>
                  <Eye className="h-4 w-4" />
                  Ver detalle
                </Button>
              </>
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No hay orden seleccionada en la vista actual.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Orden de preparación #{selectedOrden?.id}
            </DialogTitle>
            <DialogDescription>
              {selectedOrden ? getTerceroName(selectedOrden.terceroId) : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4 text-sm">
            {selectedOrden && (
              <Tabs defaultValue="general" className="col-span-2">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="general">General</TabsTrigger>
                  <TabsTrigger value="circuito">Circuito</TabsTrigger>
                  <TabsTrigger value="referencias">Referencias</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  {[
                    ["ID", String(selectedOrden.id)],
                    ["Estado", selectedOrden.estado],
                    ["Tercero", getTerceroName(selectedOrden.terceroId)],
                    ["Sucursal ID", String(selectedOrden.sucursalId)],
                    ["Fecha", formatDate(selectedOrden.fecha)],
                    ["Fecha y hora visible", formatDateTime(selectedOrden.fecha)],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <span className="mb-1 block text-muted-foreground">{label}</span>
                      <p className="font-semibold">{value}</p>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="circuito" className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  {[
                    ["Estado operativo", getOperationalStatus(selectedOrden)],
                    ["Antiguedad", `${getDaysOpen(selectedOrden.fecha) ?? 0} dias`],
                    ["Trazabilidad", getTraceabilityStatus(selectedOrden)],
                    [
                      "Cobertura documental",
                      selectedOrden.observacion ? "Con observacion" : "Sin observacion",
                    ],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <span className="mb-1 block text-muted-foreground">{label}</span>
                      <p className="font-semibold">{value}</p>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="referencias" className="mt-4 space-y-4 text-sm">
                  <div>
                    <span className="mb-1 block text-muted-foreground">Observacion</span>
                    <p className="font-semibold">{selectedOrden.observacion ?? "-"}</p>
                  </div>
                  <div>
                    <span className="mb-1 block text-muted-foreground">Lectura operativa</span>
                    <p className="font-semibold">
                      {selectedOrden.terceroId
                        ? "Orden vinculada a un tercero visible en el frontend actual."
                        : "Orden interna sin tercero asociado visible."}
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva orden de preparación</DialogTitle>
            <DialogDescription>
              Registrá una orden de picking sobre la sucursal activa. El tercero sigue siendo
              opcional según el backend actual.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tercero-id">ID de tercero</Label>
              <Input
                id="tercero-id"
                type="number"
                min={1}
                value={draft.terceroId}
                onChange={(e) => setDraft((current) => ({ ...current, terceroId: e.target.value }))}
                placeholder="Opcional"
              />
              <p className="text-xs text-muted-foreground">
                Si lo informas, la orden queda vinculada a un tercero visible en la consola.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fecha">Fecha</Label>
              <Input
                id="fecha"
                type="date"
                value={draft.fecha}
                onChange={(e) => setDraft((current) => ({ ...current, fecha: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="observacion">Observación</Label>
              <Input
                id="observacion"
                value={draft.observacion}
                onChange={(e) =>
                  setDraft((current) => ({ ...current, observacion: e.target.value }))
                }
                placeholder="Detalle operativo"
              />
              <p className="text-xs text-muted-foreground">
                Conviene registrar referencia de picking, turno, remito interno o prioridad.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "Guardando..." : "Crear orden"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
