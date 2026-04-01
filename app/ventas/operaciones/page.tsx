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
  DialogContent,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useCobros } from "@/lib/hooks/useCobros"
import { useComprobantes, useComprobantesConfig } from "@/lib/hooks/useComprobantes"
import { useLegacyLocalCollection } from "@/lib/hooks/useLegacyLocalCollection"
import { useListasPrecios } from "@/lib/hooks/useListasPrecios"
import { usePuntosFacturacion } from "@/lib/hooks/usePuntosFacturacion"
import { useDefaultSucursalId, useSucursales } from "@/lib/hooks/useSucursales"
import { useTerceros } from "@/lib/hooks/useTerceros"
import type { Comprobante } from "@/lib/types/comprobantes"
import {
  legacySalesAutomationRules,
  legacySalesBatchJobs,
  legacySalesMonitorRows,
  legacySalesWindowTurns,
  type LegacySalesAutomationRule,
  type LegacySalesBatchJob,
  type LegacySalesMonitorRow,
  type LegacySalesWindowTurn,
} from "@/lib/ventas-operaciones-legacy"

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

export default function VentasOperacionesPage() {
  const sucursalId = useDefaultSucursalId()
  const { comprobantes } = useComprobantes({ esVenta: true })
  const { tipos } = useComprobantesConfig()
  const { cobros } = useCobros({ sucursalId })
  const { listas } = useListasPrecios()
  const { puntos } = usePuntosFacturacion(sucursalId)
  const { sucursales } = useSucursales()
  const { terceros } = useTerceros()
  const { rows: monitorRows, setRows: setMonitorRows } =
    useLegacyLocalCollection<LegacySalesMonitorRow>("ventas-monitor-legacy", legacySalesMonitorRows)
  const { rows: automationRules, setRows: setAutomationRules } =
    useLegacyLocalCollection<LegacySalesAutomationRule>(
      "ventas-automation-legacy",
      legacySalesAutomationRules
    )
  const { rows: windowTurns, setRows: setWindowTurns } =
    useLegacyLocalCollection<LegacySalesWindowTurn>(
      "ventas-window-turns-legacy",
      legacySalesWindowTurns
    )
  const { rows: batchJobs, setRows: setBatchJobs } = useLegacyLocalCollection<LegacySalesBatchJob>(
    "ventas-batch-jobs-legacy",
    legacySalesBatchJobs
  )

  const [editingMonitor, setEditingMonitor] = useState<LegacySalesMonitorRow | null>(null)
  const [editingAutomation, setEditingAutomation] = useState<LegacySalesAutomationRule | null>(null)
  const [editingTurn, setEditingTurn] = useState<LegacySalesWindowTurn | null>(null)
  const [editingBatch, setEditingBatch] = useState<LegacySalesBatchJob | null>(null)

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

  const saveMonitor = (row: LegacySalesMonitorRow) => {
    setMonitorRows((prev) => prev.map((item) => (item.id === row.id ? row : item)))
    setEditingMonitor(null)
  }

  const saveAutomation = (row: LegacySalesAutomationRule) => {
    setAutomationRules((prev) => prev.map((item) => (item.id === row.id ? row : item)))
    setEditingAutomation(null)
  }

  const saveTurn = (row: LegacySalesWindowTurn) => {
    setWindowTurns((prev) => prev.map((item) => (item.id === row.id ? row : item)))
    setEditingTurn(null)
  }

  const saveBatch = (row: LegacySalesBatchJob) => {
    setBatchJobs((prev) => prev.map((item) => (item.id === row.id ? row : item)))
    setEditingBatch(null)
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
          local sólo para reglas, turnos y tandas internas.
        </AlertDescription>
      </Alert>

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
        <TabsList className="grid h-auto w-full grid-cols-2 gap-2 lg:grid-cols-4">
          <TabsTrigger value="monitor">Monitor</TabsTrigger>
          <TabsTrigger value="prefacturacion">Pre-facturación</TabsTrigger>
          <TabsTrigger value="ventanilla">Ventanilla</TabsTrigger>
          <TabsTrigger value="tandas">Tandas y distribución</TabsTrigger>
        </TabsList>

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
                          <TableCell className="max-w-55 whitespace-normal">
                            {row.cliente}
                          </TableCell>
                          <TableCell>{row.documento}</TableCell>
                          <TableCell>{row.responsable}</TableCell>
                          <TableCell>{priorityBadge(row.prioridad)}</TableCell>
                          <TableCell>{stateBadge(row.estado)}</TableCell>
                          <TableCell className="max-w-90 whitespace-normal text-muted-foreground">
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
                  Casos internos que todavía necesitan criterio del equipo y no una regla
                  automática.
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
                      <Button variant="ghost" size="icon" onClick={() => setEditingMonitor(row)}>
                        <Edit className="h-4 w-4" />
                      </Button>
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
                            <TableCell className="max-w-55 whitespace-normal">
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
                  Definición operativa de lotes automáticos hasta que el backend los ejecute por sí
                  mismo.
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
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingAutomation(rule)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
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
                          <TableCell className="max-w-55 whitespace-normal">
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
                        <Button variant="ghost" size="icon" onClick={() => setEditingTurn(turn)}>
                          <Edit className="h-4 w-4" />
                        </Button>
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
                        <Button variant="ghost" size="icon" onClick={() => setEditingBatch(job)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                        <p>Registros: {job.registros}</p>
                        <p>Responsable: {job.responsable}</p>
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
        open={editingMonitor !== null}
        onOpenChange={(open) => !open && setEditingMonitor(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar seguimiento manual</DialogTitle>
            <DialogDescription>
              Ajuste interno para casos que todavía requieren intervención humana explícita.
            </DialogDescription>
          </DialogHeader>
          {editingMonitor ? (
            <MonitorEditor
              row={editingMonitor}
              onClose={() => setEditingMonitor(null)}
              onSave={saveMonitor}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={editingAutomation !== null}
        onOpenChange={(open) => !open && setEditingAutomation(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar regla operativa</DialogTitle>
            <DialogDescription>
              Define alcance y frecuencia mientras la ejecución masiva sigue sin contrato backend
              dedicado.
            </DialogDescription>
          </DialogHeader>
          {editingAutomation ? (
            <AutomationEditor
              row={editingAutomation}
              onClose={() => setEditingAutomation(null)}
              onSave={saveAutomation}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={editingTurn !== null} onOpenChange={(open) => !open && setEditingTurn(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar turno de ventanilla</DialogTitle>
            <DialogDescription>
              Ajusta operador, cola y objetivo del turno donde el backend no maneja agenda de caja.
            </DialogDescription>
          </DialogHeader>
          {editingTurn ? (
            <TurnEditor row={editingTurn} onClose={() => setEditingTurn(null)} onSave={saveTurn} />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={editingBatch !== null} onOpenChange={(open) => !open && setEditingBatch(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar tanda interna</DialogTitle>
            <DialogDescription>
              Seguimiento local para lotes, impresión y control de cierre operativo.
            </DialogDescription>
          </DialogHeader>
          {editingBatch ? (
            <BatchEditor
              row={editingBatch}
              onClose={() => setEditingBatch(null)}
              onSave={saveBatch}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function MonitorEditor({
  row,
  onClose,
  onSave,
}: {
  row: LegacySalesMonitorRow
  onClose: () => void
  onSave: (row: LegacySalesMonitorRow) => void
}) {
  const [draft, setDraft] = useState(row)

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <OperationsFormField label="Circuito">
          <Input
            value={draft.circuito}
            onChange={(event) => setDraft((prev) => ({ ...prev, circuito: event.target.value }))}
          />
        </OperationsFormField>
        <OperationsFormField label="Cliente">
          <Input
            value={draft.cliente}
            onChange={(event) => setDraft((prev) => ({ ...prev, cliente: event.target.value }))}
          />
        </OperationsFormField>
        <OperationsFormField label="Documento">
          <Input
            value={draft.documento}
            onChange={(event) => setDraft((prev) => ({ ...prev, documento: event.target.value }))}
          />
        </OperationsFormField>
        <OperationsFormField label="Responsable">
          <Input
            value={draft.responsable}
            onChange={(event) => setDraft((prev) => ({ ...prev, responsable: event.target.value }))}
          />
        </OperationsFormField>
        <OperationsFormField label="Prioridad">
          <Select
            value={draft.prioridad}
            onValueChange={(value) =>
              setDraft((prev) => ({
                ...prev,
                prioridad: value as LegacySalesMonitorRow["prioridad"],
              }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="media">Media</SelectItem>
              <SelectItem value="baja">Baja</SelectItem>
            </SelectContent>
          </Select>
        </OperationsFormField>
        <OperationsFormField label="Estado">
          <Select
            value={draft.estado}
            onValueChange={(value) =>
              setDraft((prev) => ({ ...prev, estado: value as LegacySalesMonitorRow["estado"] }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pendiente">Pendiente</SelectItem>
              <SelectItem value="gestion">En gestión</SelectItem>
              <SelectItem value="resuelto">Resuelto</SelectItem>
            </SelectContent>
          </Select>
        </OperationsFormField>
      </div>
      <OperationsFormField label="Observación">
        <Textarea
          value={draft.observacion}
          onChange={(event) => setDraft((prev) => ({ ...prev, observacion: event.target.value }))}
          rows={4}
        />
      </OperationsFormField>
      <DialogFooter>
        <Button variant="outline" className="bg-transparent" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={() => onSave(draft)}>Guardar</Button>
      </DialogFooter>
    </div>
  )
}

function AutomationEditor({
  row,
  onClose,
  onSave,
}: {
  row: LegacySalesAutomationRule
  onClose: () => void
  onSave: (row: LegacySalesAutomationRule) => void
}) {
  const [draft, setDraft] = useState(row)

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <OperationsFormField label="Nombre">
          <Input
            value={draft.nombre}
            onChange={(event) => setDraft((prev) => ({ ...prev, nombre: event.target.value }))}
          />
        </OperationsFormField>
        <OperationsFormField label="Frecuencia">
          <Input
            value={draft.frecuencia}
            onChange={(event) => setDraft((prev) => ({ ...prev, frecuencia: event.target.value }))}
          />
        </OperationsFormField>
        <OperationsFormField label="Circuito">
          <Select
            value={draft.circuito}
            onValueChange={(value) =>
              setDraft((prev) => ({
                ...prev,
                circuito: value as LegacySalesAutomationRule["circuito"],
              }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="facturacion-automatica">Facturación automática</SelectItem>
              <SelectItem value="facturacion-masiva">Facturación masiva</SelectItem>
              <SelectItem value="remitos-masivos">Remitos masivos</SelectItem>
              <SelectItem value="recibos-masivos">Recibos masivos</SelectItem>
            </SelectContent>
          </Select>
        </OperationsFormField>
        <OperationsFormField label="Estado">
          <Select
            value={draft.estado}
            onValueChange={(value) =>
              setDraft((prev) => ({
                ...prev,
                estado: value as LegacySalesAutomationRule["estado"],
              }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="activa">Activa</SelectItem>
              <SelectItem value="pausada">Pausada</SelectItem>
              <SelectItem value="revision">Revisión</SelectItem>
            </SelectContent>
          </Select>
        </OperationsFormField>
      </div>
      <OperationsFormField label="Alcance">
        <Textarea
          value={draft.alcance}
          onChange={(event) => setDraft((prev) => ({ ...prev, alcance: event.target.value }))}
          rows={3}
        />
      </OperationsFormField>
      <OperationsFormField label="Última ejecución">
        <Input
          type="date"
          value={draft.ultimaEjecucion}
          onChange={(event) =>
            setDraft((prev) => ({ ...prev, ultimaEjecucion: event.target.value }))
          }
        />
      </OperationsFormField>
      <OperationsFormField label="Observación">
        <Textarea
          value={draft.observacion}
          onChange={(event) => setDraft((prev) => ({ ...prev, observacion: event.target.value }))}
          rows={4}
        />
      </OperationsFormField>
      <DialogFooter>
        <Button variant="outline" className="bg-transparent" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={() => onSave(draft)}>Guardar</Button>
      </DialogFooter>
    </div>
  )
}

function TurnEditor({
  row,
  onClose,
  onSave,
}: {
  row: LegacySalesWindowTurn
  onClose: () => void
  onSave: (row: LegacySalesWindowTurn) => void
}) {
  const [draft, setDraft] = useState(row)

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <OperationsFormField label="Caja">
          <Input
            value={draft.caja}
            onChange={(event) => setDraft((prev) => ({ ...prev, caja: event.target.value }))}
          />
        </OperationsFormField>
        <OperationsFormField label="Operador">
          <Input
            value={draft.operador}
            onChange={(event) => setDraft((prev) => ({ ...prev, operador: event.target.value }))}
          />
        </OperationsFormField>
        <OperationsFormField label="Cola">
          <Input
            type="number"
            value={draft.cola}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, cola: Number(event.target.value) || 0 }))
            }
          />
        </OperationsFormField>
        <OperationsFormField label="Importe objetivo">
          <Input
            type="number"
            value={draft.importeObjetivo}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, importeObjetivo: Number(event.target.value) || 0 }))
            }
          />
        </OperationsFormField>
        <OperationsFormField label="Estado">
          <Select
            value={draft.estado}
            onValueChange={(value) =>
              setDraft((prev) => ({ ...prev, estado: value as LegacySalesWindowTurn["estado"] }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="abierta">Abierta</SelectItem>
              <SelectItem value="pausa">Pausa</SelectItem>
              <SelectItem value="cerrada">Cerrada</SelectItem>
            </SelectContent>
          </Select>
        </OperationsFormField>
      </div>
      <OperationsFormField label="Observación">
        <Textarea
          value={draft.observacion}
          onChange={(event) => setDraft((prev) => ({ ...prev, observacion: event.target.value }))}
          rows={4}
        />
      </OperationsFormField>
      <DialogFooter>
        <Button variant="outline" className="bg-transparent" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={() => onSave(draft)}>Guardar</Button>
      </DialogFooter>
    </div>
  )
}

function BatchEditor({
  row,
  onClose,
  onSave,
}: {
  row: LegacySalesBatchJob
  onClose: () => void
  onSave: (row: LegacySalesBatchJob) => void
}) {
  const [draft, setDraft] = useState(row)

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <OperationsFormField label="Descripción">
          <Input
            value={draft.descripcion}
            onChange={(event) => setDraft((prev) => ({ ...prev, descripcion: event.target.value }))}
          />
        </OperationsFormField>
        <OperationsFormField label="Responsable">
          <Input
            value={draft.responsable}
            onChange={(event) => setDraft((prev) => ({ ...prev, responsable: event.target.value }))}
          />
        </OperationsFormField>
        <OperationsFormField label="Tipo">
          <Select
            value={draft.tipo}
            onValueChange={(value) =>
              setDraft((prev) => ({ ...prev, tipo: value as LegacySalesBatchJob["tipo"] }))
            }
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
            onValueChange={(value) =>
              setDraft((prev) => ({ ...prev, estado: value as LegacySalesBatchJob["estado"] }))
            }
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
          />
        </OperationsFormField>
      </div>
      <OperationsFormField label="Observación">
        <Textarea
          value={draft.observacion}
          onChange={(event) => setDraft((prev) => ({ ...prev, observacion: event.target.value }))}
          rows={4}
        />
      </OperationsFormField>
      <DialogFooter>
        <Button variant="outline" className="bg-transparent" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={() => onSave(draft)}>Guardar</Button>
      </DialogFooter>
    </div>
  )
}
