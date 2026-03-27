"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ArrowRightLeft, Eye, RefreshCw, Search, ShieldAlert, Wallet } from "lucide-react"

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
  legacyAccountingTransfers,
  type LegacyAccountingTransfer,
} from "@/lib/contabilidad-legacy-data"
import { useLegacyLocalCollection } from "@/lib/hooks/useLegacyLocalCollection"
import { useAsientos } from "@/lib/hooks/useAsientos"
import { useCajas } from "@/lib/hooks/useCajas"
import { useCotizaciones } from "@/lib/hooks/useCotizaciones"
import { useDefaultSucursalId } from "@/lib/hooks/useSucursales"

type TransferStage = "emitida" | "pendiente_acreditacion" | "observada" | "cerrada"

type LocalTransferTracker = {
  transferId: string
  stage: TransferStage
  owner: string
  nextStep: string
  updatedAt: string
}

const TRANSFER_TRACKER_STORAGE_KEY = "zuluia_contabilidad_transferencias_trackers"

const STATUS_CONFIG: Record<
  LegacyAccountingTransfer["estado"],
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  EMITIDA: { label: "Emitida", variant: "outline" },
  ACREDITADA: { label: "Acreditada", variant: "default" },
  OBSERVADA: { label: "Observada", variant: "destructive" },
}

const STAGE_CONFIG: Record<
  TransferStage,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  emitida: { label: "Emitida", variant: "outline" },
  pendiente_acreditacion: { label: "Pendiente acreditacion", variant: "secondary" },
  observada: { label: "Observada", variant: "destructive" },
  cerrada: { label: "Cerrada", variant: "default" },
}

const DEFAULT_TRACKERS: LocalTransferTracker[] = legacyAccountingTransfers.map((item) => ({
  transferId: item.id,
  stage:
    item.estado === "ACREDITADA"
      ? "cerrada"
      : item.estado === "OBSERVADA"
        ? "observada"
        : "pendiente_acreditacion",
  owner: item.responsable,
  nextStep:
    item.estado === "ACREDITADA"
      ? "Mantener conciliadas las referencias de origen, destino y asiento."
      : item.estado === "OBSERVADA"
        ? "Resolver diferencia bancaria y regularizar el asiento final."
        : "Esperar comprobante bancario y confirmar acreditacion.",
  updatedAt: item.fecha,
}))

function formatMoney(value: number, currency = "ARS") {
  return value.toLocaleString("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "USD" ? 2 : 0,
  })
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString("es-AR") : "-"
}

function matchesTerm(item: LegacyAccountingTransfer, tracker: LocalTransferTracker, term: string) {
  if (term === "") {
    return true
  }

  return [
    item.id,
    item.origen,
    item.destino,
    item.referencia,
    item.comprobanteOrigen,
    item.comprobanteDestino,
    item.circuito,
    item.observacion,
    tracker.owner,
    tracker.nextStep,
    ...item.items.map((line) => `${line.concepto} ${line.cuenta}`),
  ]
    .join(" ")
    .toLowerCase()
    .includes(term)
}

