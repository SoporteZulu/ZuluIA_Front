"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  RefreshCw,
  Search,
  ShieldAlert,
} from "lucide-react"
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
import { legacyPurchaseAllocations, type LegacyPurchaseAllocation } from "@/lib/compras-legacy-data"
import { useLegacyLocalCollection } from "@/lib/hooks/useLegacyLocalCollection"
import { useOrdenesCompra } from "@/lib/hooks/useOrdenesCompra"

type AllocationStage = "pendiente" | "en_revision" | "lista_para_cierre" | "cerrada"

type LocalAllocationTracker = {
  allocationId: number
  stage: AllocationStage
  owner: string
  nextStep: string
  updatedAt: string
}

const ALLOCATION_TRACKER_STORAGE_KEY = "zuluia_compras_allocation_trackers"

const STATUS_CONFIG: Record<
  LegacyPurchaseAllocation["estado"],
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  PENDIENTE: { label: "Pendiente", variant: "secondary" },
  IMPUTADA: { label: "Imputada", variant: "default" },
  OBSERVADA: { label: "Observada", variant: "destructive" },
}

const STAGE_CONFIG: Record<
  AllocationStage,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  pendiente: { label: "Pendiente", variant: "outline" },
  en_revision: { label: "En revisión", variant: "secondary" },
  lista_para_cierre: { label: "Lista para cierre", variant: "default" },
  cerrada: { label: "Cerrada", variant: "default" },
}

const DEFAULT_TRACKERS: LocalAllocationTracker[] = legacyPurchaseAllocations.map((item) => ({
  allocationId: item.id,
  stage:
    item.estado === "IMPUTADA"
      ? "cerrada"
      : item.estado === "OBSERVADA"
        ? "en_revision"
        : "pendiente",
  owner: item.responsable,
  nextStep:
    item.estado === "IMPUTADA"
      ? "Mantener trazabilidad del cierre contable."
      : item.estado === "OBSERVADA"
        ? "Resolver observación y cerrar distribución contable."
        : "Confirmar distribución y preparar imputación final.",
  updatedAt: item.fecha,
}))

function formatMoney(value: number, currency = "ARS") {
  return value.toLocaleString("es-AR", { style: "currency", currency })
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString("es-AR") : "-"
}

function matchesTerm(item: LegacyPurchaseAllocation, term: string) {
  if (term === "") return true
  const haystack = [
    item.proveedor,
    item.comprobante,
    item.cuenta,
    item.centroCosto,
    item.circuitoOrigen,
    item.ordenCompraReferencia ?? "",
    item.recepcionReferencia ?? "",
    item.observacion,
    ...item.distribucion.map((row) => `${row.cuenta} ${row.centroCosto}`),
  ]
    .join(" ")
    .toLowerCase()
  return haystack.includes(term)
}

