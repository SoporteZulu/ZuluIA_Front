"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ArrowRightLeft,
  BarChart3,
  Ban,
  BookOpen,
  CalendarDays,
  PiggyBank,
  ShieldCheck,
  Ticket,
  Undo2,
  Unplug,
  Wallet,
} from "lucide-react"
import { useEjercicioVigente } from "@/lib/hooks/useEjercicios"
import { useAsientos, usePlanCuentasAll } from "@/lib/hooks/useAsientos"
import { useCobros } from "@/lib/hooks/useCobros"
import { usePagos } from "@/lib/hooks/usePagos"
import { usePeriodosIva } from "@/lib/hooks/usePeriodosIva"
import { useCotizaciones } from "@/lib/hooks/useCotizaciones"
import { useDefaultSucursalId } from "@/lib/hooks/useSucursales"

function fmtARS(value: number) {
  return Number(value ?? 0).toLocaleString("es-AR", { minimumFractionDigits: 2 })
}

function formatCurrencyBreakdown(
  movements: Array<{ total: number; monedaSimbolo?: string | null }>
) {
  const totalsBySymbol = new Map<string, number>()

  movements.forEach((movement) => {
    const symbol = movement.monedaSimbolo?.trim() || "$"
    totalsBySymbol.set(symbol, (totalsBySymbol.get(symbol) ?? 0) + Number(movement.total ?? 0))
  })

  const orderedTotals = [...totalsBySymbol.entries()].sort(([left], [right]) => {
    if (left === right) return 0
    if (left === "$") return -1
    if (right === "$") return 1
    return left.localeCompare(right)
  })

  return orderedTotals.length > 0
    ? orderedTotals.map(([symbol, total]) => `${symbol}${fmtARS(total)}`).join(" + ")
    : "$0,00"
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

function formatPeriodo(periodo?: string) {
  if (!periodo) return "Sin período"

  const [year, month] = periodo.split("-").map(Number)
  if (!year || !month) return periodo

  return new Date(year, month - 1, 1).toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  })
}

function normalizeAsientoEstado(status?: string) {
  return (status ?? "").trim().toLowerCase()
}

function isConsolidatedAsientoStatus(status?: string) {
  const normalized = normalizeAsientoEstado(status)
  return normalized === "publicado" || normalized === "contabilizado"
}

function isDraftAsientoStatus(status?: string) {
  return normalizeAsientoEstado(status) === "borrador"
}

function isActiveTreasuryStatus(status?: string) {
  return normalizeAsientoEstado(status) !== "anulado"
}

const treasuryExpansionLinks = [
  {
    title: "Ingresos",
    description: "Cobros reales complementarios visibles para la sucursal activa",
    href: "/contabilidad/ingresos",
    icon: PiggyBank,
  },
  {
    title: "Egresos",
    description: "Pagos reales complementarios visibles para la sucursal activa",
    href: "/contabilidad/egresos",
    icon: Wallet,
  },
  {
    title: "Vales",
    description: "Adelantos y fondos a rendir sobre el contrato real de tesorería",
    href: "/contabilidad/vales",
    icon: Ticket,
  },
  {
    title: "Reintegros",
    description: "Rendiciones reales derivadas de vales emitidos",
    href: "/contabilidad/reintegros",
    icon: Undo2,
  },
  {
    title: "Transferencias",
    description: "Transferencias reales entre cajas y cuentas bancarias",
    href: "/contabilidad/transferencias",
    icon: ArrowRightLeft,
  },
  {
    title: "CAE y Timbrado",
    description: "Control visible de autorizaciones y vencimientos",
    href: "/contabilidad/cae-timbrado",
    icon: ShieldCheck,
  },
  {
    title: "Anulaciones",
    description: "Tablero real de anulaciones visibles en tesorería",
    href: "/contabilidad/anulaciones",
    icon: Ban,
  },
  {
    title: "Desimputaciones",
    description: "Historial real de imputaciones y reversas disponibles",
    href: "/contabilidad/desimputaciones",
    icon: Unplug,
  },
]

