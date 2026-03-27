"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { BadgeAlert, Eye, RefreshCw, Search, ShieldAlert } from "lucide-react"

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
import { legacyAccountingCaeItems, type LegacyAccountingCae } from "@/lib/contabilidad-legacy-data"
import { useLegacyLocalCollection } from "@/lib/hooks/useLegacyLocalCollection"
import { useCotizaciones } from "@/lib/hooks/useCotizaciones"
import { useDefaultSucursalId } from "@/lib/hooks/useSucursales"
import { usePeriodosIva } from "@/lib/hooks/usePeriodosIva"

type CaeStage = "controlado" | "renovar" | "observado" | "cerrado"
type LocalCaeTracker = {
  caeId: string
  stage: CaeStage
  owner: string
  nextStep: string
  updatedAt: string
}

const CAE_TRACKER_STORAGE_KEY = "zuluia_contabilidad_cae_trackers"

const STATUS_CONFIG: Record<
  LegacyAccountingCae["estado"],
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  VIGENTE: { label: "Vigente", variant: "default" },
  A_VENCER: { label: "A vencer", variant: "secondary" },
  OBSERVADO: { label: "Observado", variant: "destructive" },
}

const STAGE_CONFIG: Record<
  CaeStage,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  controlado: { label: "Controlado", variant: "default" },
  renovar: { label: "Renovar", variant: "secondary" },
  observado: { label: "Observado", variant: "destructive" },
  cerrado: { label: "Cerrado", variant: "outline" },
}

