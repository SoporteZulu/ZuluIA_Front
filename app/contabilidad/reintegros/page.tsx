"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Eye, RefreshCw, Search, ShieldAlert, Undo2, Wallet } from "lucide-react"

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
  legacyAccountingRefunds,
  type LegacyAccountingRefund,
} from "@/lib/contabilidad-legacy-data"
import { useLegacyLocalCollection } from "@/lib/hooks/useLegacyLocalCollection"
import { usePagos } from "@/lib/hooks/usePagos"
import { useDefaultSucursalId } from "@/lib/hooks/useSucursales"

type RefundStage = "recibido" | "pendiente_cierre" | "diferencia_abierta" | "cerrado"

type LocalRefundTracker = {
  refundId: string
  stage: RefundStage
  owner: string
  nextStep: string
  updatedAt: string
}

const REFUND_TRACKER_STORAGE_KEY = "zuluia_contabilidad_reintegros_trackers"

const STATUS_CONFIG: Record<
  LegacyAccountingRefund["estado"],
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  PARCIAL: { label: "Parcial", variant: "secondary" },
  TOTAL: { label: "Total", variant: "default" },
  PENDIENTE: { label: "Pendiente", variant: "outline" },
}

const STAGE_CONFIG: Record<
  RefundStage,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  recibido: { label: "Recibido", variant: "secondary" },
  pendiente_cierre: { label: "Pendiente de cierre", variant: "outline" },
  diferencia_abierta: { label: "Diferencia abierta", variant: "destructive" },
  cerrado: { label: "Cerrado", variant: "default" },
}

