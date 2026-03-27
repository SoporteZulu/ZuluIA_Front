"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ArrowUpRight, Eye, RefreshCw, Search, ShieldAlert, Wallet } from "lucide-react"

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
  legacyAccountingExpenses,
  type LegacyAccountingExpense,
} from "@/lib/contabilidad-legacy-data"
import { useLegacyLocalCollection } from "@/lib/hooks/useLegacyLocalCollection"
import { useCajas } from "@/lib/hooks/useCajas"
import { usePagos } from "@/lib/hooks/usePagos"
import { useDefaultSucursalId } from "@/lib/hooks/useSucursales"

type ExpenseStage = "relevado" | "pendiente_rendicion" | "pendiente_asiento" | "cerrado"

type LocalExpenseTracker = {
  expenseId: string
  stage: ExpenseStage
  owner: string
  nextStep: string
  updatedAt: string
}

const EXPENSE_TRACKER_STORAGE_KEY = "zuluia_contabilidad_egresos_trackers"

const STATUS_CONFIG: Record<
  LegacyAccountingExpense["estado"],
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  REGISTRADO: { label: "Registrado", variant: "secondary" },
  APLICADO: { label: "Aplicado", variant: "default" },
  OBSERVADO: { label: "Observado", variant: "destructive" },
}

const STAGE_CONFIG: Record<
  ExpenseStage,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  relevado: { label: "Relevado", variant: "outline" },
  pendiente_rendicion: { label: "Pendiente de rendicion", variant: "destructive" },
  pendiente_asiento: { label: "Pendiente de asiento", variant: "secondary" },
  cerrado: { label: "Cerrado", variant: "default" },
}