function getTransferHealth(item: LegacyAccountingTransfer, tracker: LocalTransferTracker) {
  if (tracker.stage === "cerrada") {
    return "Transferencia conciliada entre origen, destino y asiento"
  }
  if (tracker.stage === "observada") {
    return "Existe una diferencia u observacion bancaria sin resolver"
  }
  if (tracker.stage === "pendiente_acreditacion") {
    return "Transferencia emitida a la espera de comprobante de destino"
  }
  return "Transferencia emitida y bajo monitoreo local"
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

export default function ContabilidadTransferenciasPage() {
  const sucursalId = useDefaultSucursalId()
  const { cajas } = useCajas(sucursalId)
  const { cotizaciones } = useCotizaciones()
  const { asientos } = useAsientos()
  const {
    rows: trackers,
    setRows: setTrackers,
    reset: resetTrackers,
  } = useLegacyLocalCollection<LocalTransferTracker>(TRANSFER_TRACKER_STORAGE_KEY, DEFAULT_TRACKERS)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"todos" | LegacyAccountingTransfer["estado"]>(
    "todos"
  )
  const [stageFilter, setStageFilter] = useState<"todos" | TransferStage>("todos")
  const [selectedId, setSelectedId] = useState<string | null>(
    legacyAccountingTransfers[0]?.id ?? null
  )

  const trackerMap = useMemo(
    () => new Map(trackers.map((tracker) => [tracker.transferId, tracker])),
    [trackers]
  )
  const transfers = useMemo(
    () =>
      legacyAccountingTransfers.map((item) => ({
        ...item,
        tracker:
          trackerMap.get(item.id) ??
          DEFAULT_TRACKERS.find((tracker) => tracker.transferId === item.id)!,
      })),
    [trackerMap]
  )

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim()
    return transfers.filter(
      (item) =>
        matchesTerm(item, item.tracker, term) &&
        (statusFilter === "todos" || item.estado === statusFilter) &&
        (stageFilter === "todos" || item.tracker.stage === stageFilter)
    )
  }, [transfers, search, statusFilter, stageFilter])

  const selected = transfers.find((item) => item.id === selectedId) ?? filtered[0] ?? null
  const highlighted = filtered.find((item) => item.estado === "OBSERVADA") ?? filtered[0] ?? null
  const kpis = useMemo(
    () => ({
      emitted: transfers.filter((item) => item.estado === "EMITIDA").length,
      observed: transfers.filter((item) => item.estado === "OBSERVADA").length,
      accredited: transfers.filter((item) => item.estado === "ACREDITADA").length,
      total: transfers.reduce((acc, item) => acc + item.importe * item.cotizacion, 0),
    }),
    [transfers]
  )

  const updateTracker = (transferId: string, patch: Partial<LocalTransferTracker>) => {
    setTrackers((current) => {
      const index = current.findIndex((row) => row.transferId === transferId)
      const base =
        index >= 0 ? current[index] : DEFAULT_TRACKERS.find((row) => row.transferId === transferId)!
      const nextRow = { ...base, ...patch, updatedAt: new Date().toISOString() }
      return index >= 0
        ? current.map((row, rowIndex) => (rowIndex === index ? nextRow : row))
        : [...current, nextRow]
    })
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transferencias</h1>
          <p className="mt-1 text-muted-foreground">
            Consola de transferencias entre cajas y cuentas con seguimiento de acreditacion,
            diferencia documental y trazabilidad local del legacy.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="bg-transparent" onClick={() => resetTrackers()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Restablecer seguimiento
          </Button>
          <Button asChild variant="outline" className="bg-transparent">
            <Link href="/contabilidad/cajas">Cajas</Link>
          </Button>
          <Button asChild>
            <Link href="/contabilidad/cheques">Cheques</Link>
          </Button>
        </div>
      </div>

      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertDescription>
          El backend actual no expone el circuito completo de transferencias entre caja y banco con
          doble referencia, acreditacion y observaciones. Esta vista cubre ese gap desde frontend.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Emitidas</p>
            <p className="mt-2 text-2xl font-bold text-amber-600">{kpis.emitted}</p>
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
            <p className="text-xs text-muted-foreground">Acreditadas</p>
            <p className="mt-2 text-2xl font-bold text-emerald-600">{kpis.accredited}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Monto equivalente ARS</p>
            <p className="mt-2 text-2xl font-bold">{formatMoney(kpis.total)}</p>
          </CardContent>
        </Card>
      </div>

      {highlighted ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardDescription>Transferencia priorizada</CardDescription>
            <CardTitle className="mt-1 text-xl">{highlighted.id.toUpperCase()}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-4">
            <div className="rounded-lg bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Origen</p>
              <p className="text-sm font-medium">{highlighted.origen}</p>
            </div>
            <div className="rounded-lg bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Destino</p>
              <p className="text-sm font-medium">{highlighted.destino}</p>
            </div>
            <div className="rounded-lg bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Estado</p>
              <p className="text-sm font-medium">{STATUS_CONFIG[highlighted.estado].label}</p>
            </div>
            <div className="rounded-lg bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Importe</p>
              <p className="text-sm font-medium">
                {formatMoney(highlighted.importe, highlighted.moneda)}
              </p>
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
                placeholder="Buscar por origen, destino, referencia o cuenta..."
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as "todos" | LegacyAccountingTransfer["estado"])
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Estado legacy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todo el estado legacy</SelectItem>
                <SelectItem value="EMITIDA">Emitida</SelectItem>
                <SelectItem value="ACREDITADA">Acreditada</SelectItem>
                <SelectItem value="OBSERVADA">Observada</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={stageFilter}
              onValueChange={(value) => setStageFilter(value as "todos" | TransferStage)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seguimiento local" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todo el seguimiento</SelectItem>
                <SelectItem value="emitida">Emitida</SelectItem>
                <SelectItem value="pendiente_acreditacion">Pendiente acreditacion</SelectItem>
                <SelectItem value="observada">Observada</SelectItem>
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
              <ArrowRightLeft className="h-4 w-4" /> Transferencias visibles
            </CardTitle>
            <CardDescription>
              Movimientos entre caja y banco con seguimiento documental y contable.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Origen</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Moneda</TableHead>
                  <TableHead className="text-right">Importe</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.id.toUpperCase()}</TableCell>
                    <TableCell>{item.origen}</TableCell>
                    <TableCell>{item.destino}</TableCell>
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
                    <TableCell>{item.moneda}</TableCell>
                    <TableCell className="text-right">
                      {formatMoney(item.importe, item.moneda)}
                    </TableCell>
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
                      No hay transferencias que coincidan con los filtros actuales.
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
              Referencias vivas para ubicar estas transferencias dentro del modulo actual.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Wallet className="h-4 w-4" /> Cajas visibles
              </div>
              <p className="mt-2 text-2xl font-bold">{cajas.length}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Wallet className="h-4 w-4" /> Asientos visibles
              </div>
              <p className="mt-2 text-2xl font-bold">{asientos.length}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Wallet className="h-4 w-4" /> Cotizaciones visibles
              </div>
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
              {selected ? `Transferencia ${selected.id.toUpperCase()}` : "Transferencia"}
            </DialogTitle>
            <DialogDescription>
              {selected
                ? `${selected.origen} -> ${selected.destino} · ${selected.referencia}`
                : "Detalle operativo de transferencia"}
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
                          { label: "Origen", value: selected.origen },
                          { label: "Destino", value: selected.destino },
                          { label: "Circuito", value: selected.circuito },
                          { label: "Moneda", value: selected.moneda },
                          {
                            label: "Cotizacion",
                            value: selected.cotizacion.toLocaleString("es-AR"),
                          },
                          { label: "Referencia", value: selected.referencia },
                          { label: "Comp. origen", value: selected.comprobanteOrigen },
                          { label: "Comp. destino", value: selected.comprobanteDestino },
                          { label: "Asiento", value: selected.asientoReferencia },
                          {
                            label: "Salud del circuito",
                            value: getTransferHealth(selected, selected.tracker),
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
              <TabsContent value="impacto" className="pt-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Impacto visible</CardTitle>
                    <CardDescription>
                      Apertura local de origen, destino y referencia contable.
                    </CardDescription>
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
                              {formatMoney(item.importe, selected.moneda)}
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
                    Este seguimiento se guarda solo en el navegador actual y cubre acreditacion,
                    observaciones y cierre documental hasta que exista API dedicada.
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
                            updateTracker(selected.id, { stage: value as TransferStage })
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Seleccionar estado" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="emitida">Emitida</SelectItem>
                            <SelectItem value="pendiente_acreditacion">
                              Pendiente acreditacion
                            </SelectItem>
                            <SelectItem value="observada">Observada</SelectItem>
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
                          {getTransferHealth(selected, selected.tracker)}
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