const DEFAULT_TRACKERS: LocalRefundTracker[] = legacyAccountingRefunds.map((item) => ({
  refundId: item.id,
  stage:
    item.estado === "TOTAL"
      ? "cerrado"
      : item.estado === "PARCIAL"
        ? "pendiente_cierre"
        : item.diferencia > 0
          ? "diferencia_abierta"
          : "recibido",
  owner: item.responsable,
  nextStep:
    item.estado === "TOTAL"
      ? "Mantener conciliado el reintegro con el vale cerrado."
      : item.estado === "PARCIAL"
        ? "Completar la rendicion y cerrar saldo restante del vale."
        : "Definir recupero o castigo de la diferencia pendiente.",
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

function matchesTerm(item: LegacyAccountingRefund, tracker: LocalRefundTracker, term: string) {
  if (term === "") {
    return true
  }

  return [
    item.id,
    item.vale,
    item.beneficiario,
    item.forma,
    item.cajaDestino,
    item.referencia,
    item.observacion,
    tracker.owner,
    tracker.nextStep,
    ...item.items.map((line) => `${line.concepto} ${line.cuenta}`),
  ]
    .join(" ")
    .toLowerCase()
    .includes(term)
}

function getRefundHealth(item: LegacyAccountingRefund, tracker: LocalRefundTracker) {
  if (tracker.stage === "cerrado") {
    return "Reintegro conciliado contra el vale y su cierre documental"
  }
  if (tracker.stage === "diferencia_abierta") {
    return "Existe diferencia abierta pendiente de recupero o castigo"
  }
  if (tracker.stage === "pendiente_cierre") {
    return "Hay reintegro parcial, pero resta cerrar el vale origen"
  }
  return "Reintegro recibido y pendiente de aplicacion final"
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

export default function ContabilidadReintegrosPage() {
  const sucursalId = useDefaultSucursalId()
  const { pagos } = usePagos({ sucursalId })
  const {
    rows: trackers,
    setRows: setTrackers,
    reset: resetTrackers,
  } = useLegacyLocalCollection<LocalRefundTracker>(REFUND_TRACKER_STORAGE_KEY, DEFAULT_TRACKERS)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"todos" | LegacyAccountingRefund["estado"]>(
    "todos"
  )
  const [stageFilter, setStageFilter] = useState<"todos" | RefundStage>("todos")
  const [selectedId, setSelectedId] = useState<string | null>(
    legacyAccountingRefunds[0]?.id ?? null
  )

  const trackerMap = useMemo(
    () => new Map(trackers.map((tracker) => [tracker.refundId, tracker])),
    [trackers]
  )
  const refunds = useMemo(
    () =>
      legacyAccountingRefunds.map((item) => ({
        ...item,
        tracker:
          trackerMap.get(item.id) ??
          DEFAULT_TRACKERS.find((tracker) => tracker.refundId === item.id)!,
      })),
    [trackerMap]
  )

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim()
    return refunds.filter(
      (item) =>
        matchesTerm(item, item.tracker, term) &&
        (statusFilter === "todos" || item.estado === statusFilter) &&
        (stageFilter === "todos" || item.tracker.stage === stageFilter)
    )
  }, [refunds, search, statusFilter, stageFilter])

  const selected = refunds.find((item) => item.id === selectedId) ?? filtered[0] ?? null
  const highlighted = filtered.find((item) => item.diferencia > 0) ?? filtered[0] ?? null
  const kpis = useMemo(
    () => ({
      partial: refunds.filter((item) => item.estado === "PARCIAL").length,
      total: refunds.filter((item) => item.estado === "TOTAL").length,
      differences: refunds.filter((item) => item.diferencia > 0).length,
      pendingBalance: refunds.reduce((acc, item) => acc + item.saldoVale, 0),
    }),
    [refunds]
  )

  const updateTracker = (refundId: string, patch: Partial<LocalRefundTracker>) => {
    setTrackers((current) => {
      const index = current.findIndex((row) => row.refundId === refundId)
      const base =
        index >= 0 ? current[index] : DEFAULT_TRACKERS.find((row) => row.refundId === refundId)!
      const nextRow = {
        ...base,
        ...patch,
        updatedAt: new Date().toISOString(),
      }

      if (index >= 0) {
        return current.map((row, rowIndex) => (rowIndex === index ? nextRow : row))
      }

      return [...current, nextRow]
    })
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reintegros</h1>
          <p className="mt-1 text-muted-foreground">
            Consola de rendiciones y devoluciones vinculadas a vales, con control de saldo, forma de
            devolucion, diferencias y cierre documental.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="bg-transparent" onClick={() => resetTrackers()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Restablecer seguimiento
          </Button>
          <Button asChild variant="outline" className="bg-transparent">
            <Link href="/contabilidad/vales">Ver vales</Link>
          </Button>
          <Button asChild>
            <Link href="/contabilidad/pagos">Movimientos reales</Link>
          </Button>
        </div>
      </div>

      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertDescription>
          El backend actual no publica reintegros ni rendiciones parciales por vale. Esta pantalla
          cubre el seguimiento local y deja visible el gap documental y contable restante.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Parciales</p>
            <p className="mt-2 text-2xl font-bold text-amber-600">{kpis.partial}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Totales</p>
            <p className="mt-2 text-2xl font-bold text-emerald-600">{kpis.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Con diferencia</p>
            <p className="mt-2 text-2xl font-bold text-destructive">{kpis.differences}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Saldo de vales</p>
            <p className="mt-2 text-2xl font-bold">{formatMoney(kpis.pendingBalance)}</p>
          </CardContent>
        </Card>
      </div>

      {highlighted ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardDescription>Rendicion priorizada</CardDescription>
            <CardTitle className="mt-1 text-xl">{highlighted.id.toUpperCase()}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-4">
            <div className="rounded-lg bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Vale</p>
              <p className="text-sm font-medium">{highlighted.vale}</p>
            </div>
            <div className="rounded-lg bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Beneficiario</p>
              <p className="text-sm font-medium">{highlighted.beneficiario}</p>
            </div>
            <div className="rounded-lg bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Diferencia</p>
              <p className="text-sm font-medium">{formatMoney(highlighted.diferencia)}</p>
            </div>
            <div className="rounded-lg bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Saldo vale</p>
              <p className="text-sm font-medium">{formatMoney(highlighted.saldoVale)}</p>
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
                placeholder="Buscar por vale, beneficiario, referencia o forma..."
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as "todos" | LegacyAccountingRefund["estado"])
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Estado legacy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todo el estado legacy</SelectItem>
                <SelectItem value="PARCIAL">Parcial</SelectItem>
                <SelectItem value="TOTAL">Total</SelectItem>
                <SelectItem value="PENDIENTE">Pendiente</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={stageFilter}
              onValueChange={(value) => setStageFilter(value as "todos" | RefundStage)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seguimiento local" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todo el seguimiento</SelectItem>
                <SelectItem value="recibido">Recibido</SelectItem>
                <SelectItem value="pendiente_cierre">Pendiente de cierre</SelectItem>
                <SelectItem value="diferencia_abierta">Diferencia abierta</SelectItem>
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
              <Undo2 className="h-4 w-4" /> Reintegros visibles
            </CardTitle>
            <CardDescription>
              Rendiciones parciales, totales y diferencias abiertas derivadas de vales historicos.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Vale</TableHead>
                  <TableHead>Beneficiario</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Forma</TableHead>
                  <TableHead className="text-right">Saldo vale</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.id.toUpperCase()}</TableCell>
                    <TableCell>{item.vale}</TableCell>
                    <TableCell>{item.beneficiario}</TableCell>
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
                    <TableCell>{item.forma}</TableCell>
                    <TableCell className="text-right">{formatMoney(item.saldoVale)}</TableCell>
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
                      No hay reintegros que coincidan con los filtros actuales.
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
              Punto de apoyo sobre el circuito de pagos existente para seguir estos reintegros.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Wallet className="h-4 w-4" /> Pagos visibles
              </div>
              <p className="mt-2 text-2xl font-bold">{pagos.length}</p>
            </div>
            {selected ? (
              <>
                <div className="rounded-lg bg-muted/40 p-3 text-sm">
                  <p className="text-xs text-muted-foreground">Gap activo</p>
                  <p className="mt-1 font-medium">{selected.backendGap}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3 text-sm">
                  <p className="text-xs text-muted-foreground">Caja destino</p>
                  <p className="mt-1 font-medium">{selected.cajaDestino}</p>
                </div>
              </>
            ) : null}
            <p className="text-sm text-muted-foreground">
              La vista deja claro que el reintegro aun no puede ejecutar cierre real contra un vale,
              pero ya ordena diferencias, saldo pendiente y pasos de recupero.
            </p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>
              {selected ? `Reintegro ${selected.id.toUpperCase()}` : "Reintegro"}
            </DialogTitle>
            <DialogDescription>
              {selected
                ? `${selected.vale} · ${selected.beneficiario} · ${selected.referencia}`
                : "Detalle operativo del reintegro"}
            </DialogDescription>
          </DialogHeader>
          {selected ? (
            <Tabs defaultValue="circuito">
              <TabsList className="grid h-auto w-full grid-cols-4">
                <TabsTrigger value="circuito">Circuito</TabsTrigger>
                <TabsTrigger value="items">Impacto</TabsTrigger>
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
                          { label: "Vale", value: selected.vale },
                          { label: "Beneficiario", value: selected.beneficiario },
                          { label: "Fecha", value: formatDate(selected.fecha) },
                          { label: "Caja destino", value: selected.cajaDestino },
                          { label: "Forma", value: selected.forma },
                          { label: "Referencia", value: selected.referencia },
                          {
                            label: "Responsable",
                            value: selected.tracker.owner || selected.responsable,
                          },
                          { label: "Importe reintegrado", value: formatMoney(selected.importe) },
                          { label: "Saldo del vale", value: formatMoney(selected.saldoVale) },
                          { label: "Diferencia", value: formatMoney(selected.diferencia) },
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
                        <p className="text-xs text-muted-foreground">Estado operativo</p>
                        <p className="mt-1 font-medium">
                          {getRefundHealth(selected, selected.tracker)}
                        </p>
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

              <TabsContent value="items" className="pt-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Aplicacion visible del reintegro</CardTitle>
                    <CardDescription>
                      Conceptos locales asociados al reintegro o diferencia pendiente.
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
                    El seguimiento local cubre cierre, diferencias y recupero del reintegro mientras
                    no exista integracion backend entre vales y rendiciones.
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
                            updateTracker(selected.id, { stage: value as RefundStage })
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Seleccionar estado" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="recibido">Recibido</SelectItem>
                            <SelectItem value="pendiente_cierre">Pendiente de cierre</SelectItem>
                            <SelectItem value="diferencia_abierta">Diferencia abierta</SelectItem>
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
                          {getRefundHealth(selected, selected.tracker)}
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
