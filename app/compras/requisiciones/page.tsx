"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Eye,
  FileStack,
  Landmark,
  RefreshCw,
  Search,
  ShieldAlert,
  ShoppingCart,
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
import {
  legacyPurchaseQuotations,
  legacyPurchaseRequisitions,
  type LegacyPurchaseRequisition,
} from "@/lib/compras-legacy-data"
import { useLegacyLocalCollection } from "@/lib/hooks/useLegacyLocalCollection"
import { useOrdenesCompra } from "@/lib/hooks/useOrdenesCompra"

type RequisitionStage = "sin_revisar" | "en_preparacion" | "lista_para_cotizar" | "derivada"

type LocalRequisitionTracker = {
  requisitionId: number
  stage: RequisitionStage
  buyer: string
  nextStep: string
  updatedAt: string
}

const REQUISITION_TRACKER_STORAGE_KEY = "zuluia_compras_requisition_trackers"

const STATUS_CONFIG: Record<
  LegacyPurchaseRequisition["estado"],
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  ABIERTA: { label: "Abierta", variant: "secondary" },
  EN_PROCESO: { label: "En proceso", variant: "default" },
  COTIZADA: { label: "Cotizada", variant: "default" },
  CANCELADA: { label: "Cancelada", variant: "destructive" },
}

const STAGE_CONFIG: Record<
  RequisitionStage,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  sin_revisar: { label: "Sin revisar", variant: "outline" },
  en_preparacion: { label: "En preparación", variant: "secondary" },
  lista_para_cotizar: { label: "Lista para cotizar", variant: "default" },
  derivada: { label: "Derivada", variant: "default" },
}

const DEFAULT_TRACKERS: LocalRequisitionTracker[] = legacyPurchaseRequisitions.map(
  (requisition) => ({
    requisitionId: requisition.id,
    stage: requisition.cotizacionReferencia
      ? requisition.ordenCompraReferencia
        ? "derivada"
        : "lista_para_cotizar"
      : requisition.estado === "ABIERTA"
        ? "sin_revisar"
        : "en_preparacion",
    buyer: requisition.compradorAsignado,
    nextStep: requisition.ordenCompraReferencia
      ? "Mantener trazabilidad del origen; la orden ya está emitida."
      : requisition.cotizacionReferencia
        ? "Completar comparativa comercial y decidir si pasa a orden."
        : "Preparar lote y enviar a cotización manual.",
    updatedAt: requisition.fecha,
  })
)

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString("es-AR") : "-"
}

function formatMoney(value: number, currency = "ARS") {
  return value.toLocaleString("es-AR", { style: "currency", currency })
}

