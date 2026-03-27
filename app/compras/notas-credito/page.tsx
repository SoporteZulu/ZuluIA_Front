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
import { legacyPurchaseCreditNotes, type LegacyPurchaseCreditNote } from "@/lib/compras-legacy-data"
import { useLegacyLocalCollection } from "@/lib/hooks/useLegacyLocalCollection"

type CreditNoteStage = "borrador" | "en_emision" | "lista_para_aplicar" | "cerrada"
type LocalCreditNoteTracker = {
  noteId: number
  stage: CreditNoteStage
  owner: string
  nextStep: string
  updatedAt: string
}

const CREDIT_NOTE_TRACKER_STORAGE_KEY = "zuluia_compras_credit_note_trackers"
const STATUS_CONFIG: Record<
  LegacyPurchaseCreditNote["estado"],
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  BORRADOR: { label: "Borrador", variant: "secondary" },
  EMITIDA: { label: "Emitida", variant: "outline" },
  APLICADA: { label: "Aplicada", variant: "default" },
}
const STAGE_CONFIG: Record<
  CreditNoteStage,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  borrador: { label: "Borrador", variant: "outline" },
  en_emision: { label: "En emisión", variant: "secondary" },
  lista_para_aplicar: { label: "Lista para aplicar", variant: "default" },
  cerrada: { label: "Cerrada", variant: "default" },
}
const DEFAULT_TRACKERS: LocalCreditNoteTracker[] = legacyPurchaseCreditNotes.map((item) => ({
  noteId: item.id,
  stage:
    item.estado === "APLICADA"
      ? "cerrada"
      : item.estado === "EMITIDA"
        ? "lista_para_aplicar"
        : "en_emision",
  owner: item.responsable,
  nextStep:
    item.estado === "APLICADA"
      ? "Mantener trazabilidad del impacto económico aplicado."
      : item.estado === "EMITIDA"
        ? "Aplicar sobre cuenta corriente o comprobante base."
        : "Emitir formalmente la nota y validar documentación soporte.",
  updatedAt: item.fecha,
}))

