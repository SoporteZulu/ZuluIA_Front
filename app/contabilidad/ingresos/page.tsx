"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ArrowDownLeft, Eye, PiggyBank, RefreshCw, Search, ShieldAlert, Wallet } from "lucide-react"

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
  legacyAccountingIncomes,
  type LegacyAccountingIncome,
} from "@/lib/contabilidad-legacy-data"
import { useLegacyLocalCollection } from "@/lib/hooks/useLegacyLocalCollection"
import { useCajas } from "@/lib/hooks/useCajas"
import { useCobros } from "@/lib/hooks/useCobros"
import { useDefaultSucursalId } from "@/lib/hooks/useSucursales"

type IncomeStage = "relevado" | "pendiente_asiento" | "listo_para_aplicar" | "cerrado"

type LocalIncomeTracker = {
  incomeId: string
  stage: IncomeStage
  owner: string
  nextStep: string
  updatedAt: string
}

const INCOME_TRACKER_STORAGE_KEY = "zuluia_contabilidad_ingresos_trackers"

const STATUS_CONFIG: Record<
  LegacyAccountingIncome["estado"],
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  REGISTRADO: { label: "Registrado", variant: "secondary" },
  APLICADO: { label: "Aplicado", variant: "default" },
  PENDIENTE: { label: "Pendiente", variant: "outline" },
}

const STAGE_CONFIG: Record<
  IncomeStage,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  relevado: { label: "Relevado", variant: "outline" },
  pendiente_asiento: { label: "Pendiente de asiento", variant: "secondary" },
  listo_para_aplicar: { label: "Listo para aplicar", variant: "default" },
  cerrado: { label: "Cerrado", variant: "default" },
}

