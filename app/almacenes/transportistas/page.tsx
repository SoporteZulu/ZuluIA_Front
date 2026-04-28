"use client"

import { useMemo, useState } from "react"
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
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsTrigger } from "@/components/ui/tabs"
import {
  WmsDetailFieldGrid,
  WmsDialogContent,
  WmsTabsList,
} from "@/components/almacenes/wms-responsive"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useTransportistas } from "@/lib/hooks/useTransportistas"
import type {
  CreateTransportistaDto,
  Transportista,
  UpdateTransportistaDto,
} from "@/lib/types/transportistas"
import { AlertCircle, Eye, Pencil, Plus, RefreshCcw, Search, Truck } from "lucide-react"
import { toast } from "@/hooks/use-toast"

type DraftState = CreateTransportistaDto & {
  activo: boolean
}

function emptyDraft(): DraftState {
  return {
    terceroId: 0,
    nroCuitTransportista: "",
    domicilioPartida: "",
    patente: "",
    marcaVehiculo: "",
    activo: true,
  }
}

function buildDraft(transportista?: Transportista | null): DraftState {
  if (!transportista) return emptyDraft()

  return {
    terceroId: transportista.terceroId,
    nroCuitTransportista: transportista.nroCuitTransportista ?? "",
    domicilioPartida: transportista.domicilioPartida ?? "",
    patente: transportista.patente ?? "",
    marcaVehiculo: transportista.marcaVehiculo ?? "",
    activo: transportista.activo,
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

function getVehicleStatus(transportista: Transportista) {
  if (transportista.patente && transportista.marcaVehiculo) return "Unidad identificada"
  if (transportista.patente || transportista.marcaVehiculo) return "Unidad parcial"
  return "Sin unidad visible"
}

function getTraceabilityStatus(transportista: Transportista) {
  if (
    transportista.terceroCuit &&
    transportista.nroCuitTransportista &&
    transportista.domicilioPartida
  ) {
    return "Legajo completo"
  }

  if (
    transportista.terceroCuit ||
    transportista.nroCuitTransportista ||
    transportista.domicilioPartida
  ) {
    return "Legajo operativo"
  }

  return "Legajo base"
}

function digitsOnly(value?: string | null) {
  return String(value ?? "").replace(/\D+/g, "")
}

export default function TransportistasPage() {
  const [soloActivos, setSoloActivos] = useState(false)
  const { transportistas, loading, error, getById, crear, actualizar, cambiarEstado, refetch } =
    useTransportistas(soloActivos)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<Transportista | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Transportista | null>(null)
  const [draft, setDraft] = useState<DraftState>(emptyDraft())
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [statusSaving, setStatusSaving] = useState(false)

  const filtered = useMemo(
    () =>
      transportistas.filter((transportista) => {
        const term = searchTerm.trim().toLowerCase()
        return (
          !term ||
          (transportista.terceroRazonSocial ?? "").toLowerCase().includes(term) ||
          (transportista.patente ?? "").toLowerCase().includes(term) ||
          (transportista.terceroCuit ?? "").toLowerCase().includes(term) ||
          (transportista.nroCuitTransportista ?? "").toLowerCase().includes(term) ||
          String(transportista.terceroId).includes(term)
        )
      }),
    [searchTerm, transportistas]
  )

  const visibleStats = useMemo(
    () => ({
      total: filtered.length,
      activos: filtered.filter((transportista) => transportista.activo).length,
      withPatent: filtered.filter((transportista) => transportista.patente).length,
      withOwnCuit: filtered.filter((transportista) => transportista.nroCuitTransportista).length,
      withDomicilio: filtered.filter((transportista) => transportista.domicilioPartida).length,
      withVehicleProfile: filtered.filter(
        (transportista) => transportista.patente || transportista.marcaVehiculo
      ).length,
    }),
    [filtered]
  )

  const resolvedSelectedId = useMemo(() => {
    if (!filtered.length) return null
    if (selectedId && filtered.some((transportista) => transportista.id === selectedId)) {
      return selectedId
    }

    return filtered[0].id
  }, [filtered, selectedId])

  const selected = useMemo(
    () => filtered.find((transportista) => transportista.id === resolvedSelectedId) ?? null,
    [filtered, resolvedSelectedId]
  )
  const selectedTraceability = selected ? getTraceabilityStatus(selected) : "-"

  const openCreate = () => {
    setEditing(null)
    setDraft(emptyDraft())
    setFormError(null)
    setFormOpen(true)
  }

  const openEdit = (transportista: Transportista) => {
    setEditing(transportista)
    setDraft(buildDraft(transportista))
    setFormError(null)
    setFormOpen(true)
  }

  const openDetail = async (id: number) => {
    setDetailOpen(true)
    setDetailLoading(true)
    const data = await getById(id)
    setDetail(data)
    setDetailLoading(false)
  }

  const handleSave = async () => {
    setFormError(null)

    if (!draft.terceroId) {
      setFormError("Informá el identificador del tercero maestro para asociar el transportista.")
      return
    }

    const nroCuitTransportista = digitsOnly(draft.nroCuitTransportista)
    if (!editing && nroCuitTransportista && nroCuitTransportista.length !== 11) {
      setFormError("El CUIT del transportista debe tener 11 dígitos si se informa.")
      return
    }

    const domicilioPartida = draft.domicilioPartida.trim() || undefined
    const patente = draft.patente.trim().toUpperCase() || undefined
    const marcaVehiculo = draft.marcaVehiculo.trim() || undefined

    setSaving(true)
    const ok = editing
      ? await actualizar(editing.id, {
          domicilioPartida,
          patente,
          marcaVehiculo,
        } satisfies UpdateTransportistaDto)
      : await crear({
          terceroId: draft.terceroId,
          nroCuitTransportista: nroCuitTransportista || undefined,
          domicilioPartida,
          patente,
          marcaVehiculo,
        } satisfies CreateTransportistaDto)
    setSaving(false)

    if (!ok) {
      setFormError(
        editing ? "No se pudo actualizar el transportista." : "No se pudo crear el transportista."
      )
      return
    }

    setFormOpen(false)
    setDraft(emptyDraft())
    setEditing(null)
  }

  const handleToggleEstado = async () => {
    if (!selected) return

    setFormError(null)
    setStatusSaving(true)
    const nextActivo = !selected.activo
    const ok = await cambiarEstado(selected.id, nextActivo)
    setStatusSaving(false)

    if (!ok) {
      setFormError(
        nextActivo
          ? "No se pudo reactivar el transportista seleccionado."
          : "No se pudo desactivar el transportista seleccionado."
      )
      return
    }

    toast({
      title: nextActivo ? "Transportista activado" : "Transportista desactivado",
      description: `${selected.terceroRazonSocial ?? `Legajo #${selected.id}`} actualizó su estado.`,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transportistas</h1>
          <p className="text-muted-foreground">
            Consola operativa para mantener legajos de transporte, revisar detalle de vehículo y
            actualizar datos maestros sin depender de grillas estáticas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={refetch} disabled={loading}>
            <RefreshCcw className="h-4 w-4" />
            Actualizar
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nuevo transportista
          </Button>
        </div>
      </div>

      <Alert>
        <Truck className="h-4 w-4" />
        <AlertDescription>
          El alta y la edición ya están soportadas por backend. Mientras no exista selector dedicado
          de terceros para esta vista, la asociación se carga por identificador maestro.
        </AlertDescription>
      </Alert>

      {(error || formError) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{formError || error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Transportistas visibles"
          value={String(visibleStats.total)}
          description={
            soloActivos
              ? "Coinciden con la búsqueda dentro de los legajos activos."
              : "Coinciden con la búsqueda dentro de la vista actual."
          }
        />
        <SummaryCard
          title="Activos"
          value={String(visibleStats.activos)}
          description="Legajos visibles disponibles para documentos de traslado y carta porte."
        />
        <SummaryCard
          title="Con patente"
          value={String(visibleStats.withPatent)}
          description="Registros visibles que ya informan dominio del vehículo."
        />
        <SummaryCard
          title="CUIT propio informado"
          value={String(visibleStats.withOwnCuit)}
          description="Transportistas visibles con CUIT operativo específico cargado."
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Con partida"
          value={String(visibleStats.withDomicilio)}
          description="Legajos visibles con domicilio de partida cargado para logística."
        />
        <SummaryCard
          title="Perfil vehicular"
          value={String(visibleStats.withVehicleProfile)}
          description="Transportistas visibles con patente o marca de unidad informada."
        />
        <SummaryCard
          title="Trazabilidad"
          value={selectedTraceability}
          description="Estado de referencia visible del legajo seleccionado."
        />
        <SummaryCard
          title="Unidad seleccionada"
          value={selected ? getVehicleStatus(selected) : "-"}
          description="Cobertura visible de identificacion del vehiculo activo."
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros operativos</CardTitle>
          <CardDescription>
            Buscá por razón social, patente, CUIT o ID de tercero y controlá si querés incluir
            registros inactivos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, CUIT, patente o tercero ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <Switch
              id="show-inactive"
              checked={!soloActivos}
              onCheckedChange={(checked) => setSoloActivos(!checked)}
            />
            <Label htmlFor="show-inactive">Mostrar legajos inactivos</Label>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Legajos de transporte</CardTitle>
            <CardDescription>
              {filtered.length} registros en la vista actual. Seleccioná uno para revisar su perfil.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Razón social</TableHead>
                  <TableHead>CUIT</TableHead>
                  <TableHead>Patente</TableHead>
                  <TableHead>Vehículo</TableHead>
                  <TableHead>Legajo</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      Cargando transportistas...
                    </TableCell>
                  </TableRow>
                )}
                {!loading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      No hay transportistas para los filtros actuales.
                    </TableCell>
                  </TableRow>
                )}
                {!loading &&
                  filtered.map((transportista) => (
                    <TableRow
                      key={transportista.id}
                      className={
                        transportista.id === resolvedSelectedId ? "bg-accent/40" : undefined
                      }
                      onClick={() => setSelectedId(transportista.id)}
                    >
                      <TableCell className="font-medium">
                        {transportista.terceroRazonSocial ?? `Tercero #${transportista.terceroId}`}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {transportista.terceroCuit ?? "-"}
                      </TableCell>
                      <TableCell className="font-mono">{transportista.patente ?? "-"}</TableCell>
                      <TableCell>{transportista.marcaVehiculo ?? "-"}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant="outline" className="text-xs">
                            {getTraceabilityStatus(transportista)}
                          </Badge>
                          <p className="text-xs text-muted-foreground">
                            {getVehicleStatus(transportista)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={transportista.activo ? "default" : "secondary"}>
                          {transportista.activo ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {selected?.terceroRazonSocial ??
                (selected ? `Tercero #${selected.terceroId}` : "Detalle del transportista")}
            </CardTitle>
            <CardDescription>
              {selected
                ? `Legajo #${selected.id} asociado al tercero maestro ${selected.terceroId}.`
                : "Seleccioná un transportista para revisar su detalle operativo."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selected ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">CUIT del tercero</p>
                    <p className="mt-2 font-mono text-lg font-semibold">
                      {selected.terceroCuit ?? "-"}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">CUIT operativo</p>
                    <p className="mt-2 font-mono text-lg font-semibold">
                      {selected.nroCuitTransportista ?? "-"}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Patente</p>
                    <p className="mt-2 font-mono text-lg font-semibold">
                      {selected.patente ?? "-"}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Marca vehículo</p>
                    <p className="mt-2 font-medium">{selected.marcaVehiculo ?? "No informada"}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Estado de unidad</p>
                    <p className="mt-2 font-medium">{getVehicleStatus(selected)}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Estado de legajo</p>
                    <p className="mt-2 font-medium">{getTraceabilityStatus(selected)}</p>
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Domicilio de partida</p>
                  <p className="mt-2 font-medium">{selected.domicilioPartida ?? "No informado"}</p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => openDetail(selected.id)}
                  >
                    <Eye className="h-4 w-4" />
                    Ver detalle
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => openEdit(selected)}>
                    <Pencil className="h-4 w-4" />
                    Editar
                  </Button>
                  <Button
                    variant={selected.activo ? "destructive" : "outline"}
                    className="flex-1"
                    onClick={() => void handleToggleEstado()}
                    disabled={statusSaving}
                  >
                    {selected.activo ? "Desactivar" : "Activar"}
                  </Button>
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No hay transportista seleccionado en la vista actual.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <WmsDialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Detalle del transportista</DialogTitle>
            <DialogDescription>
              Consulta puntual al backend para revisar el legajo completo.
            </DialogDescription>
          </DialogHeader>
          {detailLoading ? (
            <p className="text-sm text-muted-foreground">Cargando detalle...</p>
          ) : detail ? (
            <Tabs defaultValue="general">
              <WmsTabsList className="md:grid-cols-3">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="vehiculo">Vehiculo</TabsTrigger>
                <TabsTrigger value="circuito">Circuito</TabsTrigger>
              </WmsTabsList>

              <TabsContent value="general" className="mt-4">
                <WmsDetailFieldGrid
                  columns="2"
                  fields={[
                    {
                      label: "Tercero",
                      value: detail.terceroRazonSocial ?? `#${detail.terceroId}`,
                    },
                    { label: "Estado", value: detail.activo ? "Activo" : "Inactivo" },
                    { label: "CUIT tercero", value: detail.terceroCuit ?? "-" },
                    {
                      label: "CUIT transportista",
                      value: detail.nroCuitTransportista ?? "-",
                    },
                  ]}
                />
              </TabsContent>

              <TabsContent value="vehiculo" className="mt-4">
                <WmsDetailFieldGrid
                  columns="2"
                  fields={[
                    { label: "Patente", value: detail.patente ?? "-" },
                    { label: "Marca vehículo", value: detail.marcaVehiculo ?? "-" },
                    {
                      label: "Estado de unidad",
                      value: getVehicleStatus(detail),
                      className: "md:col-span-2",
                    },
                  ]}
                />
              </TabsContent>

              <TabsContent value="circuito" className="mt-4">
                <WmsDetailFieldGrid
                  columns="2"
                  fields={[
                    {
                      label: "Domicilio partida",
                      value: detail.domicilioPartida ?? "-",
                      className: "md:col-span-2",
                    },
                    { label: "Estado de legajo", value: getTraceabilityStatus(detail) },
                    { label: "Cobertura vehicular", value: getVehicleStatus(detail) },
                  ]}
                />
              </TabsContent>
            </Tabs>
          ) : (
            <p className="text-sm text-muted-foreground">
              No se pudo obtener el detalle solicitado.
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </WmsDialogContent>
      </Dialog>

      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) {
            setEditing(null)
            setDraft(emptyDraft())
            setFormError(null)
          }
        }}
      >
        <WmsDialogContent size="md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar transportista" : "Nuevo transportista"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "El backend hoy permite actualizar domicilio de partida, patente y marca. El tercero base y el CUIT operativo quedan en solo lectura."
                : "Cargá el legajo de transporte completo. La activación depende hoy del tercero base."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tercero-id">ID de tercero</Label>
              <Input
                id="tercero-id"
                type="number"
                min={1}
                value={draft.terceroId || ""}
                disabled={Boolean(editing)}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, terceroId: Number(e.target.value) || 0 }))
                }
                placeholder="Identificador del maestro de terceros"
              />
              <p className="text-xs text-muted-foreground">
                {editing
                  ? "Para cambiar el tercero asociado hoy hay que recrear el legajo del transportista."
                  : "Este identificador sigue siendo la referencia principal del legajo en el frontend actual."}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cuit-transporte">CUIT transportista</Label>
                <Input
                  id="cuit-transporte"
                  value={draft.nroCuitTransportista ?? ""}
                  disabled={Boolean(editing)}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, nroCuitTransportista: e.target.value }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {editing
                    ? "El CUIT específico hoy se conserva desde el alta original; si cambia, conviene recrear el legajo."
                    : "Informalo cuando el circuito logistico requiera CUIT operativo distinto al del tercero."}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="patente">Patente</Label>
                <Input
                  id="patente"
                  value={draft.patente ?? ""}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, patente: e.target.value.toUpperCase() }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  La patente ayuda a recuperar la identificacion visible del vehiculo en documentos
                  y detalle.
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="marca">Marca vehículo</Label>
                <Input
                  id="marca"
                  value={draft.marcaVehiculo ?? ""}
                  onChange={(e) => setDraft((prev) => ({ ...prev, marcaVehiculo: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="domicilio-partida">Domicilio partida</Label>
                <Input
                  id="domicilio-partida"
                  value={draft.domicilioPartida ?? ""}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, domicilioPartida: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear transportista"}
            </Button>
          </DialogFooter>
        </WmsDialogContent>
      </Dialog>
    </div>
  )
}
