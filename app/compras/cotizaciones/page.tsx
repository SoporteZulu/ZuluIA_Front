"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Eye,
  FileStack,
  Landmark,
  RefreshCw,
  Search,
  ShieldAlert,
  ShoppingCart,
  Truck,
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
import { useLegacyLocalCollection } from "@/lib/hooks/useLegacyLocalCollection"
import { legacyPurchaseQuotations, type LegacyPurchaseQuotation } from "@/lib/compras-legacy-data"
import { useOrdenesCompra } from "@/lib/hooks/useOrdenesCompra"
import { useProveedores } from "@/lib/hooks/useTerceros"

type TrackerStage = "sin_revisar" | "en_analisis" | "en_espera_proveedor" | "lista_para_orden"

type LocalQuotationTracker = {
  quotationId: number
  stage: TrackerStage
  buyer: string
  nextStep: string
  updatedAt: string
}

const QUOTATION_TRACKER_STORAGE_KEY = "zuluia_compras_quotation_trackers"

const STATUS_CONFIG: Record<
  LegacyPurchaseQuotation["estado"],
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  BORRADOR: { label: "Borrador", variant: "outline" },
  ENVIADA: { label: "Enviada", variant: "secondary" },
  NEGOCIACION: { label: "Negociacion", variant: "default" },
  APROBADA: { label: "Aprobada", variant: "default" },
}

const TRACKER_STAGE_CONFIG: Record<
  TrackerStage,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  sin_revisar: { label: "Sin revisar", variant: "outline" },
  en_analisis: { label: "En analisis", variant: "secondary" },
  en_espera_proveedor: { label: "En espera proveedor", variant: "default" },
  lista_para_orden: { label: "Lista para orden", variant: "default" },
}

const DEFAULT_TRACKERS: LocalQuotationTracker[] = legacyPurchaseQuotations.map((quote) => ({
  quotationId: quote.id,
  stage: quote.readyForOrder
    ? "lista_para_orden"
    : quote.estado === "BORRADOR"
      ? "sin_revisar"
      : "en_analisis",
  buyer: quote.comprador,
  nextStep: quote.readyForOrder
    ? "Emitir orden de compra manual desde el circuito real de ordenes."
    : quote.estado === "BORRADOR"
      ? "Completar comparativa y validar condiciones comerciales."
      : "Cerrar decision comercial y definir proveedor ganador.",
  updatedAt: quote.fecha,
}))

function formatMoney(value: number, currency = "ARS") {
  return value.toLocaleString("es-AR", { style: "currency", currency })
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString("es-AR") : "-"
}

