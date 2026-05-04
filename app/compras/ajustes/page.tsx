"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Eye, RefreshCw, Search, ShieldAlert } from "lucide-react"
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
import { useComprasAjustes } from "@/lib/hooks/useCompras"
import { useLegacyLocalCollection } from "@/lib/hooks/useLegacyLocalCollection"
import type { CompraAjusteResumen } from "@/lib/types/compras-operativa"

type AdjustmentStage = "borrador" | "en_revision" | "listo_para_emitir" | "cerrado"
type LocalAdjustmentTracker = {
  adjustmentId: number
  stage: AdjustmentStage
  owner: string
  nextStep: string
  updatedAt: string
}

const ADJUSTMENT_TRACKER_STORAGE_KEY = "zuluia_compras_adjustment_trackers"
const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  BORRADOR: { label: "Borrador", variant: "secondary" },
  EMITIDO: { label: "Emitido", variant: "outline" },
  APLICADO: { label: "Aplicado", variant: "default" },
}
const STAGE_CONFIG: Record<
  AdjustmentStage,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  borrador: { label: "Borrador", variant: "outline" },
  en_revision: { label: "En revisión", variant: "secondary" },
  listo_para_emitir: { label: "Listo para emitir", variant: "default" },
  cerrado: { label: "Cerrado", variant: "default" },
}
function formatMoney(value: number) {
  return value.toLocaleString("es-AR", { style: "currency", currency: "ARS" })
}
function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString("es-AR") : "-"
}
function matchesTerm(item: CompraAjusteResumen, term: string) {
  if (term === "") return true
  return [
    item.proveedor,
    item.motivo,
    item.comprobanteReferencia,
    item.circuito,
    item.observacion,
    ...item.items.map((row) => `${row.concepto} ${row.cuenta}`),
  ]
    .join(" ")
    .toLowerCase()
    .includes(term)
}
function getAdjustmentHealth(item: CompraAjusteResumen, tracker: LocalAdjustmentTracker) {
  if (tracker.stage === "cerrado") return "Ajuste cerrado y aplicado"
  if (item.requiereNotaCredito) return "Depende de compensación con nota de crédito"
  if (tracker.stage === "listo_para_emitir") return "Listo para emitir o aplicar"
  return "Pendiente de revisión documental"
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

export default function AjustesCompraPage() {
  const { ajustes: liveAdjustments, loading, error } = useComprasAjustes()
  const {
    rows: trackers,
    setRows: setTrackers,
    reset: resetTrackers,
  } = useLegacyLocalCollection<LocalAdjustmentTracker>(ADJUSTMENT_TRACKER_STORAGE_KEY, [])
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<"todos" | CompraAjusteResumen["tipo"]>("todos")
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const defaultTrackers = useMemo(
    () =>
      liveAdjustments.map((item) => ({
        adjustmentId: item.id,
        stage:
          item.estado === "APLICADO"
            ? "cerrado"
            : item.estado === "EMITIDO"
              ? "listo_para_emitir"
              : "en_revision",
        owner: item.responsable,
        nextStep:
          item.estado === "APLICADO"
            ? "Mantener trazabilidad del ajuste aplicado."
            : item.estado === "EMITIDO"
              ? "Coordinar aplicación con la nota o factura relacionada."
              : "Revisar soporte documental antes de emitir.",
        updatedAt: item.fecha,
      })),
    [liveAdjustments]
  )
  const trackerMap = useMemo(
    () => new Map(trackers.map((tracker) => [tracker.adjustmentId, tracker])),
    [trackers]
  )
  const adjustments = useMemo(
    () =>
      liveAdjustments.map((item) => ({
        ...item,
        tracker:
          trackerMap.get(item.id) ?? defaultTrackers.find((row) => row.adjustmentId === item.id)!,
      })),
    [defaultTrackers, liveAdjustments, trackerMap]
  )
  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim()
    return adjustments.filter(
      (item) => matchesTerm(item, term) && (typeFilter === "todos" || item.tipo === typeFilter)
    )
  }, [adjustments, search, typeFilter])
  const selected = filtered.find((item) => item.id === selectedId) ?? null
  const visibleKpis = useMemo(
    () => ({
      draft: filtered.filter((item) => item.estado === "BORRADOR").length,
      applied: filtered.filter((item) => item.estado === "APLICADO").length,
      creditLinked: filtered.filter((item) => item.requiereNotaCredito).length,
      total: filtered.reduce((acc, item) => acc + item.total, 0),
    }),
    [filtered]
  )
  const updateTracker = (adjustmentId: number, patch: Partial<LocalAdjustmentTracker>) =>
    setTrackers((current) => {
      const index = current.findIndex((row) => row.adjustmentId === adjustmentId)
      const nextRow = {
        ...(index >= 0
          ? current[index]
          : defaultTrackers.find((row) => row.adjustmentId === adjustmentId)!),
        ...patch,
        updatedAt: new Date().toISOString(),
      }
      return index >= 0
        ? current.map((row, rowIndex) => (rowIndex === index ? nextRow : row))
        : [...current, nextRow]
    })

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ajustes de compra</h1>
          <p className="text-muted-foreground">
            Consola de regularización comercial y económica del circuito de compras.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="bg-transparent" onClick={() => resetTrackers()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Restablecer tablero local
          </Button>
          <Button asChild>
            <Link href="/compras/notas-credito">Ir a notas de crédito</Link>
          </Button>
        </div>
      </div>
      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertDescription>
          Esta vista ya consume ajustes reales agregados desde backend. El seguimiento local queda
          como capa operativa para revisar regularizaciones y su continuidad documental.
        </AlertDescription>
      </Alert>
      {error && (
        <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Borrador</p>
            <p className="mt-2 text-2xl font-bold">{loading ? "..." : visibleKpis.draft}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Aplicados</p>
            <p className="mt-2 text-2xl font-bold text-emerald-600">
              {loading ? "..." : visibleKpis.applied}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Vinculados a NC</p>
            <p className="mt-2 text-2xl font-bold text-amber-600">
              {loading ? "..." : visibleKpis.creditLinked}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Monto visible</p>
            <p className="mt-2 text-2xl font-bold">
              {loading ? "..." : formatMoney(visibleKpis.total)}
            </p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar proveedor, motivo, comprobante o cuenta..."
              />
            </div>
            <Select
              value={typeFilter}
              onValueChange={(value) =>
                setTypeFilter(value as "todos" | CompraAjusteResumen["tipo"])
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los tipos</SelectItem>
                <SelectItem value="Débito">Débito</SelectItem>
                <SelectItem value="Crédito">Crédito</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ajustes visibles</CardTitle>
          <CardDescription>
            Débitos, créditos y regularizaciones posteriores a factura o recepción.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">AJ-{item.id}</TableCell>
                  <TableCell>{item.tipo}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p>{item.proveedor}</p>
                      <p className="text-xs text-muted-foreground">{item.comprobanteReferencia}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_CONFIG[item.estado].variant}>
                      {STATUS_CONFIG[item.estado].label}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatMoney(item.total)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => setSelectedId(item.id)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    {loading
                      ? "Cargando ajustes reales..."
                      : "No hay ajustes que coincidan con los filtros actuales."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog
        open={selectedId !== null && selected !== null}
        onOpenChange={(open) => !open && setSelectedId(null)}
      >
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{selected ? `Ajuste AJ-${selected.id}` : "Ajuste"}</DialogTitle>
            <DialogDescription>
              {selected
                ? `${selected.proveedor} · ${selected.comprobanteReferencia} · ${selected.circuito}`
                : "Detalle de ajuste"}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <Tabs defaultValue="circuito">
              <TabsList className="grid h-auto w-full grid-cols-4">
                <TabsTrigger value="circuito">Circuito</TabsTrigger>
                <TabsTrigger value="items">Items</TabsTrigger>
                <TabsTrigger value="detalle">Detalle</TabsTrigger>
                <TabsTrigger value="seguimiento">Seguimiento</TabsTrigger>
              </TabsList>
              <TabsContent value="circuito" className="pt-2">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Cabecera</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <DetailFieldGrid
                        fields={[
                          { label: "Tipo", value: selected.tipo },
                          { label: "Proveedor", value: selected.proveedor },
                          { label: "Comprobante", value: selected.comprobanteReferencia },
                          {
                            label: "Orden asociada",
                            value: selected.ordenCompraReferencia ?? "Sin orden visible",
                          },
                          {
                            label: "Responsable",
                            value: selected.tracker.owner || selected.responsable,
                          },
                          { label: "Estado legado", value: STATUS_CONFIG[selected.estado].label },
                          {
                            label: "Seguimiento local",
                            value: STAGE_CONFIG[selected.tracker.stage].label,
                          },
                          {
                            label: "Salud del circuito",
                            value: getAdjustmentHealth(selected, selected.tracker),
                          },
                        ]}
                      />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Motivo y circuito</CardTitle>
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
                </div>
              </TabsContent>
              <TabsContent value="items" className="pt-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Conceptos del ajuste</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Concepto</TableHead>
                          <TableHead>Cuenta</TableHead>
                          <TableHead>Importe</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selected.items.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell className="font-medium">{row.concepto}</TableCell>
                            <TableCell>{row.cuenta}</TableCell>
                            <TableCell>{formatMoney(row.importe)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="detalle" className="pt-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Resumen económico</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DetailFieldGrid
                      fields={[
                        { label: "Fecha", value: formatDate(selected.fecha) },
                        { label: "Total", value: formatMoney(selected.total) },
                        { label: "Circuito", value: selected.circuito },
                        {
                          label: "Requiere nota de crédito",
                          value: selected.requiereNotaCredito ? "Sí" : "No",
                        },
                      ]}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="seguimiento" className="space-y-4 pt-2">
                <Alert>
                  <ShieldAlert className="h-4 w-4" />
                  <AlertDescription>
                    Este seguimiento se guarda solo en el navegador actual y cubre el cierre
                    comercial/económico sin modificar la lectura real que ya expone backend.
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
                            updateTracker(selected.id, { stage: value as AdjustmentStage })
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Seleccionar estado" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="borrador">Borrador</SelectItem>
                            <SelectItem value="en_revision">En revisión</SelectItem>
                            <SelectItem value="listo_para_emitir">Listo para emitir</SelectItem>
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
                      <CardTitle className="text-base">Continuidad</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">Estado actual</p>
                        <p className="mt-1 font-medium">
                          {getAdjustmentHealth(selected, selected.tracker)}
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