function getAllocationHealth(item: LegacyPurchaseAllocation, tracker: LocalAllocationTracker) {
  if (tracker.stage === "cerrada") return "Imputación cerrada y conciliada"
  if (item.estado === "OBSERVADA") return "Tiene observaciones de prorrateo o costos accesorios"
  if (tracker.stage === "lista_para_cierre") return "Lista para cierre contable"
  return "Pendiente de distribución o validación"
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

export default function ImputacionesCompraPage() {
  const { ordenes, loading: loadingOrders, error: ordersError } = useOrdenesCompra()
  const {
    rows: trackers,
    setRows: setTrackers,
    reset: resetTrackers,
  } = useLegacyLocalCollection<LocalAllocationTracker>(
    ALLOCATION_TRACKER_STORAGE_KEY,
    DEFAULT_TRACKERS
  )

  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<"todas" | "Compras" | "Importación">("todas")
  const [stageFilter, setStageFilter] = useState<"todas" | AllocationStage>("todas")
  const [selectedId, setSelectedId] = useState<number | null>(
    legacyPurchaseAllocations[0]?.id ?? null
  )

  const trackerMap = useMemo(
    () => new Map(trackers.map((tracker) => [tracker.allocationId, tracker])),
    [trackers]
  )

  const allocations = useMemo(
    () =>
      legacyPurchaseAllocations.map((item) => ({
        ...item,
        tracker:
          trackerMap.get(item.id) ?? DEFAULT_TRACKERS.find((row) => row.allocationId === item.id)!,
      })),
    [trackerMap]
  )

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim()
    return allocations.filter((item) => {
      const matchesSearch = matchesTerm(item, term)
      const matchesType = typeFilter === "todas" || item.tipo === typeFilter
      const matchesStage = stageFilter === "todas" || item.tracker.stage === stageFilter
      return matchesSearch && matchesType && matchesStage
    })
  }, [allocations, search, stageFilter, typeFilter])

  const selected = allocations.find((item) => item.id === selectedId) ?? filtered[0] ?? null

  const kpis = useMemo(() => {
    const observed = allocations.filter((item) => item.estado === "OBSERVADA").length
    const imported = allocations.filter((item) => item.tipo === "Importación").length
    const closed = allocations.filter((item) => item.tracker.stage === "cerrada").length
    const total = allocations.reduce((acc, item) => acc + item.importe, 0)
    return { observed, imported, closed, total }
  }, [allocations])

  const queue = useMemo(() => {
    const order: Record<AllocationStage, number> = {
      en_revision: 0,
      pendiente: 1,
      lista_para_cierre: 2,
      cerrada: 3,
    }
    return [...filtered]
      .sort(
        (left, right) =>
          order[left.tracker.stage] - order[right.tracker.stage] || right.importe - left.importe
      )
      .slice(0, 5)
  }, [filtered])

  const updateTracker = (allocationId: number, patch: Partial<LocalAllocationTracker>) => {
    setTrackers((current) => {
      const index = current.findIndex((row) => row.allocationId === allocationId)
      const nextRow = {
        ...(index >= 0
          ? current[index]
          : DEFAULT_TRACKERS.find((row) => row.allocationId === allocationId)!),
        ...patch,
        updatedAt: new Date().toISOString(),
      }
      if (index >= 0) return current.map((row, rowIndex) => (rowIndex === index ? nextRow : row))
      return [...current, nextRow]
    })
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Imputaciones de compras</h1>
          <p className="text-muted-foreground">
            Consola contable para distribución, observaciones y cierre de imputaciones de compras.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="bg-transparent" asChild>
            <Link href="/compras/facturas">Ver facturas</Link>
          </Button>
          <Button asChild>
            <Link href="/compras/reportes">
              <ArrowRight className="mr-2 h-4 w-4" />
              Ir a reportes
            </Link>
          </Button>
        </div>
      </div>

      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertDescription>
          El backend actual no expone imputaciones contables de compras ni prorrateos de
          importación. Esta vista cubre el análisis y seguimiento local hasta el cierre contable
          real.
        </AlertDescription>
      </Alert>
      {ordersError && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{ordersError}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Observadas</p>
            <p className="mt-2 text-2xl font-bold text-amber-600">{kpis.observed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Importación</p>
            <p className="mt-2 text-2xl font-bold">{kpis.imported}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Cerradas</p>
            <p className="mt-2 text-2xl font-bold text-emerald-600">{kpis.closed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Importe visible</p>
            <p className="mt-2 text-2xl font-bold">{formatMoney(kpis.total)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">Continuidad operativa</CardTitle>
            <CardDescription>
              Las imputaciones enlazan factura, recepción y eventual nota de crédito, pero su
              persistencia sigue fuera del backend actual.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" className="bg-transparent" onClick={() => resetTrackers()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Restablecer tablero local
            </Button>
            <Button asChild>
              <Link href="/compras/notas-credito">
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Ver notas
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">Cobertura real</CardTitle>
            <CardDescription>
              Órdenes visibles hoy para sostener el contexto del gasto.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{loadingOrders ? "..." : ordenes.length}</p>
            <p className="text-sm text-muted-foreground">órdenes disponibles</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 lg:grid-cols-[1.7fr_repeat(2,minmax(0,1fr))]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar proveedor, cuenta, comprobante, recepción o centro de costo..."
              />
            </div>
            <Select
              value={typeFilter}
              onValueChange={(value) => setTypeFilter(value as "todas" | "Compras" | "Importación")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todos los tipos</SelectItem>
                <SelectItem value="Compras">Compras</SelectItem>
                <SelectItem value="Importación">Importación</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={stageFilter}
              onValueChange={(value) => setStageFilter(value as "todas" | AllocationStage)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seguimiento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todo el seguimiento</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="en_revision">En revisión</SelectItem>
                <SelectItem value="lista_para_cierre">Lista para cierre</SelectItem>
                <SelectItem value="cerrada">Cerrada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.8fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lote de imputaciones</CardTitle>
            <CardDescription>
              Distribución contable, centro de costo y observaciones del circuito.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Cuenta</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Seguimiento</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">IMP-{item.id}</TableCell>
                    <TableCell>{item.tipo}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p>{item.proveedor}</p>
                        <p className="text-xs text-muted-foreground">{item.comprobante}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p>{item.cuenta}</p>
                        <p className="text-xs text-muted-foreground">{item.centroCosto}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_CONFIG[item.estado].variant}>
                        {STATUS_CONFIG[item.estado].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STAGE_CONFIG[item.tracker.stage].variant}>
                        {STAGE_CONFIG[item.tracker.stage].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => setSelectedId(item.id)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No hay imputaciones que coincidan con los filtros actuales.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cola operativa</CardTitle>
            <CardDescription>Se priorizan observadas y montos altos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {queue.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                className="w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">IMP-{item.id}</p>
                    <p className="text-sm text-muted-foreground">{item.proveedor}</p>
                  </div>
                  <Badge variant={STAGE_CONFIG[item.tracker.stage].variant}>
                    {STAGE_CONFIG[item.tracker.stage].label}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {getAllocationHealth(item, item.tracker)}
                </p>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{selected ? `Imputación IMP-${selected.id}` : "Imputación"}</DialogTitle>
            <DialogDescription>
              {selected
                ? `${selected.proveedor} · ${selected.comprobante} · ${selected.centroCosto}`
                : "Detalle de imputación"}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <Tabs defaultValue="circuito">
              <TabsList className="grid h-auto w-full grid-cols-4">
                <TabsTrigger value="circuito">Circuito</TabsTrigger>
                <TabsTrigger value="distribucion">Distribución</TabsTrigger>
                <TabsTrigger value="observaciones">Observaciones</TabsTrigger>
                <TabsTrigger value="seguimiento">Seguimiento</TabsTrigger>
              </TabsList>
              <TabsContent value="circuito" className="space-y-4 pt-2">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Cabecera contable</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <DetailFieldGrid
                        fields={[
                          { label: "Proveedor", value: selected.proveedor },
                          { label: "Comprobante", value: selected.comprobante },
                          { label: "Tipo", value: selected.tipo },
                          { label: "Cuenta principal", value: selected.cuenta },
                          { label: "Centro de costo", value: selected.centroCosto },
                          {
                            label: "Orden asociada",
                            value: selected.ordenCompraReferencia ?? "Sin orden visible",
                          },
                          {
                            label: "Recepción asociada",
                            value: selected.recepcionReferencia ?? "Sin recepción visible",
                          },
                          {
                            label: "Salud del circuito",
                            value: getAllocationHealth(selected, selected.tracker),
                          },
                        ]}
                      />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Importe y origen</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <DetailFieldGrid
                        fields={[
                          {
                            label: "Importe",
                            value: formatMoney(selected.importe, selected.moneda),
                          },
                          { label: "Moneda", value: selected.moneda },
                          {
                            label: "Responsable",
                            value: selected.tracker.owner || selected.responsable,
                          },
                          { label: "Circuito origen", value: selected.circuitoOrigen },
                          { label: "Fecha", value: formatDate(selected.fecha) },
                          { label: "Estado legado", value: STATUS_CONFIG[selected.estado].label },
                          {
                            label: "Seguimiento local",
                            value: STAGE_CONFIG[selected.tracker.stage].label,
                          },
                          { label: "Órdenes backend visibles", value: String(ordenes.length) },
                        ]}
                      />
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              <TabsContent value="distribucion" className="pt-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Prorrateo visible</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cuenta</TableHead>
                          <TableHead>Centro costo</TableHead>
                          <TableHead>Porcentaje</TableHead>
                          <TableHead>Importe</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selected.distribucion.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell className="font-medium">{row.cuenta}</TableCell>
                            <TableCell>{row.centroCosto}</TableCell>
                            <TableCell>{row.porcentaje}%</TableCell>
                            <TableCell>{formatMoney(row.importe, selected.moneda)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="observaciones" className="pt-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Observaciones del circuito</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <p className="text-muted-foreground">{selected.observacion}</p>
                    <div className="space-y-2">
                      {selected.detallesClave.map((detail) => (
                        <div
                          key={detail}
                          className="rounded-lg bg-muted/40 p-3 text-muted-foreground"
                        >
                          {detail}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="seguimiento" className="space-y-4 pt-2">
                <Alert>
                  <ShieldAlert className="h-4 w-4" />
                  <AlertDescription>
                    Este seguimiento se guarda solo en el navegador actual y cubre el trabajo de
                    conciliación contable hasta que exista backend formal de imputaciones.
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
                            updateTracker(selected.id, { stage: value as AllocationStage })
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Seleccionar estado" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pendiente">Pendiente</SelectItem>
                            <SelectItem value="en_revision">En revisión</SelectItem>
                            <SelectItem value="lista_para_cierre">Lista para cierre</SelectItem>
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
                        <label className="text-sm font-medium">Próximo paso</label>
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
                      <CardTitle className="text-base">Continuidad del circuito</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">Estado actual</p>
                        <p className="mt-1 font-medium">
                          {getAllocationHealth(selected, selected.tracker)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">Última actualización local</p>
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
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