function formatMoney(value: number) {
  return value.toLocaleString("es-AR", { style: "currency", currency: "ARS" })
}
function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString("es-AR") : "-"
}
function matchesTerm(item: LegacyPurchaseCreditNote, term: string) {
  if (term === "") return true
  return [
    item.proveedor,
    item.comprobanteReferencia,
    item.motivo,
    item.observacion,
    item.ordenCompraReferencia ?? "",
    item.devolucionReferencia ?? "",
    ...item.items.map((row) => row.concepto),
  ]
    .join(" ")
    .toLowerCase()
    .includes(term)
}
function getNoteHealth(item: LegacyPurchaseCreditNote, tracker: LocalCreditNoteTracker) {
  if (tracker.stage === "cerrada") return "Nota de crédito aplicada y conciliada"
  if (tracker.stage === "lista_para_aplicar") return "Lista para impacto económico"
  return "Pendiente de emisión o aplicación"
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

export default function NotasCreditoCompraPage() {
  const {
    rows: trackers,
    setRows: setTrackers,
    reset: resetTrackers,
  } = useLegacyLocalCollection<LocalCreditNoteTracker>(
    CREDIT_NOTE_TRACKER_STORAGE_KEY,
    DEFAULT_TRACKERS
  )
  const [search, setSearch] = useState("")
  const [stageFilter, setStageFilter] = useState<"todas" | CreditNoteStage>("todas")
  const [selectedId, setSelectedId] = useState<number | null>(
    legacyPurchaseCreditNotes[0]?.id ?? null
  )
  const trackerMap = useMemo(
    () => new Map(trackers.map((tracker) => [tracker.noteId, tracker])),
    [trackers]
  )
  const notes = useMemo(
    () =>
      legacyPurchaseCreditNotes.map((item) => ({
        ...item,
        tracker: trackerMap.get(item.id) ?? DEFAULT_TRACKERS.find((row) => row.noteId === item.id)!,
      })),
    [trackerMap]
  )
  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim()
    return notes.filter(
      (item) =>
        matchesTerm(item, term) && (stageFilter === "todas" || item.tracker.stage === stageFilter)
    )
  }, [notes, search, stageFilter])
  const selected = notes.find((item) => item.id === selectedId) ?? filtered[0] ?? null
  const kpis = useMemo(
    () => ({
      issued: notes.filter((item) => item.estado === "EMITIDA").length,
      applied: notes.filter((item) => item.estado === "APLICADA").length,
      draft: notes.filter((item) => item.estado === "BORRADOR").length,
      total: notes.reduce((acc, item) => acc + item.total, 0),
    }),
    [notes]
  )
  const updateTracker = (noteId: number, patch: Partial<LocalCreditNoteTracker>) =>
    setTrackers((current) => {
      const index = current.findIndex((row) => row.noteId === noteId)
      const nextRow = {
        ...(index >= 0 ? current[index] : DEFAULT_TRACKERS.find((row) => row.noteId === noteId)!),
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
          <h1 className="text-3xl font-bold tracking-tight">Notas de crédito de compra</h1>
          <p className="text-muted-foreground">
            Consola de cierre económico derivada de devoluciones, bonificaciones y ajustes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="bg-transparent" onClick={() => resetTrackers()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Restablecer tablero local
          </Button>
          <Button asChild>
            <Link href="/compras/ajustes">Ver ajustes</Link>
          </Button>
        </div>
      </div>
      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertDescription>
          El backend actual no expone notas de crédito de compra ni su aplicación. Esta vista cubre
          la trazabilidad documental y el seguimiento local hasta el cierre económico real.
        </AlertDescription>
      </Alert>
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Borrador</p>
            <p className="mt-2 text-2xl font-bold">{kpis.draft}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Emitidas</p>
            <p className="mt-2 text-2xl font-bold text-amber-600">{kpis.issued}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Aplicadas</p>
            <p className="mt-2 text-2xl font-bold text-emerald-600">{kpis.applied}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Monto visible</p>
            <p className="mt-2 text-2xl font-bold">{formatMoney(kpis.total)}</p>
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
                placeholder="Buscar proveedor, comprobante, devolución o motivo..."
              />
            </div>
            <Select
              value={stageFilter}
              onValueChange={(value) => setStageFilter(value as "todas" | CreditNoteStage)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seguimiento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todo el seguimiento</SelectItem>
                <SelectItem value="borrador">Borrador</SelectItem>
                <SelectItem value="en_emision">En emisión</SelectItem>
                <SelectItem value="lista_para_aplicar">Lista para aplicar</SelectItem>
                <SelectItem value="cerrada">Cerrada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notas visibles</CardTitle>
          <CardDescription>Regularizaciones documentales del circuito de compras.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Comprobante ref.</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">NC-{item.id}</TableCell>
                  <TableCell>{item.proveedor}</TableCell>
                  <TableCell>{item.comprobanteReferencia}</TableCell>
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
                    No hay notas de crédito que coincidan con los filtros actuales.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>
              {selected ? `Nota de crédito NC-${selected.id}` : "Nota de crédito"}
            </DialogTitle>
            <DialogDescription>
              {selected
                ? `${selected.proveedor} · ${selected.comprobanteReferencia} · ${selected.devolucionReferencia ?? "sin devolución"}`
                : "Detalle de nota de crédito"}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <Tabs defaultValue="circuito">
              <TabsList className="grid h-auto w-full grid-cols-4">
                <TabsTrigger value="circuito">Circuito</TabsTrigger>
                <TabsTrigger value="items">Items</TabsTrigger>
                <TabsTrigger value="impacto">Impacto</TabsTrigger>
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
                          { label: "Proveedor", value: selected.proveedor },
                          { label: "Comprobante", value: selected.comprobanteReferencia },
                          {
                            label: "Orden asociada",
                            value: selected.ordenCompraReferencia ?? "Sin orden visible",
                          },
                          {
                            label: "Devolución asociada",
                            value: selected.devolucionReferencia ?? "Sin devolución visible",
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
                            value: getNoteHealth(selected, selected.tracker),
                          },
                        ]}
                      />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Motivo y observación</CardTitle>
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
                    <CardTitle className="text-base">Conceptos</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Concepto</TableHead>
                          <TableHead>Importe</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selected.items.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell className="font-medium">{row.concepto}</TableCell>
                            <TableCell>{formatMoney(row.importe)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="impacto" className="pt-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Impacto económico</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DetailFieldGrid
                      fields={[
                        { label: "Fecha", value: formatDate(selected.fecha) },
                        { label: "Total", value: formatMoney(selected.total) },
                        {
                          label: "Impacto en cuenta corriente",
                          value: selected.impactoCuentaCorriente,
                        },
                        {
                          label: "Estado actual",
                          value: getNoteHealth(selected, selected.tracker),
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
                    Este seguimiento se guarda solo en el navegador actual y cubre emisión,
                    aplicación y cierre de la nota hasta que exista backend formal.
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
                            updateTracker(selected.id, { stage: value as CreditNoteStage })
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Seleccionar estado" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="borrador">Borrador</SelectItem>
                            <SelectItem value="en_emision">En emisión</SelectItem>
                            <SelectItem value="lista_para_aplicar">Lista para aplicar</SelectItem>
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
                      <CardTitle className="text-base">Continuidad</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">Estado actual</p>
                        <p className="mt-1 font-medium">
                          {getNoteHealth(selected, selected.tracker)}
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
