"use client"

import { useEffect, useMemo, useState } from "react"
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
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useTransportistas } from "@/lib/hooks/useTransportistas"
import type { CreateTransportistaDto, Transportista } from "@/lib/types/transportistas"
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

  const activos = transportistas.filter((transportista) => transportista.activo).length
  const withPatent = transportistas.filter((transportista) => transportista.patente).length
  const withOwnCuit = transportistas.filter(
    (transportista) => transportista.nroCuitTransportista
  ).length
  const withDomicilio = transportistas.filter(
    (transportista) => transportista.domicilioPartida
  ).length
  const withVehicleProfile = transportistas.filter(
    (transportista) => transportista.patente || transportista.marcaVehiculo
  ).length
  const selectedTraceability = selected ? getTraceabilityStatus(selected) : "-"

  useEffect(() => {
    if (!filtered.length) {
      setSelectedId(null)
      return
    }

    if (!selectedId || !filtered.some((transportista) => transportista.id === selectedId)) {
      setSelectedId(filtered[0].id)
    }
  }, [filtered, selectedId])

  const selected = useMemo(
    () => filtered.find((transportista) => transportista.id === selectedId) ?? null,
    [filtered, selectedId]
  )

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

    const payload: CreateTransportistaDto = {
      terceroId: draft.terceroId,
      nroCuitTransportista: draft.nroCuitTransportista || undefined,
      domicilioPartida: draft.domicilioPartida || undefined,
      patente: draft.patente || undefined,
      marcaVehiculo: draft.marcaVehiculo || undefined,
    }

    setSaving(true)
    const ok = editing ? await actualizar(editing.id, payload) : await crear(payload)
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
          title="Total transportistas"
          value={String(transportistas.length)}
          description={soloActivos ? "Vista limitada a activos." : "Incluye activos e inactivos."}
        />
        <SummaryCard
          title="Activos"
          value={String(activos)}
          description="Legajos disponibles para documentos de traslado y carta porte."
        />
        <SummaryCard
          title="Con patente"
          value={String(withPatent)}
          description="Registros que ya informan dominio del vehículo."
        />
        <SummaryCard
          title="CUIT propio informado"
          value={String(withOwnCuit)}
          description="Transportistas con CUIT operativo específico cargado."
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Con partida"
          value={String(withDomicilio)}
          description="Legajos con domicilio de partida visible para logística."
        />
        <SummaryCard
          title="Perfil vehicular"
          value={String(withVehicleProfile)}
          description="Transportistas con patente o marca de unidad informada."
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
                      className={transportista.id === selectedId ? "bg-accent/40" : undefined}
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
        <DialogContent>
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
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="vehiculo">Vehiculo</TabsTrigger>
                <TabsTrigger value="circuito">Circuito</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-muted/40 p-3">
                  <span className="mb-1 block text-xs text-muted-foreground">Tercero</span>
                  <p className="text-sm font-medium">
                    {detail.terceroRazonSocial ?? `#${detail.terceroId}`}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <span className="mb-1 block text-xs text-muted-foreground">Estado</span>
                  <p className="text-sm font-medium">{detail.activo ? "Activo" : "Inactivo"}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <span className="mb-1 block text-xs text-muted-foreground">CUIT tercero</span>
                  <p className="text-sm font-medium">{detail.terceroCuit ?? "-"}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <span className="mb-1 block text-xs text-muted-foreground">
                    CUIT transportista
                  </span>
                  <p className="text-sm font-medium">{detail.nroCuitTransportista ?? "-"}</p>
                </div>
              </TabsContent>

              <TabsContent value="vehiculo" className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-muted/40 p-3">
                  <span className="mb-1 block text-xs text-muted-foreground">Patente</span>
                  <p className="text-sm font-medium">{detail.patente ?? "-"}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <span className="mb-1 block text-xs text-muted-foreground">Marca vehículo</span>
                  <p className="text-sm font-medium">{detail.marcaVehiculo ?? "-"}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3 sm:col-span-2">
                  <span className="mb-1 block text-xs text-muted-foreground">Estado de unidad</span>
                  <p className="text-sm font-medium">{getVehicleStatus(detail)}</p>
                </div>
              </TabsContent>

              <TabsContent value="circuito" className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-muted/40 p-3 sm:col-span-2">
                  <span className="mb-1 block text-xs text-muted-foreground">
                    Domicilio partida
                  </span>
                  <p className="text-sm font-medium">{detail.domicilioPartida ?? "-"}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <span className="mb-1 block text-xs text-muted-foreground">Estado de legajo</span>
                  <p className="text-sm font-medium">{getTraceabilityStatus(detail)}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <span className="mb-1 block text-xs text-muted-foreground">
                    Cobertura vehicular
                  </span>
                  <p className="text-sm font-medium">{getVehicleStatus(detail)}</p>
                </div>
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
        </DialogContent>
      </Dialog>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar transportista" : "Nuevo transportista"}</DialogTitle>
            <DialogDescription>
              Cargá o actualizá el legajo de transporte. La activación depende hoy del tercero base.
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
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, terceroId: Number(e.target.value) || 0 }))
                }
                placeholder="Identificador del maestro de terceros"
              />
              <p className="text-xs text-muted-foreground">
                Este identificador sigue siendo la referencia principal del legajo en el frontend
                actual.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cuit-transporte">CUIT transportista</Label>
                <Input
                  id="cuit-transporte"
                  value={draft.nroCuitTransportista ?? ""}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, nroCuitTransportista: e.target.value }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Informalo cuando el circuito logistico requiera CUIT operativo distinto al del
                  tercero.
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
        </DialogContent>
      </Dialog>
    </div>
  )
}