export default function ContabilidadPage() {
  const [currentTimestamp] = useState(() => Date.now())
  const sucursalId = useDefaultSucursalId() ?? 1
  const { ejercicio } = useEjercicioVigente()
  const { cuentas, loading: loadingCuentas, error: errorCuentas } = usePlanCuentasAll(ejercicio?.id)
  const {
    asientos,
    loading: loadingAsientos,
    error: errorAsientos,
    totalCount: totalAsientos,
  } = useAsientos({ ejercicioId: ejercicio?.id, sucursalId })
  const {
    pagos,
    loading: loadingPagos,
    error: errorPagos,
    totalCount: totalPagos,
  } = usePagos({ sucursalId })
  const {
    cobros,
    loading: loadingCobros,
    error: errorCobros,
    totalCount: totalCobros,
  } = useCobros({ sucursalId })
  const {
    periodos,
    loading: loadingPeriodos,
    error: errorPeriodos,
  } = usePeriodosIva(sucursalId, ejercicio?.id)
  const { cotizaciones, loading: loadingCotizaciones, error: errorCotizaciones } = useCotizaciones()

  const imputables = cuentas.filter((cuenta) => cuenta.imputable).length
  const cuentasIntegradoras = cuentas.length - imputables
  const asientosConsolidados = asientos.filter((entry) => isConsolidatedAsientoStatus(entry.estado))
  const asientosBorrador = asientos.filter((entry) => isDraftAsientoStatus(entry.estado))
  const pagosActivos = pagos.filter((pago) => isActiveTreasuryStatus(pago.estado))
  const cobrosActivos = cobros.filter((cobro) => isActiveTreasuryStatus(cobro.estado))
  const totalTreasuryMovements = pagosActivos.length + cobrosActivos.length
  const totalTreasuryLabel = formatCurrencyBreakdown([...pagosActivos, ...cobrosActivos])
  const periodosAbiertos = periodos.filter((periodo) => !periodo.cerrado)
  const ultimoPeriodo = [...periodos].sort((a, b) => b.periodo.localeCompare(a.periodo))[0] ?? null
  const ultimaCotizacion =
    [...cotizaciones].sort((a, b) => `${b.fecha}-${b.id}`.localeCompare(`${a.fecha}-${a.id}`))[0] ??
    null
  const balanceGap = Math.abs(
    asientos.reduce((acc, entry) => acc + Number(entry.totalDebe ?? 0), 0) -
      asientos.reduce((acc, entry) => acc + Number(entry.totalHaber ?? 0), 0)
  )
  const asientosRecientes = [...asientos]
    .sort((a, b) => `${b.fecha}-${b.id}`.localeCompare(`${a.fecha}-${a.id}`))
    .slice(0, 5)
  const treasuryRecientes = [
    ...pagosActivos.map((pago) => ({
      key: `pago-${pago.id}`,
      kind: "Pago",
      tercero: pago.terceroRazonSocial,
      sucursalId: pago.sucursalId ?? sucursalId,
      fecha: pago.fecha,
      estado: pago.estado,
      monedaSimbolo: pago.monedaSimbolo,
      total: Number(pago.total ?? 0),
    })),
    ...cobrosActivos.map((cobro) => ({
      key: `cobro-${cobro.id}`,
      kind: "Cobro",
      tercero: cobro.terceroRazonSocial?.trim() || `Tercero #${cobro.terceroId}`,
      sucursalId: cobro.sucursalId ?? sucursalId,
      fecha: cobro.fecha,
      estado: cobro.estado,
      monedaSimbolo: cobro.monedaSimbolo?.trim() || "$",
      total: Number(cobro.total ?? 0),
    })),
  ]
    .sort((a, b) => `${b.fecha}-${b.key}`.localeCompare(`${a.fecha}-${a.key}`))
    .slice(0, 5)
  const periodosCerrados = periodos.filter((periodo) => periodo.cerrado).length
  const cotizacionAgeDays = ultimaCotizacion
    ? Math.floor(
        (currentTimestamp - new Date(ultimaCotizacion.fecha).getTime()) / (1000 * 60 * 60 * 24)
      )
    : null
  const latestTreasuryMovement = treasuryRecientes[0] ?? null

  const cards = [
    {
      title: "Plan de Cuentas",
      description: "Administra el catálogo y la estructura contable del ejercicio vigente.",
      icon: BookOpen,
      href: "/contabilidad/cuentas",
      stats: loadingCuentas
        ? "Cargando cuentas..."
        : `${imputables} imputables / ${cuentas.length} totales`,
      detail: loadingCuentas
        ? "Consultando plan contable..."
        : `${cuentasIntegradoras} integradoras para navegación y consolidación.`,
    },
    {
      title: "Asientos",
      description: "Controla el libro diario, los borradores y los asientos ya consolidados.",
      icon: Wallet,
      href: "/contabilidad/asientos",
      stats: loadingAsientos
        ? "Cargando asientos..."
        : `${asientosConsolidados.length} consolidados / ${totalAsientos} consultables`,
      detail: loadingAsientos
        ? "Recuperando libro diario..."
        : `${asientosBorrador.length} en borrador dentro del ejercicio ${ejercicio?.descripcion ?? "activo"}.`,
    },
    {
      title: "Pagos y Cobros",
      description: "Sigue el movimiento financiero registrado y su impacto operativo inmediato.",
      icon: PiggyBank,
      href: "/contabilidad/pagos",
      stats:
        loadingPagos || loadingCobros
          ? "Cargando movimientos..."
          : `${totalTreasuryLabel} en ${totalTreasuryMovements} movimientos`,
      detail:
        loadingPagos || loadingCobros
          ? "Consultando tesorería..."
          : latestTreasuryMovement
            ? `Sucursal ${sucursalId}. Último ${latestTreasuryMovement.kind.toLowerCase()}: ${formatDate(latestTreasuryMovement.fecha)}.`
            : `Sucursal ${sucursalId}. Sin movimientos visibles.`,
    },
    {
      title: "Reportes",
      description: "Emite libros y controles fiscales usando períodos IVA y asientos reales.",
      icon: BarChart3,
      href: "/contabilidad/reportes",
      stats: loadingPeriodos
        ? "Cargando períodos..."
        : `${periodosAbiertos.length} períodos IVA abiertos`,
      detail: loadingPeriodos
        ? "Preparando consola fiscal..."
        : `Último período registrado: ${formatPeriodo(ultimoPeriodo?.periodo)}.`,
    },
  ]

  const radarContable = [
    {
      modulo: "Plan de cuentas",
      estado: imputables === 0 ? "Pendiente" : "Cubierto",
      detalle: `${imputables} cuentas imputables y ${cuentasIntegradoras} integradoras visibles en el ejercicio.`,
      href: "/contabilidad/cuentas",
    },
    {
      modulo: "Libro diario",
      estado: asientosBorrador.length > 0 ? "Seguimiento" : "Controlado",
      detalle: `${asientosConsolidados.length} asientos consolidados y ${asientosBorrador.length} borradores en la tanda visible.`,
      href: "/contabilidad/asientos",
    },
    {
      modulo: "Tesorería",
      estado: totalTreasuryMovements > 0 ? "Activo" : "Sin movimiento",
      detalle: `${totalTreasuryLabel} visibles entre pagos y cobros activos del contexto actual.`,
      href: "/contabilidad/pagos",
    },
    {
      modulo: "IVA",
      estado: periodosAbiertos.length > 0 ? "Abierto" : "Cerrado",
      detalle: `${periodosAbiertos.length} períodos abiertos y ${periodosCerrados} cerrados para la sucursal ${sucursalId}.`,
      href: "/contabilidad/periodos-iva",
    },
    {
      modulo: "Cotizaciones",
      estado: cotizacionAgeDays !== null && cotizacionAgeDays > 7 ? "Actualizar" : "Vigente",
      detalle: ultimaCotizacion
        ? `${ultimaCotizacion.monedaCodigo ?? "MON"} al ${formatDate(ultimaCotizacion.fecha)}.`
        : "Sin cotizaciones visibles en backend.",
      href: "/contabilidad/cotizaciones",
    },
  ]

  const hasError =
    errorCuentas || errorAsientos || errorPagos || errorCobros || errorPeriodos || errorCotizaciones

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Contabilidad</h1>
        <p className="text-muted-foreground">
          Tablero operativo del módulo contable sobre datos reales de ejercicio, libro diario,
          pagos, cobros, períodos IVA y cotizaciones.
        </p>
      </div>

      {hasError && (
        <Alert>
          <CalendarDays className="h-4 w-4" />
          <AlertDescription>
            Algunas métricas del tablero no pudieron cargarse por completo. Las pantallas operativas
            siguen disponibles y pueden consultarse por separado.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ejercicio vigente</CardDescription>
            <CardTitle className="text-2xl">{ejercicio?.descripcion ?? "Sin definir"}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {ejercicio
                ? `${formatDate(ejercicio.fechaInicio)} al ${formatDate(ejercicio.fechaFin)}`
                : "No hay ejercicio vigente informado por el backend."}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Balance rápido</CardDescription>
            <CardTitle className="text-2xl">
              {loadingAsientos ? "..." : `$${fmtARS(balanceGap)}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Diferencia entre debe y haber de la vista actual del libro diario.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Períodos fiscales</CardDescription>
            <CardTitle className="text-2xl">
              {loadingPeriodos ? "..." : `${periodosAbiertos.length}/${periodos.length}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Abiertos sobre el total detectado para la sucursal {sucursalId}.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Última cotización</CardDescription>
            <CardTitle className="text-2xl">
              {loadingCotizaciones
                ? "..."
                : ultimaCotizacion
                  ? `${ultimaCotizacion.monedaCodigo ?? "MON"} ${fmtARS(ultimaCotizacion.cotizacion)}`
                  : "Sin datos"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {ultimaCotizacion
                ? `${ultimaCotizacion.monedaDescripcion ?? "Moneda"} al ${formatDate(ultimaCotizacion.fecha)}.`
                : "No hay cotizaciones informadas en el backend."}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((section) => {
          const Icon = section.icon
          return (
            <Link key={section.title} href={section.href}>
              <Card className="h-full cursor-pointer transition-colors hover:bg-accent/50">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">{section.title}</CardTitle>
                  </div>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm font-medium text-foreground">{section.stats}</p>
                  <p className="text-sm text-muted-foreground">{section.detail}</p>
                </CardContent>
              </Card>
            </Link>
          )
        })}

        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Circuitos Financieros Complementarios</CardTitle>
            <CardDescription>
              Consolas complementarias de tesorería y control documental con distintos niveles de
              cobertura real según el backend hoy publicado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {treasuryExpansionLinks.map((entry) => {
                const Icon = entry.icon
                return (
                  <Link key={entry.href} href={entry.href}>
                    <div className="rounded-xl border bg-muted/20 p-4 transition-colors hover:bg-accent/40">
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-background p-2 shadow-sm">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold">{entry.title}</p>
                          <p className="text-sm text-muted-foreground">{entry.description}</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>Radar Contable</CardTitle>
              <CardDescription>
                Lectura cruzada para entrar al módulo correcto según el pendiente visible
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Módulo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Lectura</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {radarContable.map((item) => (
                    <TableRow key={item.modulo}>
                      <TableCell>
                        <Link href={item.href} className="font-medium hover:underline">
                          {item.modulo}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            item.estado === "Cubierto" ||
                            item.estado === "Controlado" ||
                            item.estado === "Activo" ||
                            item.estado === "Vigente"
                              ? "secondary"
                              : item.estado === "Seguimiento" ||
                                  item.estado === "Abierto" ||
                                  item.estado === "Actualizar"
                                ? "outline"
                                : "destructive"
                          }
                        >
                          {item.estado}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.detalle}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resumen Fiscal</CardTitle>
              <CardDescription>
                Contexto rápido del cierre impositivo y monetario visible
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-sm font-medium">Último período IVA</p>
                <p className="mt-1 text-2xl font-semibold">
                  {formatPeriodo(ultimoPeriodo?.periodo)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {ultimoPeriodo
                    ? ultimoPeriodo.cerrado
                      ? "Período cerrado"
                      : "Período todavía abierto"
                    : "No hay períodos informados."}
                </p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-sm font-medium">Borradores contables</p>
                <p className="mt-1 text-2xl font-semibold text-amber-500">
                  {asientosBorrador.length}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Asientos aún no publicados dentro de la tanda cargada.
                </p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-sm font-medium">Antigüedad de cotización</p>
                <p className="mt-1 text-2xl font-semibold">
                  {cotizacionAgeDays === null ? "Sin dato" : `${cotizacionAgeDays} días`}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Tiempo transcurrido desde la última cotización visible.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>Libro Diario Reciente</CardTitle>
              <CardDescription>Asientos más próximos en la tanda consultada</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {asientosRecientes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                        No hay asientos visibles en este contexto.
                      </TableCell>
                    </TableRow>
                  )}
                  {asientosRecientes.map((asiento) => (
                    <TableRow key={asiento.id}>
                      <TableCell>{formatDate(asiento.fecha)}</TableCell>
                      <TableCell>
                        <div className="font-medium">{asiento.descripcion}</div>
                        <div className="text-xs text-muted-foreground">
                          Asiento {asiento.numero ?? asiento.id}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            isConsolidatedAsientoStatus(asiento.estado) ? "secondary" : "outline"
                          }
                        >
                          {asiento.estado}
                        </Badge>
                      </TableCell>
                      <TableCell>${fmtARS(Number(asiento.totalDebe ?? 0))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Movimientos de Tesorería</CardTitle>
              <CardDescription>
                Últimos pagos o cobros visibles para la sucursal activa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {treasuryRecientes.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No hay movimientos visibles para resumir.
                </p>
              )}
              {treasuryRecientes.map((movement) => (
                <div key={movement.key} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{movement.tercero}</p>
                      <p className="text-xs text-muted-foreground">
                        {movement.kind} • Sucursal {movement.sucursalId} •{" "}
                        {formatDate(movement.fecha)}
                      </p>
                    </div>
                    <Badge
                      variant={
                        String(movement.estado).toLowerCase() === "anulado"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {movement.estado}
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Importe</span>
                    <span className="font-medium">
                      {movement.monedaSimbolo}
                      {fmtARS(movement.total)}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