const DEFAULT_TRACKERS: LocalIncomeTracker[] = legacyAccountingIncomes.map((item) => ({
  incomeId: item.id,
  stage:
    item.estado === "APLICADO"
      ? "cerrado"
      : item.estado === "REGISTRADO"
        ? "pendiente_asiento"
        : "listo_para_aplicar",
  owner: item.responsable,
  nextStep:
    item.estado === "APLICADO"
      ? "Mantener conciliado con el asiento y el documento soporte."
      : item.estado === "REGISTRADO"
        ? "Emitir asiento contable y validar centro de costo definitivo."
        : "Aplicar el ingreso contra el circuito real que corresponda.",
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

function matchesTerm(item: LegacyAccountingIncome, tracker: LocalIncomeTracker, term: string) {
  if (term === "") {
    return true
  }

  return [
    item.id,
    item.origen,
    item.tercero,
    item.caja,
    item.concepto,
    item.referencia,
    item.asientoReferencia,
    item.circuito,
    item.responsable,
    item.observacion,
    tracker.owner,
    tracker.nextStep,
    ...item.items.map((line) => `${line.concepto} ${line.cuenta}`),
  ]
    .join(" ")
    .toLowerCase()
    .includes(term)
}

function getIncomeHealth(item: LegacyAccountingIncome, tracker: LocalIncomeTracker) {
  if (tracker.stage === "cerrado") {
    return "Ingreso conciliado con caja y asiento contable"
  }
  if (tracker.stage === "listo_para_aplicar") {
    return "Ingreso registrado en caja y pendiente de aplicacion documental"
  }
  if (tracker.stage === "pendiente_asiento") {
    return "Falta asiento contable o validacion de centro de costo"
  }
  return "Ingreso relevado localmente a la espera del circuito backend"
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

export default function ContabilidadIngresosPage() {
  const sucursalId = useDefaultSucursalId()
  const { cobros } = useCobros({ sucursalId })
  const { cajas } = useCajas(sucursalId)
  const {
    rows: trackers,
    setRows: setTrackers,
    reset: resetTrackers,
  } = useLegacyLocalCollection<LocalIncomeTracker>(INCOME_TRACKER_STORAGE_KEY, DEFAULT_TRACKERS)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"todos" | LegacyAccountingIncome["estado"]>(
    "todos"
  )
  const [stageFilter, setStageFilter] = useState<"todos" | IncomeStage>("todos")
  const [selectedId, setSelectedId] = useState<string | null>(
    legacyAccountingIncomes[0]?.id ?? null
  )

  const trackerMap = useMemo(
    () => new Map(trackers.map((tracker) => [tracker.incomeId, tracker])),
    [trackers]
  )
  const incomes = useMemo(
    () =>
      legacyAccountingIncomes.map((item) => ({
        ...item,
        tracker:
          trackerMap.get(item.id) ??
          DEFAULT_TRACKERS.find((tracker) => tracker.incomeId === item.id)!,
      })),
    [trackerMap]
  )

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim()
    return incomes.filter(
      (item) =>
        matchesTerm(item, item.tracker, term) &&
        (statusFilter === "todos" || item.estado === statusFilter) &&
        (stageFilter === "todos" || item.tracker.stage === stageFilter)
    )
  }, [incomes, search, statusFilter, stageFilter])

  const selected = incomes.find((item) => item.id === selectedId) ?? filtered[0] ?? null
  const highlighted = filtered.find((item) => item.estado === "PENDIENTE") ?? filtered[0] ?? null
  const kpis = useMemo(
    () => ({
      pending: incomes.filter((item) => item.estado === "PENDIENTE").length,
      applied: incomes.filter((item) => item.estado === "APLICADO").length,
      withoutEntry: incomes.filter((item) => item.asientoReferencia === "Pendiente").length,
      total: incomes.reduce((acc, item) => acc + item.importe, 0),
    }),
    [incomes]
  )

  const updateTracker = (incomeId: string, patch: Partial<LocalIncomeTracker>) => {
    setTrackers((current) => {
      const index = current.findIndex((row) => row.incomeId === incomeId)
      const base =
        index >= 0 ? current[index] : DEFAULT_TRACKERS.find((row) => row.incomeId === incomeId)!
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
          <h1 className="text-3xl font-bold tracking-tight">Ingresos</h1>
          <p className="mt-1 text-muted-foreground">
            Consola operativa para ingresos de tesoreria fuera del circuito estandar de cobros, con
            trazabilidad documental, impacto contable y seguimiento local persistido.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="bg-transparent" onClick={() => resetTrackers()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Restablecer seguimiento
          </Button>
          <Button asChild variant="outline" className="bg-transparent">
            <Link href="/contabilidad/pagos">Pagos y cobros</Link>
          </Button>
          <Button asChild>
            <Link href="/contabilidad/cajas">Ver cajas</Link>
          </Button>
        </div>
      </div>

      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertDescription>
          El backend actual no expone ingresos manuales, ajustes de caja ni reintegros por fuera de
          cobros. Esta vista cubre circuito, referencias y seguimiento local sin inventar contratos.
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
            <p className="text-xs text-muted-foreground">Aplicados</p>
            <p className="mt-2 text-2xl font-bold text-emerald-600">{kpis.applied}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Sin asiento</p>
            <p className="mt-2 text-2xl font-bold">{kpis.withoutEntry}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Monto visible</p>
            <p className="mt-2 text-2xl font-bold">{formatMoney(kpis.total)}</p>
          </CardContent>
        </Card>
      </div>

      {highlighted ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardDescription>Ingreso priorizado</CardDescription>
            <CardTitle className="mt-1 text-xl">{highlighted.id.toUpperCase()}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-4">
            <div className="rounded-lg bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Origen</p>
              <p className="text-sm font-medium">{highlighted.origen}</p>
            </div>
            <div className="rounded-lg bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Tercero</p>
              <p className="text-sm font-medium">{highlighted.tercero}</p>
            </div>
            <div className="rounded-lg bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Seguimiento</p>
              <p className="text-sm font-medium">{STAGE_CONFIG[highlighted.tracker.stage].label}</p>
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
                placeholder="Buscar por tercero, origen, referencia o cuenta..."
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as "todos" | LegacyAccountingIncome["estado"])
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Estado legacy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todo el estado legacy</SelectItem>
                <SelectItem value="REGISTRADO">Registrado</SelectItem>
                <SelectItem value="APLICADO">Aplicado</SelectItem>
                <SelectItem value="PENDIENTE">Pendiente</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={stageFilter}
              onValueChange={(value) => setStageFilter(value as "todos" | IncomeStage)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seguimiento local" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todo el seguimiento</SelectItem>
                <SelectItem value="relevado">Relevado</SelectItem>
                <SelectItem value="pendiente_asiento">Pendiente de asiento</SelectItem>
                <SelectItem value="listo_para_aplicar">Listo para aplicar</SelectItem>
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
              <ArrowDownLeft className="h-4 w-4" /> Ingresos operativos visibles
            </CardTitle>
            <CardDescription>
              Coberturas locales del legado con referencia de caja, asiento, tercero y centro de
              costo.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Origen</TableHead>
                  <TableHead>Tercero</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Caja</TableHead>
                  <TableHead className="text-right">Importe</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.id.toUpperCase()}</TableCell>
                    <TableCell>{item.origen}</TableCell>
                    <TableCell>{item.tercero}</TableCell>
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
                    <TableCell>{item.caja}</TableCell>
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
                      No hay ingresos que coincidan con los filtros actuales.
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
              Referencias vivas para ubicar estos ingresos dentro del circuito contable existente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <PiggyBank className="h-4 w-4" /> Cobros visibles
              </div>
              <p className="mt-2 text-2xl font-bold">{cobros.length}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Wallet className="h-4 w-4" /> Cajas disponibles
              </div>
              <p className="mt-2 text-2xl font-bold">{cajas.length}</p>
            </div>
            {selected ? (
              <div className="rounded-lg bg-muted/40 p-3 text-sm">
                <p className="text-xs text-muted-foreground">Gap activo</p>
                <p className="mt-1 font-medium">{selected.backendGap}</p>
              </div>
            ) : null}
            <p className="text-sm text-muted-foreground">
              La pantalla ahora separa ingresos manuales, ajustes y reintegros del cobro formal,
              pero sigue declarando de forma explicita la ausencia de API dedicada.
            </p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>
              {selected ? `Ingreso ${selected.id.toUpperCase()}` : "Ingreso"}
            </DialogTitle>
            <DialogDescription>
              {selected
                ? `${selected.origen} · ${selected.tercero} · ${selected.referencia}`
                : "Detalle operativo del ingreso"}
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
                          { label: "Origen", value: selected.origen },
                          { label: "Circuito", value: selected.circuito },
                          { label: "Tercero", value: selected.tercero },
                          { label: "Caja", value: selected.caja },
                          { label: "Medio", value: selected.medio },
                          { label: "Centro de costo", value: selected.centroCosto },
                          { label: "Referencia", value: selected.referencia },
                          { label: "Asiento", value: selected.asientoReferencia },
                          {
                            label: "Responsable",
                            value: selected.tracker.owner || selected.responsable,
                          },
                          {
                            label: "Salud del circuito",
                            value: getIncomeHealth(selected, selected.tracker),
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
                        <p className="text-xs text-muted-foreground">Concepto</p>
                        <p className="mt-1 font-medium">{selected.concepto}</p>
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
                    <CardTitle className="text-base">Impacto contable visible</CardTitle>
                    <CardDescription>
                      Distribucion local del ingreso segun el legacy y su referencia contable.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Concepto</TableHead>
                          <TableHead>Cuenta</TableHead>
                          <TableHead>Centro costo</TableHead>
                          <TableHead className="text-right">Importe</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selected.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.concepto}</TableCell>
                            <TableCell>{item.cuenta}</TableCell>
                            <TableCell>{item.centroCosto}</TableCell>
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
                    Este seguimiento se guarda solo en el navegador actual para cubrir el trabajo
                    operativo mientras no exista backend especifico de ingresos.
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
                            updateTracker(selected.id, { stage: value as IncomeStage })
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Seleccionar estado" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="relevado">Relevado</SelectItem>
                            <SelectItem value="pendiente_asiento">Pendiente de asiento</SelectItem>
                            <SelectItem value="listo_para_aplicar">Listo para aplicar</SelectItem>
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
                          {getIncomeHealth(selected, selected.tracker)}
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