const DEFAULT_TRACKERS: LocalExpenseTracker[] = legacyAccountingExpenses.map((item) => ({
  expenseId: item.id,
  stage:
    item.estado === "APLICADO"
      ? "cerrado"
      : item.estado === "OBSERVADO"
        ? "pendiente_rendicion"
        : "pendiente_asiento",
  owner: item.responsable,
  nextStep:
    item.estado === "APLICADO"
      ? "Mantener soporte y conciliacion del egreso aplicado."
      : item.estado === "OBSERVADO"
        ? "Completar rendicion y definir asiento final."
        : "Emitir asiento e integrar el egreso al libro diario.",
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

function matchesTerm(item: LegacyAccountingExpense, tracker: LocalExpenseTracker, term: string) {
  if (term === "") {
    return true
  }

  return [
    item.id,
    item.destino,
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

function getExpenseHealth(item: LegacyAccountingExpense, tracker: LocalExpenseTracker) {
  if (tracker.stage === "cerrado") {
    return "Egreso conciliado con caja, soporte y asiento"
  }
  if (tracker.stage === "pendiente_rendicion") {
    return "Faltan comprobantes o rendicion del egreso operativo"
  }
  if (tracker.stage === "pendiente_asiento") {
    return "El movimiento existe pero aun no se integro al diario"
  }
  return "Egreso relevado localmente y pendiente de circuito formal"
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

export default function ContabilidadEgresosPage() {
  const sucursalId = useDefaultSucursalId()
  const { pagos } = usePagos({ sucursalId })
  const { cajas } = useCajas(sucursalId)
  const {
    rows: trackers,
    setRows: setTrackers,
    reset: resetTrackers,
  } = useLegacyLocalCollection<LocalExpenseTracker>(EXPENSE_TRACKER_STORAGE_KEY, DEFAULT_TRACKERS)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"todos" | LegacyAccountingExpense["estado"]>(
    "todos"
  )
  const [stageFilter, setStageFilter] = useState<"todos" | ExpenseStage>("todos")
  const [selectedId, setSelectedId] = useState<string | null>(
    legacyAccountingExpenses[0]?.id ?? null
  )

  const trackerMap = useMemo(
    () => new Map(trackers.map((tracker) => [tracker.expenseId, tracker])),
    [trackers]
  )
  const expenses = useMemo(
    () =>
      legacyAccountingExpenses.map((item) => ({
        ...item,
        tracker:
          trackerMap.get(item.id) ??
          DEFAULT_TRACKERS.find((tracker) => tracker.expenseId === item.id)!,
      })),
    [trackerMap]
  )

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim()
    return expenses.filter(
      (item) =>
        matchesTerm(item, item.tracker, term) &&
        (statusFilter === "todos" || item.estado === statusFilter) &&
        (stageFilter === "todos" || item.tracker.stage === stageFilter)
    )
  }, [expenses, search, statusFilter, stageFilter])

  const selected = expenses.find((item) => item.id === selectedId) ?? filtered[0] ?? null
  const highlighted = filtered.find((item) => item.estado === "OBSERVADO") ?? filtered[0] ?? null
  const kpis = useMemo(
    () => ({
      observed: expenses.filter((item) => item.estado === "OBSERVADO").length,
      applied: expenses.filter((item) => item.estado === "APLICADO").length,
      withoutEntry: expenses.filter((item) => item.asientoReferencia === "Pendiente").length,
      total: expenses.reduce((acc, item) => acc + item.importe, 0),
    }),
    [expenses]
  )

  const updateTracker = (expenseId: string, patch: Partial<LocalExpenseTracker>) => {
    setTrackers((current) => {
      const index = current.findIndex((row) => row.expenseId === expenseId)
      const base =
        index >= 0 ? current[index] : DEFAULT_TRACKERS.find((row) => row.expenseId === expenseId)!
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
          <h1 className="text-3xl font-bold tracking-tight">Egresos</h1>
          <p className="mt-1 text-muted-foreground">
            Consola operativa para egresos menores, adelantos y salidas urgentes que en el legacy
            quedaban fuera del circuito formal de pagos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="bg-transparent" onClick={() => resetTrackers()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Restablecer seguimiento
          </Button>
          <Button asChild variant="outline" className="bg-transparent">
            <Link href="/contabilidad/pagos">Pagos</Link>
          </Button>
          <Button asChild>
            <Link href="/contabilidad/cajas">Control de cajas</Link>
          </Button>
        </div>
      </div>

      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertDescription>
          El contrato actual publica pagos formales, pero no egresos menores, adelantos ni caja
          chica con rendicion posterior. Esta pantalla cubre esos circuitos desde el frontend.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Observados</p>
            <p className="mt-2 text-2xl font-bold text-amber-600">{kpis.observed}</p>
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
            <CardDescription>Egreso priorizado</CardDescription>
            <CardTitle className="mt-1 text-xl">{highlighted.id.toUpperCase()}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-4">
            <div className="rounded-lg bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Destino</p>
              <p className="text-sm font-medium">{highlighted.destino}</p>
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
                placeholder="Buscar por destino, tercero, referencia o cuenta..."
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as "todos" | LegacyAccountingExpense["estado"])
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Estado legacy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todo el estado legacy</SelectItem>
                <SelectItem value="REGISTRADO">Registrado</SelectItem>
                <SelectItem value="APLICADO">Aplicado</SelectItem>
                <SelectItem value="OBSERVADO">Observado</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={stageFilter}
              onValueChange={(value) => setStageFilter(value as "todos" | ExpenseStage)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seguimiento local" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todo el seguimiento</SelectItem>
                <SelectItem value="relevado">Relevado</SelectItem>
                <SelectItem value="pendiente_rendicion">Pendiente de rendicion</SelectItem>
                <SelectItem value="pendiente_asiento">Pendiente de asiento</SelectItem>
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
              <ArrowUpRight className="h-4 w-4" /> Egresos operativos visibles
            </CardTitle>
            <CardDescription>
              Salidas de caja, adelantos y consumos urgentes con trazabilidad y estado operativo.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Destino</TableHead>
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
                    <TableCell>{item.destino}</TableCell>
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
                      No hay egresos que coincidan con los filtros actuales.
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
              Referencias vivas del circuito financiero formal sobre el que se apoya el overlay
              local.
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
              La vista ahora separa caja chica, adelantos y gastos urgentes del pago formal, sin
              inventar endpoints que hoy no existen en el backend.
            </p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{selected ? `Egreso ${selected.id.toUpperCase()}` : "Egreso"}</DialogTitle>
            <DialogDescription>
              {selected
                ? `${selected.destino} · ${selected.tercero} · ${selected.referencia}`
                : "Detalle operativo del egreso"}
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
                          { label: "Destino", value: selected.destino },
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
                            value: getExpenseHealth(selected, selected.tracker),
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
                      Apertura local de cuentas y centros de costo del egreso relevado.
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
                    El seguimiento local cubre rendicion, asiento y cierre del egreso hasta que el
                    backend publique estos circuitos operativos de tesoreria.
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
                            updateTracker(selected.id, { stage: value as ExpenseStage })
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Seleccionar estado" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="relevado">Relevado</SelectItem>
                            <SelectItem value="pendiente_rendicion">
                              Pendiente de rendicion
                            </SelectItem>
                            <SelectItem value="pendiente_asiento">Pendiente de asiento</SelectItem>
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
                          {getExpenseHealth(selected, selected.tracker)}
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
