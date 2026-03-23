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
import { useCartaPorte } from "@/lib/hooks/useCartaPorte"
import { useTransportistas } from "@/lib/hooks/useTransportistas"
import type { CartaPorte } from "@/lib/types/carta-porte"
import {
  AlertCircle,
  Eye,
  FileText,
  Plus,
  RefreshCcw,
  Search,
  ShieldCheck,
  Ticket,
} from "lucide-react"

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

function getEstadoVariant(estado?: string) {
  switch ((estado ?? "").toUpperCase()) {
    case "ACTIVA":
      return "default" as const
    case "ANULADA":
      return "destructive" as const
    case "BORRADOR":
      return "secondary" as const
    default:
      return "outline" as const
  }
}

function getDocumentStatus(carta: CartaPorte) {
  if (carta.estado === "ANULADA") return "Fuera de circuito"
  if (carta.ctg && carta.coe) return "Trazabilidad completa"
  if (carta.ctg) return "CTG asignado"
  if (carta.estado === "BORRADOR") return "Pendiente de emision"
  return "Pendiente de trazabilidad"
}

function getRouteStatus(carta: CartaPorte) {
  if (carta.desde && carta.hasta) return "Origen y destino visibles"
  if (carta.desde || carta.hasta) return "Ruta parcial"
  return "Ruta no informada"
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

export default function CartaPortePage() {
  const [estado, setEstado] = useState("")
  const [desde, setDesde] = useState("")
  const [hasta, setHasta] = useState("")
  const {
    cartas,
    loading,
    error,
    page,
    setPage,
    totalPages,
    totalCount,
    getById,
    crear,
    asignarCtg,
    refetch,
  } = useCartaPorte({
    estado: estado || undefined,
    desde: desde || undefined,
    hasta: hasta || undefined,
  })
  const { transportistas } = useTransportistas(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<CartaPorte | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [draftComprobanteId, setDraftComprobanteId] = useState("")
  const [draftTransportistaId, setDraftTransportistaId] = useState("none")
  const [draftObservacion, setDraftObservacion] = useState("")
  const [ctgDraft, setCtgDraft] = useState({ ctg: "", coe: "" })

  const filtered = useMemo(
    () =>
      cartas.filter((carta) => {
        const term = searchTerm.trim().toLowerCase()
        return (
          !term ||
          String(carta.id).includes(term) ||
          (carta.ctg ?? "").toLowerCase().includes(term) ||
          (carta.coe ?? "").toLowerCase().includes(term) ||
          (carta.estado ?? "").toLowerCase().includes(term) ||
          String(carta.transportistaId ?? "").includes(term)
        )
      }),
    [cartas, searchTerm]
  )

  const withCtg = cartas.filter((carta) => carta.ctg).length
  const withCoe = cartas.filter((carta) => carta.coe).length
  const withTransportista = cartas.filter((carta) => carta.transportistaId).length
  const withRoute = cartas.filter((carta) => carta.desde || carta.hasta).length
  const fullyTraceable = cartas.filter(
    (carta) => carta.ctg && carta.coe && carta.transportistaId
  ).length

  const selected = useMemo(
    () => filtered.find((carta) => carta.id === selectedId) ?? null,
    [filtered, selectedId]
  )

  const selectedTransportistaName = (transportistaId?: number) =>
    transportistas.find((transportista) => transportista.id === transportistaId)
      ?.terceroRazonSocial ??
    (transportistaId ? `Transportista #${transportistaId}` : "Sin asignar")

  const handleOpenDetail = async (id: number) => {
    setDetailOpen(true)
    setDetailLoading(true)
    const data = await getById(id)
    setDetail(data)
    setDetailLoading(false)
  }

  const handleCreate = async () => {
    setActionError(null)
    setSaving(true)
    const ok = await crear({
      comprobanteId: draftComprobanteId ? Number(draftComprobanteId) : undefined,
      transportistaId: draftTransportistaId === "none" ? undefined : Number(draftTransportistaId),
      observacion: draftObservacion || undefined,
    })
    setSaving(false)

    if (!ok) {
      setActionError("No se pudo registrar la carta de porte.")
      return
    }

    setCreateOpen(false)
    setDraftComprobanteId("")
    setDraftTransportistaId("none")
    setDraftObservacion("")
  }

  const handleAssignCtg = async () => {
    setActionError(null)

    if (!selected?.id || !ctgDraft.ctg.trim()) {
      setActionError("Seleccioná una carta e informá un CTG válido.")
      return
    }

    setSaving(true)
    const ok = await asignarCtg(selected.id, ctgDraft.ctg.trim(), ctgDraft.coe.trim() || undefined)
    setSaving(false)

    if (!ok) {
      setActionError("No se pudo asignar el CTG a la carta seleccionada.")
      return
    }

    setAssignOpen(false)
    setCtgDraft({ ctg: "", coe: "" })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Carta de porte</h1>
          <p className="text-muted-foreground">
            Consola documental para generar cartas, consultar detalle operativo y asignar CTG o COE
            cuando el backend ya lo permite.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={refetch} disabled={loading}>
            <RefreshCcw className="h-4 w-4" />
            Actualizar
          </Button>
          <Button variant="outline" onClick={() => setAssignOpen(true)} disabled={!selected}>
            <Ticket className="h-4 w-4" />
            Asignar CTG
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Nueva carta
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
          title="Documentos visibles"
          value={String(totalCount)}
          description={`Página ${page} de ${Math.max(totalPages, 1)} con filtros aplicados.`}
        />
        <SummaryCard
          title="Con CTG"
          value={String(withCtg)}
          description="Cartas que ya tienen código de trazabilidad asignado."
        />
        <SummaryCard
          title="Con COE"
          value={String(withCoe)}
          description="Documentos que además cuentan con constancia complementaria."
        />
        <SummaryCard
          title="Con transportista"
          value={String(withTransportista)}
          description="Registros asociados a un legajo operativo de transporte."
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Con ruta"
          value={String(withRoute)}
          description="Cartas que ya muestran origen o destino visible."
        />
        <SummaryCard
          title="Trazabilidad completa"
          value={String(fullyTraceable)}
          description="Documentos con CTG, COE y transportista asignado."
        />
        <SummaryCard
          title="Estado seleccionado"
          value={selected ? getDocumentStatus(selected) : "-"}
          description="Lectura documental de la carta actualmente activa."
        />
        <SummaryCard
          title="Ruta seleccionada"
          value={selected ? getRouteStatus(selected) : "-"}
          description="Cobertura visible de origen y destino para la carta seleccionada."
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros documentales</CardTitle>
          <CardDescription>
            El estado y el rango de fechas consultan backend; la búsqueda textual refina la página
            descargada.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_180px_180px_200px]">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por ID, CTG, COE, estado o transportista..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
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
                <SelectItem value="ACTIVA">Activa</SelectItem>
                <SelectItem value="BORRADOR">Borrador</SelectItem>
                <SelectItem value="ANULADA">Anulada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cartas de porte</CardTitle>
            <CardDescription>
              {filtered.length} documentos en la página actual. Seleccioná una fila para revisar o
              completar trazabilidad.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>CTG</TableHead>
                  <TableHead>COE</TableHead>
                  <TableHead>Transportista</TableHead>
                  <TableHead>Emisión</TableHead>
                  <TableHead>Circuito</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      Cargando cartas de porte...
                    </TableCell>
                  </TableRow>
                )}
                {!loading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No hay cartas de porte para los filtros actuales.
                    </TableCell>
                  </TableRow>
                )}
                {!loading &&
                  filtered.map((carta) => (
                    <TableRow
                      key={carta.id}
                      className={carta.id === selectedId ? "bg-accent/40" : undefined}
                      onClick={() => setSelectedId(carta.id)}
                    >
                      <TableCell className="font-mono text-sm">#{carta.id}</TableCell>
                      <TableCell>
                        <Badge variant={getEstadoVariant(carta.estado)}>
                          {carta.estado ?? "-"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{carta.ctg ?? "-"}</TableCell>
                      <TableCell className="font-mono text-xs">{carta.coe ?? "-"}</TableCell>
                      <TableCell>{selectedTransportistaName(carta.transportistaId)}</TableCell>
                      <TableCell>{formatDate(carta.fechaEmision)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant="outline" className="text-xs">
                            {getDocumentStatus(carta)}
                          </Badge>
                          <p className="text-xs text-muted-foreground">{getRouteStatus(carta)}</p>
                        </div>
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
              {selected ? `Carta #${selected.id}` : "Detalle documental"}
            </CardTitle>
            <CardDescription>
              {selected
                ? `${selected.estado ?? "Sin estado"} · ${selectedTransportistaName(selected.transportistaId)}`
                : "Seleccioná una carta para revisar transporte, origen y trazabilidad."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selected ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">CTG</p>
                    <p className="mt-2 font-mono text-lg font-semibold">
                      {selected.ctg ?? "Pendiente"}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">COE</p>
                    <p className="mt-2 font-mono text-lg font-semibold">
                      {selected.coe ?? "Pendiente"}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Origen</p>
                    <p className="mt-2 font-medium">{selected.desde ?? "No informado"}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Destino</p>
                    <p className="mt-2 font-medium">{selected.hasta ?? "No informado"}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Estado documental</p>
                    <p className="mt-2 font-medium">{getDocumentStatus(selected)}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Ruta visible</p>
                    <p className="mt-2 font-medium">{getRouteStatus(selected)}</p>
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Observación</p>
                  <p className="mt-2 font-medium">
                    {selected.observacion ?? "Sin observaciones registradas."}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleOpenDetail(selected.id)}
                  >
                    <Eye className="h-4 w-4" />
                    Ver detalle
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => setAssignOpen(true)}>
                    <ShieldCheck className="h-4 w-4" />
                    Completar CTG
                  </Button>
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No hay carta de porte seleccionada.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalle de carta de porte</DialogTitle>
            <DialogDescription>
              Consulta puntual del documento recuperado desde backend.
            </DialogDescription>
          </DialogHeader>
          {detailLoading ? (
            <p className="text-sm text-muted-foreground">Cargando detalle...</p>
          ) : detail ? (
            <Tabs defaultValue="general">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="ruta">Ruta</TabsTrigger>
                <TabsTrigger value="circuito">Circuito</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-muted/40 p-3">
                  <span className="mb-1 block text-xs text-muted-foreground">Estado</span>
                  <p className="text-sm font-medium">{detail.estado}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <span className="mb-1 block text-xs text-muted-foreground">Transportista</span>
                  <p className="text-sm font-medium">
                    {selectedTransportistaName(detail.transportistaId)}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <span className="mb-1 block text-xs text-muted-foreground">Comprobante</span>
                  <p className="text-sm font-medium">{detail.comprobanteId ?? "No asociado"}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <span className="mb-1 block text-xs text-muted-foreground">Fecha emisión</span>
                  <p className="text-sm font-medium">{formatDateTime(detail.fechaEmision)}</p>
                </div>
              </TabsContent>

              <TabsContent value="ruta" className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-muted/40 p-3">
                  <span className="mb-1 block text-xs text-muted-foreground">Origen</span>
                  <p className="text-sm font-medium">{detail.desde ?? "No informado"}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <span className="mb-1 block text-xs text-muted-foreground">Destino</span>
                  <p className="text-sm font-medium">{detail.hasta ?? "No informado"}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3 sm:col-span-2">
                  <span className="mb-1 block text-xs text-muted-foreground">Estado de ruta</span>
                  <p className="text-sm font-medium">{getRouteStatus(detail)}</p>
                </div>
              </TabsContent>

              <TabsContent value="circuito" className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-muted/40 p-3">
                  <span className="mb-1 block text-xs text-muted-foreground">
                    Estado documental
                  </span>
                  <p className="text-sm font-medium">{getDocumentStatus(detail)}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <span className="mb-1 block text-xs text-muted-foreground">CTG</span>
                  <p className="text-sm font-medium">{detail.ctg ?? "Pendiente"}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <span className="mb-1 block text-xs text-muted-foreground">COE</span>
                  <p className="text-sm font-medium">{detail.coe ?? "Pendiente"}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3 sm:col-span-2">
                  <span className="mb-1 block text-xs text-muted-foreground">Observación</span>
                  <p className="text-sm font-medium">{detail.observacion ?? "Sin observación"}</p>
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
            <DialogTitle>Nueva carta de porte</DialogTitle>
            <DialogDescription>
              Registrá el documento base. El CTG puede asignarse luego cuando la operación lo
              requiera.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="comprobante-id">ID de comprobante</Label>
              <Input
                id="comprobante-id"
                type="number"
                min={1}
                value={draftComprobanteId}
                onChange={(e) => setDraftComprobanteId(e.target.value)}
                placeholder="Opcional, para vincular el documento origen"
              />
              <p className="text-xs text-muted-foreground">
                Si se informa, la carta queda vinculada al comprobante visible del circuito origen.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="transportista-id">Transportista</Label>
              <Select value={draftTransportistaId} onValueChange={setDraftTransportistaId}>
                <SelectTrigger id="transportista-id" className="w-full">
                  <SelectValue placeholder="Sin asignar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {transportistas.map((transportista) => (
                    <SelectItem key={transportista.id} value={String(transportista.id)}>
                      {transportista.terceroRazonSocial ?? `Transportista #${transportista.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                La asignacion mejora la trazabilidad documental sin cambiar el flujo del backend.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="observacion">Observación</Label>
              <Input
                id="observacion"
                value={draftObservacion}
                onChange={(e) => setDraftObservacion(e.target.value)}
                placeholder="Observación operativa"
              />
              <p className="text-xs text-muted-foreground">
                Conviene registrar referencia de viaje, cereal, cupo o contexto operativo relevante.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "Guardando..." : "Crear carta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar CTG y COE</DialogTitle>
            <DialogDescription>
              Completá la trazabilidad fiscal para la carta seleccionada usando el endpoint
              operativo disponible.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ctg">CTG</Label>
              <Input
                id="ctg"
                value={ctgDraft.ctg}
                onChange={(e) => setCtgDraft((prev) => ({ ...prev, ctg: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                El CTG es la referencia principal de trazabilidad visible en la grilla y el detalle.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="coe">COE</Label>
              <Input
                id="coe"
                value={ctgDraft.coe}
                onChange={(e) => setCtgDraft((prev) => ({ ...prev, coe: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Completalo cuando la operacion requiera respaldo complementario al CTG.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAssignCtg} disabled={saving || !selected}>
              {saving ? "Guardando..." : "Asignar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
