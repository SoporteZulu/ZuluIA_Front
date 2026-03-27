"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Eye, RefreshCw, Search, ShieldAlert, Unplug, Wallet } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  legacyAccountingUnallocations,
  type LegacyAccountingUnallocation,
} from "@/lib/contabilidad-legacy-data"
import { useLegacyLocalCollection } from "@/lib/hooks/useLegacyLocalCollection"
import { useAsientos } from "@/lib/hooks/useAsientos"
import { usePagos } from "@/lib/hooks/usePagos"
import { useDefaultSucursalId } from "@/lib/hooks/useSucursales"

type UnallocationStage = "pedida" | "liberada" | "reimputando" | "cerrada"
type LocalUnallocationTracker = {
  unallocationId: string
  stage: UnallocationStage
  owner: string
  nextStep: string
  updatedAt: string
}

const UNALLOCATION_TRACKER_STORAGE_KEY = "zuluia_contabilidad_desimputaciones_trackers"
const STATUS_CONFIG: Record<
  LegacyAccountingUnallocation["estado"],
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  PENDIENTE: { label: "Pendiente", variant: "outline" },
  EJECUTADA: { label: "Ejecutada", variant: "default" },
  OBSERVADA: { label: "Observada", variant: "destructive" },
}
const STAGE_CONFIG: Record<
  UnallocationStage,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  pedida: { label: "Pedida", variant: "outline" },
  liberada: { label: "Liberada", variant: "secondary" },
  reimputando: { label: "Reimputando", variant: "destructive" },
  cerrada: { label: "Cerrada", variant: "default" },
}
const DEFAULT_TRACKERS: LocalUnallocationTracker[] = legacyAccountingUnallocations.map((item) => ({
  unallocationId: item.id,
  stage:
    item.estado === "EJECUTADA"
      ? "cerrada"
      : item.estado === "OBSERVADA"
        ? "reimputando"
        : "pedida",
  owner: item.responsable,
  nextStep:
    item.estado === "EJECUTADA"
      ? "Mantener trazabilidad de la reimputacion ya cerrada."
      : item.estado === "OBSERVADA"
        ? "Definir si el saldo se reimputa o se castiga."
        : "Liberar el comprobante y coordinar reaplicacion.",
  updatedAt: item.fecha,
}))

