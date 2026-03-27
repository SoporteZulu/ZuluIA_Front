"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { useComprobantes } from "@/lib/hooks/useComprobantes"
import { useCobros } from "@/lib/hooks/useCobros"
import { useListasPrecios } from "@/lib/hooks/useListasPrecios"
import { usePuntosFacturacion } from "@/lib/hooks/usePuntosFacturacion"
import { useDefaultSucursalId } from "@/lib/hooks/useSucursales"
import { useLegacyLocalCollection } from "@/lib/hooks/useLegacyLocalCollection"
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

function priorityBadge(value: LegacySalesMonitorRow["prioridad"]) {
  if (value === "alta") return <Badge variant="destructive">Alta</Badge>
  if (value === "media") return <Badge variant="secondary">Media</Badge>
  return <Badge variant="outline">Baja</Badge>
}

function stateBadge(value: string) {
  if (value === "activa" || value === "abierta" || value === "ejecucion") {
    return <Badge>Activo</Badge>
  }
  if (value === "gestion" || value === "control" || value === "revision" || value === "pausa") {
    return <Badge variant="secondary">En gestión</Badge>
  }
  if (value === "cerrado" || value === "resuelto") {
    return <Badge variant="outline">Cerrado</Badge>
  }
  return <Badge variant="outline">Preparación</Badge>
}

function OperationsFormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