function getDaysUntil(value: string) {
  const target = new Date(value)
  const today = new Date()
  target.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  return Math.floor((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function matchesTerm(requisition: LegacyPurchaseRequisition, term: string) {
  if (term === "") return true

  const haystack = [
    requisition.solicitante,
    requisition.area,
    requisition.motivo,
    requisition.origen,
    requisition.destino,
    requisition.centroCosto,
    requisition.proveedorSugerido ?? "",
    requisition.cotizacionReferencia ?? "",
    requisition.ordenCompraReferencia ?? "",
    String(requisition.id),
    ...requisition.items.map((item) => `${item.codigo} ${item.descripcion} ${item.destino}`),
  ]
    .join(" ")
    .toLowerCase()

  return haystack.includes(term)
}

function getRequisitionHealth(
  requisition: LegacyPurchaseRequisition,
  tracker: LocalRequisitionTracker
) {
  if (tracker.stage === "derivada") return "El requerimiento ya fue derivado al circuito siguiente"
  if (tracker.stage === "lista_para_cotizar")
    return "El lote ya está preparado para pasar a cotización"
  if (requisition.requiereValidacionTecnica) return "Falta validación técnica antes de cotizar"
  return "Pendiente de consolidación operativa"
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

export default function RequisicionesCompraPage() {
  const { ordenes, loading: loadingOrders, error: ordersError } = useOrdenesCompra()
  const {
    rows: trackers,
    setRows: setTrackers,
    reset: resetTrackers,
  } = useLegacyLocalCollection<LocalRequisitionTracker>(
    REQUISITION_TRACKER_STORAGE_KEY,
    DEFAULT_TRACKERS
  )

  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState<number | null>(
    legacyPurchaseRequisitions[0]?.id ?? null
  )
  const [typeFilter, setTypeFilter] = useState<"todas" | "Compra" | "Obra">("todas")
  const [stageFilter, setStageFilter] = useState<"todas" | RequisitionStage>("todas")

  const trackerMap = useMemo(
    () => new Map(trackers.map((tracker) => [tracker.requisitionId, tracker])),
    [trackers]
  )

  const requisitions = useMemo(
    () =>
      legacyPurchaseRequisitions.map((requisition) => ({
        ...requisition,
        tracker:
          trackerMap.get(requisition.id) ??
          DEFAULT_TRACKERS.find((row) => row.requisitionId === requisition.id)!,
        daysToDue: getDaysUntil(requisition.vencimiento),
        totalUnits: requisition.items.reduce((acc, item) => acc + item.cantidad, 0),
        linkedQuotation:
          legacyPurchaseQuotations.find((quote) => quote.id === requisition.cotizacionId) ?? null,
      })),
    [trackerMap]
  )

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim()
    return requisitions.filter((requisition) => {
      const matchesSearch = matchesTerm(requisition, term)
      const matchesType = typeFilter === "todas" || requisition.tipo === typeFilter
      const matchesStage = stageFilter === "todas" || requisition.tracker.stage === stageFilter
      return matchesSearch && matchesType && matchesStage
    })
  }, [requisitions, search, stageFilter, typeFilter])

  const selected = requisitions.find((req) => req.id === selectedId) ?? filtered[0] ?? null

  const kpis = useMemo(() => {
    const linked = requisitions.filter((req) => req.cotizacionReferencia).length
    const technical = requisitions.filter((req) => req.requiereValidacionTecnica).length
    const ready = requisitions.filter((req) => req.tracker.stage === "lista_para_cotizar").length
    const pendingBudget = requisitions.reduce((acc, req) => acc + req.presupuestoEstimado, 0)
    return {
      total: requisitions.length,
      linked,
      technical,
      ready,
      pendingBudget,
    }
  }, [requisitions])

  const queue = useMemo(() => {
    const stageOrder: Record<RequisitionStage, number> = {
      lista_para_cotizar: 0,
      en_preparacion: 1,
      sin_revisar: 2,
      derivada: 3,
    }
    const priorityOrder = { Alta: 0, Media: 1, Baja: 2 }
    return [...filtered]
      .sort((left, right) => {
        if (stageOrder[left.tracker.stage] !== stageOrder[right.tracker.stage]) {
          return stageOrder[left.tracker.stage] - stageOrder[right.tracker.stage]
        }
        if (priorityOrder[left.prioridad] !== priorityOrder[right.prioridad]) {
          return priorityOrder[left.prioridad] - priorityOrder[right.prioridad]
        }
        return left.daysToDue - right.daysToDue
      })
      .slice(0, 5)
  }, [filtered])

  const updateTracker = (requisitionId: number, patch: Partial<LocalRequisitionTracker>) => {
    setTrackers((current) => {
      const index = current.findIndex((row) => row.requisitionId === requisitionId)
      const nextRow = {
        ...(index >= 0
          ? current[index]
          : DEFAULT_TRACKERS.find((row) => row.requisitionId === requisitionId)!),
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
          <h1 className="text-3xl font-bold tracking-tight">Requisiciones de compra</h1>
          <p className="text-muted-foreground">
            Consola del origen manual legacy antes de cotización y emisión de orden.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="bg-transparent" asChild>
            <Link href="/compras/solicitudes">
              <ClipboardList className="mr-2 h-4 w-4" />
              Ver solicitudes
            </Link>
          </Button>
          <Button asChild>
            <Link href="/compras/cotizaciones">
              <ArrowRight className="mr-2 h-4 w-4" />
              Ir a cotizaciones
            </Link>
          </Button>
        </div>
      </div>

      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertDescription>
          El backend actual no expone un alta formal de requisiciones de compra. Esta vista cubre el
          origen manual legacy, los renglones, la preparación para cotizar y el seguimiento local
          hasta derivar el caso a [cotizaciones](app/compras/cotizaciones/page.tsx) u
          [ordenes](app/compras/ordenes/page.tsx).
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
            <p className="text-xs text-muted-foreground">Requisiciones visibles</p>
            <p className="mt-2 text-2xl font-bold">{kpis.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Con cotización asociada</p>
            <p className="mt-2 text-2xl font-bold">{kpis.linked}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Validación técnica</p>
            <p className="mt-2 text-2xl font-bold text-amber-600">{kpis.technical}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Presupuesto visible</p>
            <p className="mt-2 text-2xl font-bold">{formatMoney(kpis.pendingBudget)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">Entrada del circuito</CardTitle>
            <CardDescription>
              Las requisiciones conviven con la reposición automática pero responden a pedidos por
              área, obra o ingeniería.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/compras/solicitudes">
                <ArrowRight className="mr-2 h-4 w-4" />
                Ver radar de reposición
              </Link>
            </Button>
            <Button variant="outline" className="bg-transparent" asChild>
              <Link href="/compras/cotizaciones">Ir a cotizaciones</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">Seguimiento local</CardTitle>
            <CardDescription>
              Persistencia en navegador para cubrir análisis y derivación mientras no exista API.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" className="bg-transparent" onClick={() => resetTrackers()}>
              <RefreshCw className="mr-2 h-4 w-4" /> Restablecer tablero local
            </Button>
            <Button asChild>
              <Link href="/compras/ordenes">
                <ShoppingCart className="mr-2 h-4 w-4" />
                Ir a ordenes
              </Link>
            </Button>
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
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar solicitante, área, motivo, item, cotización o orden..."
              />
            </div>
            <Select
              value={typeFilter}
              onValueChange={(value) => setTypeFilter(value as "todas" | "Compra" | "Obra")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todos los tipos</SelectItem>
                <SelectItem value="Compra">Compra</SelectItem>
                <SelectItem value="Obra">Obra</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={stageFilter}
              onValueChange={(value) => setStageFilter(value as "todas" | RequisitionStage)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seguimiento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todo el seguimiento</SelectItem>
                <SelectItem value="sin_revisar">Sin revisar</SelectItem>
                <SelectItem value="en_preparacion">En preparación</SelectItem>
                <SelectItem value="lista_para_cotizar">Lista para cotizar</SelectItem>
                <SelectItem value="derivada">Derivada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.8fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lote de requisiciones</CardTitle>
            <CardDescription>
              Origen del pedido, responsable, derivación y preparación para cotización.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Origen</TableHead>
                  <TableHead>Solicitante</TableHead>
                  <TableHead>Vence</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Seguimiento</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">REQ-{req.id}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p>{req.tipo}</p>
                        <p className="text-xs text-muted-foreground">{req.modalidad}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p>{req.solicitante}</p>
                        <p className="text-xs text-muted-foreground">{req.area}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p>{formatDate(req.vencimiento)}</p>
                        <p className="text-xs text-muted-foreground">
                          {req.daysToDue < 0
                            ? `Vencida hace ${Math.abs(req.daysToDue)} dias`
                            : `Vence en ${req.daysToDue} dias`}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_CONFIG[req.estado].variant}>
                        {STATUS_CONFIG[req.estado].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STAGE_CONFIG[req.tracker.stage].variant}>
                        {STAGE_CONFIG[req.tracker.stage].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => setSelectedId(req.id)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No hay requisiciones que coincidan con los filtros actuales.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cola operativa</CardTitle>
              <CardDescription>
                Casos que conviene revisar primero por vencimiento o derivación pendiente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {queue.map((req) => (
                <button
                  key={req.id}
                  type="button"
                  onClick={() => setSelectedId(req.id)}
                  className="w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">REQ-{req.id}</p>
                      <p className="text-sm text-muted-foreground">{req.motivo}</p>
                    </div>
                    <Badge variant={STAGE_CONFIG[req.tracker.stage].variant}>
                      {STAGE_CONFIG[req.tracker.stage].label}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {getRequisitionHealth(req, req.tracker)}
                  </p>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Salida real disponible</CardTitle>
              <CardDescription>
                Puentes existentes con el resto del circuito de compras.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Listas para cotizar</p>
                <p className="mt-1 text-2xl font-bold text-emerald-600">{kpis.ready}</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Órdenes visibles en backend</p>
                <p className="mt-1 text-2xl font-bold">{loadingOrders ? "..." : ordenes.length}</p>
              </div>
              <p className="text-muted-foreground">
                Esta pantalla no emite requisiciones en backend; prepara el caso, deja trazabilidad
                y deriva a Cotizaciones u Órdenes según el estado real del circuito.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{selected ? `Requisición REQ-${selected.id}` : "Requisición"}</DialogTitle>
            <DialogDescription>
              {selected
                ? `${selected.solicitante} · ${selected.area} · ${selected.destino}`
                : "Detalle de requisición"}
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <Tabs defaultValue="circuito">
              <TabsList className="grid h-auto w-full grid-cols-4">
                <TabsTrigger value="circuito">Circuito</TabsTrigger>
                <TabsTrigger value="items">Items</TabsTrigger>
                <TabsTrigger value="vinculos">Vínculos</TabsTrigger>
                <TabsTrigger value="seguimiento">Seguimiento</TabsTrigger>
              </TabsList>

              <TabsContent value="circuito" className="space-y-4 pt-2">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <FileStack className="h-4 w-4" /> Cabecera operativa
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <DetailFieldGrid
                        fields={[
                          { label: "Tipo", value: `${selected.tipo} · ${selected.modalidad}` },
                          { label: "Solicitante", value: selected.solicitante },
                          { label: "Área", value: selected.area },
                          { label: "Prioridad", value: selected.prioridad },
                          { label: "Estado", value: STATUS_CONFIG[selected.estado].label },
                          {
                            label: "Comprador asignado",
                            value: selected.tracker.buyer || selected.compradorAsignado,
                          },
                          { label: "Centro de costo", value: selected.centroCosto },
                          {
                            label: "Presupuesto",
                            value: formatMoney(selected.presupuestoEstimado, selected.moneda),
                          },
                        ]}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Landmark className="h-4 w-4" /> Origen y control
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <DetailFieldGrid
                        fields={[
                          { label: "Origen", value: selected.origen },
                          { label: "Destino", value: selected.destino },
                          { label: "Fecha", value: formatDate(selected.fecha) },
                          { label: "Vencimiento", value: formatDate(selected.vencimiento) },
                          { label: "Aprobador", value: selected.aprobador },
                          {
                            label: "Validación técnica",
                            value: selected.requiereValidacionTecnica
                              ? "Requerida"
                              : "No requerida",
                          },
                          {
                            label: "Proveedor sugerido",
                            value: selected.proveedorSugerido ?? "Sin sugerencia visible",
                          },
                          {
                            label: "Salud del circuito",
                            value: getRequisitionHealth(selected, selected.tracker),
                          },
                        ]}
                      />
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Motivo y observaciones clave</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <p className="text-muted-foreground">{selected.motivo}</p>
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

              <TabsContent value="items" className="space-y-4 pt-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Renglones solicitados</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Código</TableHead>
                          <TableHead>Descripción</TableHead>
                          <TableHead>Cantidad</TableHead>
                          <TableHead>Faltante</TableHead>
                          <TableHead>Destino</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selected.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.codigo}</TableCell>
                            <TableCell>{item.descripcion}</TableCell>
                            <TableCell>
                              {item.cantidad} {item.unidad}
                            </TableCell>
                            <TableCell>{item.faltante}</TableCell>
                            <TableCell>{item.destino}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="vinculos" className="space-y-4 pt-2">
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardContent className="pt-4 pb-4">
                      <p className="text-xs text-muted-foreground">Cotización vinculada</p>
                      <p className="mt-2 font-semibold">
                        {selected.cotizacionReferencia ?? "Todavía sin cotización"}
                      </p>
                      <div className="mt-3">
                        <Button size="sm" asChild>
                          <Link href="/compras/cotizaciones">Ver cotizaciones</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 pb-4">
                      <p className="text-xs text-muted-foreground">Orden asociada</p>
                      <p className="mt-2 font-semibold">
                        {selected.ordenCompraReferencia ?? "Sin orden emitida"}
                      </p>
                      <div className="mt-3">
                        <Button size="sm" variant="outline" className="bg-transparent" asChild>
                          <Link href="/compras/ordenes">Ver órdenes</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 pb-4">
                      <p className="text-xs text-muted-foreground">Oferta visible</p>
                      <p className="mt-2 font-semibold">
                        {selected.linkedQuotation
                          ? formatMoney(
                              selected.linkedQuotation.total,
                              selected.linkedQuotation.moneda
                            )
                          : "Sin importe cotizado aún"}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="seguimiento" className="space-y-4 pt-2">
                <Alert>
                  <ShieldAlert className="h-4 w-4" />
                  <AlertDescription>
                    Este seguimiento se guarda solo en el navegador actual para cubrir preparación,
                    derivación y notas internas mientras no exista backend formal para
                    requisiciones.
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
                            updateTracker(selected.id, { stage: value as RequisitionStage })
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Seleccionar estado" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sin_revisar">Sin revisar</SelectItem>
                            <SelectItem value="en_preparacion">En preparación</SelectItem>
                            <SelectItem value="lista_para_cotizar">Lista para cotizar</SelectItem>
                            <SelectItem value="derivada">Derivada</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Comprador responsable</label>
                        <Input
                          value={selected.tracker.buyer}
                          onChange={(event) =>
                            updateTracker(selected.id, { buyer: event.target.value })
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
                      <CardTitle className="text-base">Salida recomendada</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">Estado actual</p>
                        <p className="mt-1 font-medium">
                          {getRequisitionHealth(selected, selected.tracker)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">Ultima actualización local</p>
                        <p className="mt-1 font-medium">{formatDate(selected.tracker.updatedAt)}</p>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">Paso sugerido</p>
                        <p className="mt-1 font-medium">{selected.tracker.nextStep}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-2">
                        <Button variant="outline" className="bg-transparent" asChild>
                          <Link href="/compras/cotizaciones">
                            <ClipboardList className="mr-2 h-4 w-4" />
                            Continuar en cotizaciones
                          </Link>
                        </Button>
                        <Button asChild>
                          <Link href="/compras/ordenes">
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Ver órdenes
                          </Link>
                        </Button>
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
