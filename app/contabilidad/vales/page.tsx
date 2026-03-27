"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Eye, RefreshCw, Search, ShieldAlert, Ticket, Wallet } from "lucide-react"

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
  legacyAccountingVouchers,
  type LegacyAccountingVoucher,
} from "@/lib/contabilidad-legacy-data"
import { useLegacyLocalCollection } from "@/lib/hooks/useLegacyLocalCollection"
import { useCajas } from "@/lib/hooks/useCajas"
import { useEmpleados } from "@/lib/hooks/useEmpleados"
import { useDefaultSucursalId } from "@/lib/hooks/useSucursales"

type VoucherStage = "emitido" | "en_rendicion" | "vencido" | "cerrado"

type LocalVoucherTracker = {
  voucherId: string
  stage: VoucherStage
  owner: string
  nextStep: string
  updatedAt: string
}

const VOUCHER_TRACKER_STORAGE_KEY = "zuluia_contabilidad_vales_trackers"

const STATUS_CONFIG: Record<
  LegacyAccountingVoucher["estado"],
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  ABIERTO: { label: "Abierto", variant: "outline" },
  RENDIDO: { label: "Rendido", variant: "default" },
  VENCIDO: { label: "Vencido", variant: "destructive" },
}

const STAGE_CONFIG: Record<
  VoucherStage,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  emitido: { label: "Emitido", variant: "outline" },
  en_rendicion: { label: "En rendicion", variant: "secondary" },
  vencido: { label: "Vencido", variant: "destructive" },
  cerrado: { label: "Cerrado", variant: "default" },
}

const DEFAULT_TRACKERS: LocalVoucherTracker[] = legacyAccountingVouchers.map((item) => ({
  voucherId: item.id,
  stage:
    item.estado === "RENDIDO" ? "cerrado" : item.estado === "VENCIDO" ? "vencido" : "en_rendicion",
  owner: item.responsable,
  nextStep:
    item.estado === "RENDIDO"
      ? "Mantener legajo de rendicion y conciliacion del vale."
      : item.estado === "VENCIDO"
        ? "Escalar faltante de rendicion y definir diferencia."
        : "Completar reintegro o comprobantes para cerrar el vale.",
  updatedAt: item.fecha,
}))

function formatMoney(value: number) {
  return value.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  })
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString("es-AR") : "-"
}

function matchesTerm(item: LegacyAccountingVoucher, tracker: LocalVoucherTracker, term: string) {
  if (term === "") {
    return true
  }

  return [
    item.id,
    item.beneficiario,
    item.sector,
    item.concepto,
    item.referencia,
    item.centroCosto,
    item.caja,
    item.observacion,
    item.rendicionEsperada,
    tracker.owner,
    tracker.nextStep,
    ...item.items.map((line) => `${line.concepto} ${line.cuenta}`),
  ]
    .join(" ")
    .toLowerCase()
    .includes(term)
}

