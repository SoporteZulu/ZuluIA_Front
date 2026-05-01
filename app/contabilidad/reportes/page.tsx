"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  AlertCircle,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  FileText,
  Scale,
  Search,
  ShieldCheck,
  Waypoints,
} from "lucide-react"
import { useLibroIva } from "@/lib/hooks/useLibroIva"
import { useAsientos, usePlanCuentas } from "@/lib/hooks/useAsientos"
import { useEjercicioVigente } from "@/lib/hooks/useEjercicios"
import { usePeriodosIva } from "@/lib/hooks/usePeriodosIva"
import { useDefaultSucursalId } from "@/lib/hooks/useSucursales"
import type { Asiento, BalanceSumasYSaldos, MayorResult, PlanCuenta } from "@/lib/types/asientos"
import type { Ejercicio } from "@/lib/types/ejercicios"
import type { LibroIvaDto, LibroIvaLinea } from "@/lib/types/libro-iva"
import type { PeriodoIvaDto } from "@/lib/types/periodos-iva"

function fmtARS(n: number) {
  return Number(n).toLocaleString("es-AR", { minimumFractionDigits: 2 })
}

function formatInputDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function buildMonthRange(offset = 0) {
  const today = new Date()
  const firstDay = new Date(today.getFullYear(), today.getMonth() + offset, 1)
  const lastDay = new Date(today.getFullYear(), today.getMonth() + offset + 1, 0)

  return {
    desde: formatInputDate(firstDay),
    hasta: formatInputDate(lastDay),
  }
}

function buildRangeFromPeriodo(periodo: string) {
  const [year, month] = periodo.split("-").map(Number)

  if (!year || !month) return buildMonthRange(0)

  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)

  return {
    desde: formatInputDate(firstDay),
    hasta: formatInputDate(lastDay),
  }
}

function formatDate(value?: string) {
  if (!value) return "-"
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch
    return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString("es-AR")
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("es-AR")
}

function normalizeAsientoEstado(status?: string) {
  return (status ?? "").trim().toLowerCase()
}

function isConsolidatedAsientoStatus(status?: string) {
  const normalized = normalizeAsientoEstado(status)
  return normalized === "publicado" || normalized === "contabilizado"
}

function formatPeriodo(periodo?: string) {
  if (!periodo) return "Sin período"

  const [year, month] = periodo.split("-").map(Number)
  if (!year || !month) return periodo

  return new Date(year, month - 1, 1).toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  })
}

function getPeriodoStatus(periodo?: PeriodoIvaDto | null) {
  if (!periodo) {
    return {
      label: "Rango manual",
      detail: "La consulta no coincide con un período IVA registrado.",
    }
  }

  if (periodo.cerrado) {
    return {
      label: "Período cerrado",
      detail: "El reporte toma un período ya cerrado y listo para control fiscal.",
    }
  }

  return {
    label: "Período abierto",
    detail: "El rango coincide con un período todavía operativo en IVA.",
  }
}

function getLibroLineaStatus(linea: LibroIvaLinea) {
  if (linea.terceroCuit && linea.tipoComprobante) {
    return {
      label: "Trazable",
      detail: "Comprobante y tercero identificados para control fiscal.",
    }
  }

  if (linea.tipoComprobante) {
    return {
      label: "Parcial",
      detail: "El comprobante existe, pero faltan datos completos del tercero.",
    }
  }

  return {
    label: "Incompleto",
    detail: "La línea requiere revisión documental adicional.",
  }
}

function getBalanceStatus(difference: number) {
  if (difference === 0) {
    return {
      label: "Balanceado",
      detail: "Debe y haber quedaron compensados en el rango emitido.",
    }
  }

  return {
    label: "Con diferencia",
    detail: "El libro diario muestra diferencia y necesita control previo al cierre.",
  }
}