function formatMoney(value: number) {
  return value.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  })
}
function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString("es-AR") : "-"
}
function matchesTerm(
  item: LegacyAccountingUnallocation,
  tracker: LocalUnallocationTracker,
  term: string
) {
  if (term === "") return true
  return [
    item.id,
    item.modulo,
    item.comprobante,
    item.cuenta,
    item.tercero,
    item.motivo,
    item.referenciaAsiento,
    item.observacion,
    item.saldoRelacion,
    tracker.owner,
    tracker.nextStep,
    ...item.items.map((line) => `${line.concepto} ${line.cuenta}`),
  ]
    .join(" ")
    .toLowerCase()
    .includes(term)
}
function getUnallocationHealth(
  item: LegacyAccountingUnallocation,
  tracker: LocalUnallocationTracker
) {
  if (tracker.stage === "cerrada") return "Desimputacion y reaplicacion ya conciliadas"
  if (tracker.stage === "reimputando") return "El comprobante fue liberado y sigue en redefinicion"
  if (tracker.stage === "liberada") return "El comprobante quedo libre y espera nueva aplicacion"
  return "La liberacion todavia esta pendiente"
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

export default function ContabilidadDesimputacionesPage() {
  const sucursalId = useDefaultSucursalId()
  const { pagos } = usePagos({ sucursalId })
  const { asientos } = useAsientos()
  const {
    rows: trackers,
    setRows: setTrackers,
    reset: resetTrackers,
  } = useLegacyLocalCollection<LocalUnallocationTracker>(
    UNALLOCATION_TRACKER_STORAGE_KEY,
    DEFAULT_TRACKERS
  )
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<
    "todos" | LegacyAccountingUnallocation["estado"]
  >("todos")
  const [stageFilter, setStageFilter] = useState<"todos" | UnallocationStage>("todos")
  const [selectedId, setSelectedId] = useState<string | null>(
    legacyAccountingUnallocations[0]?.id ?? null
  )
  const trackerMap = useMemo(
    () => new Map(trackers.map((tracker) => [tracker.unallocationId, tracker])),
    [trackers]
  )
  const items = useMemo(
    () =>
      legacyAccountingUnallocations.map((item) => ({
        ...item,
        tracker:
          trackerMap.get(item.id) ??
          DEFAULT_TRACKERS.find((tracker) => tracker.unallocationId === item.id)!,
      })),
    [trackerMap]
  )
  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim()
    return items.filter(
      (item) =>
        matchesTerm(item, item.tracker, term) &&
        (statusFilter === "todos" || item.estado === statusFilter) &&
        (stageFilter === "todos" || item.tracker.stage === stageFilter)
    )
  }, [items, search, statusFilter, stageFilter])
  const selected = items.find((item) => item.id === selectedId) ?? filtered[0] ?? null
  const highlighted = filtered.find((item) => item.estado !== "EJECUTADA") ?? filtered[0] ?? null
  const kpis = useMemo(
    () => ({
      pending: items.filter((item) => item.estado === "PENDIENTE").length,
      observed: items.filter((item) => item.estado === "OBSERVADA").length,
      executed: items.filter((item) => item.estado === "EJECUTADA").length,
      total: items.reduce((acc, item) => acc + item.importe, 0),
    }),
    [items]
  )
  const updateTracker = (unallocationId: string, patch: Partial<LocalUnallocationTracker>) =>
    setTrackers((current) => {
      const index = current.findIndex((row) => row.unallocationId === unallocationId)
      const base =
        index >= 0
          ? current[index]
          : DEFAULT_TRACKERS.find((row) => row.unallocationId === unallocationId)!
      const nextRow = { ...base, ...patch, updatedAt: new Date().toISOString() }
      return index >= 0
        ? current.map((row, rowIndex) => (rowIndex === index ? nextRow : row))
        : [...current, nextRow]
    })

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Desimputaciones</h1>
          <p className="mt-1 text-muted-foreground">
            Consola de liberacion de comprobantes y reaplicacion pendiente, con trazabilidad
            documental y seguimiento local del legacy.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="bg-transparent" onClick={() => resetTrackers()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Restablecer seguimiento
          </Button>
          <Button asChild variant="outline" className="bg-transparent">
            <Link href="/contabilidad/asientos">Asientos</Link>
          </Button>
          <Button asChild>
            <Link href="/contabilidad/pagos">Pagos</Link>
          </Button>
        </div>
      </div>
      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertDescription>
          El backend actual no permite desimputar y reaplicar documentos desde cuenta corriente o
          tesoreria. Esta pantalla cubre la liberacion, el motivo y el seguimiento local de ese
          circuito.
        </AlertDescription>
      </Alert>
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Pendientes</p>
            <p className="mt-2 text-2xl font-bold text-amber-600">{kpis.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Observadas</p>
            <p className="mt-2 text-2xl font-bold text-destructive">{kpis.observed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Ejecutadas</p>
            <p className="mt-2 text-2xl font-bold text-emerald-600">{kpis.executed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Importe visible</p>
            <p className="mt-2 text-2xl font-bold">{formatMoney(kpis.total)}</p>
          </CardContent>
        </Card>
      </div>
      {highlighted ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardDescription>Desimputacion priorizada</CardDescription>
            <CardTitle className="mt-1 text-xl">{highlighted.id.toUpperCase()}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-4">
            <div className="rounded-lg bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Modulo</p>
              <p className="text-sm font-medium">{highlighted.modulo}</p>
            </div>
            <div className="rounded-lg bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Comprobante</p>
              <p className="text-sm font-medium">{highlighted.comprobante}</p>
            </div>
            <div className="rounded-lg bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Cuenta</p>
              <p className="text-sm font-medium">{highlighted.cuenta}</p>
            </div>
            <div className="rounded-lg bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Importe</p>
              <p className="text-sm font-medium">{formatMoney(highlighted.importe)}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 lg:grid-cols-[1.8fr_1fr_1fr]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-10"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por modulo, comprobante, tercero o motivo..."
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as "todos" | LegacyAccountingUnallocation["estado"])
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Estado legacy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todo el estado legacy</SelectItem>
                <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                <SelectItem value="EJECUTADA">Ejecutada</SelectItem>
                <SelectItem value="OBSERVADA">Observada</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={stageFilter}
              onValueChange={(value) => setStageFilter(value as "todos" | UnallocationStage)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seguimiento local" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todo el seguimiento</SelectItem>
                <SelectItem value="pedida">Pedida</SelectItem>
                <SelectItem value="liberada">Liberada</SelectItem>
                <SelectItem value="reimputando">Reimputando</SelectItem>
                <SelectItem value="cerrada">Cerrada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Unplug className="h-4 w-4" /> Desimputaciones visibles
            </CardTitle>
            <CardDescription>
              Comprobantes liberados o pendientes de reaplicacion sobre ventas, compras y tesoreria.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Modulo</TableHead>
                  <TableHead>Comprobante</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Tercero</TableHead>
                  <TableHead className="text-right">Importe</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.id.toUpperCase()}</TableCell>
                    <TableCell>{item.modulo}</TableCell>
                    <TableCell>{item.comprobante}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={STATUS_CONFIG[item.estado].variant}>
                          {STATUS_CONFIG[item.estado].label}
                        </Badge>
                        <Badge variant={STAGE_CONFIG[item.tracker.stage].variant}>
                          {STAGE_CONFIG[item.tracker.stage].label}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>{item.tercero}</TableCell>
                    <TableCell className="text-right">{formatMoney(item.importe)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => setSelectedId(item.id)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No hay desimputaciones que coincidan con los filtros actuales.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contexto real del backend</CardTitle>
            <CardDescription>
              Referencias disponibles para ubicar la liberacion documental dentro del modulo actual.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Wallet className="h-4 w-4" /> Pagos visibles
              </div>
              <p className="mt-2 text-2xl font-bold">{pagos.length}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Wallet className="h-4 w-4" /> Asientos visibles
              </div>
              <p className="mt-2 text-2xl font-bold">{asientos.length}</p>
            </div>
            {selected ? (
              <div className="rounded-lg bg-muted/40 p-3 text-sm">
                <p className="text-xs text-muted-foreground">Gap activo</p>
                <p className="mt-1 font-medium">{selected.backendGap}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>
              {selected ? `Desimputacion ${selected.id.toUpperCase()}` : "Desimputacion"}
            </DialogTitle>
            <DialogDescription>
              {selected
                ? `${selected.modulo} · ${selected.comprobante} · ${selected.tercero}`
                : "Detalle de desimputacion"}
            </DialogDescription>
          </DialogHeader>
          {selected ? (
            <Tabs defaultValue="circuito">
              <TabsList className="grid h-auto w-full grid-cols-4">
                <TabsTrigger value="circuito">Circuito</TabsTrigger>
                <TabsTrigger value="impacto">Impacto</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="seguimiento">Seguimiento</TabsTrigger>
              </TabsList>
              <TabsContent value="circuito" className="pt-2">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Cabecera operativa</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <DetailFieldGrid
                        fields={[
                          { label: "Modulo", value: selected.modulo },
                          { label: "Comprobante", value: selected.comprobante },
                          { label: "Cuenta", value: selected.cuenta },
                          { label: "Tercero", value: selected.tercero },
                          { label: "Fecha", value: formatDate(selected.fecha) },
                          { label: "Asiento", value: selected.referenciaAsiento },
                          { label: "Estado", value: STATUS_CONFIG[selected.estado].label },
                          { label: "Saldo relacion", value: selected.saldoRelacion },
                          {
                            label: "Responsable",
                            value: selected.tracker.owner || selected.responsable,
                          },
                          {
                            label: "Salud del circuito",
                            value: getUnallocationHealth(selected, selected.tracker),
                          },
                        ]}
                      />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Observaciones</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">Motivo</p>
                        <p className="mt-1 font-medium">{selected.motivo}</p>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">Observacion</p>
                        <p className="mt-1 text-muted-foreground">{selected.observacion}</p>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">Backend faltante</p>
                        <p className="mt-1 text-muted-foreground">{selected.backendGap}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              <TabsContent value="impacto" className="pt-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Impacto visible</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Concepto</TableHead>
                          <TableHead>Cuenta</TableHead>
                          <TableHead className="text-right">Importe</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selected.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.concepto}</TableCell>
                            <TableCell>{item.cuenta}</TableCell>
                            <TableCell className="text-right">
                              {formatMoney(item.importe)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="timeline" className="pt-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Secuencia operativa</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selected.timeline.map((event) => (
                      <div key={event.id} className="rounded-lg border bg-muted/20 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium">{event.title}</p>
                          <span className="text-xs text-muted-foreground">{event.at}</span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{event.detail}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="seguimiento" className="space-y-4 pt-2">
                <Alert>
                  <ShieldAlert className="h-4 w-4" />
                  <AlertDescription>
                    El seguimiento local cubre liberacion y reaplicacion del comprobante mientras no
                    exista endpoint dedicado en backend.
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
                          value={selected.tracker.stage}
                          onValueChange={(value) =>
                            updateTracker(selected.id, { stage: value as UnallocationStage })
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Seleccionar estado" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pedida">Pedida</SelectItem>
                            <SelectItem value="liberada">Liberada</SelectItem>
                            <SelectItem value="reimputando">Reimputando</SelectItem>
                            <SelectItem value="cerrada">Cerrada</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Responsable</label>
                        <Input
                          value={selected.tracker.owner}
                          onChange={(event) =>
                            updateTracker(selected.id, { owner: event.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Proximo paso</label>
                        <Textarea
                          rows={5}
                          value={selected.tracker.nextStep}
                          onChange={(event) =>
                            updateTracker(selected.id, { nextStep: event.target.value })
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
                          {getUnallocationHealth(selected, selected.tracker)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">Ultima actualizacion local</p>
                        <p className="mt-1 font-medium">{formatDate(selected.tracker.updatedAt)}</p>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">Paso sugerido</p>
                        <p className="mt-1 font-medium">{selected.tracker.nextStep}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
