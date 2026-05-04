"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertCircle,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  Lock,
  RefreshCcw,
  ScrollText,
  ShieldCheck,
  Unlock,
} from "lucide-react"
import { usePeriodosIva } from "@/lib/hooks/usePeriodosIva"
import { useEjercicioVigente } from "@/lib/hooks/useEjercicios"
import { useDefaultSucursalId } from "@/lib/hooks/useSucursales"

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

function currentDateInput() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function currentPeriodoInput() {
  return currentDateInput().slice(0, 7)
}

function normalizePeriodoKey(value?: string) {
  return value?.slice(0, 7) ?? ""
}

function formatPeriodo(periodo?: string) {
  const periodoKey = normalizePeriodoKey(periodo)
  if (!periodoKey) return "Sin período"

  const [year, month] = periodoKey.split("-").map(Number)
  if (!year || !month) return periodo

  return new Date(year, month - 1, 1).toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  })
}

function getMonthsBetween(start?: string, end?: string) {
  if (!start || !end) return 0

  const startDate = new Date(start)
  const endDate = new Date(end)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 0

  return (
    (endDate.getFullYear() - startDate.getFullYear()) * 12 +
    (endDate.getMonth() - startDate.getMonth()) +
    1
  )
}

function getPeriodoStatus(cerrado: boolean, periodo: string, currentPeriodoKey: string) {
  if (cerrado) {
    return {
      label: "Cerrado",
      detail: "El mes quedó inmovilizado para nuevas registraciones fiscales.",
    }
  }

  if (normalizePeriodoKey(periodo) === currentPeriodoKey) {
    return {
      label: "Abierto vigente",
      detail: "Es el período corriente disponible para operación fiscal diaria.",
    }
  }

  return {
    label: "Abierto histórico",
    detail: "El período permanece abierto y conviene revisar si corresponde cerrarlo.",
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

export default function PeriodosIvaPage() {
  const sucursalId = useDefaultSucursalId() ?? 1
  const { ejercicio } = useEjercicioVigente()
  const { periodos, loading, error, abrir, cerrar, getEstado, refetch } = usePeriodosIva(
    sucursalId,
    ejercicio?.id
  )

  const [fechaControl, setFechaControl] = useState(currentDateInput())
  const [checkingEstado, setCheckingEstado] = useState(false)
  const [estadoFecha, setEstadoFecha] = useState<boolean | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [savingPeriodoId, setSavingPeriodoId] = useState<number | null>(null)
  const [selectedPeriodoId, setSelectedPeriodoId] = useState<number | null>(null)
  const currentPeriodoKey = currentPeriodoInput()

  const sortedPeriodos = useMemo(
    () => [...periodos].sort((a, b) => b.periodo.localeCompare(a.periodo)),
    [periodos]
  )

  const abiertos = sortedPeriodos.filter((periodo) => !periodo.cerrado)
  const cerrados = sortedPeriodos.filter((periodo) => periodo.cerrado)
  const periodoActual =
    sortedPeriodos.find((periodo) => normalizePeriodoKey(periodo.periodo) === currentPeriodoKey) ??
    null
  const ultimoPeriodo = sortedPeriodos[0] ?? null
  const mesesEjercicio = getMonthsBetween(ejercicio?.fechaInicio, ejercicio?.fechaFin)
  const coberturaCalendario =
    mesesEjercicio > 0
      ? `${sortedPeriodos.length}/${mesesEjercicio}`
      : String(sortedPeriodos.length)
  const pendientesCierre = abiertos.filter(
    (periodo) => normalizePeriodoKey(periodo.periodo) !== currentPeriodoKey
  ).length
  const selectedPeriodo =
    sortedPeriodos.find((periodo) => periodo.id === selectedPeriodoId) ??
    periodoActual ??
    ultimoPeriodo
  const periodoConsultado =
    sortedPeriodos.find(
      (periodo) => normalizePeriodoKey(periodo.periodo) === normalizePeriodoKey(fechaControl)
    ) ?? null
  const selectedPeriodoStatus = selectedPeriodo
    ? getPeriodoStatus(selectedPeriodo.cerrado, selectedPeriodo.periodo, currentPeriodoKey)
    : null

  const handleCheckEstado = async () => {
    setCheckingEstado(true)
    setActionError(null)
    const abierto = await getEstado(sucursalId, fechaControl)
    setEstadoFecha(abierto)
    setCheckingEstado(false)
  }

  const handleAbrir = async (periodoId: number, periodo: string) => {
    if (!ejercicio?.id) {
      setActionError("No hay ejercicio vigente para abrir el período IVA.")
      return
    }

    setSavingPeriodoId(periodoId)
    setActionError(null)
    const ok = await abrir({ sucursalId, ejercicioId: ejercicio.id, periodo })
    setSavingPeriodoId(null)

    if (!ok) {
      setActionError("No se pudo abrir el período IVA seleccionado.")
      return
    }

    await refetch()
  }

  const handleCerrar = async (periodoId: number, periodo: string) => {
    if (!ejercicio?.id) {
      setActionError("No hay ejercicio vigente para cerrar el período IVA.")
      return
    }

    setSavingPeriodoId(periodoId)
    setActionError(null)
    const ok = await cerrar({ sucursalId, ejercicioId: ejercicio.id, periodo })
    setSavingPeriodoId(null)

    if (!ok) {
      setActionError("No se pudo cerrar el período IVA seleccionado.")
      return
    }

    await refetch()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Períodos IVA</h1>
          <p className="text-muted-foreground">
            Consola fiscal para controlar aperturas, cierres y estado operativo de períodos IVA por
            ejercicio y sucursal.
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={loading}>
          <RefreshCcw className="h-4 w-4" />
          Actualizar
        </Button>
      </div>

      {!ejercicio && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No se detectó un ejercicio vigente. La consulta continúa disponible, pero la gestión de
            apertura y cierre queda condicionada a que exista uno activo.
          </AlertDescription>
        </Alert>
      )}

      {(error || actionError) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{actionError || error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Ejercicio vigente"
          value={ejercicio?.descripcion ?? "Sin definir"}
          description={
            ejercicio
              ? `${formatDate(ejercicio.fechaInicio)} al ${formatDate(ejercicio.fechaFin)}`
              : "No hay ejercicio vigente informado por el backend."
          }
        />
        <SummaryCard
          title="Períodos abiertos"
          value={String(abiertos.length)}
          description={`${cerrados.length} cerrados para la sucursal ${sucursalId}.`}
        />
        <SummaryCard
          title="Período actual"
          value={
            periodoActual
              ? formatPeriodo(periodoActual.periodo)
              : formatPeriodo(currentPeriodoInput())
          }
          description={
            periodoActual
              ? `Estado: ${periodoActual.cerrado ? "cerrado" : "abierto"}.`
              : "No existe aún un registro específico para el mes en curso."
          }
        />
        <SummaryCard
          title="Último período"
          value={ultimoPeriodo ? formatPeriodo(ultimoPeriodo.periodo) : "Sin datos"}
          description={
            ultimoPeriodo
              ? `Creado el ${formatDate(ultimoPeriodo.createdAt)}.`
              : "Todavía no hay períodos IVA registrados."
          }
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4" /> Cobertura del ejercicio
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {ejercicio
              ? `${coberturaCalendario} meses registrados dentro del ejercicio ${ejercicio.descripcion}.`
              : `${sortedPeriodos.length} períodos visibles sin contexto de ejercicio vigente.`}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4" /> Calendario operativo
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {pendientesCierre > 0
              ? `${pendientesCierre} períodos abiertos fuera del mes actual requieren revisión de cierre.`
              : "No hay períodos históricos abiertos pendientes de revisión."}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ScrollText className="h-4 w-4" /> Alcance de fase actual
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            La pantalla cubre control de estado, apertura y cierre real del período. Libro IVA y
            consistencias tributarias por comprobante siguen en módulos complementarios.
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.9fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Control fiscal por fecha</CardTitle>
            <CardDescription>
              Verificá si una fecha determinada cae en un período IVA abierto para esta sucursal.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium">Fecha a validar</label>
                <Input
                  type="date"
                  value={fechaControl}
                  onChange={(e) => setFechaControl(e.target.value)}
                />
              </div>
              <Button onClick={handleCheckEstado} disabled={checkingEstado || !fechaControl}>
                <ShieldCheck className="h-4 w-4" />
                {checkingEstado ? "Validando..." : "Consultar estado"}
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              <span>Sucursal {sucursalId}</span>
              <span>·</span>
              <span>Fecha consultada: {formatDate(fechaControl)}</span>
            </div>

            {estadoFecha !== null && (
              <Alert>
                <ShieldCheck className="h-4 w-4" />
                <AlertDescription>
                  {estadoFecha
                    ? periodoConsultado && !periodoConsultado.cerrado
                      ? `La fecha consultada cae dentro del período ${formatPeriodo(periodoConsultado.periodo)} abierto en esta sucursal.`
                      : `El backend informó estado operativo positivo para la fecha consultada, pero no hay un período mensual abierto visible para ${formatPeriodo(fechaControl)} en la grilla actual.`
                    : "La fecha consultada no tiene un período IVA abierto en esta sucursal."}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {selectedPeriodo
                ? `Lectura de ${formatPeriodo(selectedPeriodo.periodo)}`
                : "Resumen operativo"}
            </CardTitle>
            <CardDescription>
              Vista rápida para detectar cierres pendientes y consistencia del calendario fiscal.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Período en foco</p>
                <p className="text-sm text-muted-foreground">
                  {selectedPeriodo
                    ? formatPeriodo(selectedPeriodo.periodo)
                    : formatPeriodo(currentPeriodoInput())}
                </p>
              </div>
              <Badge
                variant={
                  selectedPeriodo ? (selectedPeriodo.cerrado ? "secondary" : "default") : "outline"
                }
              >
                {selectedPeriodo
                  ? selectedPeriodo.cerrado
                    ? "Cerrado"
                    : "Abierto"
                  : "Sin registrar"}
              </Badge>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Último período cargado</p>
                <p className="text-sm text-muted-foreground">
                  {ultimoPeriodo ? formatPeriodo(ultimoPeriodo.periodo) : "Sin registros"}
                </p>
              </div>
              <Badge variant="outline">{sortedPeriodos.length} períodos</Badge>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Circuito del período</p>
                <p className="text-sm text-muted-foreground">
                  {selectedPeriodoStatus?.detail ??
                    (abiertos.length > 0
                      ? `${abiertos.length} períodos abiertos para trabajo operativo.`
                      : "No hay períodos abiertos; revisar cierres o aperturas.")}
                </p>
              </div>
              <Badge
                variant={
                  selectedPeriodo
                    ? selectedPeriodo.cerrado
                      ? "secondary"
                      : "default"
                    : abiertos.length > 0
                      ? "default"
                      : "secondary"
                }
              >
                {selectedPeriodoStatus?.label ??
                  (abiertos.length > 0 ? "Operativo" : "Sin aperturas")}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historial de períodos</CardTitle>
          <CardDescription>
            Listado completo de períodos IVA del ejercicio y sucursal actuales. Las acciones se
            ejecutan contra el backend y refrescan la grilla al finalizar.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Período</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Ejercicio</TableHead>
                <TableHead>Sucursal</TableHead>
                <TableHead>Alta</TableHead>
                <TableHead>Circuito</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    Cargando períodos IVA...
                  </TableCell>
                </TableRow>
              )}

              {!loading && sortedPeriodos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    <CalendarDays className="mx-auto mb-2 h-8 w-8 opacity-50" />
                    No hay períodos IVA registrados
                  </TableCell>
                </TableRow>
              )}

              {sortedPeriodos.map((periodo) => {
                const busy = savingPeriodoId === periodo.id
                const status = getPeriodoStatus(periodo.cerrado, periodo.periodo, currentPeriodoKey)
                const isSelected = periodo.id === selectedPeriodo?.id

                return (
                  <TableRow
                    key={periodo.id}
                    className={isSelected ? "bg-accent/30" : undefined}
                    onClick={() => setSelectedPeriodoId(periodo.id)}
                  >
                    <TableCell className="font-mono font-medium">{periodo.periodo}</TableCell>
                    <TableCell>
                      {periodo.periodoDescripcion ?? formatPeriodo(periodo.periodo)}
                    </TableCell>
                    <TableCell>#{periodo.ejercicioId}</TableCell>
                    <TableCell>#{periodo.sucursalId}</TableCell>
                    <TableCell>{formatDate(periodo.createdAt)}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm font-medium">{status.label}</div>
                        <p className="text-xs text-muted-foreground">
                          {formatPeriodo(periodo.periodo)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={periodo.cerrado ? "secondary" : "default"}>
                        {periodo.cerrado ? "Cerrado" : "Abierto"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {periodo.cerrado ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(event) => {
                            event.stopPropagation()
                            void handleAbrir(periodo.id, periodo.periodo)
                          }}
                          disabled={busy || !ejercicio?.id}
                        >
                          <Unlock className="mr-1 h-3 w-3" />
                          {busy ? "Abriendo..." : "Abrir"}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(event) => {
                            event.stopPropagation()
                            void handleCerrar(periodo.id, periodo.periodo)
                          }}
                          disabled={busy || !ejercicio?.id}
                        >
                          <Lock className="mr-1 h-3 w-3" />
                          {busy ? "Cerrando..." : "Cerrar"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