function getVoucherHealth(item: LegacyAccountingVoucher, tracker: LocalVoucherTracker) {
  if (tracker.stage === "cerrado") {
    return "Vale conciliado con rendicion y cierre documental"
  }
  if (tracker.stage === "vencido") {
    return "Vale vencido con escalamiento pendiente"
  }
  if (tracker.stage === "en_rendicion") {
    return "Vale emitido con rendicion parcial o en curso"
  }
  return "Vale emitido y a la espera de uso o comprobantes"
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

export default function ContabilidadValesPage() {
  const sucursalId = useDefaultSucursalId()
  const { cajas } = useCajas(sucursalId)
  const { empleados } = useEmpleados({ sucursalId })
  const {
    rows: trackers,
    setRows: setTrackers,
    reset: resetTrackers,
  } = useLegacyLocalCollection<LocalVoucherTracker>(VOUCHER_TRACKER_STORAGE_KEY, DEFAULT_TRACKERS)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"todos" | LegacyAccountingVoucher["estado"]>(
    "todos"
  )
  const [stageFilter, setStageFilter] = useState<"todos" | VoucherStage>("todos")
  const [selectedId, setSelectedId] = useState<string | null>(
    legacyAccountingVouchers[0]?.id ?? null
  )

  const trackerMap = useMemo(
    () => new Map(trackers.map((tracker) => [tracker.voucherId, tracker])),
    [trackers]
  )
  const vouchers = useMemo(
    () =>
      legacyAccountingVouchers.map((item) => ({
        ...item,
        tracker:
          trackerMap.get(item.id) ??
          DEFAULT_TRACKERS.find((tracker) => tracker.voucherId === item.id)!,
      })),
    [trackerMap]
  )

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim()
    return vouchers.filter(
      (item) =>
        matchesTerm(item, item.tracker, term) &&
        (statusFilter === "todos" || item.estado === statusFilter) &&
        (stageFilter === "todos" || item.tracker.stage === stageFilter)
    )
  }, [vouchers, search, statusFilter, stageFilter])

  const selected = vouchers.find((item) => item.id === selectedId) ?? filtered[0] ?? null
  const highlighted = filtered.find((item) => item.estado === "VENCIDO") ?? filtered[0] ?? null
  const kpis = useMemo(
    () => ({
      open: vouchers.filter((item) => item.estado === "ABIERTO").length,
      overdue: vouchers.filter((item) => item.estado === "VENCIDO").length,
      rendered: vouchers.filter((item) => item.estado === "RENDIDO").length,
      pendingAmount: vouchers.reduce((acc, item) => acc + item.saldoPendiente, 0),
    }),
    [vouchers]
  )

  const updateTracker = (voucherId: string, patch: Partial<LocalVoucherTracker>) => {
    setTrackers((current) => {
      const index = current.findIndex((row) => row.voucherId === voucherId)
      const base =
        index >= 0 ? current[index] : DEFAULT_TRACKERS.find((row) => row.voucherId === voucherId)!
      const nextRow = {
        ...base,
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
          <h1 className="text-3xl font-bold tracking-tight">Vales</h1>
          <p className="mt-1 text-muted-foreground">
            Consola de vales y adelantos con control de vencimiento, rendicion, saldo pendiente y
            seguimiento local del circuito historico de tesoreria.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="bg-transparent" onClick={() => resetTrackers()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Restablecer seguimiento
          </Button>
          <Button asChild variant="outline" className="bg-transparent">
            <Link href="/contabilidad/reintegros">Reintegros</Link>
          </Button>
          <Button asChild>
            <Link href="/contabilidad/cajas">Ir a cajas</Link>
          </Button>
        </div>
      </div>

      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertDescription>
          El backend actual no emite ni rinde vales. Esta vista cubre beneficiario, vencimiento,
          saldo, referencias y seguimiento local sin inventar contratos nuevos.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Abiertos</p>
            <p className="mt-2 text-2xl font-bold text-amber-600">{kpis.open}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Vencidos</p>
            <p className="mt-2 text-2xl font-bold text-destructive">{kpis.overdue}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Rendidos</p>
            <p className="mt-2 text-2xl font-bold text-emerald-600">{kpis.rendered}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Saldo pendiente</p>
            <p className="mt-2 text-2xl font-bold">{formatMoney(kpis.pendingAmount)}</p>
          </CardContent>
        </Card>
      </div>

      {highlighted ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardDescription>Vale priorizado</CardDescription>
            <CardTitle className="mt-1 text-xl">{highlighted.id.toUpperCase()}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-4">
            <div className="rounded-lg bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Beneficiario</p>
              <p className="text-sm font-medium">{highlighted.beneficiario}</p>
            </div>
            <div className="rounded-lg bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Caja</p>
              <p className="text-sm font-medium">{highlighted.caja}</p>
            </div>
            <div className="rounded-lg bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Vence</p>
              <p className="text-sm font-medium">{formatDate(highlighted.fechaVencimiento)}</p>
            </div>
            <div className="rounded-lg bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Saldo pendiente</p>
              <p className="text-sm font-medium">{formatMoney(highlighted.saldoPendiente)}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 lg:grid-cols-[1.8fr_1fr_1fr]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-10"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por beneficiario, sector, referencia o concepto..."
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as "todos" | LegacyAccountingVoucher["estado"])
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Estado legacy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todo el estado legacy</SelectItem>
                <SelectItem value="ABIERTO">Abierto</SelectItem>
                <SelectItem value="RENDIDO">Rendido</SelectItem>
                <SelectItem value="VENCIDO">Vencido</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={stageFilter}
              onValueChange={(value) => setStageFilter(value as "todos" | VoucherStage)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seguimiento local" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todo el seguimiento</SelectItem>
                <SelectItem value="emitido">Emitido</SelectItem>
                <SelectItem value="en_rendicion">En rendicion</SelectItem>
                <SelectItem value="vencido">Vencido</SelectItem>
                <SelectItem value="cerrado">Cerrado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Ticket className="h-4 w-4" /> Vales y adelantos visibles
            </CardTitle>
            <CardDescription>
              Emision, vencimiento y rendicion de fondos a rendir tomados del legado.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Beneficiario</TableHead>
                  <TableHead>Sector</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Vence</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.id.toUpperCase()}</TableCell>
                    <TableCell>{item.beneficiario}</TableCell>
                    <TableCell>{item.sector}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={STATUS_CONFIG[item.estado].variant}>
                          {STATUS_CONFIG[item.estado].label}
                        </Badge>
                        <Badge variant={STAGE_CONFIG[item.tracker.stage].variant}>
                          {STAGE_CONFIG[item.tracker.stage].label}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(item.fechaVencimiento)}</TableCell>
                    <TableCell className="text-right">{formatMoney(item.saldoPendiente)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => setSelectedId(item.id)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No hay vales que coincidan con los filtros actuales.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contexto real del backend</CardTitle>
            <CardDescription>
              Referencias disponibles para sostener el control local de vales mientras no hay API.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Wallet className="h-4 w-4" /> Cajas disponibles
              </div>
              <p className="mt-2 text-2xl font-bold">{cajas.length}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Wallet className="h-4 w-4" /> Empleados visibles
              </div>
              <p className="mt-2 text-2xl font-bold">{empleados.length}</p>
            </div>
            {selected ? (
              <div className="rounded-lg bg-muted/40 p-3 text-sm">
                <p className="text-xs text-muted-foreground">Gap activo</p>
                <p className="mt-1 font-medium">{selected.backendGap}</p>
              </div>
            ) : null}
            <p className="text-sm text-muted-foreground">
              Esta pantalla hace visible la brecha entre adelantos y rendiciones sin simular alta ni
              cierre backend que hoy todavia no existen.
            </p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{selected ? `Vale ${selected.id.toUpperCase()}` : "Vale"}</DialogTitle>
            <DialogDescription>
              {selected
                ? `${selected.beneficiario} · ${selected.sector} · ${selected.referencia}`
                : "Detalle operativo del vale"}
            </DialogDescription>
          </DialogHeader>
          {selected ? (
            <Tabs defaultValue="circuito">
              <TabsList className="grid h-auto w-full grid-cols-4">
                <TabsTrigger value="circuito">Circuito</TabsTrigger>
                <TabsTrigger value="items">Impacto</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="seguimiento">Seguimiento</TabsTrigger>
              </TabsList>

              <TabsContent value="circuito" className="pt-2">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Cabecera operativa</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <DetailFieldGrid
                        fields={[
                          { label: "Beneficiario", value: selected.beneficiario },
                          { label: "Sector", value: selected.sector },
                          { label: "Caja", value: selected.caja },
                          { label: "Centro de costo", value: selected.centroCosto },
                          { label: "Fecha", value: formatDate(selected.fecha) },
                          { label: "Vencimiento", value: formatDate(selected.fechaVencimiento) },
                          { label: "Referencia", value: selected.referencia },
                          {
                            label: "Responsable",
                            value: selected.tracker.owner || selected.responsable,
                          },
                          { label: "Saldo pendiente", value: formatMoney(selected.saldoPendiente) },
                          {
                            label: "Salud del circuito",
                            value: getVoucherHealth(selected, selected.tracker),
                          },
                        ]}
                      />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Observaciones</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">Concepto</p>
                        <p className="mt-1 font-medium">{selected.concepto}</p>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">Rendicion esperada</p>
                        <p className="mt-1 text-muted-foreground">{selected.rendicionEsperada}</p>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">Observacion</p>
                        <p className="mt-1 text-muted-foreground">{selected.observacion}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="items" className="pt-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Impacto visible del vale</CardTitle>
                    <CardDescription>
                      Apertura local del fondo a rendir y su centro de costo asociado.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Concepto</TableHead>
                          <TableHead>Cuenta</TableHead>
                          <TableHead>Centro costo</TableHead>
                          <TableHead className="text-right">Importe</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selected.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.concepto}</TableCell>
                            <TableCell>{item.cuenta}</TableCell>
                            <TableCell>{item.centroCosto}</TableCell>
                            <TableCell className="text-right">
                              {formatMoney(item.importe)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="timeline" className="pt-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Secuencia operativa</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selected.timeline.map((event) => (
                      <div key={event.id} className="rounded-lg border bg-muted/20 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium">{event.title}</p>
                          <span className="text-xs text-muted-foreground">{event.at}</span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{event.detail}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="seguimiento" className="space-y-4 pt-2">
                <Alert>
                  <ShieldAlert className="h-4 w-4" />
                  <AlertDescription>
                    El seguimiento local cubre vencimiento, rendicion y cierre del vale en este
                    navegador hasta que exista backend propio para tesoreria ampliada.
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
                            updateTracker(selected.id, { stage: value as VoucherStage })
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Seleccionar estado" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="emitido">Emitido</SelectItem>
                            <SelectItem value="en_rendicion">En rendicion</SelectItem>
                            <SelectItem value="vencido">Vencido</SelectItem>
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
                        <label className="text-sm font-medium">Proximo paso</label>
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
                          {getVoucherHealth(selected, selected.tracker)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">Ultima actualizacion local</p>
                        <p className="mt-1 font-medium">{formatDate(selected.tracker.updatedAt)}</p>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">Paso sugerido</p>
                        <p className="mt-1 font-medium">{selected.tracker.nextStep}</p>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">Backend faltante</p>
                        <p className="mt-1 font-medium">{selected.backendGap}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