function SummaryCard({
  title,
  value,
  description,
}: {
  title: string
  value: string
  description: string
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

function RangeQuickActions({
  onCurrentMonth,
  onPreviousMonth,
  recentPeriodos,
  onPeriodoSelect,
}: {
  onCurrentMonth: () => void
  onPreviousMonth: () => void
  recentPeriodos: PeriodoIvaDto[]
  onPeriodoSelect: (periodo: PeriodoIvaDto) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" onClick={onCurrentMonth}>
        Mes actual
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={onPreviousMonth}>
        Mes anterior
      </Button>
      {recentPeriodos.map((periodo) => (
        <Button
          key={periodo.id}
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPeriodoSelect(periodo)}
        >
          {formatPeriodo(periodo.periodo)}
        </Button>
      ))}
    </div>
  )
}

function LibroIvaTab({
  tipo,
  sucursalId,
  recentPeriodos,
}: {
  tipo: "ventas" | "compras"
  sucursalId: number
  recentPeriodos: PeriodoIvaDto[]
}) {
  const { libroVentas, libroCompras, loading, error, fetchVentas, fetchCompras } = useLibroIva()
  const initialRange = recentPeriodos[0]
    ? buildRangeFromPeriodo(recentPeriodos[0].periodo)
    : buildMonthRange(0)
  const [desde, setDesde] = useState(initialRange.desde)
  const [hasta, setHasta] = useState(initialRange.hasta)

  const libro = tipo === "ventas" ? libroVentas : libroCompras
  const title = tipo === "ventas" ? "Libro IVA Ventas" : "Libro IVA Compras"

  const selectedPeriodo = useMemo(
    () =>
      recentPeriodos.find((periodo) => {
        const range = buildRangeFromPeriodo(periodo.periodo)
        return range.desde === desde && range.hasta === hasta
      }) ?? null,
    [desde, hasta, recentPeriodos]
  )
  const periodoStatus = getPeriodoStatus(selectedPeriodo)

  const setCurrentMonth = () => {
    const range = buildMonthRange(0)
    setDesde(range.desde)
    setHasta(range.hasta)
  }

  const setPreviousMonth = () => {
    const range = buildMonthRange(-1)
    setDesde(range.desde)
    setHasta(range.hasta)
  }

  const setPeriodoRange = (periodo: PeriodoIvaDto) => {
    const range = buildRangeFromPeriodo(periodo.periodo)
    setDesde(range.desde)
    setHasta(range.hasta)
  }

  const handleBuscar = () => {
    if (!desde || !hasta) return
    if (tipo === "ventas") fetchVentas(sucursalId, desde, hasta)
    else fetchCompras(sucursalId, desde, hasta)
  }

  const libroActual = libro as LibroIvaDto | null
  const lineas = libroActual?.lineas ?? []
  const tercerosIdentificados = lineas.filter((linea) => Boolean(linea.terceroCuit)).length
  const totalExento = lineas.reduce((sum, linea) => sum + Number(linea.exento ?? 0), 0)
  const totalIvaNoInscripto = lineas.reduce((sum, linea) => sum + Number(linea.ivaRni ?? 0), 0)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Parámetros del reporte</CardTitle>
          <CardDescription>
            Definí el rango manualmente o reutilizá períodos IVA recientes para mantener
            consistencia con cierres fiscales.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Desde</Label>
              <Input
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Hasta</Label>
              <Input
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                className="w-40"
              />
            </div>
            <Button onClick={handleBuscar} disabled={loading || !desde || !hasta}>
              <Search className="h-4 w-4 mr-2" />
              Generar
            </Button>
          </div>

          <RangeQuickActions
            onCurrentMonth={setCurrentMonth}
            onPreviousMonth={setPreviousMonth}
            recentPeriodos={recentPeriodos}
            onPeriodoSelect={setPeriodoRange}
          />

          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>Período detectado:</span>
            <Badge variant="outline">
              {selectedPeriodo ? formatPeriodo(selectedPeriodo.periodo) : "Rango manual"}
            </Badge>
            {selectedPeriodo && (
              <Badge variant={selectedPeriodo.cerrado ? "secondary" : "default"}>
                {selectedPeriodo.cerrado ? "Cerrado" : "Abierto"}
              </Badge>
            )}
          </div>

          <div className="rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
              <div>
                <p className="font-medium text-foreground">Lectura del rango fiscal</p>
                <p>{periodoStatus.detail}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && <p className="text-sm text-muted-foreground">Cargando {title}…</p>}

      {libroActual && !loading && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title="Comprobantes informados"
              value={String(libroActual.lineas?.length ?? 0)}
              description="Cantidad de registros incluidos en el libro para el rango consultado."
            />
            <SummaryCard
              title="Neto gravado"
              value={`$${fmtARS(libroActual.totalNetoGravado ?? 0)}`}
              description="Base imponible gravada acumulada en el período."
            />
            <SummaryCard
              title="Neto no gravado"
              value={`$${fmtARS(libroActual.totalNetoNoGravado ?? 0)}`}
              description="Conceptos no gravados informados por el backend fiscal."
            />
            <SummaryCard
              title="Total general"
              value={`$${fmtARS(libroActual.totalGeneral ?? 0)}`}
              description="Importe consolidado del libro listo para control o exportación posterior."
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ClipboardList className="h-4 w-4" /> Cobertura documental
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {tercerosIdentificados} de {lineas.length} líneas exponen CUIT visible para control
                fiscal.
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Waypoints className="h-4 w-4" /> Circuito fiscal
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {periodoStatus.label}.{" "}
                {selectedPeriodo
                  ? `Asociado a ${formatPeriodo(selectedPeriodo.periodo)}.`
                  : "Rango manual sin período persistido."}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarClock className="h-4 w-4" /> Composición IVA
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Exento: ${fmtARS(totalExento)} · IVA RNI: ${fmtARS(totalIvaNoInscripto)}.
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription>
                {libroActual.desde} → {libroActual.hasta} · Sucursal {libroActual.sucursalId}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Comprobante</TableHead>
                    <TableHead>Tercero</TableHead>
                    <TableHead>CUIT</TableHead>
                    <TableHead>Circuito</TableHead>
                    <TableHead className="text-right">Neto Grav.</TableHead>
                    <TableHead className="text-right">IVA RI</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(libroActual.lineas ?? []).map((l, i) => {
                    const lineStatus = getLibroLineaStatus(l)

                    return (
                      <TableRow key={i}>
                        <TableCell className="text-sm">{l.fecha}</TableCell>
                        <TableCell className="text-sm">
                          <Badge variant="outline">{l.tipoComprobante}</Badge>
                          {l.numero && <span className="ml-1 text-xs">{l.numero}</span>}
                          {l.puntoVenta && (
                            <p className="text-xs text-muted-foreground">PV {l.puntoVenta}</p>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{l.terceroRazonSocial ?? "-"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {l.terceroCuit ?? "-"}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm font-medium">{lineStatus.label}</div>
                            <p className="text-xs text-muted-foreground">{lineStatus.detail}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          ${fmtARS(l.netoGravado)}
                        </TableCell>
                        <TableCell className="text-right text-sm">${fmtARS(l.ivaRi)}</TableCell>
                        <TableCell className="text-right font-medium">${fmtARS(l.total)}</TableCell>
                      </TableRow>
                    )
                  })}
                  {(libroActual.lineas ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        Sin registros en el período
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="px-4 py-3 border-t flex justify-end gap-6 text-sm">
                <span>
                  Neto Grav.: <strong>${fmtARS(libroActual.totalNetoGravado ?? 0)}</strong>
                </span>
                <span>
                  IVA RI: <strong>${fmtARS(libroActual.totalIvaRi ?? 0)}</strong>
                </span>
                <span className="text-base font-bold">
                  Total: ${fmtARS(libroActual.totalGeneral ?? 0)}
                </span>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

type LibroDiarioResult = {
  totalAsientos?: number
  totalDebe?: number
  totalHaber?: number
  asientos?: {
    id: number
    fecha: string
    numero: string
    descripcion: string
    totalDebe: number
    totalHaber: number
  }[]
}

function LibroDiarioTab({
  ejercicio,
  recentPeriodos,
  asientos,
  loading,
  error,
  getLibroDiario,
  sucursalId,
}: {
  ejercicio: Ejercicio | null
  recentPeriodos: PeriodoIvaDto[]
  asientos: Asiento[]
  loading: boolean
  error: string | null
  getLibroDiario: (
    ejercicioId: number,
    sucursalId: number,
    desde: string,
    hasta: string
  ) => Promise<unknown | null>
  sucursalId: number
}) {
  const initialRange = recentPeriodos[0]
    ? buildRangeFromPeriodo(recentPeriodos[0].periodo)
    : buildMonthRange(0)
  const [desde, setDesde] = useState(initialRange.desde)
  const [hasta, setHasta] = useState(initialRange.hasta)
  const [libroDiario, setLibroDiario] = useState<LibroDiarioResult | null>(null)
  const [reportLoading, setReportLoading] = useState(false)

  const handleBuscar = async () => {
    if (!ejercicio?.id || !desde || !hasta) return
    setReportLoading(true)
    const result = await getLibroDiario(ejercicio.id, sucursalId, desde, hasta)
    setLibroDiario((result as LibroDiarioResult | null) ?? null)
    setReportLoading(false)
  }

  const recentEntries = useMemo(
    () =>
      [...asientos]
        .sort((a, b) => `${b.fecha}-${b.id}`.localeCompare(`${a.fecha}-${a.id}`))
        .slice(0, 8),
    [asientos]
  )

  const balanceDifference = Math.abs((libroDiario?.totalDebe ?? 0) - (libroDiario?.totalHaber ?? 0))
  const balanceStatus = getBalanceStatus(balanceDifference)
  const selectedPeriodo = useMemo(
    () =>
      recentPeriodos.find((periodo) => {
        const range = buildRangeFromPeriodo(periodo.periodo)
        return range.desde === desde && range.hasta === hasta
      }) ?? null,
    [desde, hasta, recentPeriodos]
  )
  const periodoStatus = getPeriodoStatus(selectedPeriodo)

  const setCurrentMonth = () => {
    const range = buildMonthRange(0)
    setDesde(range.desde)
    setHasta(range.hasta)
  }

  const setPreviousMonth = () => {
    const range = buildMonthRange(-1)
    setDesde(range.desde)
    setHasta(range.hasta)
  }

  const setPeriodoRange = (periodo: PeriodoIvaDto) => {
    const range = buildRangeFromPeriodo(periodo.periodo)
    setDesde(range.desde)
    setHasta(range.hasta)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Rango de libro diario</CardTitle>
          <CardDescription>
            Tomá períodos fiscales ya utilizados o ajustá el rango manualmente para controlar
            asientos del ejercicio vigente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Desde</Label>
              <Input
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Hasta</Label>
              <Input
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                className="w-40"
              />
            </div>
            <Button onClick={handleBuscar} disabled={loading || !desde || !hasta || !ejercicio?.id}>
              <Search className="h-4 w-4 mr-2" />
              Generar
            </Button>
          </div>

          <RangeQuickActions
            onCurrentMonth={setCurrentMonth}
            onPreviousMonth={setPreviousMonth}
            recentPeriodos={recentPeriodos}
            onPeriodoSelect={setPeriodoRange}
          />

          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>Ejercicio:</span>
            <Badge variant="outline">{ejercicio?.descripcion ?? "No disponible"}</Badge>
            {ejercicio && (
              <Badge variant={ejercicio.cerrado ? "secondary" : "default"}>
                {ejercicio.cerrado ? "Cerrado" : "Abierto"}
              </Badge>
            )}
          </div>

          <div className="rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <Scale className="mt-0.5 h-4 w-4 text-primary" />
              <div>
                <p className="font-medium text-foreground">Lectura del rango contable</p>
                <p>
                  {selectedPeriodo
                    ? periodoStatus.detail
                    : "Podés trabajar con un rango manual aunque no coincida con un período IVA persistido."}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {reportLoading && <p className="text-sm text-muted-foreground">Cargando Libro Diario…</p>}

      {libroDiario && !reportLoading && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title="Asientos incluidos"
              value={String(libroDiario.totalAsientos ?? 0)}
              description="Cantidad de asientos incluidos en el libro diario emitido."
            />
            <SummaryCard
              title="Total Debe"
              value={`$${fmtARS(libroDiario.totalDebe ?? 0)}`}
              description="Suma total del debe para el rango consultado."
            />
            <SummaryCard
              title="Total Haber"
              value={`$${fmtARS(libroDiario.totalHaber ?? 0)}`}
              description="Suma total del haber para el rango consultado."
            />
            <SummaryCard
              title="Diferencia"
              value={`$${fmtARS(balanceDifference)}`}
              description={
                balanceDifference === 0
                  ? "El libro quedó balanceado."
                  : "Existe diferencia entre debe y haber; requiere revisión."
              }
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Scale className="h-4 w-4" /> Estado del balance
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {balanceStatus.label}. {balanceStatus.detail}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarClock className="h-4 w-4" /> Período asociado
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {selectedPeriodo
                  ? `${formatPeriodo(selectedPeriodo.periodo)} · ${periodoStatus.label.toLowerCase()}.`
                  : "Rango manual sin vínculo directo a un período IVA persistido."}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Waypoints className="h-4 w-4" /> Circuito contable
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {libroDiario.totalAsientos ?? 0} asientos incluidos para el ejercicio{" "}
                {ejercicio?.descripcion ?? "vigente"} y la sucursal {sucursalId}.
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Libro Diario</CardTitle>
              <CardDescription>
                {libroDiario.totalAsientos ?? 0} asientos · Debe: $
                {fmtARS(libroDiario.totalDebe ?? 0)} · Haber: ${fmtARS(libroDiario.totalHaber ?? 0)}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Nro.</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Debe</TableHead>
                    <TableHead className="text-right">Haber</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(libroDiario.asientos ?? []).map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-sm">{a.fecha}</TableCell>
                      <TableCell className="text-sm font-mono">{a.numero}</TableCell>
                      <TableCell className="text-sm">{a.descripcion}</TableCell>
                      <TableCell className="text-right text-sm">${fmtARS(a.totalDebe)}</TableCell>
                      <TableCell className="text-right text-sm">${fmtARS(a.totalHaber)}</TableCell>
                    </TableRow>
                  ))}
                  {(libroDiario.asientos ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Sin asientos en el período
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {!libroDiario && !reportLoading && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Últimos asientos cargados</CardTitle>
            <CardDescription>
              Vista operativa previa a la emisión del libro diario para el ejercicio vigente.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {recentEntries.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Número</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Alta</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Debe</TableHead>
                    <TableHead className="text-right">Haber</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-sm">{formatDate(entry.fecha)}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {entry.numero ?? entry.id}
                      </TableCell>
                      <TableCell className="text-sm">{entry.descripcion}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(entry.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            isConsolidatedAsientoStatus(entry.estado) ? "default" : "secondary"
                          }
                        >
                          {entry.estado}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        ${fmtARS(entry.totalDebe ?? 0)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        ${fmtARS(entry.totalHaber ?? 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>No hay asientos recientes para previsualizar en este ejercicio.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function BalanceTab({
  ejercicio,
  recentPeriodos,
  getBalance,
  sucursalId,
  error,
}: {
  ejercicio: Ejercicio | null
  recentPeriodos: PeriodoIvaDto[]
  getBalance: (
    ejercicioId: number,
    desde: string,
    hasta: string,
    sucursalId?: number
  ) => Promise<BalanceSumasYSaldos | null>
  sucursalId: number
  error: string | null
}) {
  const initialRange = recentPeriodos[0]
    ? buildRangeFromPeriodo(recentPeriodos[0].periodo)
    : buildMonthRange(0)
  const [desde, setDesde] = useState(initialRange.desde)
  const [hasta, setHasta] = useState(initialRange.hasta)
  const [balance, setBalance] = useState<BalanceSumasYSaldos | null>(null)
  const [reportLoading, setReportLoading] = useState(false)

  const selectedPeriodo = useMemo(
    () =>
      recentPeriodos.find((periodo) => {
        const range = buildRangeFromPeriodo(periodo.periodo)
        return range.desde === desde && range.hasta === hasta
      }) ?? null,
    [desde, hasta, recentPeriodos]
  )
  const periodoStatus = getPeriodoStatus(selectedPeriodo)
  const balanceDifference = Math.abs((balance?.totalDebe ?? 0) - (balance?.totalHaber ?? 0))
  const balanceStatus = getBalanceStatus(balanceDifference)
  const balanceLineas = balance?.lineas ?? []

  const setCurrentMonth = () => {
    const range = buildMonthRange(0)
    setDesde(range.desde)
    setHasta(range.hasta)
  }

  const setPreviousMonth = () => {
    const range = buildMonthRange(-1)
    setDesde(range.desde)
    setHasta(range.hasta)
  }

  const setPeriodoRange = (periodo: PeriodoIvaDto) => {
    const range = buildRangeFromPeriodo(periodo.periodo)
    setDesde(range.desde)
    setHasta(range.hasta)
  }

  const handleBuscar = async () => {
    if (!ejercicio?.id || !desde || !hasta) return

    setReportLoading(true)
    const result = await getBalance(ejercicio.id, desde, hasta, sucursalId)
    setBalance(result)
    setReportLoading(false)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Parametros del balance</CardTitle>
          <CardDescription>
            Emiti el balance de sumas y saldos del ejercicio vigente usando el mismo rango fiscal o
            un rango manual equivalente al legado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Desde</Label>
              <Input
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Hasta</Label>
              <Input
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                className="w-40"
              />
            </div>
            <Button
              onClick={handleBuscar}
              disabled={reportLoading || !desde || !hasta || !ejercicio?.id}
            >
              <Search className="h-4 w-4 mr-2" />
              Generar
            </Button>
          </div>

          <RangeQuickActions
            onCurrentMonth={setCurrentMonth}
            onPreviousMonth={setPreviousMonth}
            recentPeriodos={recentPeriodos}
            onPeriodoSelect={setPeriodoRange}
          />

          <div className="rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <Scale className="mt-0.5 h-4 w-4 text-primary" />
              <div>
                <p className="font-medium text-foreground">Lectura del rango de balance</p>
                <p>
                  {selectedPeriodo
                    ? periodoStatus.detail
                    : "Podes emitir el balance con un rango manual aunque no coincida con un periodo IVA persistido."}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {reportLoading && (
        <p className="text-sm text-muted-foreground">Cargando balance de sumas y saldos...</p>
      )}

      {balance && !reportLoading && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title="Cuentas con movimiento"
              value={String(balanceLineas.length)}
              description="Cuentas alcanzadas por el rango contable consultado."
            />
            <SummaryCard
              title="Total Debe"
              value={`$${fmtARS(balance.totalDebe ?? 0)}`}
              description="Sumatoria total del debe para el balance emitido."
            />
            <SummaryCard
              title="Total Haber"
              value={`$${fmtARS(balance.totalHaber ?? 0)}`}
              description="Sumatoria total del haber para el balance emitido."
            />
            <SummaryCard
              title="Diferencia"
              value={`$${fmtARS(balanceDifference)}`}
              description={balanceStatus.detail}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title="Saldo Deudor"
              value={`$${fmtARS(balance.totalSaldoDeudor ?? 0)}`}
              description="Total de saldos deudores del rango emitido."
            />
            <SummaryCard
              title="Saldo Acreedor"
              value={`$${fmtARS(balance.totalSaldoAcreedor ?? 0)}`}
              description="Total de saldos acreedores del rango emitido."
            />
            <SummaryCard
              title="Estado"
              value={balanceStatus.label}
              description="Lectura rapida del equilibrio del reporte devuelto."
            />
            <SummaryCard
              title="Ejercicio"
              value={balance.ejercicioDescripcion || ejercicio?.descripcion || "Sin definir"}
              description={`Sucursal ${sucursalId} dentro del rango ${formatDate(desde)} a ${formatDate(hasta)}.`}
            />
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Balance de sumas y saldos</CardTitle>
              <CardDescription>
                {balance.ejercicioDescripcion || ejercicio?.descripcion || "Sin ejercicio"} ·{" "}
                {formatDate(desde)} a {formatDate(hasta)}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cuenta</TableHead>
                    <TableHead>Denominacion</TableHead>
                    <TableHead className="text-right">Nivel</TableHead>
                    <TableHead className="text-right">Sumas Debe</TableHead>
                    <TableHead className="text-right">Sumas Haber</TableHead>
                    <TableHead className="text-right">Saldo Deudor</TableHead>
                    <TableHead className="text-right">Saldo Acreedor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {balanceLineas.map((linea) => (
                    <TableRow key={linea.cuentaId}>
                      <TableCell className="font-mono text-sm">{linea.codigoCuenta}</TableCell>
                      <TableCell className="text-sm">{linea.denominacion}</TableCell>
                      <TableCell className="text-right text-sm">{linea.nivel}</TableCell>
                      <TableCell className="text-right text-sm">
                        ${fmtARS(linea.sumasDebe)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        ${fmtARS(linea.sumasHaber)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        ${fmtARS(linea.saldoDeudor)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        ${fmtARS(linea.saldoAcreedor)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {balanceLineas.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Sin movimientos contables para el rango elegido.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function MayorTab({
  ejercicio,
  recentPeriodos,
  cuentas,
  cuentasLoading,
  getMayor,
  error,
}: {
  ejercicio: Ejercicio | null
  recentPeriodos: PeriodoIvaDto[]
  cuentas: PlanCuenta[]
  cuentasLoading: boolean
  getMayor: (options: {
    cuentaId: number
    ejercicioId: number
    desde?: string
    hasta?: string
    page?: number
    pageSize?: number
  }) => Promise<MayorResult | null>
  error: string | null
}) {
  const initialRange = recentPeriodos[0]
    ? buildRangeFromPeriodo(recentPeriodos[0].periodo)
    : buildMonthRange(0)
  const [cuentaId, setCuentaId] = useState("")
  const [desde, setDesde] = useState(initialRange.desde)
  const [hasta, setHasta] = useState(initialRange.hasta)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [mayor, setMayor] = useState<MayorResult | null>(null)
  const [reportLoading, setReportLoading] = useState(false)

  const selectedCuenta = useMemo(
    () => cuentas.find((cuenta) => cuenta.id === Number(cuentaId)) ?? null,
    [cuentaId, cuentas]
  )
  const selectedPeriodo = useMemo(
    () =>
      recentPeriodos.find((periodo) => {
        const range = buildRangeFromPeriodo(periodo.periodo)
        return range.desde === desde && range.hasta === hasta
      }) ?? null,
    [desde, hasta, recentPeriodos]
  )
  const filteredLineas = useMemo(() => {
    const term = search.trim().toLowerCase()
    const lineas = mayor?.lineas ?? []

    if (!term) return lineas

    return lineas.filter((linea) =>
      [
        String(linea.numero ?? linea.asientoId),
        linea.asientoDescripcion,
        linea.lineaDescripcion ?? "",
        linea.fecha,
        linea.centroCostoId ? `cc ${linea.centroCostoId}` : "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    )
  }, [mayor, search])

  const pageDebe = filteredLineas.reduce((sum, linea) => sum + Number(linea.debe ?? 0), 0)
  const pageHaber = filteredLineas.reduce((sum, linea) => sum + Number(linea.haber ?? 0), 0)

  const setCurrentMonth = () => {
    const range = buildMonthRange(0)
    setDesde(range.desde)
    setHasta(range.hasta)
  }

  const setPreviousMonth = () => {
    const range = buildMonthRange(-1)
    setDesde(range.desde)
    setHasta(range.hasta)
  }

  const setPeriodoRange = (periodo: PeriodoIvaDto) => {
    const range = buildRangeFromPeriodo(periodo.periodo)
    setDesde(range.desde)
    setHasta(range.hasta)
  }

  const fetchMayorPage = async (nextPage = 1) => {
    if (!ejercicio?.id || !cuentaId) return

    setReportLoading(true)
    const result = await getMayor({
      cuentaId: Number(cuentaId),
      ejercicioId: ejercicio.id,
      desde,
      hasta,
      page: nextPage,
      pageSize: 50,
    })
    setMayor(result)
    setPage(nextPage)
    setReportLoading(false)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Parametros del libro mayor</CardTitle>
          <CardDescription>
            Selecciona una cuenta imputable y un rango contable para revisar todos los movimientos
            que la impactan en el ejercicio vigente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_180px_180px_auto]">
            <div className="space-y-1">
              <Label className="text-xs">Cuenta contable</Label>
              <Select
                value={cuentaId || "__none__"}
                onValueChange={(value) => {
                  setCuentaId(value === "__none__" ? "" : value)
                  setMayor(null)
                  setPage(1)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cuenta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Seleccionar cuenta</SelectItem>
                  {cuentas.map((cuenta) => (
                    <SelectItem key={cuenta.id} value={String(cuenta.id)}>
                      {cuenta.codigoCuenta} - {cuenta.denominacion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Desde</Label>
              <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Hasta</Label>
              <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
            </div>
            <Button
              className="self-end"
              onClick={() => void fetchMayorPage(1)}
              disabled={reportLoading || cuentasLoading || !ejercicio?.id || !cuentaId}
            >
              <Search className="h-4 w-4 mr-2" />
              Generar
            </Button>
          </div>

          <RangeQuickActions
            onCurrentMonth={setCurrentMonth}
            onPreviousMonth={setPreviousMonth}
            recentPeriodos={recentPeriodos}
            onPeriodoSelect={setPeriodoRange}
          />

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <FileText className="mt-0.5 h-4 w-4 text-primary" />
                <div>
                  <p className="font-medium text-foreground">Cuenta enfocada</p>
                  <p>
                    {selectedCuenta
                      ? `${selectedCuenta.codigoCuenta} - ${selectedCuenta.denominacion}`
                      : "Selecciona una cuenta imputable para consultar el mayor real."}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <Waypoints className="mt-0.5 h-4 w-4 text-primary" />
                <div>
                  <p className="font-medium text-foreground">Rango contable</p>
                  <p>
                    {selectedPeriodo
                      ? `El rango coincide con ${formatPeriodo(selectedPeriodo.periodo)}.`
                      : "El mayor puede emitirse con un rango manual sin depender de un periodo IVA guardado."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {reportLoading && <p className="text-sm text-muted-foreground">Cargando libro mayor...</p>}

      {mayor && !reportLoading && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title="Lineas visibles"
              value={String(filteredLineas.length)}
              description={`Pagina ${page} de ${mayor.totalPages || 1} sobre ${mayor.totalCount} lineas backend.`}
            />
            <SummaryCard
              title="Debe pagina"
              value={`$${fmtARS(pageDebe)}`}
              description="Total del debe dentro de la pagina cargada y filtrada localmente."
            />
            <SummaryCard
              title="Haber pagina"
              value={`$${fmtARS(pageHaber)}`}
              description="Total del haber dentro de la pagina cargada y filtrada localmente."
            />
            <SummaryCard
              title="Cuenta"
              value={selectedCuenta?.codigoCuenta ?? "Sin cuenta"}
              description={selectedCuenta?.denominacion ?? "Selecciona una cuenta imputable."}
            />
          </div>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Movimientos del mayor</CardTitle>
              <CardDescription>
                {selectedCuenta
                  ? `${selectedCuenta.codigoCuenta} - ${selectedCuenta.denominacion}`
                  : "Cuenta no seleccionada"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative max-w-md">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Buscar por asiento, fecha o detalle..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Asiento</TableHead>
                      <TableHead>Descripcion</TableHead>
                      <TableHead>Detalle linea</TableHead>
                      <TableHead>Centro costo</TableHead>
                      <TableHead className="text-right">Debe</TableHead>
                      <TableHead className="text-right">Haber</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLineas.map((linea) => (
                      <TableRow key={linea.id}>
                        <TableCell className="text-sm">{formatDate(linea.fecha)}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {linea.numero ?? linea.asientoId}
                        </TableCell>
                        <TableCell className="text-sm">{linea.asientoDescripcion}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {linea.lineaDescripcion ?? "Sin detalle"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {linea.centroCostoId ? `CC ${linea.centroCostoId}` : "-"}
                        </TableCell>
                        <TableCell className="text-right text-sm">${fmtARS(linea.debe)}</TableCell>
                        <TableCell className="text-right text-sm">${fmtARS(linea.haber)}</TableCell>
                      </TableRow>
                    ))}
                    {filteredLineas.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Sin movimientos para la cuenta y el rango seleccionados.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {mayor.totalPages > 1 && (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    Pagina {page} de {mayor.totalPages} sobre {mayor.totalCount} lineas.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1 || reportLoading}
                      onClick={() => void fetchMayorPage(page - 1)}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= mayor.totalPages || reportLoading}
                      onClick={() => void fetchMayorPage(page + 1)}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

export default function ReportesContablesPage() {
  const sucursalId = useDefaultSucursalId() ?? 1
  const { ejercicio } = useEjercicioVigente()
  const {
    periodos,
    loading: loadingPeriodos,
    error: errorPeriodos,
  } = usePeriodosIva(sucursalId, ejercicio?.id)
  const {
    asientos,
    loading: loadingAsientos,
    error: errorAsientos,
    getLibroDiario,
    getBalance,
    getMayor,
  } = useAsientos({ ejercicioId: ejercicio?.id, sucursalId })
  const { cuentas, loading: loadingCuentas } = usePlanCuentas(ejercicio?.id)
  const safePeriodos = periodos ?? []
  const safeAsientos = asientos ?? []
  const safeCuentas = cuentas ?? []
  const ejercicioSucursales = ejercicio?.sucursales ?? []

  const recentPeriodos = useMemo(
    () => [...safePeriodos].sort((a, b) => b.periodo.localeCompare(a.periodo)).slice(0, 3),
    [safePeriodos]
  )

  const asientosConsolidados = useMemo(
    () => safeAsientos.filter((entry) => isConsolidatedAsientoStatus(entry.estado)).length,
    [safeAsientos]
  )

  const asientosBorrador = useMemo(
    () => safeAsientos.filter((entry) => entry.estado.toLowerCase() === "borrador").length,
    [safeAsientos]
  )

  const ultimoAsiento = useMemo(
    () =>
      [...safeAsientos].sort((a, b) =>
        `${b.fecha}-${b.id}`.localeCompare(`${a.fecha}-${a.id}`)
      )[0] ?? null,
    [safeAsientos]
  )

  const periodosAbiertos = safePeriodos.filter((periodo) => !periodo.cerrado).length
  const ultimoPeriodo = recentPeriodos[0] ?? null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reportes Contables</h1>
        <p className="text-muted-foreground">
          Consola operativa para emitir libros fiscales y revisar el movimiento del ejercicio sin
          recurrir a datos simulados.
        </p>
      </div>

      {!ejercicio && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No se detectó un ejercicio vigente. Los reportes seguirán limitados hasta que el backend
            exponga uno activo.
          </AlertDescription>
        </Alert>
      )}

      {errorPeriodos && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorPeriodos}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Ejercicio vigente"
          value={ejercicio?.descripcion ?? "Sin definir"}
          description={
            ejercicio
              ? `${formatDate(ejercicio.fechaInicio)} al ${formatDate(ejercicio.fechaFin)}`
              : "No hay ejercicio activo informado por el backend."
          }
        />
        <SummaryCard
          title="Períodos IVA"
          value={`${periodosAbiertos}/${safePeriodos.length}`}
          description={
            loadingPeriodos
              ? "Cargando períodos fiscales…"
              : `${periodosAbiertos} abiertos sobre ${safePeriodos.length} detectados.`
          }
        />
        <SummaryCard
          title="Asientos consolidados"
          value={loadingAsientos ? "..." : String(asientosConsolidados)}
          description={
            loadingAsientos
              ? "Cargando libro diario base…"
              : `${asientosBorrador} en borrador dentro del ejercicio vigente.`
          }
        />
        <SummaryCard
          title="Último movimiento"
          value={ultimoAsiento ? formatDate(ultimoAsiento.fecha) : "Sin datos"}
          description={
            ultimoPeriodo
              ? `Último período IVA: ${formatPeriodo(ultimoPeriodo.periodo)}.`
              : "No hay períodos IVA recientes para sugerir."
          }
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4" /> Cobertura contable
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {safeAsientos.length} asientos visibles del ejercicio y {recentPeriodos.length} períodos
            IVA recientes para reutilizar como base de emisión.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4" /> Estado del ejercicio
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {ejercicio
              ? `${ejercicio.cerrado ? "Ejercicio cerrado" : "Ejercicio abierto"} con máscara ${ejercicio.mascaraCuentaContable}.`
              : "No hay ejercicio vigente para evaluar consistencia de reportes."}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Waypoints className="h-4 w-4" /> Sucursales del ejercicio
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {ejercicio
              ? `${ejercicioSucursales.length} sucursales asociadas al ejercicio vigente; la consola está enfocada en la sucursal ${sucursalId}.`
              : `La consola toma la sucursal ${sucursalId} sin contexto adicional de ejercicio.`}
          </CardContent>
        </Card>
      </div>

      {(errorAsientos || ultimoPeriodo) && (
        <Alert>
          <CalendarDays className="h-4 w-4" />
          <AlertDescription>
            {errorAsientos
              ? "El resumen de asientos no pudo cargarse por completo, pero la emisión puntual del libro diario sigue disponible."
              : ultimoPeriodo
                ? `Se sugirió ${formatPeriodo(ultimoPeriodo.periodo)} como rango inicial porque es el último período IVA registrado.`
                : "Podés tomar períodos fiscales recientes o cargar un rango manual para cada libro."}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="iva-ventas" className="w-full">
        <TabsList className="flex h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="iva-ventas">Libro IVA Ventas</TabsTrigger>
          <TabsTrigger value="iva-compras">Libro IVA Compras</TabsTrigger>
          <TabsTrigger value="diario">Libro Diario</TabsTrigger>
          <TabsTrigger value="balance">Balance</TabsTrigger>
          <TabsTrigger value="mayor">Libro Mayor</TabsTrigger>
        </TabsList>

        <TabsContent value="iva-ventas" className="mt-6">
          <LibroIvaTab
            key={`iva-ventas-${!loadingPeriodos}-${recentPeriodos[0]?.id ?? recentPeriodos[0]?.periodo ?? "manual"}`}
            tipo="ventas"
            sucursalId={sucursalId}
            recentPeriodos={recentPeriodos}
          />
        </TabsContent>

        <TabsContent value="iva-compras" className="mt-6">
          <LibroIvaTab
            key={`iva-compras-${!loadingPeriodos}-${recentPeriodos[0]?.id ?? recentPeriodos[0]?.periodo ?? "manual"}`}
            tipo="compras"
            sucursalId={sucursalId}
            recentPeriodos={recentPeriodos}
          />
        </TabsContent>

        <TabsContent value="diario" className="mt-6">
          <LibroDiarioTab
            key={`libro-diario-${!loadingPeriodos}-${recentPeriodos[0]?.id ?? recentPeriodos[0]?.periodo ?? "manual"}`}
            ejercicio={ejercicio}
            recentPeriodos={recentPeriodos}
            asientos={safeAsientos}
            loading={loadingAsientos}
            error={errorAsientos}
            getLibroDiario={getLibroDiario}
            sucursalId={sucursalId}
          />
        </TabsContent>

        <TabsContent value="balance" className="mt-6">
          <BalanceTab
            key={`balance-${!loadingPeriodos}-${recentPeriodos[0]?.id ?? recentPeriodos[0]?.periodo ?? "manual"}`}
            ejercicio={ejercicio}
            recentPeriodos={recentPeriodos}
            getBalance={getBalance}
            sucursalId={sucursalId}
            error={errorAsientos}
          />
        </TabsContent>

        <TabsContent value="mayor" className="mt-6">
          <MayorTab
            key={`mayor-${ejercicio?.id ?? "sin-ejercicio"}-${safeCuentas.length}`}
            ejercicio={ejercicio}
            recentPeriodos={recentPeriodos}
            cuentas={safeCuentas}
            cuentasLoading={loadingCuentas}
            getMayor={getMayor}
            error={errorAsientos}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
