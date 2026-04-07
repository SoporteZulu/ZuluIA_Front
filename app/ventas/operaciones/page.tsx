"use client"

import Link from "next/link"
import { type ComponentType, type ReactNode, useMemo, useState } from "react"
import {
  ArrowRight,
  CreditCard,
  Edit,
  FileSpreadsheet,
  MonitorCog,
  Printer,
  Receipt,
  Rows3,
  Settings2,
  ShieldCheck,
  Truck,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
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
import { Tabs, TabsContent, TabsTrigger } from "@/components/ui/tabs"
import { SalesDialogContent, SalesTabsList } from "@/components/ventas/sales-responsive"
import { Textarea } from "@/components/ui/textarea"
import { useCobros } from "@/lib/hooks/useCobros"
import { useComprobantes, useComprobantesConfig } from "@/lib/hooks/useComprobantes"
import { useFacturacionBatch, useMonitoresExportacion } from "@/lib/hooks/useOperaciones"
import { useListasPrecios } from "@/lib/hooks/useListasPrecios"
import { usePuntosFacturacion } from "@/lib/hooks/usePuntosFacturacion"
import { useDefaultSucursalId, useSucursales } from "@/lib/hooks/useSucursales"
import { useTerceros } from "@/lib/hooks/useTerceros"
import type { OperacionesBatchJob } from "@/lib/types/operaciones"
import type { Comprobante } from "@/lib/types/comprobantes"
import { type LegacySalesMonitorRow } from "@/lib/ventas-operaciones-legacy"

type LiveMonitorRow = {
  id: string
  circuito: string
  cliente: string
  documento: string
  prioridad: LegacySalesMonitorRow["prioridad"]
  estado: LegacySalesMonitorRow["estado"]
  responsable: string
  observacion: string
}

type LiveWindowTurn = {
  id: string
  caja: string
  operador: string
  cola: number
  importeObjetivo: number
  estado: "abierta" | "pausa" | "cerrada"
  observacion: string
}

function formatMoney(value: number) {
  return value.toLocaleString("es-AR", { style: "currency", currency: "ARS" })
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString("es-AR") : "-"
}

function stateBadge(value: string) {
  if (["activa", "abierta", "ejecucion", "EMITIDO"].includes(value)) {
    return <Badge>Activo</Badge>
  }
  if (["gestion", "control", "revision", "pausa", "BORRADOR", "PAGADO_PARCIAL"].includes(value)) {
    return <Badge variant="secondary">En gestión</Badge>
  }
  if (["cerrado", "resuelto", "PAGADO"].includes(value)) {
    return <Badge variant="outline">Cerrado</Badge>
  }
  if (value === "ANULADO") {
    return <Badge variant="destructive">Anulado</Badge>
  }
  return <Badge variant="outline">Preparación</Badge>
}

function priorityBadge(value: LegacySalesMonitorRow["prioridad"]) {
  if (value === "alta") return <Badge variant="destructive">Alta</Badge>
  if (value === "media") return <Badge variant="secondary">Media</Badge>
  return <Badge variant="outline">Baja</Badge>
}

function MetricCard({
  title,
  value,
  description,
}: {
  title: string
  value: string | number
  description: string
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

function QuickLink({
  title,
  href,
  description,
  icon: Icon,
}: {
  title: string
  href: string
  description: string
  icon: ComponentType<{ className?: string }>
}) {
  return (
    <Card className="transition-colors hover:border-primary/40">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">{description}</p>
        <Button asChild size="sm" variant="outline" className="bg-transparent">
          <Link href={href}>
            Abrir
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

function OperationsFormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function buildLiveMonitorRows({
  overdueInvoices,
  remitos,
  cobros,
  customersById,
  sucursalesById,
  tiposById,
}: {
  overdueInvoices: Comprobante[]
  remitos: Comprobante[]
  cobros: ReturnType<typeof useCobros>["cobros"]
  customersById: Map<number, ReturnType<typeof useTerceros>["terceros"][number]>
  sucursalesById: Map<number, string>
  tiposById: Map<number, ReturnType<typeof useComprobantesConfig>["tipos"][number]>
}) {
  const invoiceCases: LiveMonitorRow[] = overdueInvoices.slice(0, 4).map((row) => {
    const customer = customersById.get(row.terceroId)
    return {
      id: `inv-${row.id}`,
      circuito: "Factura monitor",
      cliente: customer?.razonSocial ?? `Cliente #${row.terceroId}`,
      documento: row.nroComprobante ?? `#${row.id}`,
      prioridad: row.saldo > 500000 ? "alta" : "media",
      estado: "pendiente",
      responsable: customer?.vendedorNombre ?? "Mesa comercial",
      observacion: `Saldo pendiente ${formatMoney(row.saldo)}. Vence ${formatDate(row.fechaVto)}.`,
    }
  })

  const remitoCases: LiveMonitorRow[] = remitos.slice(0, 4).map((row) => {
    const customer = customersById.get(row.terceroId)
    return {
      id: `rem-${row.id}`,
      circuito: row.estado === "BORRADOR" ? "Salida pendiente" : "Despacho emitido",
      cliente: customer?.razonSocial ?? `Cliente #${row.terceroId}`,
      documento: row.nroComprobante ?? `#${row.id}`,
      prioridad: row.estado === "BORRADOR" ? "alta" : "media",
      estado: row.estado === "BORRADOR" ? "gestion" : "pendiente",
      responsable: sucursalesById.get(row.sucursalId) ?? "Expedición",
      observacion: `${tiposById.get(row.tipoComprobanteId)?.descripcion ?? "Remito"} por ${formatMoney(row.total)}.`,
    }
  })

  const cobranzaCases: LiveMonitorRow[] = cobros.slice(0, 3).map((row) => {
    const customer = customersById.get(row.terceroId)
    return {
      id: `cob-${row.id}`,
      circuito: "Cobro por ventanilla",
      cliente: customer?.razonSocial ?? `Cliente #${row.terceroId}`,
      documento: `COB-${row.id}`,
      prioridad: row.total > 800000 ? "alta" : "baja",
      estado: row.estado === "PAGADO" ? "resuelto" : "gestion",
      responsable: sucursalesById.get(row.sucursalId) ?? "Caja",
      observacion: `Cobro registrado el ${formatDate(row.fecha)} por ${formatMoney(row.total)}.`,
    }
  })

  return [...invoiceCases, ...remitoCases, ...cobranzaCases]
}

function mapAutomationState(job: OperacionesBatchJob): "activa" | "pausada" | "revision" {
  if (job.source === "programacion" && job.activa === false) return "pausada"
  if (job.estado === "control") return "revision"
  return "activa"
}

function mapAutomationCircuit(
  job: OperacionesBatchJob
): "facturacion-automatica" | "facturacion-masiva" | "remitos-masivos" | "recibos-masivos" {
  if (job.tipo === "remitos-masivos") return "remitos-masivos"
  if (job.tipo === "imputacion-masiva") return "recibos-masivos"
  if (job.tipo === "monitor-facturas") return "facturacion-automatica"
  return "facturacion-masiva"
}

function buildAutomationRule(job: OperacionesBatchJob) {
  return {
    id: job.id,
    nombre: job.descripcion,
    circuito: mapAutomationCircuit(job),
    alcance: `${job.tipo} con ${job.registros} registros visibles.`,
    frecuencia: job.intervaloMinutos ? `${job.intervaloMinutos} min` : "Bajo demanda",
    estado: mapAutomationState(job),
    ultimaEjecucion: job.ultimaEjecucion ? job.ultimaEjecucion.slice(0, 10) : "",
    observacion: job.observacion,
  }
}

function buildLiveWindowTurns({
  puntos,
  cobros,
  sucursal,
}: {
  puntos: Array<{ id: number; descripcion: string; activo: boolean }>
  cobros: ReturnType<typeof useCobros>["cobros"]
  sucursal: string | null
}): LiveWindowTurn[] {
  const totalCobrado = cobros.reduce((sum, row) => sum + row.total, 0)
  const baseObjective = puntos.length > 0 ? Math.round(totalCobrado / puntos.length) : totalCobrado

  return puntos.slice(0, 4).map((punto, index) => {
    const cola = Math.max(cobros.length - index * 2, 0)
    const abierta = punto.activo && cola > 0
    return {
      id: `turn-${punto.id}`,
      caja: punto.descripcion,
      operador: sucursal ? `Operación ${sucursal}` : "Operación de caja",
      cola,
      importeObjetivo: baseObjective,
      estado: !punto.activo ? "cerrada" : abierta ? "abierta" : "pausa",
      observacion: abierta
        ? `${cola} cobros recientes sostienen la atención operativa de este punto.`
        : "Sin cola activa; punto disponible para contingencia o espera.",
    }
  })
}

export default function VentasOperacionesPage() {
  const sucursalId = useDefaultSucursalId()
  const { comprobantes } = useComprobantes({ esVenta: true })
  const { tipos } = useComprobantesConfig()
  const { cobros } = useCobros({ sucursalId })
  const { rows: monitorRows, error: monitorError } = useMonitoresExportacion()
  const { jobs: batchJobs, error: batchError, actualizarProgramacion } = useFacturacionBatch()
  const { listas } = useListasPrecios()
  const { puntos } = usePuntosFacturacion(sucursalId)
  const { sucursales } = useSucursales()
  const { terceros } = useTerceros()
  const [editingBatch, setEditingBatch] = useState<OperacionesBatchJob | null>(null)

  const customersById = useMemo(() => {
    const map = new Map<number, (typeof terceros)[number]>()
    terceros.forEach((customer) => map.set(customer.id, customer))
    return map
  }, [terceros])

  const sucursalesById = useMemo(() => {
    const map = new Map<number, string>()
    sucursales.forEach((sucursal) => map.set(sucursal.id, sucursal.descripcion))
    return map
  }, [sucursales])

  const tiposById = useMemo(() => {
    const map = new Map<number, (typeof tipos)[number]>()
    tipos.forEach((tipo) => map.set(tipo.id, tipo))
    return map
  }, [tipos])

  const invoiceTypeIds = useMemo(
    () =>
      new Set(
        tipos
          .filter(
            (tipo) =>
              tipo.esVenta &&
              !tipo.afectaStock &&
              (tipo.afectaCuentaCorriente || tipo.tipoAfip !== null)
          )
          .map((tipo) => tipo.id)
      ),
    [tipos]
  )

  const remitoTypeIds = useMemo(
    () => new Set(tipos.filter((tipo) => tipo.esVenta && tipo.afectaStock).map((tipo) => tipo.id)),
    [tipos]
  )

  const salesInvoices = useMemo(
    () =>
      comprobantes
        .filter((row) => invoiceTypeIds.has(row.tipoComprobanteId) && row.estado !== "ANULADO")
        .sort((a, b) => `${b.fecha}-${b.id}`.localeCompare(`${a.fecha}-${a.id}`)),
    [comprobantes, invoiceTypeIds]
  )

  const remitos = useMemo(
    () =>
      comprobantes
        .filter((row) => remitoTypeIds.has(row.tipoComprobanteId) && row.estado !== "ANULADO")
        .sort((a, b) => `${b.fecha}-${b.id}`.localeCompare(`${a.fecha}-${a.id}`)),
    [comprobantes, remitoTypeIds]
  )

  const recentCobros = useMemo(
    () =>
      [...cobros]
        .sort((a, b) => `${b.fecha}-${b.id}`.localeCompare(`${a.fecha}-${a.id}`))
        .slice(0, 12),
    [cobros]
  )

  const overdueInvoices = useMemo(() => {
    const now = new Date()
    return salesInvoices.filter(
      (row) =>
        row.saldo > 0 && row.fechaVto && new Date(row.fechaVto) < now && row.estado !== "ANULADO"
    )
  }, [salesInvoices])

  const prebillingCandidates = useMemo(() => salesInvoices.slice(0, 12), [salesInvoices])
  const remitoBatchCandidates = useMemo(
    () =>
      remitos.filter((row) => row.estado === "BORRADOR" || row.estado === "EMITIDO").slice(0, 12),
    [remitos]
  )
  const activeLists = useMemo(() => listas.filter((lista) => lista.activa), [listas])
  const expiringLists = useMemo(
    () =>
      listas.filter((lista) => {
        if (!lista.vigenciaHasta) return false
        const today = new Date()
        const target = new Date(lista.vigenciaHasta)
        const diff = target.getTime() - today.getTime()
        return diff >= 0 && diff <= 1000 * 60 * 60 * 24 * 15
      }),
    [listas]
  )
  const automationRules = useMemo(
    () => batchJobs.filter((job) => job.source === "programacion").map(buildAutomationRule),
    [batchJobs]
  )
  const currentSucursal = sucursalId ? (sucursalesById.get(sucursalId) ?? null) : null
  const windowTurns = useMemo(
    () => buildLiveWindowTurns({ puntos, cobros: recentCobros, sucursal: currentSucursal }),
    [currentSucursal, puntos, recentCobros]
  )
  const activeAutomation = useMemo(
    () => automationRules.filter((rule) => rule.estado === "activa").length,
    [automationRules]
  )
  const openTurns = useMemo(
    () => windowTurns.filter((turn) => turn.estado === "abierta").length,
    [windowTurns]
  )
  const runningJobs = useMemo(
    () => batchJobs.filter((job) => job.estado === "ejecucion").length,
    [batchJobs]
  )

  const liveMonitorRows = useMemo(
    () =>
      buildLiveMonitorRows({
        overdueInvoices,
        remitos: remitoBatchCandidates,
        cobros: recentCobros,
        customersById,
        sucursalesById,
        tiposById,
      }),
    [customersById, overdueInvoices, recentCobros, remitoBatchCandidates, sucursalesById, tiposById]
  )

  const highlightedBatch = batchJobs[0] ?? null

  const saveBatch = async (row: OperacionesBatchJob) => {
    const ok = await actualizarProgramacion(row)
    if (ok) setEditingBatch(null)
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Ventas: operaciones</h1>
        <p className="max-w-4xl text-muted-foreground">
          Consola unificada para seguimiento comercial, pre-facturación, ventanilla, tandas masivas
          y distribución. Usa comprobantes, cobros, listas y puntos reales; sólo deja planificación
          manual donde el backend todavía no publica la orquestación específica.
        </p>
      </div>

      <Alert>
        <AlertTitle>Alcance actual</AlertTitle>
        <AlertDescription>
          La referencia histórica de pre-facturas automáticas, cobro por ventanilla, recibos y
          remitos masivos ya quedó traducida a una sola vista. Los ajustes manuales persisten en
          backend para programaciones batch y en lecturas derivadas para ventanilla cuando no hay
          agenda de caja expuesta por API.
        </AlertDescription>
      </Alert>

      {monitorError ? (
        <Alert variant="destructive">
          <AlertDescription>{monitorError}</AlertDescription>
        </Alert>
      ) : null}

      {batchError ? (
        <Alert variant="destructive">
          <AlertDescription>{batchError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Facturas vencidas"
          value={overdueInvoices.length}
          description="Casos reales listos para monitor y cobranza dirigida."
        />
        <MetricCard
          title="Cobros recientes"
          value={recentCobros.length}
          description="Base activa para caja, recibos y rendición mostrador."
        />
        <MetricCard
          title="Listas activas"
          value={activeLists.length}
          description="Distribución comercial disponible por vigencia real."
        />
        <MetricCard
          title="Puntos visibles"
          value={puntos.length}
          description="Numeración disponible en la sucursal operativa actual."
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Reglas activas"
          value={activeAutomation}
          description="Tandas preparadas para disparo manual controlado."
        />
        <MetricCard
          title="Cajas abiertas"
          value={openTurns}
          description="Turnos de ventanilla con seguimiento operativo."
        />
        <MetricCard
          title="Jobs en curso"
          value={runningJobs}
          description="Lotes internos que siguen bajo control del equipo."
        />
        <MetricCard
          title="Listas por vencer"
          value={expiringLists.length}
          description="Señal para impresión y redistribución comercial."
        />
      </div>

      {highlightedBatch ? (
        <Card className="overflow-hidden border-none bg-linear-to-br from-stone-950 via-stone-900 to-slate-800 text-stone-50 shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl">Tanda destacada</CardTitle>
            <CardDescription className="text-stone-300">
              {highlightedBatch.descripcion} · {highlightedBatch.responsable}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="grid gap-3 md:grid-cols-2">
              {[
                { label: "Tipo", value: highlightedBatch.tipo },
                { label: "Estado", value: highlightedBatch.estado },
                { label: "Registros", value: String(highlightedBatch.registros) },
                { label: "Responsable", value: highlightedBatch.responsable },
              ].map((field) => (
                <div key={field.label} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-stone-400">
                    {field.label}
                  </p>
                  <p className="mt-2 text-sm font-medium wrap-break-word text-stone-100">
                    {field.value}
                  </p>
                </div>
              ))}
            </div>
            <div className="grid gap-3 text-sm text-stone-200">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                {highlightedBatch.observacion}
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                Facturas vencidas: {overdueInvoices.length}. Remitos listos para tanda:{" "}
                {remitoBatchCandidates.length}. Cobros recientes: {recentCobros.length}.
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Tabs defaultValue="monitor" className="space-y-4">
        <SalesTabsList className="gap-2 md:grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="monitor">Monitor</TabsTrigger>
          <TabsTrigger value="prefacturacion">Pre-facturación</TabsTrigger>
          <TabsTrigger value="ventanilla">Ventanilla</TabsTrigger>
          <TabsTrigger value="tandas">Tandas y distribución</TabsTrigger>
        </SalesTabsList>

        <TabsContent value="monitor" className="space-y-4">
          <div className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MonitorCog className="h-4 w-4" /> Seguimiento vivo
                </CardTitle>
                <CardDescription>
                  Casos detectados desde facturas vencidas, despachos abiertos y cobros recientes.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="w-full whitespace-nowrap">
                  <Table className="min-w-230">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Circuito</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Documento</TableHead>
                        <TableHead>Responsable</TableHead>
                        <TableHead>Prioridad</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Observación</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {liveMonitorRows.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium">{row.circuito}</TableCell>
                          <TableCell className="max-w-56 whitespace-normal wrap-break-word">
                            {row.cliente}
                          </TableCell>
                          <TableCell>{row.documento}</TableCell>
                          <TableCell>{row.responsable}</TableCell>
                          <TableCell>{priorityBadge(row.prioridad)}</TableCell>
                          <TableCell>{stateBadge(row.estado)}</TableCell>
                          <TableCell className="max-w-88 whitespace-normal wrap-break-word text-muted-foreground">
                            {row.observacion}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Seguimiento manual</CardTitle>
                <CardDescription>
                  Monitores e integraciones activas reportadas por backend para seguimiento
                  operativo.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {monitorRows.map((row) => (
                  <div key={row.id} className="rounded-xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{row.circuito}</p>
                        <p className="text-sm text-muted-foreground">{row.cliente}</p>
                      </div>
                      <Badge variant="outline">Backend</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {priorityBadge(row.prioridad)}
                      {stateBadge(row.estado)}
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">{row.observacion}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="prefacturacion" className="space-y-4">
          <div className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileSpreadsheet className="h-4 w-4" /> Candidatos operativos
                </CardTitle>
                <CardDescription>
                  Recrea la habilitación de pre-facturas con documentos reales, vendedor y sucursal.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="w-full whitespace-nowrap">
                  <Table className="min-w-270">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Comprobante</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Asesor</TableHead>
                        <TableHead>Sucursal</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {prebillingCandidates.map((row) => {
                        const customer = customersById.get(row.terceroId)
                        return (
                          <TableRow key={row.id}>
                            <TableCell className="font-medium">
                              {row.nroComprobante ?? `#${row.id}`}
                            </TableCell>
                            <TableCell>{formatDate(row.fecha)}</TableCell>
                            <TableCell className="max-w-56 whitespace-normal wrap-break-word">
                              {customer?.razonSocial ?? `Cliente #${row.terceroId}`}
                            </TableCell>
                            <TableCell>
                              {customer?.vendedorNombre ?? "Sin asesor visible"}
                            </TableCell>
                            <TableCell>
                              {sucursalesById.get(row.sucursalId) ?? `#${row.sucursalId}`}
                            </TableCell>
                            <TableCell>{stateBadge(row.estado)}</TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatMoney(row.total)}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Settings2 className="h-4 w-4" /> Reglas y disparadores
                </CardTitle>
                <CardDescription>
                  Programaciones reales de facturación batch recuperadas desde backend.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {automationRules.map((rule) => (
                  <div key={rule.id} className="rounded-xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{rule.nombre}</p>
                        <p className="text-sm text-muted-foreground">{rule.alcance}</p>
                      </div>
                      <Badge variant="outline">Programación backend</Badge>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                      <p>Circuito: {rule.circuito}</p>
                      <p>Frecuencia: {rule.frecuencia}</p>
                      <p>Última ejecución: {rule.ultimaEjecucion || "Sin ejecutar"}</p>
                    </div>
                    <div className="mt-3">{stateBadge(rule.estado)}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ventanilla" className="space-y-4">
          <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CreditCard className="h-4 w-4" /> Cobros de mostrador
                </CardTitle>
                <CardDescription>
                  Reúne el flujo de cobro rápido con lectura real de caja, clientes y montos
                  cobrados.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="w-full whitespace-nowrap">
                  <Table className="min-w-230">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cobro</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Sucursal</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentCobros.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium">COB-{row.id}</TableCell>
                          <TableCell>{formatDate(row.fecha)}</TableCell>
                          <TableCell className="max-w-56 whitespace-normal wrap-break-word">
                            {customersById.get(row.terceroId)?.razonSocial ??
                              `Cliente #${row.terceroId}`}
                          </TableCell>
                          <TableCell>
                            {sucursalesById.get(row.sucursalId) ?? `#${row.sucursalId}`}
                          </TableCell>
                          <TableCell>{stateBadge(row.estado)}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatMoney(row.total)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Turnos y cajas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {windowTurns.map((turn) => (
                    <div key={turn.id} className="rounded-xl border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{turn.caja}</p>
                          <p className="text-sm text-muted-foreground">{turn.operador}</p>
                        </div>
                        <Badge variant="outline">Derivado</Badge>
                      </div>
                      <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                        <p>Cola estimada: {turn.cola}</p>
                        <p>Objetivo diario: {formatMoney(turn.importeObjetivo)}</p>
                        <p>{turn.observacion}</p>
                      </div>
                      <div className="mt-3">{stateBadge(turn.estado)}</div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Puentes activos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    {cobros.length} cobros visibles sostienen la lectura operativa del mostrador.
                  </p>
                  <p>
                    {puntos.length} puntos de facturación están disponibles para el circuito de
                    recibos.
                  </p>
                  <Button asChild>
                    <Link href="/ventas/cobros">Abrir cobros</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tandas" className="space-y-4">
          <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Rows3 className="h-4 w-4" /> Tandas documentales
                </CardTitle>
                <CardDescription>
                  Remitos listos para agrupar, recibos recientes y distribución comercial pendiente.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Remitos en circuito</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {remitoBatchCandidates.slice(0, 5).map((row) => (
                        <div key={row.id} className="rounded-xl border p-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-medium">{row.nroComprobante ?? `#${row.id}`}</p>
                            {stateBadge(row.estado)}
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground wrap-break-word">
                            {customersById.get(row.terceroId)?.razonSocial ??
                              `Cliente #${row.terceroId}`}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {formatDate(row.fecha)} · {formatMoney(row.total)}
                          </p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Listas para distribuir</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {activeLists.slice(0, 5).map((lista) => (
                        <div key={lista.id} className="rounded-xl border p-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-medium">{lista.nombre}</p>
                            <Badge variant={lista.esDefault ? "default" : "outline"}>
                              {lista.esDefault ? "Default" : "Activa"}
                            </Badge>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Desde {formatDate(lista.vigenciaDesde)} · Hasta{" "}
                            {formatDate(lista.vigenciaHasta)}
                          </p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <QuickLink
                    title="Remitos"
                    href="/ventas/remitos"
                    description="Despacho y control de documentos con impacto de stock."
                    icon={Truck}
                  />
                  <QuickLink
                    title="Facturas"
                    href="/ventas/facturas"
                    description="Emisión y seguimiento para los lotes de pre-facturación."
                    icon={Receipt}
                  />
                  <QuickLink
                    title="Listas de precios"
                    href="/ventas/listas-precios"
                    description="Vigencias, impresión y distribución comercial."
                    icon={Printer}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ShieldCheck className="h-4 w-4" /> Jobs internos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {batchJobs.map((job) => (
                    <div key={job.id} className="rounded-xl border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{job.descripcion}</p>
                          <p className="text-sm text-muted-foreground">{job.tipo}</p>
                        </div>
                        {job.source === "programacion" ? (
                          <Button variant="ghost" size="icon" onClick={() => setEditingBatch(job)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Badge variant="outline">Job</Badge>
                        )}
                      </div>
                      <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                        <p>Registros: {job.registros}</p>
                        <p>Responsable: {job.responsable}</p>
                        {job.proximaEjecucion ? (
                          <p>Próxima ejecución: {formatDate(job.proximaEjecucion)}</p>
                        ) : null}
                        <p>{job.observacion}</p>
                      </div>
                      <div className="mt-3">{stateBadge(job.estado)}</div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Numeración y vigencias</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>{puntos.length} puntos de facturación visibles en la sucursal operativa.</p>
                  <p>{expiringLists.length} listas requieren redistribución dentro de 15 días.</p>
                  <Button asChild variant="outline" className="bg-transparent">
                    <Link href="/ventas/puntos-facturacion">Abrir puntos de facturación</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog
        open={editingBatch !== null}
        onOpenChange={(open: boolean) => !open && setEditingBatch(null)}
      >
        <SalesDialogContent size="md">
          <DialogHeader>
            <DialogTitle>Editar tanda interna</DialogTitle>
            <DialogDescription>
              Edición de la programación backend para lotes, impresión y control operativo.
            </DialogDescription>
          </DialogHeader>
          {editingBatch ? (
            <BatchEditor
              row={editingBatch}
              onClose={() => setEditingBatch(null)}
              onSave={saveBatch}
            />
          ) : null}
        </SalesDialogContent>
      </Dialog>
    </div>
  )
}

function BatchEditor({
  row,
  onClose,
  onSave,
}: {
  row: OperacionesBatchJob
  onClose: () => void
  onSave: (row: OperacionesBatchJob) => void | Promise<void>
}) {
  const [draft, setDraft] = useState(row)

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <OperationsFormField label="Descripción">
          <Input
            value={draft.descripcion}
            onChange={(event) => setDraft((prev) => ({ ...prev, descripcion: event.target.value }))}
            disabled={draft.source !== "programacion"}
          />
        </OperationsFormField>
        <OperationsFormField label="Responsable">
          <Input
            value={draft.responsable}
            onChange={(event) => setDraft((prev) => ({ ...prev, responsable: event.target.value }))}
            disabled
          />
        </OperationsFormField>
        <OperationsFormField label="Tipo">
          <Select
            value={draft.tipo}
            onValueChange={(value: string) =>
              setDraft((prev) => ({ ...prev, tipo: value as OperacionesBatchJob["tipo"] }))
            }
            disabled={draft.source !== "programacion"}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="imputacion-masiva">Imputación masiva</SelectItem>
              <SelectItem value="listas-imprimir">Listas imprimir</SelectItem>
              <SelectItem value="monitor-facturas">Monitor facturas</SelectItem>
              <SelectItem value="remitos-masivos">Remitos masivos</SelectItem>
            </SelectContent>
          </Select>
        </OperationsFormField>
        <OperationsFormField label="Estado">
          <Select
            value={draft.estado}
            onValueChange={(value: string) =>
              setDraft((prev) => ({ ...prev, estado: value as OperacionesBatchJob["estado"] }))
            }
            disabled={draft.source !== "programacion"}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="preparacion">Preparación</SelectItem>
              <SelectItem value="ejecucion">Ejecución</SelectItem>
              <SelectItem value="control">Control</SelectItem>
              <SelectItem value="cerrado">Cerrado</SelectItem>
            </SelectContent>
          </Select>
        </OperationsFormField>
        <OperationsFormField label="Registros">
          <Input
            type="number"
            value={draft.registros}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, registros: Number(event.target.value) || 0 }))
            }
            disabled={draft.source !== "programacion"}
          />
        </OperationsFormField>
        <OperationsFormField label="Intervalo (min)">
          <Input
            type="number"
            value={draft.intervaloMinutos ?? 0}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, intervaloMinutos: Number(event.target.value) || 0 }))
            }
            disabled={draft.source !== "programacion"}
          />
        </OperationsFormField>
        <OperationsFormField label="Próxima ejecución">
          <Input
            type="datetime-local"
            value={
              draft.proximaEjecucion
                ? new Date(draft.proximaEjecucion).toISOString().slice(0, 16)
                : ""
            }
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                proximaEjecucion: event.target.value
                  ? new Date(event.target.value).toISOString()
                  : null,
              }))
            }
            disabled={draft.source !== "programacion"}
          />
        </OperationsFormField>
      </div>
      <OperationsFormField label="Observación">
        <Textarea
          value={draft.observacion}
          onChange={(event) => setDraft((prev) => ({ ...prev, observacion: event.target.value }))}
          rows={4}
          disabled={draft.source !== "programacion"}
        />
      </OperationsFormField>
      <DialogFooter>
        <Button variant="outline" className="bg-transparent" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={() => onSave(draft)} disabled={draft.source !== "programacion"}>
          Guardar
        </Button>
      </DialogFooter>
    </div>
  )
}
