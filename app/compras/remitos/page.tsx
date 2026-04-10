"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  FileStack,
  PackageCheck,
  RefreshCw,
  Search,
  ShieldAlert,
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
import { useComprasRemitos } from "@/lib/hooks/useCompras"
import { useLegacyLocalCollection } from "@/lib/hooks/useLegacyLocalCollection"
import { useOrdenesCompra } from "@/lib/hooks/useOrdenesCompra"
import type { CompraRemitoResumen } from "@/lib/types/compras-operativa"

type RemitoStage = "sin_conciliar" | "en_revision" | "listo_para_recepcion" | "cerrado"

type LocalRemitoTracker = {
  remitoId: number
  stage: RemitoStage
  owner: string
  nextStep: string
  updatedAt: string
}

const REMITO_TRACKER_STORAGE_KEY = "zuluia_compras_remito_trackers"

const STATUS_CONFIG: Record<
  LegacyPurchaseRemito["estado"],
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  PENDIENTE: { label: "Pendiente", variant: "secondary" },
  RECIBIDO: { label: "Recibido", variant: "default" },
  ANULADO: { label: "Anulado", variant: "destructive" },
}

const STAGE_CONFIG: Record<
  RemitoStage,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  sin_conciliar: { label: "Sin conciliar", variant: "outline" },
  en_revision: { label: "En revisión", variant: "secondary" },
  listo_para_recepcion: { label: "Listo para recepción", variant: "default" },
  cerrado: { label: "Cerrado", variant: "default" },
}

function formatMoney(value: number) {
  return value.toLocaleString("es-AR", { style: "currency", currency: "ARS" })
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString("es-AR") : "-"
}

function matchesTerm(remito: CompraRemitoResumen, term: string) {
  if (term === "") return true
  const haystack = [
    remito.proveedor,
    remito.numero,
    remito.deposito,
    remito.transportista,
    remito.ordenCompraReferencia ?? "",
    remito.recepcionReferencia ?? "",
    remito.observacion,
    ...remito.items.map((item) => `${item.codigo} ${item.descripcion}`),
  ]
    .join(" ")
    .toLowerCase()
  return haystack.includes(term)
}

