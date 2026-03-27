"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { useDepositos } from "@/lib/hooks/useDepositos"
import { useFormulasProduccion } from "@/lib/hooks/useFormulasProduccion"
import { useItems } from "@/lib/hooks/useItems"
import { useLegacyLocalCollection } from "@/lib/hooks/useLegacyLocalCollection"
import { useOrdenesTrabajo } from "@/lib/hooks/useOrdenesTrabajo"
import { useDefaultSucursalId } from "@/lib/hooks/useSucursales"
import type { FormulaProduccion } from "@/lib/types/formulas-produccion"
import type { OrdenTrabajo } from "@/lib/types/ordenes-trabajo"
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  ClipboardList,
  GitBranch,
  RefreshCcw,
  Search,
} from "lucide-react"

type ConsumptionStage = "pendiente" | "en_consumo" | "consumido" | "observado" | "cerrado"
type ClosureStage = "pendiente" | "pendiente_ingreso" | "ajuste_abierto" | "cerrado"

type LocalConsumptionTracker = {
  orderId: number
  stage: ConsumptionStage
  owner: string
  lotReference: string
  actualConsumedQty: string
  scrapQty: string
  note: string
  nextStep: string
  updatedAt: string
}

type LocalClosureTracker = {
  orderId: number
  stage: ClosureStage
  owner: string
  actualProducedQty: string
  materialExitQty: string
  adjustmentReason: string
  note: string
  nextStep: string
  updatedAt: string
}

type ProductionRow = {
  order: OrdenTrabajo
  formula: FormulaProduccion | null
  productLabel: string
  expectedConsumption: number
  expectedOutput: number
  totalComponents: number
  consumptionTracker: LocalConsumptionTracker
  closureTracker: LocalClosureTracker
}

const CONSUMPTION_STORAGE_KEY = "wms-production-consumption-trackers"
const CLOSURE_STORAGE_KEY = "wms-production-closure-trackers"

const CONSUMPTION_STAGE_CONFIG: Record<
  ConsumptionStage,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  pendiente: { label: "Pendiente", variant: "outline" },
  en_consumo: { label: "En consumo", variant: "secondary" },
  consumido: { label: "Consumido", variant: "default" },
  observado: { label: "Observado", variant: "destructive" },
  cerrado: { label: "Cerrado", variant: "default" },
}

const CLOSURE_STAGE_CONFIG: Record<
  ClosureStage,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  pendiente: { label: "Pendiente", variant: "outline" },
  pendiente_ingreso: { label: "Pendiente ingreso", variant: "secondary" },
  ajuste_abierto: { label: "Ajuste abierto", variant: "destructive" },
  cerrado: { label: "Cerrado", variant: "default" },
}

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleDateString("es-AR") : "-"
}

function formatQty(value: number) {
  return Number(value ?? 0).toLocaleString("es-AR", { maximumFractionDigits: 2 })
}