function getDaysUntil(value: string) {
  const target = new Date(value)
  const today = new Date()
  target.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  return Math.floor((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function matchesTerm(quote: LegacyPurchaseQuotation, term: string) {
  if (term === "") return true

  const haystack = [
    quote.proveedor,
    quote.observacion,
    quote.requisicionReferencia,
    quote.solicitudOrigen,
    quote.depositoDestino,
    quote.sectorSolicitante,
    quote.comprador,
    String(quote.id),
    ...quote.items.map((item) => `${item.codigo} ${item.descripcion}`),
    ...quote.comparativa.map((option) => option.proveedor),
  ]
    .join(" ")
    .toLowerCase()

  return haystack.includes(term)
}

function getComparisonSpread(quote: LegacyPurchaseQuotation) {
  const cheapest = Math.min(...quote.comparativa.map((option) => option.total))
  return quote.total - cheapest
}

function getQuotationHealth(quote: LegacyPurchaseQuotation, tracker: LocalQuotationTracker) {
  if (tracker.stage === "lista_para_orden") return "Lista para pasar al circuito real de ordenes"
  if (quote.estado === "BORRADOR") return "Pendiente de completar antes de enviar a proveedores"
  if (quote.estado === "NEGOCIACION") return "Negociacion comercial abierta"
  if (quote.estado === "ENVIADA") return "Esperando respuesta o confirmacion de comparativa"
  return "Aprobada comercialmente"
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

export default function CotizacionesCompraPage() {
  const {
    terceros: proveedores,
    loading: loadingProviders,
    error: providersError,
  } = useProveedores()
  const { ordenes, loading: loadingOrders, error: ordersError } = useOrdenesCompra()
  const {
    rows: trackers,
    setRows: setTrackers,
    reset: resetTrackers,
  } = useLegacyLocalCollection<LocalQuotationTracker>(
    QUOTATION_TRACKER_STORAGE_KEY,
    DEFAULT_TRACKERS
  )

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"todas" | LegacyPurchaseQuotation["estado"]>(
    "todas"
  )
  const [priorityFilter, setPriorityFilter] = useState<
    "todas" | LegacyPurchaseQuotation["prioridad"]
  >("todas")
  const [stageFilter, setStageFilter] = useState<"todas" | TrackerStage>("todas")
  const [selectedId, setSelectedId] = useState<number | null>(
    legacyPurchaseQuotations[0]?.id ?? null
  )

  const trackerMap = useMemo(
    () => new Map(trackers.map((tracker) => [tracker.quotationId, tracker])),
    [trackers]
  )

  const enrichedQuotes = useMemo(
    () =>
      legacyPurchaseQuotations.map((quote) => ({
        ...quote,
        tracker:
          trackerMap.get(quote.id) ?? DEFAULT_TRACKERS.find((row) => row.quotationId === quote.id)!,
        spread: getComparisonSpread(quote),
        daysToExpire: getDaysUntil(quote.vigenteHasta),
      })),
    [trackerMap]
  )

  const filteredQuotes = useMemo(() => {
    const term = search.toLowerCase().trim()
    return enrichedQuotes.filter((quote) => {
      const matchesSearch = matchesTerm(quote, term)
      const matchesStatus = statusFilter === "todas" || quote.estado === statusFilter
      const matchesPriority = priorityFilter === "todas" || quote.prioridad === priorityFilter
      const matchesStage = stageFilter === "todas" || quote.tracker.stage === stageFilter
      return matchesSearch && matchesStatus && matchesPriority && matchesStage
    })
  }, [enrichedQuotes, priorityFilter, search, stageFilter, statusFilter])

  const selectedQuote =
    enrichedQuotes.find((quote) => quote.id === selectedId) ?? filteredQuotes[0] ?? null

  const kpis = useMemo(() => {
    const ready = enrichedQuotes.filter(
      (quote) => quote.tracker.stage === "lista_para_orden"
    ).length
    const negotiationAmount = enrichedQuotes
      .filter((quote) => quote.estado === "NEGOCIACION" || quote.estado === "ENVIADA")
      .reduce((acc, quote) => acc + quote.total, 0)
    const expiringSoon = enrichedQuotes.filter((quote) => quote.daysToExpire <= 5).length
    const suppliersInPlay = new Set(
      enrichedQuotes.flatMap((quote) => quote.comparativa.map((option) => option.proveedor))
    ).size

    return {
      total: enrichedQuotes.length,
      ready,
      negotiationAmount,
      expiringSoon,
      suppliersInPlay,
    }
  }, [enrichedQuotes])

  const queueQuotes = useMemo(() => {
    const stageOrder: Record<TrackerStage, number> = {
      lista_para_orden: 0,
      en_analisis: 1,
      en_espera_proveedor: 2,
      sin_revisar: 3,
    }
    const priorityOrder = { Alta: 0, Media: 1, Baja: 2 }

    return [...filteredQuotes]
      .sort((left, right) => {
        if (stageOrder[left.tracker.stage] !== stageOrder[right.tracker.stage]) {
          return stageOrder[left.tracker.stage] - stageOrder[right.tracker.stage]
        }
        if (priorityOrder[left.prioridad] !== priorityOrder[right.prioridad]) {
          return priorityOrder[left.prioridad] - priorityOrder[right.prioridad]
        }
        return left.daysToExpire - right.daysToExpire
      })
      .slice(0, 5)
  }, [filteredQuotes])

  const updateTracker = (quotationId: number, patch: Partial<LocalQuotationTracker>) => {
    setTrackers((current) => {
      const index = current.findIndex((row) => row.quotationId === quotationId)
      const nextRow = {
        ...(index >= 0
          ? current[index]
          : DEFAULT_TRACKERS.find((row) => row.quotationId === quotationId)!),
        ...patch,
        updatedAt: new Date().toISOString(),
      }

      if (index >= 0) {
        return current.map((row, rowIndex) => (rowIndex === index ? nextRow : row))
      }

      return [...current, nextRow]
    })
  }

  const activeProviders = proveedores.filter((provider) => provider.activo)

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cotizaciones de compra</h1>
          <p className="text-muted-foreground">
            Consola operativa del circuito legacy de cotizacion con seguimiento local y salida al
            flujo real de ordenes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="bg-transparent" asChild>
            <Link href="/compras/requisiciones">
              <ClipboardList className="mr-2 h-4 w-4" />
              Ver requisiciones
            </Link>
          </Button>
          <Button asChild>
            <Link href="/compras/ordenes">
              <ShoppingCart className="mr-2 h-4 w-4" />
              Ir a ordenes
            </Link>
          </Button>
        </div>
      </div>

      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertDescription>
          El backend actual no publica un endpoint para alta, aprobacion o procesamiento de
          cotizaciones de compra. Esta vista cubre la comparativa, el detalle y el seguimiento
          operativo con dataset legado y persistencia local en navegador, dejando el pase a ordenes
          en el circuito real ya disponible.
        </AlertDescription>
      </Alert>

      {(providersError || ordersError) && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{providersError || ordersError}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Cotizaciones visibles</p>
            <p className="mt-2 text-2xl font-bold">{kpis.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Listas para orden</p>
            <p className="mt-2 text-2xl font-bold text-emerald-600">{kpis.ready}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Monto en negociacion</p>
            <p className="mt-2 text-2xl font-bold">{formatMoney(kpis.negotiationAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Vencen en 5 dias</p>
            <p className="mt-2 text-2xl font-bold text-amber-600">{kpis.expiringSoon}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">Origen del circuito</CardTitle>
            <CardDescription>
              Las cotizaciones toman como base requisiciones por area, obra o lotes de reposicion.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/compras/requisiciones">
                <ArrowRight className="mr-2 h-4 w-4" />
                Requisiciones manuales
              </Link>
            </Button>
            <Button variant="outline" className="bg-transparent" asChild>
              <Link href="/compras/solicitudes">Radar de reposicion</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">Destino operativo</CardTitle>
            <CardDescription>
              Cuando la decision comercial ya esta cerrada, la emision se resuelve en ordenes.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/compras/ordenes">
                <ArrowRight className="mr-2 h-4 w-4" />
                Emitir orden real
              </Link>
            </Button>
            <Button variant="outline" className="bg-transparent" onClick={() => resetTrackers()}>
              <RefreshCw className="mr-2 h-4 w-4" /> Restablecer tablero local
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 lg:grid-cols-[1.5fr_repeat(3,minmax(0,1fr))]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-10"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar proveedor, requisicion, deposito, item o comprador..."
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as "todas" | LegacyPurchaseQuotation["estado"])
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todos los estados</SelectItem>
                <SelectItem value="BORRADOR">Borrador</SelectItem>
                <SelectItem value="ENVIADA">Enviada</SelectItem>
                <SelectItem value="NEGOCIACION">Negociacion</SelectItem>
                <SelectItem value="APROBADA">Aprobada</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={priorityFilter}
              onValueChange={(value) =>
                setPriorityFilter(value as "todas" | LegacyPurchaseQuotation["prioridad"])
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Prioridad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las prioridades</SelectItem>
                <SelectItem value="Alta">Alta</SelectItem>
                <SelectItem value="Media">Media</SelectItem>
                <SelectItem value="Baja">Baja</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={stageFilter}
              onValueChange={(value) => setStageFilter(value as "todas" | TrackerStage)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seguimiento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todo el seguimiento</SelectItem>
                <SelectItem value="sin_revisar">Sin revisar</SelectItem>
                <SelectItem value="en_analisis">En analisis</SelectItem>
                <SelectItem value="en_espera_proveedor">En espera proveedor</SelectItem>
                <SelectItem value="lista_para_orden">Lista para orden</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.8fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lote de cotizaciones</CardTitle>
            <CardDescription>
              Comparativa comercial, vencimiento y preparacion de pase a ordenes sin inventar APIs.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Origen</TableHead>
                  <TableHead>Vigencia</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Seguimiento</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuotes.map((quote) => (
                  <TableRow key={quote.id}>
                    <TableCell className="font-medium">COT-{quote.id}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p>{quote.proveedor}</p>
                        <p className="text-xs text-muted-foreground">
                          {quote.modalidad} · {quote.prioridad}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p>{quote.requisicionReferencia}</p>
                        <p className="text-xs text-muted-foreground">{quote.sectorSolicitante}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p>{formatDate(quote.vigenteHasta)}</p>
                        <p className="text-xs text-muted-foreground">
                          {quote.daysToExpire < 0
                            ? `Vencida hace ${Math.abs(quote.daysToExpire)} dias`
                            : `Vence en ${quote.daysToExpire} dias`}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{formatMoney(quote.total, quote.moneda)}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_CONFIG[quote.estado].variant}>
                        {STATUS_CONFIG[quote.estado].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={TRACKER_STAGE_CONFIG[quote.tracker.stage].variant}>
                        {TRACKER_STAGE_CONFIG[quote.tracker.stage].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => setSelectedId(quote.id)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredQuotes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                      No hay cotizaciones que coincidan con los filtros actuales.
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
                Prioriza lo que ya puede pasar a orden o lo que vence primero.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {queueQuotes.map((quote) => (
                <button
                  key={quote.id}
                  type="button"
                  onClick={() => setSelectedId(quote.id)}
                  className="w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">COT-{quote.id}</p>
                      <p className="text-sm text-muted-foreground">{quote.proveedor}</p>
                    </div>
                    <Badge variant={TRACKER_STAGE_CONFIG[quote.tracker.stage].variant}>
                      {TRACKER_STAGE_CONFIG[quote.tracker.stage].label}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {getQuotationHealth(quote, quote.tracker)}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{quote.requisicionReferencia}</span>
                    <span>{formatDate(quote.vigenteHasta)}</span>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cobertura real disponible</CardTitle>
              <CardDescription>
                Datos vivos ya expuestos por backend para sostener el resto del circuito.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Proveedores backend activos</p>
                <p className="mt-1 text-2xl font-bold">
                  {loadingProviders ? "..." : activeProviders.length}
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Ordenes reales visibles</p>
                <p className="mt-1 text-2xl font-bold">{loadingOrders ? "..." : ordenes.length}</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Proveedores en comparativas</p>
                <p className="mt-1 text-2xl font-bold">{kpis.suppliersInPlay}</p>
              </div>
              <p className="text-muted-foreground">
                La emision formal sigue dependiendo de la pantalla real de ordenes; aqui se resuelve
                la decision comercial, no la persistencia backend.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={selectedQuote !== null} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>
              {selectedQuote ? `Cotizacion COT-${selectedQuote.id}` : "Cotizacion"}
            </DialogTitle>
            <DialogDescription>
              {selectedQuote
                ? `${selectedQuote.proveedor} · ${selectedQuote.requisicionReferencia} · ${selectedQuote.depositoDestino}`
                : "Detalle de cotizacion"}
            </DialogDescription>
          </DialogHeader>

          {selectedQuote && (
            <Tabs defaultValue="circuito">
              <TabsList className="grid h-auto w-full grid-cols-4">
                <TabsTrigger value="circuito">Circuito</TabsTrigger>
                <TabsTrigger value="comparativa">Comparativa</TabsTrigger>
                <TabsTrigger value="items">Items</TabsTrigger>
                <TabsTrigger value="seguimiento">Seguimiento</TabsTrigger>
              </TabsList>

              <TabsContent value="circuito" className="space-y-4 pt-2">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <FileStack className="h-4 w-4" /> Cabecera comercial
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <DetailFieldGrid
                        fields={[
                          { label: "Proveedor ganador", value: selectedQuote.proveedor },
                          {
                            label: "Estado legado",
                            value: STATUS_CONFIG[selectedQuote.estado].label,
                          },
                          {
                            label: "Seguimiento local",
                            value: TRACKER_STAGE_CONFIG[selectedQuote.tracker.stage].label,
                          },
                          {
                            label: "Comprador",
                            value: selectedQuote.tracker.buyer || selectedQuote.comprador,
                          },
                          { label: "Condicion compra", value: selectedQuote.condicionCompra },
                          { label: "Plazo pago", value: selectedQuote.plazoPago },
                          { label: "Vigente hasta", value: formatDate(selectedQuote.vigenteHasta) },
                          {
                            label: "Brecha contra oferta mas barata",
                            value:
                              selectedQuote.spread > 0
                                ? formatMoney(selectedQuote.spread, selectedQuote.moneda)
                                : "Es la opcion mas baja",
                          },
                        ]}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Truck className="h-4 w-4" /> Origen y destino
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <DetailFieldGrid
                        fields={[
                          {
                            label: "Origen",
                            value: `${selectedQuote.origen} · ${selectedQuote.solicitudOrigen}`,
                          },
                          { label: "Requisicion", value: selectedQuote.requisicionReferencia },
                          { label: "Sector solicitante", value: selectedQuote.sectorSolicitante },
                          { label: "Deposito destino", value: selectedQuote.depositoDestino },
                          {
                            label: "Entrega comprometida",
                            value: formatDate(selectedQuote.fechaEntrega),
                          },
                          { label: "Aprobador", value: selectedQuote.aprobador },
                          {
                            label: "Orden asociada",
                            value:
                              selectedQuote.ordenCompraReferencia ?? "Todavia sin orden emitida",
                          },
                          {
                            label: "Salud del circuito",
                            value: getQuotationHealth(selectedQuote, selectedQuote.tracker),
                          },
                        ]}
                      />
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Landmark className="h-4 w-4" /> Observacion y diferencias clave
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <p className="text-muted-foreground">{selectedQuote.observacion}</p>
                      <div className="space-y-2">
                        {selectedQuote.diferenciasClave.map((item) => (
                          <div
                            key={item}
                            className="rounded-lg bg-muted/40 p-3 text-muted-foreground"
                          >
                            {item}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <CalendarClock className="h-4 w-4" /> Montos y fechas
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">Subtotal</p>
                        <p className="mt-1 font-medium">
                          {formatMoney(selectedQuote.subtotal, selectedQuote.moneda)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">IVA</p>
                        <p className="mt-1 font-medium">
                          {formatMoney(selectedQuote.iva, selectedQuote.moneda)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="mt-1 text-lg font-semibold">
                          {formatMoney(selectedQuote.total, selectedQuote.moneda)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="comparativa" className="space-y-4 pt-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Comparativa por proveedor</CardTitle>
                    <CardDescription>
                      Replica el analisis comercial previo al pase manual a ordenes.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Proveedor</TableHead>
                          <TableHead>Condicion</TableHead>
                          <TableHead>Entrega</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Decision</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedQuote.comparativa.map((option) => (
                          <TableRow key={`${selectedQuote.id}-${option.proveedor}`}>
                            <TableCell>
                              <div className="space-y-1">
                                <p>{option.proveedor}</p>
                                <p className="text-xs text-muted-foreground">
                                  {option.observacion}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>{option.condicionPago}</TableCell>
                            <TableCell>{option.plazoEntregaDias} dias</TableCell>
                            <TableCell>{formatMoney(option.total, option.moneda)}</TableCell>
                            <TableCell>
                              <Badge variant={option.seleccionada ? "default" : "outline"}>
                                {option.seleccionada ? "Seleccionada" : "Alternativa"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardContent className="pt-4 pb-4">
                      <p className="text-xs text-muted-foreground">Proveedor elegido</p>
                      <p className="mt-2 font-semibold">{selectedQuote.proveedor}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 pb-4">
                      <p className="text-xs text-muted-foreground">Total adjudicado</p>
                      <p className="mt-2 font-semibold">
                        {formatMoney(selectedQuote.total, selectedQuote.moneda)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 pb-4">
                      <p className="text-xs text-muted-foreground">Salida siguiente</p>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <p className="text-sm font-medium">
                          {selectedQuote.readyForOrder
                            ? "Emitir orden manual"
                            : "Cerrar decision y pasar a orden"}
                        </p>
                        <Button size="sm" asChild>
                          <Link href="/compras/ordenes">Ir</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="items" className="space-y-4 pt-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Renglones cotizados</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Codigo</TableHead>
                          <TableHead>Descripcion</TableHead>
                          <TableHead>Cantidad</TableHead>
                          <TableHead>Precio unitario</TableHead>
                          <TableHead>Bonif.</TableHead>
                          <TableHead>Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedQuote.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.codigo}</TableCell>
                            <TableCell>{item.descripcion}</TableCell>
                            <TableCell>
                              {item.cantidad} {item.unidad}
                            </TableCell>
                            <TableCell>
                              {formatMoney(item.precioUnitario, selectedQuote.moneda)}
                            </TableCell>
                            <TableCell>{item.bonificacionPct}%</TableCell>
                            <TableCell>
                              {formatMoney(item.subtotal, selectedQuote.moneda)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardContent className="pt-4 pb-4">
                      <p className="text-xs text-muted-foreground">Items cotizados</p>
                      <p className="mt-2 text-2xl font-bold">{selectedQuote.items.length}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 pb-4">
                      <p className="text-xs text-muted-foreground">Monto neto</p>
                      <p className="mt-2 text-2xl font-bold">
                        {formatMoney(selectedQuote.subtotal, selectedQuote.moneda)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 pb-4">
                      <p className="text-xs text-muted-foreground">Moneda</p>
                      <p className="mt-2 text-2xl font-bold">{selectedQuote.moneda}</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="seguimiento" className="space-y-4 pt-2">
                <Alert>
                  <ShieldAlert className="h-4 w-4" />
                  <AlertDescription>
                    Este seguimiento se guarda solo en el navegador actual para cubrir analisis,
                    notas y estado interno hasta que exista backend formal para cotizaciones.
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
                          value={selectedQuote.tracker.stage}
                          onValueChange={(value) =>
                            updateTracker(selectedQuote.id, { stage: value as TrackerStage })
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Seleccionar estado" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sin_revisar">Sin revisar</SelectItem>
                            <SelectItem value="en_analisis">En analisis</SelectItem>
                            <SelectItem value="en_espera_proveedor">En espera proveedor</SelectItem>
                            <SelectItem value="lista_para_orden">Lista para orden</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Comprador responsable</label>
                        <Input
                          value={selectedQuote.tracker.buyer}
                          onChange={(event) =>
                            updateTracker(selectedQuote.id, { buyer: event.target.value })
                          }
                          placeholder="Asignar responsable"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Proximo paso</label>
                        <Textarea
                          rows={5}
                          value={selectedQuote.tracker.nextStep}
                          onChange={(event) =>
                            updateTracker(selectedQuote.id, { nextStep: event.target.value })
                          }
                          placeholder="Definir proximo paso comercial u operativo"
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
                          {getQuotationHealth(selectedQuote, selectedQuote.tracker)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">Ultima actualizacion local</p>
                        <p className="mt-1 font-medium">
                          {formatDate(selectedQuote.tracker.updatedAt)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">Paso sugerido</p>
                        <p className="mt-1 font-medium">{selectedQuote.tracker.nextStep}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-2">
                        <Button variant="outline" className="bg-transparent" asChild>
                          <Link href="/compras/requisiciones">
                            <ClipboardList className="mr-2 h-4 w-4" />
                            Revisar origen
                          </Link>
                        </Button>
                        <Button asChild>
                          <Link href="/compras/ordenes">
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Continuar en ordenes
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