const DEFAULT_TRACKERS: LocalCaeTracker[] = legacyAccountingCaeItems.map((item) => ({
  caeId: item.id,
  stage:
    item.estado === "OBSERVADO"
      ? "observado"
      : item.estado === "A_VENCER"
        ? "renovar"
        : "controlado",
  owner: item.responsable,
  nextStep:
    item.estado === "OBSERVADO"
      ? "Corregir observacion y reemitir solicitud."
      : item.estado === "A_VENCER"
        ? "Preparar renovacion antes del vencimiento."
        : "Mantener control de vigencia y consumo.",
  updatedAt: item.ultimoControl,
}))

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString("es-AR") : "-"
}
function daysUntil(value: string) {
  return Math.ceil((new Date(value).getTime() - Date.now()) / 86400000)
}
function matchesTerm(item: LegacyAccountingCae, tracker: LocalCaeTracker, term: string) {
  if (term === "") return true
  return [
    item.id,
    item.circuito,
    item.puntoVenta,
    item.referencia,
    item.tipo,
    item.entorno,
    item.observacion,
    tracker.owner,
    tracker.nextStep,
    ...item.accionesPendientes,
  ]
    .join(" ")
    .toLowerCase()
    .includes(term)
}
function getCaeHealth(item: LegacyAccountingCae, tracker: LocalCaeTracker) {
  if (tracker.stage === "observado") return "Autorizacion observada y pendiente de correccion"
  if (tracker.stage === "renovar") return "Autorizacion vigente con renovacion pendiente"
  if (tracker.stage === "cerrado") return "Seguimiento documental cerrado"
  return "Autorizacion bajo control local"
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

export default function ContabilidadCaeTimbradoPage() {
  const sucursalId = useDefaultSucursalId()
  const { periodos } = usePeriodosIva(sucursalId)
  const { cotizaciones } = useCotizaciones()
  const {
    rows: trackers,
    setRows: setTrackers,
    reset: resetTrackers,
  } = useLegacyLocalCollection<LocalCaeTracker>(CAE_TRACKER_STORAGE_KEY, DEFAULT_TRACKERS)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"todos" | LegacyAccountingCae["estado"]>("todos")
  const [stageFilter, setStageFilter] = useState<"todos" | CaeStage>("todos")
  const [selectedId, setSelectedId] = useState<string | null>(
    legacyAccountingCaeItems[0]?.id ?? null
  )
  const trackerMap = useMemo(
    () => new Map(trackers.map((tracker) => [tracker.caeId, tracker])),
    [trackers]
  )
  const items = useMemo(
    () =>
      legacyAccountingCaeItems.map((item) => ({
        ...item,
        tracker:
          trackerMap.get(item.id) ?? DEFAULT_TRACKERS.find((tracker) => tracker.caeId === item.id)!,
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
  const highlighted = filtered.find((item) => item.estado !== "VIGENTE") ?? filtered[0] ?? null
  const kpis = useMemo(
    () => ({
      valid: items.filter((item) => item.estado === "VIGENTE").length,
      expiring: items.filter((item) => item.estado === "A_VENCER").length,
      observed: items.filter((item) => item.estado === "OBSERVADO").length,
      nextExpiry: items.map((item) => daysUntil(item.fechaVto)).sort((a, b) => a - b)[0] ?? 0,
    }),
    [items]
  )
  const updateTracker = (caeId: string, patch: Partial<LocalCaeTracker>) =>
    setTrackers((current) => {
      const index = current.findIndex((row) => row.caeId === caeId)
      const base =
        index >= 0 ? current[index] : DEFAULT_TRACKERS.find((row) => row.caeId === caeId)!
      const nextRow = { ...base, ...patch, updatedAt: new Date().toISOString() }
      return index >= 0
        ? current.map((row, rowIndex) => (rowIndex === index ? nextRow : row))
        : [...current, nextRow]
    })

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">CAE y timbrado</h1>
          <p className="mt-1 text-muted-foreground">
            Control documental de CAE, timbrados y observaciones fiscales con renovacion y
            seguimiento local del legado.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="bg-transparent" onClick={() => resetTrackers()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Restablecer seguimiento
          </Button>
          <Button asChild variant="outline" className="bg-transparent">
            <Link href="/contabilidad/periodos-iva">Periodos IVA</Link>
          </Button>
          <Button asChild>
            <Link href="/contabilidad/reportes">Reportes</Link>
          </Button>
        </div>
      </div>
      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertDescription>
          El frontend actual no solicita, consulta ni renueva CAE o timbrados. Esta pantalla deja
          trazabilidad, vencimientos y proximos pasos sin fingir integracion fiscal.
        </AlertDescription>
      </Alert>
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Vigentes</p>
            <p className="mt-2 text-2xl font-bold text-emerald-600">{kpis.valid}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">A vencer</p>
            <p className="mt-2 text-2xl font-bold text-amber-600">{kpis.expiring}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Observados</p>
            <p className="mt-2 text-2xl font-bold text-destructive">{kpis.observed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Proximo vencimiento</p>
            <p className="mt-2 text-2xl font-bold">{kpis.nextExpiry} d</p>
          </CardContent>
        </Card>
      </div>
      {highlighted ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardDescription>Autorizacion priorizada</CardDescription>
            <CardTitle className="mt-1 text-xl">{highlighted.id.toUpperCase()}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-4">
            <div className="rounded-lg bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Circuito</p>
              <p className="text-sm font-medium">{highlighted.circuito}</p>
            </div>
            <div className="rounded-lg bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Punto venta</p>
              <p className="text-sm font-medium">{highlighted.puntoVenta}</p>
            </div>
            <div className="rounded-lg bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Estado</p>
              <p className="text-sm font-medium">{STATUS_CONFIG[highlighted.estado].label}</p>
            </div>
            <div className="rounded-lg bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Vence</p>
              <p className="text-sm font-medium">{formatDate(highlighted.fechaVto)}</p>
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
                placeholder="Buscar por circuito, punto de venta o referencia..."
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as "todos" | LegacyAccountingCae["estado"])
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Estado legacy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todo el estado legacy</SelectItem>
                <SelectItem value="VIGENTE">Vigente</SelectItem>
                <SelectItem value="A_VENCER">A vencer</SelectItem>
                <SelectItem value="OBSERVADO">Observado</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={stageFilter}
              onValueChange={(value) => setStageFilter(value as "todos" | CaeStage)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seguimiento local" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todo el seguimiento</SelectItem>
                <SelectItem value="controlado">Controlado</SelectItem>
                <SelectItem value="renovar">Renovar</SelectItem>
                <SelectItem value="observado">Observado</SelectItem>
                <SelectItem value="cerrado">Cerrado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BadgeAlert className="h-4 w-4" /> Autorizaciones visibles
            </CardTitle>
            <CardDescription>
              CAE y timbrados del legado con control de vigencia y acciones pendientes.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Circuito</TableHead>
                  <TableHead>Punto venta</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.id.toUpperCase()}</TableCell>
                    <TableCell>{item.circuito}</TableCell>
                    <TableCell>{item.puntoVenta}</TableCell>
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
                    <TableCell>{item.tipo}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => setSelectedId(item.id)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      No hay autorizaciones que coincidan con los filtros actuales.
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
              Referencias vivas del entorno fiscal actual para ubicar el overlay local.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-sm font-medium">Periodos IVA visibles</p>
              <p className="mt-2 text-2xl font-bold">{periodos.length}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-sm font-medium">Cotizaciones visibles</p>
              <p className="mt-2 text-2xl font-bold">{cotizaciones.length}</p>
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
              {selected ? `${selected.tipo} ${selected.id.toUpperCase()}` : "Autorizacion"}
            </DialogTitle>
            <DialogDescription>
              {selected
                ? `${selected.circuito} · ${selected.puntoVenta} · ${selected.referencia}`
                : "Detalle fiscal"}
            </DialogDescription>
          </DialogHeader>
          {selected ? (
            <Tabs defaultValue="circuito">
              <TabsList className="grid h-auto w-full grid-cols-4">
                <TabsTrigger value="circuito">Circuito</TabsTrigger>
                <TabsTrigger value="acciones">Acciones</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="seguimiento">Seguimiento</TabsTrigger>
              </TabsList>
              <TabsContent value="circuito" className="pt-2">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Cabecera fiscal</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <DetailFieldGrid
                        fields={[
                          { label: "Circuito", value: selected.circuito },
                          { label: "Punto venta", value: selected.puntoVenta },
                          { label: "Tipo", value: selected.tipo },
                          { label: "Entorno", value: selected.entorno },
                          { label: "Solicitud", value: formatDate(selected.fechaSolicitud) },
                          { label: "Vencimiento", value: formatDate(selected.fechaVto) },
                          { label: "Referencia", value: selected.referencia },
                          {
                            label: "Responsable",
                            value: selected.tracker.owner || selected.responsable,
                          },
                          { label: "Ultimo control", value: formatDate(selected.ultimoControl) },
                          {
                            label: "Salud del circuito",
                            value: getCaeHealth(selected, selected.tracker),
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
              <TabsContent value="acciones" className="pt-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Acciones pendientes</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selected.accionesPendientes.map((action) => (
                      <div key={action} className="rounded-lg border bg-muted/20 p-3 text-sm">
                        {action}
                      </div>
                    ))}
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
                    El seguimiento local cubre control, renovacion y observaciones mientras no
                    exista integracion CAE o timbrado en backend.
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
                            updateTracker(selected.id, { stage: value as CaeStage })
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Seleccionar estado" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="controlado">Controlado</SelectItem>
                            <SelectItem value="renovar">Renovar</SelectItem>
                            <SelectItem value="observado">Observado</SelectItem>
                            <SelectItem value="cerrado">Cerrado</SelectItem>
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
                          {getCaeHealth(selected, selected.tracker)}
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