function parseNumeric(value: string) {
  const normalized = value.replace(",", ".")
  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function buildDefaultConsumptionTracker(order: OrdenTrabajo): LocalConsumptionTracker {
  return {
    orderId: order.id,
    stage: order.estado === "COMPLETADO" ? "consumido" : "pendiente",
    owner: "",
    lotReference: "",
    actualConsumedQty: "",
    scrapQty: "",
    note: "",
    nextStep:
      order.estado === "COMPLETADO"
        ? "Confirmar consumo real y documentar merma o diferencias del lote."
        : "Preparar retiro de componentes para la orden seleccionada.",
    updatedAt: new Date().toISOString(),
  }
}

function buildDefaultClosureTracker(order: OrdenTrabajo): LocalClosureTracker {
  return {
    orderId: order.id,
    stage: order.estado === "COMPLETADO" ? "pendiente_ingreso" : "pendiente",
    owner: "",
    actualProducedQty: "",
    materialExitQty: "",
    adjustmentReason: "",
    note: "",
    nextStep:
      order.estado === "COMPLETADO"
        ? "Registrar ingreso del producto terminado y definir ajustes de merma si aplica."
        : "Esperar avance de producción antes de cerrar ingresos y egresos asociados.",
    updatedAt: new Date().toISOString(),
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

function getPlanningStatus(order: OrdenTrabajo) {
  if (order.depositoOrigenId && order.depositoDestinoId) return "Circuito completo"
  if (order.depositoOrigenId || order.depositoDestinoId) return "Circuito parcial"
  return "Sin depósitos definidos"
}

function getConsumptionHealth(row: ProductionRow) {
  const actual = parseNumeric(row.consumptionTracker.actualConsumedQty)
  const scrap = parseNumeric(row.consumptionTracker.scrapQty) ?? 0

  if (row.consumptionTracker.stage === "observado") {
    return "Consumo observado por diferencias, merma o faltante de componentes"
  }

  if (actual !== null && actual + scrap < row.expectedConsumption) {
    return "Consumo cargado por debajo de lo esperado para la fórmula"
  }

  if (row.consumptionTracker.stage === "cerrado") {
    return "Consumo documentado y listo para cierre de orden"
  }

  return "Consumo local pendiente de confirmación contra producción real"
}

function getClosureHealth(row: ProductionRow) {
  const actual = parseNumeric(row.closureTracker.actualProducedQty)

  if (row.closureTracker.stage === "ajuste_abierto") {
    return "Existe diferencia entre producción esperada y cierre real"
  }

  if (row.closureTracker.stage === "cerrado") {
    return "Ingreso y ajustes documentados localmente"
  }

  if (actual !== null && actual !== row.expectedOutput) {
    return "La cantidad real no coincide con la orden programada"
  }

  return "Cierre productivo pendiente de registrar en frontend"
}

export default function ProduccionPage() {
  const searchParams = useSearchParams()
  const defaultSucursalId = useDefaultSucursalId() ?? 1
  const initialOrderId = Number.parseInt(searchParams.get("orden") ?? "", 10)
  const [selectedId, setSelectedId] = useState<number | null>(
    Number.isFinite(initialOrderId) ? initialOrderId : null
  )
  const [search, setSearch] = useState("")
  const [estado, setEstado] = useState("")
  const [consumptionStageFilter, setConsumptionStageFilter] = useState<"all" | ConsumptionStage>(
    "all"
  )
  const [closureStageFilter, setClosureStageFilter] = useState<"all" | ClosureStage>("all")

  const { ordenes, loading, error, refetch } = useOrdenesTrabajo({
    sucursalId: defaultSucursalId,
    estado: estado || undefined,
  })
  const { formulas } = useFormulasProduccion(true)
  const { items } = useItems()
  const { depositos } = useDepositos(defaultSucursalId)
  const {
    rows: consumptionTrackers,
    setRows: setConsumptionTrackers,
    reset: resetConsumptionTrackers,
  } = useLegacyLocalCollection<LocalConsumptionTracker>(CONSUMPTION_STORAGE_KEY, [])
  const {
    rows: closureTrackers,
    setRows: setClosureTrackers,
    reset: resetClosureTrackers,
  } = useLegacyLocalCollection<LocalClosureTracker>(CLOSURE_STORAGE_KEY, [])

  const formulaMap = useMemo(
    () => new Map(formulas.map((formula) => [formula.id, formula])),
    [formulas]
  )
  const itemMap = useMemo(() => new Map(items.map((item) => [item.id, item])), [items])
  const depositoMap = useMemo(
    () => new Map(depositos.map((deposito) => [deposito.id, deposito.descripcion])),
    [depositos]
  )
  const consumptionMap = useMemo(
    () => new Map(consumptionTrackers.map((tracker) => [tracker.orderId, tracker])),
    [consumptionTrackers]
  )
  const closureMap = useMemo(
    () => new Map(closureTrackers.map((tracker) => [tracker.orderId, tracker])),
    [closureTrackers]
  )

  const rows = useMemo<ProductionRow[]>(() => {
    return ordenes.map((order) => {
      const formula = formulaMap.get(order.formulaId) ?? null
      const factor =
        formula && formula.cantidadProducida > 0 ? order.cantidad / formula.cantidadProducida : 1
      const expectedConsumption = (formula?.componentes ?? []).reduce(
        (acc, component) => acc + component.cantidad * factor,
        0
      )
      const productLabel = formula
        ? (itemMap.get(formula.itemProductoId)?.descripcion ??
          `Producto #${formula.itemProductoId}`)
        : `Fórmula #${order.formulaId}`

      return {
        order,
        formula,
        productLabel,
        expectedConsumption,
        expectedOutput: order.cantidad,
        totalComponents: formula?.componentes?.length ?? 0,
        consumptionTracker: consumptionMap.get(order.id) ?? buildDefaultConsumptionTracker(order),
        closureTracker: closureMap.get(order.id) ?? buildDefaultClosureTracker(order),
      }
    })
  }, [closureMap, consumptionMap, formulaMap, itemMap, ordenes])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()

    return rows.filter((row) => {
      if (
        consumptionStageFilter !== "all" &&
        row.consumptionTracker.stage !== consumptionStageFilter
      ) {
        return false
      }

      if (closureStageFilter !== "all" && row.closureTracker.stage !== closureStageFilter) {
        return false
      }

      if (!term) {
        return true
      }

      const text = [
        String(row.order.id),
        row.formula?.descripcion ?? "",
        row.productLabel,
        row.order.estado,
        row.order.observacion ?? "",
        row.consumptionTracker.owner,
        row.consumptionTracker.nextStep,
        row.closureTracker.owner,
        row.closureTracker.nextStep,
        depositoMap.get(row.order.depositoOrigenId ?? 0) ?? "",
        depositoMap.get(row.order.depositoDestinoId ?? 0) ?? "",
      ]
        .join(" ")
        .toLowerCase()

      return text.includes(term)
    })
  }, [closureStageFilter, consumptionStageFilter, depositoMap, rows, search])

  const selected = filtered.find((row) => row.order.id === selectedId) ?? filtered[0] ?? null
  const pendingConsumptions = filtered.filter(
    (row) => !["consumido", "cerrado"].includes(row.consumptionTracker.stage)
  ).length
  const pendingClosures = filtered.filter((row) => row.closureTracker.stage !== "cerrado").length
  const openAdjustments = filtered.filter(
    (row) => row.closureTracker.stage === "ajuste_abierto"
  ).length
  const totalExpectedConsumption = filtered.reduce((acc, row) => acc + row.expectedConsumption, 0)

  const updateConsumptionTracker = (orderId: number, patch: Partial<LocalConsumptionTracker>) => {
    setConsumptionTrackers((prev) => {
      const current =
        prev.find((tracker) => tracker.orderId === orderId) ??
        buildDefaultConsumptionTracker(ordenes.find((order) => order.id === orderId)!)
      const next = { ...current, ...patch, updatedAt: new Date().toISOString() }
      const others = prev.filter((tracker) => tracker.orderId !== orderId)
      return [...others, next]
    })
  }

  const updateClosureTracker = (orderId: number, patch: Partial<LocalClosureTracker>) => {
    setClosureTrackers((prev) => {
      const current =
        prev.find((tracker) => tracker.orderId === orderId) ??
        buildDefaultClosureTracker(ordenes.find((order) => order.id === orderId)!)
      const next = { ...current, ...patch, updatedAt: new Date().toISOString() }
      const others = prev.filter((tracker) => tracker.orderId !== orderId)
      return [...others, next]
    })
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Producción</h1>
          <p className="mt-1 text-muted-foreground">
            Consola operativa para consumos, ingresos y ajustes de producción sobre órdenes reales,
            con seguimiento local donde el backend todavía no publica el circuito completo.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="bg-transparent"
            onClick={() => void refetch()}
            disabled={loading}
          >
            <RefreshCcw className="mr-2 h-4 w-4" /> Actualizar
          </Button>
          <Button
            variant="outline"
            className="bg-transparent"
            onClick={() => {
              resetConsumptionTrackers()
              resetClosureTrackers()
            }}
          >
            Restablecer seguimiento local
          </Button>
          <Button asChild variant="outline" className="bg-transparent">
            <Link href="/almacenes/ordenes-trabajo">Órdenes de trabajo</Link>
          </Button>
          <Button asChild>
            <Link href="/almacenes/formulas-produccion">Fórmulas</Link>
          </Button>
        </div>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          El legado tenía formularios separados para consumo de orden, ingreso de producción, egreso
          de materia prima y ajustes de fórmula. El backend actual no expone esas mutaciones; esta
          pantalla cubre el circuito operativo en frontend con órdenes y fórmulas reales, sin
          inventar contratos nuevos.
        </AlertDescription>
      </Alert>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Órdenes visibles"
          value={String(filtered.length)}
          description="Órdenes productivas dentro del filtro actual."
        />
        <SummaryCard
          title="Consumos pendientes"
          value={String(pendingConsumptions)}
          description="Órdenes que todavía no cerraron el consumo de componentes."
        />
        <SummaryCard
          title="Cierres pendientes"
          value={String(pendingClosures)}
          description="Ingresos o egresos de producción aún abiertos localmente."
        />
        <SummaryCard
          title="Consumo esperado"
          value={formatQty(totalExpectedConsumption)}
          description="Suma proyectada de materia prima según fórmula y cantidad ordenada."
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Ajustes abiertos"
          value={String(openAdjustments)}
          description="Órdenes con diferencias de producción o merma pendientes."
        />
        <SummaryCard
          title="Fórmulas activas"
          value={String(formulas.length)}
          description="Base real de fórmulas usada para estimar consumos."
        />
        <SummaryCard
          title="Items disponibles"
          value={String(items.length)}
          description="Catálogo real para producto final y componentes."
        />
        <SummaryCard
          title="Depósitos visibles"
          value={String(depositos.length)}
          description="Origen y destino tomados del backend actual."
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros operativos</CardTitle>
          <CardDescription>
            El estado de la orden consulta backend. El resto de filtros ordena el overlay local de
            producción para consumos, ingresos y ajustes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_200px_220px_220px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-10"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por orden, fórmula, producto, depósito o seguimiento..."
              />
            </div>
            <Select
              value={estado || "all"}
              onValueChange={(value) => setEstado(value === "all" ? "" : value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Estado orden" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                <SelectItem value="EN_PROCESO">En proceso</SelectItem>
                <SelectItem value="COMPLETADO">Completado</SelectItem>
                <SelectItem value="CANCELADO">Cancelado</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={consumptionStageFilter}
              onValueChange={(value) =>
                setConsumptionStageFilter(value as "all" | ConsumptionStage)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seguimiento consumo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo consumo</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="en_consumo">En consumo</SelectItem>
                <SelectItem value="consumido">Consumido</SelectItem>
                <SelectItem value="observado">Observado</SelectItem>
                <SelectItem value="cerrado">Cerrado</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={closureStageFilter}
              onValueChange={(value) => setClosureStageFilter(value as "all" | ClosureStage)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seguimiento cierre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo cierre</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="pendiente_ingreso">Pendiente ingreso</SelectItem>
                <SelectItem value="ajuste_abierto">Ajuste abierto</SelectItem>
                <SelectItem value="cerrado">Cerrado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,0.9fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4" /> Circuito productivo visible
            </CardTitle>
            <CardDescription>
              {filtered.length} orden(es) tras filtros. Seleccioná una fila para revisar consumo,
              ingreso y ajustes asociados.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>OT</TableHead>
                  <TableHead>Fórmula</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Estado OT</TableHead>
                  <TableHead>Consumo</TableHead>
                  <TableHead>Cierre</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      Cargando órdenes de producción...
                    </TableCell>
                  </TableRow>
                ) : null}
                {!loading && filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      No hay órdenes que coincidan con los filtros actuales.
                    </TableCell>
                  </TableRow>
                ) : null}
                {!loading
                  ? filtered.map((row) => (
                      <TableRow
                        key={row.order.id}
                        className={selected?.order.id === row.order.id ? "bg-accent/40" : undefined}
                        onClick={() => setSelectedId(row.order.id)}
                      >
                        <TableCell className="font-medium">#{row.order.id}</TableCell>
                        <TableCell>
                          {row.formula?.descripcion ?? `Fórmula #${row.order.formulaId}`}
                        </TableCell>
                        <TableCell>{row.productLabel}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{row.order.estado}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge
                              variant={
                                CONSUMPTION_STAGE_CONFIG[row.consumptionTracker.stage].variant
                              }
                            >
                              {CONSUMPTION_STAGE_CONFIG[row.consumptionTracker.stage].label}
                            </Badge>
                            <p className="text-xs text-muted-foreground">
                              {row.totalComponents} comp. · {formatQty(row.expectedConsumption)}{" "}
                              esperado
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge variant={CLOSURE_STAGE_CONFIG[row.closureTracker.stage].variant}>
                              {CLOSURE_STAGE_CONFIG[row.closureTracker.stage].label}
                            </Badge>
                            <p className="text-xs text-muted-foreground">
                              {formatQty(row.expectedOutput)} prod. esperado
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {selected ? `Producción OT #${selected.order.id}` : "Detalle de producción"}
            </CardTitle>
            <CardDescription>
              {selected
                ? `${selected.formula?.descripcion ?? `Fórmula #${selected.order.formulaId}`} · ${selected.productLabel}`
                : "Seleccioná una orden para revisar el circuito local de producción."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selected ? (
              <Tabs defaultValue="circuito" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="circuito">Circuito</TabsTrigger>
                  <TabsTrigger value="consumos">Consumos</TabsTrigger>
                  <TabsTrigger value="ingreso">Ingreso</TabsTrigger>
                  <TabsTrigger value="seguimiento">Seguimiento</TabsTrigger>
                </TabsList>

                <TabsContent value="circuito" className="space-y-4 pt-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-muted-foreground">Producto final</p>
                      <p className="mt-2 font-medium">{selected.productLabel}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-muted-foreground">Planificación</p>
                      <p className="mt-2 font-medium">{getPlanningStatus(selected.order)}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-muted-foreground">Depósito origen</p>
                      <p className="mt-2 font-medium">
                        {depositoMap.get(selected.order.depositoOrigenId ?? 0) ?? "No definido"}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-muted-foreground">Depósito destino</p>
                      <p className="mt-2 font-medium">
                        {depositoMap.get(selected.order.depositoDestinoId ?? 0) ?? "No definido"}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-muted-foreground">Fecha</p>
                      <p className="mt-2 font-medium">{formatDate(selected.order.fecha)}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-muted-foreground">Fin previsto</p>
                      <p className="mt-2 font-medium">
                        {formatDate(selected.order.fechaFinPrevista)}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-4 text-sm">
                    <p className="font-medium">Gap backend activo</p>
                    <p className="mt-1 text-muted-foreground">
                      No existe endpoint para consumir componentes, registrar ingreso terminado ni
                      abrir ajustes de producción por orden. Este circuito queda documentado aquí
                      para reemplazo operativo del formulario legacy.
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="consumos" className="space-y-4 pt-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-muted-foreground">Componentes</p>
                      <p className="mt-2 text-lg font-semibold">{selected.totalComponents}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-muted-foreground">Consumo esperado</p>
                      <p className="mt-2 text-lg font-semibold">
                        {formatQty(selected.expectedConsumption)}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-muted-foreground">Salud del circuito</p>
                      <p className="mt-2 text-sm font-medium">{getConsumptionHealth(selected)}</p>
                    </div>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Cantidad fórmula</TableHead>
                        <TableHead className="text-right">Esperado OT</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(selected.formula?.componentes ?? []).map((component) => {
                        const factor =
                          selected.formula && selected.formula.cantidadProducida > 0
                            ? selected.order.cantidad / selected.formula.cantidadProducida
                            : 1

                        return (
                          <TableRow key={component.id}>
                            <TableCell className="font-medium">
                              {component.itemDescripcion ??
                                itemMap.get(component.itemId)?.descripcion ??
                                `Item #${component.itemId}`}
                            </TableCell>
                            <TableCell>{formatQty(component.cantidad)}</TableCell>
                            <TableCell className="text-right">
                              {formatQty(component.cantidad * factor)}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                      {(selected.formula?.componentes ?? []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                            La fórmula actual no expone componentes en backend.
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="consumo-real">Consumo real total</Label>
                      <Input
                        id="consumo-real"
                        value={selected.consumptionTracker.actualConsumedQty}
                        onChange={(event) =>
                          updateConsumptionTracker(selected.order.id, {
                            actualConsumedQty: event.target.value,
                          })
                        }
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="merma">Merma / scrap</Label>
                      <Input
                        id="merma"
                        value={selected.consumptionTracker.scrapQty}
                        onChange={(event) =>
                          updateConsumptionTracker(selected.order.id, {
                            scrapQty: event.target.value,
                          })
                        }
                        placeholder="0"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="ingreso" className="space-y-4 pt-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-muted-foreground">Salida materia prima</p>
                      <p className="mt-2 text-lg font-semibold">
                        {selected.closureTracker.materialExitQty ||
                          formatQty(selected.expectedConsumption)}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-muted-foreground">Ingreso esperado</p>
                      <p className="mt-2 text-lg font-semibold">
                        {formatQty(selected.expectedOutput)}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-muted-foreground">Salud del cierre</p>
                      <p className="mt-2 text-sm font-medium">{getClosureHealth(selected)}</p>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="produccion-real">Producción real ingresada</Label>
                      <Input
                        id="produccion-real"
                        value={selected.closureTracker.actualProducedQty}
                        onChange={(event) =>
                          updateClosureTracker(selected.order.id, {
                            actualProducedQty: event.target.value,
                          })
                        }
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="egreso-real">Egreso materia prima registrado</Label>
                      <Input
                        id="egreso-real"
                        value={selected.closureTracker.materialExitQty}
                        onChange={(event) =>
                          updateClosureTracker(selected.order.id, {
                            materialExitQty: event.target.value,
                          })
                        }
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="motivo-ajuste">Motivo de ajuste</Label>
                    <Textarea
                      id="motivo-ajuste"
                      rows={4}
                      value={selected.closureTracker.adjustmentReason}
                      onChange={(event) =>
                        updateClosureTracker(selected.order.id, {
                          adjustmentReason: event.target.value,
                        })
                      }
                      placeholder="Ej.: merma por arranque, diferencia de rendimiento, sobrante recuperado..."
                    />
                  </div>
                </TabsContent>

                <TabsContent value="seguimiento" className="space-y-4 pt-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <ArrowUpRight className="h-4 w-4" /> Seguimiento de consumo
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label>Estado</Label>
                          <Select
                            value={selected.consumptionTracker.stage}
                            onValueChange={(value) =>
                              updateConsumptionTracker(selected.order.id, {
                                stage: value as ConsumptionStage,
                              })
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Seleccionar estado" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pendiente">Pendiente</SelectItem>
                              <SelectItem value="en_consumo">En consumo</SelectItem>
                              <SelectItem value="consumido">Consumido</SelectItem>
                              <SelectItem value="observado">Observado</SelectItem>
                              <SelectItem value="cerrado">Cerrado</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Responsable</Label>
                          <Input
                            value={selected.consumptionTracker.owner}
                            onChange={(event) =>
                              updateConsumptionTracker(selected.order.id, {
                                owner: event.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Lote / referencia</Label>
                          <Input
                            value={selected.consumptionTracker.lotReference}
                            onChange={(event) =>
                              updateConsumptionTracker(selected.order.id, {
                                lotReference: event.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Próximo paso</Label>
                          <Textarea
                            rows={4}
                            value={selected.consumptionTracker.nextStep}
                            onChange={(event) =>
                              updateConsumptionTracker(selected.order.id, {
                                nextStep: event.target.value,
                              })
                            }
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Última actualización: {formatDate(selected.consumptionTracker.updatedAt)}
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <ArrowDownLeft className="h-4 w-4" /> Seguimiento de ingreso y ajuste
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label>Estado</Label>
                          <Select
                            value={selected.closureTracker.stage}
                            onValueChange={(value) =>
                              updateClosureTracker(selected.order.id, {
                                stage: value as ClosureStage,
                              })
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Seleccionar estado" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pendiente">Pendiente</SelectItem>
                              <SelectItem value="pendiente_ingreso">Pendiente ingreso</SelectItem>
                              <SelectItem value="ajuste_abierto">Ajuste abierto</SelectItem>
                              <SelectItem value="cerrado">Cerrado</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Responsable</Label>
                          <Input
                            value={selected.closureTracker.owner}
                            onChange={(event) =>
                              updateClosureTracker(selected.order.id, { owner: event.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Nota operativa</Label>
                          <Textarea
                            rows={4}
                            value={selected.closureTracker.note}
                            onChange={(event) =>
                              updateClosureTracker(selected.order.id, { note: event.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Próximo paso</Label>
                          <Textarea
                            rows={4}
                            value={selected.closureTracker.nextStep}
                            onChange={(event) =>
                              updateClosureTracker(selected.order.id, {
                                nextStep: event.target.value,
                              })
                            }
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Última actualización: {formatDate(selected.closureTracker.updatedAt)}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-4 text-sm">
                    <div className="flex items-center gap-2 font-medium">
                      <GitBranch className="h-4 w-4" /> Puente con circuitos existentes
                    </div>
                    <p className="mt-2 text-muted-foreground">
                      La orden vive en backend, pero consumo de componentes, ingreso terminado y
                      ajustes por rendimiento siguen documentándose acá hasta que existan endpoints
                      específicos de producción.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No hay orden seleccionada para producción.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
