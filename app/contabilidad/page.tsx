"use client"

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
import { BarChart3, BookOpen, CalendarDays, PiggyBank, Wallet } from "lucide-react"
import { useEjercicioVigente } from "@/lib/hooks/useEjercicios"
import { useAsientos, usePlanCuentasAll } from "@/lib/hooks/useAsientos"
import { usePagos } from "@/lib/hooks/usePagos"
import { usePeriodosIva } from "@/lib/hooks/usePeriodosIva"
import { useCotizaciones } from "@/lib/hooks/useCotizaciones"
import { useDefaultSucursalId } from "@/lib/hooks/useSucursales"

function fmtARS(value: number) {
  return Number(value ?? 0).toLocaleString("es-AR", { minimumFractionDigits: 2 })
}

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleDateString("es-AR") : "-"
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

export default function ContabilidadPage() {
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
    periodos,
    loading: loadingPeriodos,
    error: errorPeriodos,
  } = usePeriodosIva(sucursalId, ejercicio?.id)
  const { cotizaciones, loading: loadingCotizaciones, error: errorCotizaciones } = useCotizaciones()

  const imputables = cuentas.filter((cuenta) => cuenta.imputable).length
  const cuentasIntegradoras = cuentas.length - imputables
  const asientosPublicados = asientos.filter((entry) => entry.estado.toLowerCase() === "publicado")
  const asientosBorrador = asientos.filter((entry) => entry.estado.toLowerCase() === "borrador")
  const totalPagosMonto = pagos.reduce((acc, pago) => acc + Number(pago.total ?? 0), 0)
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
  const pagosRecientes = [...pagos]
    .sort((a, b) => `${b.fecha}-${b.id}`.localeCompare(`${a.fecha}-${a.id}`))
    .slice(0, 5)
  const periodosCerrados = periodos.filter((periodo) => periodo.cerrado).length
  const cotizacionAgeDays = ultimaCotizacion
    ? Math.floor((Date.now() - new Date(ultimaCotizacion.fecha).getTime()) / (1000 * 60 * 60 * 24))
    : null

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
      description: "Controla el libro diario, los borradores y los asientos ya publicados.",
      icon: Wallet,
      href: "/contabilidad/asientos",
      stats: loadingAsientos
        ? "Cargando asientos..."
        : `${asientosPublicados.length} publicados / ${totalAsientos} consultables`,
      detail: loadingAsientos
        ? "Recuperando libro diario..."
        : `${asientosBorrador.length} en borrador dentro del ejercicio ${ejercicio?.descripcion ?? "activo"}.`,
    },
    {
      title: "Pagos y Cobros",
      description: "Sigue el movimiento financiero registrado y su impacto operativo inmediato.",
      icon: PiggyBank,
      href: "/contabilidad/pagos",
      stats: loadingPagos
        ? "Cargando movimientos..."
        : `$${fmtARS(totalPagosMonto)} en ${totalPagos} movimientos`,
      detail: loadingPagos
        ? "Consultando tesorería..."
        : `Sucursal ${sucursalId}. Último movimiento: ${pagos[0] ? formatDate(pagos[0].fecha) : "sin datos"}.`,
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
      detalle: `${asientosPublicados.length} asientos publicados y ${asientosBorrador.length} borradores en la tanda visible.`,
      href: "/contabilidad/asientos",
    },
    {
      modulo: "Tesorería",
      estado: totalPagos > 0 ? "Activo" : "Sin movimiento",
      detalle: `$${fmtARS(totalPagosMonto)} visibles en pagos/cobros del contexto actual.`,
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

  const hasError = errorCuentas || errorAsientos || errorPagos || errorPeriodos || errorCotizaciones

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Contabilidad</h1>
        <p className="text-muted-foreground">
          Tablero operativo del módulo contable sobre datos reales de ejercicio, libro diario,
          pagos, períodos IVA y cotizaciones.
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
                            asiento.estado.toLowerCase() === "publicado" ? "secondary" : "outline"
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
              {pagosRecientes.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No hay movimientos visibles para resumir.
                </p>
              )}
              {pagosRecientes.map((pago) => (
                <div key={pago.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{pago.terceroRazonSocial}</p>
                      <p className="text-xs text-muted-foreground">
                        Sucursal {pago.sucursalId} • {formatDate(pago.fecha)}
                      </p>
                    </div>
                    <Badge
                      variant={
                        String(pago.estado).toLowerCase() === "anulado"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {pago.estado}
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Importe</span>
                    <span className="font-medium">
                      {pago.monedaSimbolo}
                      {fmtARS(Number(pago.total ?? 0))}
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