export default function VentasOperacionesPage() {
  const sucursalId = useDefaultSucursalId()
  const { comprobantes } = useComprobantes({ esVenta: true })
  const { cobros } = useCobros({ sucursalId })
  const { listas } = useListasPrecios()
  const { puntos } = usePuntosFacturacion(sucursalId)
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

  const overdueInvoices = useMemo(
    () =>
      comprobantes.filter(
        (row) =>
          row.saldo > 0 &&
          row.estado !== "ANULADO" &&
          row.fechaVto &&
          new Date(row.fechaVto) < new Date()
      ),
    [comprobantes]
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ventas: Operaciones Legacy</h1>
        <p className="mt-1 text-muted-foreground">
          Consola de variantes operativas heredadas: factura monitor, facturación masiva o
          automática, cobro por ventanilla, remitos masivos, recibos masivos e impresión
          distribuida. Usa datos reales donde el backend alcanza y overlays honestos donde todavía
          no existe contrato.
        </p>
      </div>

      <Alert>
        <AlertTitle>Cobertura híbrida</AlertTitle>
        <AlertDescription>
          Monitor comercial, colas de ventanilla y reglas masivas quedan persistidos localmente. Los
          contadores vivos se cruzan con comprobantes, cobros, listas y puntos de facturación
          reales.
        </AlertDescription>
      </Alert>

      <Alert>
        <AlertTitle>Límite backend actual</AlertTitle>
        <AlertDescription>
          Esta consola reúne facturación automática o masiva, recibos masivos, ventanilla, monitor e
          impresión distribuida porque el backend todavía no publica orquestación específica para
          esos subflujos. La lectura base usa datos reales; la coordinación operativa sigue en
          overlay local explícito.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Facturas vencidas"
          value={overdueInvoices.length}
          description="Señal real para factura monitor"
        />
        <MetricCard
          title="Cobros visibles"
          value={cobros.length}
          description="Base real para ventanilla y recibos"
        />
        <MetricCard
          title="Listas activas"
          value={listas.length}
          description="Fuente para impresión y distribución"
        />
        <MetricCard
          title="Puntos operativos"
          value={puntos.length}
          description="Prefijos disponibles por sucursal"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Reglas activas"
          value={activeAutomation}
          description="Automatizaciones listas para disparo manual"
        />
        <MetricCard
          title="Cajas abiertas"
          value={openTurns}
          description="Ventanillas hoy en operación"
        />
        <MetricCard
          title="Jobs en ejecución"
          value={runningJobs}
          description="Lotes con seguimiento activo"
        />
      </div>

      <Tabs defaultValue="monitor" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-2 lg:grid-cols-4">
          <TabsTrigger value="monitor">Monitor</TabsTrigger>
          <TabsTrigger value="automatizacion">Masiva / automática</TabsTrigger>
          <TabsTrigger value="ventanilla">Ventanilla</TabsTrigger>
          <TabsTrigger value="batch">Batch y distribución</TabsTrigger>
        </TabsList>

        <TabsContent value="monitor" className="space-y-4">
          <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MonitorCog className="h-4 w-4" /> Monitor comercial
                </CardTitle>
                <CardDescription>
                  Replica funcional del seguimiento legacy de facturas y cobranzas.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Circuito</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Responsable</TableHead>
                      <TableHead>Prioridad</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monitorRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.circuito}</TableCell>
                        <TableCell>{row.cliente}</TableCell>
                        <TableCell>{row.documento}</TableCell>
                        <TableCell>{row.responsable}</TableCell>
                        <TableCell>{priorityBadge(row.prioridad)}</TableCell>
                        <TableCell>{stateBadge(row.estado)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingMonitor(row)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Backlog vivo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  {overdueInvoices.length} facturas reales con saldo vencido alimentan el monitor.
                </p>
                <p>
                  {monitorRows.filter((row) => row.estado !== "resuelto").length} casos siguen en
                  seguimiento local.
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button asChild variant="outline" className="bg-transparent">
                    <Link href="/ventas/facturas">Facturas</Link>
                  </Button>
                  <Button asChild>
                    <Link href="/ventas/cuenta-corriente">Cuenta corriente</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="automatizacion" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings2 className="h-4 w-4" /> Reglas masivas y automáticas
              </CardTitle>
              <CardDescription>
                Preparación operativa del legacy mientras el backend no orquesta lotes
                automáticamente.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-2">
              {automationRules.map((rule) => (
                <div key={rule.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{rule.nombre}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{rule.alcance}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {stateBadge(rule.estado)}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingAutomation(rule)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                    <p>Circuito: {rule.circuito}</p>
                    <p>Frecuencia: {rule.frecuencia}</p>
                    <p>Última ejecución: {rule.ultimaEjecucion || "Sin ejecutar"}</p>
                    <p>{rule.observacion}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ventanilla" className="space-y-4">
          <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CreditCard className="h-4 w-4" /> Cobro por ventanilla
                </CardTitle>
                <CardDescription>
                  Cola operativa de mostrador y recibos rápidos sobre el circuito real de cobros.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Caja</TableHead>
                      <TableHead>Operador</TableHead>
                      <TableHead>Cola</TableHead>
                      <TableHead>Objetivo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {windowTurns.map((turn) => (
                      <TableRow key={turn.id}>
                        <TableCell className="font-medium">{turn.caja}</TableCell>
                        <TableCell>{turn.operador}</TableCell>
                        <TableCell>{turn.cola}</TableCell>
                        <TableCell>${turn.importeObjetivo.toLocaleString("es-AR")}</TableCell>
                        <TableCell>{stateBadge(turn.estado)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => setEditingTurn(turn)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Puentes reales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>{cobros.length} cobros registrados disponibles para rendición y reimpresión.</p>
                <p>{puntos.length} puntos de facturación visibles para prefijos de recibos.</p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button asChild>
                    <Link href="/ventas/cobros">Abrir cobros</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="batch" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Rows3 className="h-4 w-4" /> Operaciones batch
              </CardTitle>
              <CardDescription>
                Imputaciones masivas, impresión de listas y tandas operativas del legacy.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-2">
              {batchJobs.map((job) => (
                <div key={job.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{job.descripcion}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{job.tipo}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {stateBadge(job.estado)}
                      <Button variant="ghost" size="icon" onClick={() => setEditingBatch(job)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                    <p>Registros: {job.registros}</p>
                    <p>Responsable: {job.responsable}</p>
                    <p>{job.observacion}</p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {job.tipo === "imputacion-masiva" ? (
                      <Button asChild variant="outline" className="bg-transparent">
                        <Link href="/ventas/imputaciones">Imputaciones</Link>
                      </Button>
                    ) : null}
                    {job.tipo === "listas-imprimir" ? (
                      <Button asChild variant="outline" className="bg-transparent">
                        <Link href="/ventas/listas-precios">Listas</Link>
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <div className="grid gap-4 md:grid-cols-3">
            <QuickLink
              title="Monitor factura"
              href="/ventas/facturas"
              description="Seguimiento con detalle real del comprobante"
              icon={Receipt}
            />
            <QuickLink
              title="Impresión listas"
              href="/ventas/listas-precios"
              description="Distribución y control de vigencias"
              icon={Printer}
            />
            <QuickLink
              title="Facturación masiva"
              href="/ventas/facturas"
              description="Preparación operativa con gap backend explícito"
              icon={FileSpreadsheet}
            />
          </div>
        </TabsContent>
      </Tabs>

      <Dialog
        open={editingMonitor !== null}
        onOpenChange={(open) => !open && setEditingMonitor(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar monitor comercial</DialogTitle>
            <DialogDescription>
              Ajuste local del seguimiento legacy hasta contar con monitor persistido por backend.
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
            <DialogTitle>Editar regla automática</DialogTitle>
            <DialogDescription>
              Persistencia local honesta del circuito masivo mientras no exista orquestación
              backend.
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
            <DialogTitle>Editar cola de ventanilla</DialogTitle>
            <DialogDescription>
              Ajuste local de cola, operador y objetivo de caja para el circuito heredado.
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
            <DialogTitle>Editar operación batch</DialogTitle>
            <DialogDescription>
              Seguimiento local de tandas e impresión distribuida del legacy.
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
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
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
  icon: typeof Receipt
}) {
  return (
    <Link href={href} className="rounded-lg border p-4 transition-colors hover:bg-muted/40">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4" /> {title}
      </div>
      <p className="mt-3 font-semibold">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      <div className="mt-4 flex items-center gap-2 text-sm font-medium">
        Abrir <ArrowRight className="h-4 w-4" />
      </div>
    </Link>
  )
}