function getRemitoHealth(remito: LegacyPurchaseRemito, tracker: LocalRemitoTracker) {
  if (tracker.stage === "cerrado") return "Remito conciliado con el circuito posterior"
  if (remito.items.some((item) => item.diferencia !== 0))
    return "Tiene diferencias por renglón pendientes"
  if (tracker.stage === "listo_para_recepcion") return "Listo para continuar en recepciones"
  return "Pendiente de conciliación logística"
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

export default function RemitosCompraPage() {
  const { remitos: liveRemitos, loading, error } = useComprasRemitos()
  const { ordenes, loading: loadingOrders, error: ordersError } = useOrdenesCompra()
  const {
    rows: trackers,
    setRows: setTrackers,
    reset: resetTrackers,
  } = useLegacyLocalCollection<LocalRemitoTracker>(REMITO_TRACKER_STORAGE_KEY, [])

  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<"todos" | CompraRemitoResumen["tipo"]>("todos")
  const [stageFilter, setStageFilter] = useState<"todos" | RemitoStage>("todos")
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const defaultTrackers = useMemo(
    () =>
      liveRemitos.map((remito) => ({
        remitoId: remito.id,
        stage:
          remito.estado === "RECIBIDO"
            ? "cerrado"
            : remito.recepcionReferencia
              ? "en_revision"
              : "sin_conciliar",
        owner: remito.responsableRecepcion,
        nextStep:
          remito.estado === "RECIBIDO"
            ? "Mantener trazabilidad cerrada con recepción y factura."
            : remito.recepcionReferencia
              ? "Resolver diferencias y confirmar cierre en recepciones."
              : "Validar contra orden antes de ingresar la recepción real.",
        updatedAt: remito.fecha,
      })),
    [liveRemitos]
  )

  const trackerMap = useMemo(
    () => new Map(trackers.map((tracker) => [tracker.remitoId, tracker])),
    [trackers]
  )

  const remitos = useMemo(
    () =>
      liveRemitos.map((remito) => ({
        ...remito,
        tracker:
          trackerMap.get(remito.id) ?? defaultTrackers.find((row) => row.remitoId === remito.id)!,
        discrepancyCount: remito.items.filter((item) => item.diferencia !== 0).length,
      })),
    [defaultTrackers, liveRemitos, trackerMap]
  )

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim()
    return remitos.filter((remito) => {
      const matchesSearch = matchesTerm(remito, term)
      const matchesType = typeFilter === "todos" || remito.tipo === typeFilter
      const matchesStage = stageFilter === "todos" || remito.tracker.stage === stageFilter
      return matchesSearch && matchesType && matchesStage
    })
  }, [remitos, search, stageFilter, typeFilter])

  const selected = remitos.find((remito) => remito.id === selectedId) ?? filtered[0] ?? null

  const kpis = useMemo(() => {
    const pending = remitos.filter((remito) => remito.estado === "PENDIENTE").length
    const withDiff = remitos.filter((remito) =>
      remito.items.some((item) => item.diferencia !== 0)
    ).length
    const valued = remitos.filter((remito) => remito.tipo === "Valorizado").length
    const totalVisible = remitos.reduce((acc, remito) => acc + remito.total, 0)
    return { pending, withDiff, valued, totalVisible }
  }, [remitos])

  const queue = useMemo(() => {
    const stageOrder: Record<RemitoStage, number> = {
      listo_para_recepcion: 0,
      en_revision: 1,
      sin_conciliar: 2,
      cerrado: 3,
    }
    return [...filtered]
      .sort((left, right) => {
        if (stageOrder[left.tracker.stage] !== stageOrder[right.tracker.stage]) {
          return stageOrder[left.tracker.stage] - stageOrder[right.tracker.stage]
        }
        return right.discrepancyCount - left.discrepancyCount
      })
      .slice(0, 5)
  }, [filtered])

  const updateTracker = (remitoId: number, patch: Partial<LocalRemitoTracker>) => {
    setTrackers((current) => {
      const index = current.findIndex((row) => row.remitoId === remitoId)
      const nextRow = {
        ...(index >= 0
          ? current[index]
          : defaultTrackers.find((row) => row.remitoId === remitoId)!),
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
          <h1 className="text-3xl font-bold tracking-tight">Remitos de compra</h1>
          <p className="text-muted-foreground">
            Consola logística para remitos valorizados y no valorizados con diferencias visibles.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="bg-transparent" asChild>
            <Link href="/compras/ordenes">
              <FileStack className="mr-2 h-4 w-4" /> Ver órdenes
            </Link>
          </Button>
          <Button asChild>
            <Link href="/compras/recepciones">
              <PackageCheck className="mr-2 h-4 w-4" /> Ir a recepciones
            </Link>
          </Button>
        </div>
      </div>

      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertDescription>
          Esta vista ya consume remitos reales del backend de compras. El seguimiento local se
          mantiene sólo para conciliación operativa y priorización interna antes de continuar en
          recepciones.
        </AlertDescription>
      </Alert>

      {(error || ordersError) && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || ordersError}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Pendientes</p>
            <p className="mt-2 text-2xl font-bold">{loading ? "..." : kpis.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Con diferencias</p>
            <p className="mt-2 text-2xl font-bold text-amber-600">
              {loading ? "..." : kpis.withDiff}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Valorizados</p>
            <p className="mt-2 text-2xl font-bold">{loading ? "..." : kpis.valued}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Total visible</p>
            <p className="mt-2 text-2xl font-bold">
              {loading ? "..." : formatMoney(kpis.totalVisible)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">Puente operativo</CardTitle>
            <CardDescription>
              Los remitos preparan la recepción física, pero el cierre transaccional sigue en
              recepciones.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/compras/recepciones">
                <ArrowRight className="mr-2 h-4 w-4" />
                Continuar en recepciones
              </Link>
            </Button>
            <Button variant="outline" className="bg-transparent" onClick={() => resetTrackers()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Restablecer tablero local
            </Button>
          </CardContent>
        </Card>
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">Cobertura real</CardTitle>
            <CardDescription>
              Órdenes ya visibles por backend para sostener el contexto de remitos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{loadingOrders ? "..." : ordenes.length}</p>
            <p className="text-sm text-muted-foreground">órdenes disponibles en el circuito real</p>
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
                placeholder="Buscar proveedor, remito, orden, recepción o item..."
              />
            </div>
            <Select
              value={typeFilter}
              onValueChange={(value) =>
                setTypeFilter(value as "todos" | CompraRemitoResumen["tipo"])
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los tipos</SelectItem>
                <SelectItem value="No valorizado">No valorizado</SelectItem>
                <SelectItem value="Valorizado">Valorizado</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={stageFilter}
              onValueChange={(value) => setStageFilter(value as "todos" | RemitoStage)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seguimiento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todo el seguimiento</SelectItem>
                <SelectItem value="sin_conciliar">Sin conciliar</SelectItem>
                <SelectItem value="en_revision">En revisión</SelectItem>
                <SelectItem value="listo_para_recepcion">Listo para recepción</SelectItem>
                <SelectItem value="cerrado">Cerrado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.8fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lote de remitos</CardTitle>
            <CardDescription>
              Ingreso físico, diferencias y conciliación previa a la recepción real.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Depósito</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Seguimiento</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.numero}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p>{item.proveedor}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(item.fecha)}</p>
                      </div>
                    </TableCell>
                    <TableCell>{item.tipo}</TableCell>
                    <TableCell>{item.deposito}</TableCell>
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
                      {loading
                        ? "Cargando remitos reales..."
                        : "No hay remitos que coincidan con los filtros actuales."}
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
            <CardDescription>
              Los remitos con más diferencia o listos para recepción aparecen primero.
            </CardDescription>
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
                    <p className="font-medium">{item.numero}</p>
                    <p className="text-sm text-muted-foreground">{item.proveedor}</p>
                  </div>
                  <Badge variant={STAGE_CONFIG[item.tracker.stage].variant}>
                    {STAGE_CONFIG[item.tracker.stage].label}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {getRemitoHealth(item, item.tracker)}
                </p>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{selected ? `Remito ${selected.numero}` : "Remito"}</DialogTitle>
            <DialogDescription>
              {selected
                ? `${selected.proveedor} · ${selected.deposito} · ${selected.transportista}`
                : "Detalle de remito"}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <Tabs defaultValue="circuito">
              <TabsList className="grid h-auto w-full grid-cols-4">
                <TabsTrigger value="circuito">Circuito</TabsTrigger>
                <TabsTrigger value="items">Items</TabsTrigger>
                <TabsTrigger value="diferencias">Diferencias</TabsTrigger>
                <TabsTrigger value="seguimiento">Seguimiento</TabsTrigger>
              </TabsList>
              <TabsContent value="circuito" className="space-y-4 pt-2">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Truck className="h-4 w-4" /> Logística
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <DetailFieldGrid
                        fields={[
                          { label: "Proveedor", value: selected.proveedor },
                          { label: "Transportista", value: selected.transportista },
                          { label: "Depósito", value: selected.deposito },
                          {
                            label: "Responsable recepción",
                            value: selected.tracker.owner || selected.responsableRecepcion,
                          },
                          {
                            label: "Orden asociada",
                            value: selected.ordenCompraReferencia ?? "Sin orden visible",
                          },
                          {
                            label: "Recepción asociada",
                            value: selected.recepcionReferencia ?? "Sin recepción cargada",
                          },
                          {
                            label: "Total",
                            value: selected.total ? formatMoney(selected.total) : "Sin valorizar",
                          },
                          {
                            label: "Salud del circuito",
                            value: getRemitoHealth(selected, selected.tracker),
                          },
                        ]}
                      />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <FileStack className="h-4 w-4" /> Observación
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <p className="text-muted-foreground">{selected.observacion}</p>
                      <div className="space-y-2">
                        {selected.diferenciasClave.map((detail) => (
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
                </div>
              </TabsContent>
              <TabsContent value="items" className="pt-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Renglones del remito</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Código</TableHead>
                          <TableHead>Descripción</TableHead>
                          <TableHead>Cantidad</TableHead>
                          <TableHead>Recibido</TableHead>
                          <TableHead>Diferencia</TableHead>
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
                            <TableCell>{item.recibido}</TableCell>
                            <TableCell
                              className={item.diferencia === 0 ? "" : "text-amber-600 font-medium"}
                            >
                              {item.diferencia}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="diferencias" className="pt-2">
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardContent className="pt-4 pb-4">
                      <p className="text-xs text-muted-foreground">Renglones con diferencia</p>
                      <p className="mt-2 text-2xl font-bold">{selected.discrepancyCount}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 pb-4">
                      <p className="text-xs text-muted-foreground">Recepción</p>
                      <p className="mt-2 font-semibold">
                        {selected.recepcionReferencia ?? "Pendiente"}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 pb-4">
                      <p className="text-xs text-muted-foreground">Salida siguiente</p>
                      <div className="mt-2">
                        <Button size="sm" asChild>
                          <Link href="/compras/recepciones">Ir a recepciones</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              <TabsContent value="seguimiento" className="space-y-4 pt-2">
                <Alert>
                  <ShieldAlert className="h-4 w-4" />
                  <AlertDescription>
                    Este seguimiento se guarda solo en el navegador actual y cubre conciliación y
                    diferencias hasta reflejarlas en el circuito real de recepciones.
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
                            updateTracker(selected.id, { stage: value as RemitoStage })
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Seleccionar estado" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sin_conciliar">Sin conciliar</SelectItem>
                            <SelectItem value="en_revision">En revisión</SelectItem>
                            <SelectItem value="listo_para_recepcion">
                              Listo para recepción
                            </SelectItem>
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
                          {getRemitoHealth(selected, selected.tracker)}
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
                      <div className="flex flex-wrap gap-2 pt-2">
                        <Button variant="outline" className="bg-transparent" asChild>
                          <Link href="/compras/ordenes">Ver orden</Link>
                        </Button>
                        <Button asChild>
                          <Link href="/compras/recepciones">
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Continuar en recepciones
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
