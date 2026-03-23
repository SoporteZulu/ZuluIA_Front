"use client"

import { useMemo, useState } from "react"
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Landmark,
  RefreshCw,
  Search,
  Users,
  Wallet,
} from "lucide-react"
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
import { Label } from "@/components/ui/label"
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
import {
  useCuentaCorriente,
  useDeudores,
  useMovimientosCuentaCorriente,
} from "@/lib/hooks/useCuentaCorriente"
import { useSucursales } from "@/lib/hooks/useSucursales"
import { useTerceros } from "@/lib/hooks/useTerceros"
import type {
  Deudor,
  MovimientoCuentaCorriente,
  SaldoCuentaCorriente,
} from "@/lib/types/cuenta-corriente"
import type { Tercero } from "@/lib/types/terceros"

function formatMoney(value: number, symbol = "$") {
  return `${symbol}${value.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString("es-AR") : "-"
}

function formatCustomerAddress(customer?: Tercero | null) {
  if (!customer) return "-"
  const parts = [
    [customer.calle, customer.nro].filter(Boolean).join(" "),
    customer.piso ? `Piso ${customer.piso}` : null,
    customer.dpto ? `Dto ${customer.dpto}` : null,
    customer.localidadDescripcion,
    customer.codigoPostal,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(", ") : "-"
}

function movementIcon(tipo: string) {
  const normalized = tipo.toLowerCase()
  if (
    normalized.includes("factura") ||
    normalized.includes("debito") ||
    normalized.includes("cargo")
  ) {
    return <ArrowDownLeft className="h-3.5 w-3.5 text-red-500" />
  }
  return <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
}

function movementLabel(tipo: string) {
  return tipo.replace(/_/g, " ")
}

function debtorStatus(saldo: number) {
  if (saldo > 0) {
    return {
      label: "Deudor",
      variant: "outline" as const,
      className: "border-red-200 bg-red-50 text-red-700",
    }
  }
  if (saldo < 0) {
    return {
      label: "Acreedor",
      variant: "outline" as const,
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    }
  }
  return {
    label: "Saldo cero",
    variant: "outline" as const,
    className: "",
  }
}

function getPortfolioAlert(saldo: number) {
  if (saldo > 0) return "Seguimiento de cobranza requerido"
  if (saldo < 0) return "Saldo a favor para compensar"
  return "Cuenta sin desvíos"
}

function getLastMovementLabel(movimientos: MovimientoCuentaCorriente[]) {
  const lastMovement = movimientos[0]
  if (!lastMovement) return "Sin movimientos recientes"
  return `${movementLabel(lastMovement.tipoMovimiento)} del ${formatDate(lastMovement.fecha)}`
}

function getNetFlowLabel(movimientos: MovimientoCuentaCorriente[]) {
  const totalDebe = movimientos.reduce((acc, movimiento) => acc + movimiento.debe, 0)
  const totalHaber = movimientos.reduce((acc, movimiento) => acc + movimiento.haber, 0)

  if (totalDebe === 0 && totalHaber === 0) return "Sin flujo registrado"
  if (totalDebe > totalHaber)
    return `Predominan cargos por ${formatMoney(totalDebe - totalHaber, "")}`
  if (totalHaber > totalDebe)
    return `Predominan créditos por ${formatMoney(totalHaber - totalDebe, "")}`
  return "Flujo equilibrado entre cargos y créditos"
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

function SummaryCards({ deudores }: { deudores: Deudor[] }) {
  const kpis = useMemo(
    () => ({
      total: deudores.length,
      deudores: deudores.filter((item) => item.saldo > 0).length,
      acreedores: deudores.filter((item) => item.saldo < 0).length,
      totalCobrar: deudores
        .filter((item) => item.saldo > 0)
        .reduce((acc, item) => acc + item.saldo, 0),
      totalFavor: deudores
        .filter((item) => item.saldo < 0)
        .reduce((acc, item) => acc + Math.abs(item.saldo), 0),
    }),
    [deudores]
  )

  return (
    <div className="grid gap-4 md:grid-cols-5">
      <Card>
        <CardContent className="pt-4 pb-4">
          <p className="text-xs text-muted-foreground">Terceros activos</p>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-2xl font-bold">{kpis.total}</p>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-4">
          <p className="text-xs text-muted-foreground">Clientes con deuda</p>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-2xl font-bold text-red-600">{kpis.deudores}</p>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-4">
          <p className="text-xs text-muted-foreground">Clientes a favor</p>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-2xl font-bold text-emerald-600">{kpis.acreedores}</p>
            <Wallet className="h-4 w-4 text-emerald-600" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-4">
          <p className="text-xs text-muted-foreground">Total a cobrar</p>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-2xl font-bold text-primary">{formatMoney(kpis.totalCobrar)}</p>
            <ArrowDownLeft className="h-4 w-4 text-primary" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-4">
          <p className="text-xs text-muted-foreground">Total a favor</p>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-2xl font-bold text-emerald-600">{formatMoney(kpis.totalFavor)}</p>
            <ArrowUpRight className="h-4 w-4 text-emerald-600" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function AccountDetailModal({
  deudor,
  customer,
  onClose,
}: {
  deudor: Deudor
  customer?: Tercero | null
  onClose: () => void
}) {
  const { sucursales } = useSucursales()
  const {
    saldos,
    loading: loadingSaldos,
    error: errorSaldos,
  } = useCuentaCorriente(deudor.terceroId)
  const {
    movimientos,
    loading: loadingMovimientos,
    error: errorMovimientos,
    totalPages,
    page,
    setPage,
    sucursalId,
    setSucursalId,
    monedaId,
    setMonedaId,
    desde,
    setDesde,
    hasta,
    setHasta,
    refetch,
  } = useMovimientosCuentaCorriente(deudor.terceroId)

  const saldoPrincipal = saldos.find((saldo) => saldo.monedaId === deudor.monedaId) ?? null
  const movementSummary = useMemo(() => {
    const withVoucher = movimientos.filter((movimiento) => movimiento.comprobanteId !== null).length
    return {
      total: movimientos.length,
      withVoucher,
      lastMovement: getLastMovementLabel(movimientos),
      netFlow: getNetFlowLabel(movimientos),
    }
  }, [movimientos])
  const monedaOptions = useMemo(() => {
    const map = new Map<number, string>()
    saldos.forEach((saldo) => map.set(saldo.monedaId, saldo.monedaSimbolo))
    if (!map.has(deudor.monedaId)) map.set(deudor.monedaId, deudor.monedaSimbolo)
    return Array.from(map.entries()).map(([id, simbolo]) => ({ id, simbolo }))
  }, [deudor.monedaId, deudor.monedaSimbolo, saldos])

  const headerFields = [
    { label: "Razón social", value: deudor.terceroRazonSocial },
    { label: "Tercero", value: `#${deudor.terceroId}` },
    { label: "Moneda principal", value: deudor.monedaSimbolo },
    {
      label: "Sucursal principal",
      value:
        sucursales.find((sucursal) => sucursal.id === deudor.sucursalId)?.descripcion ??
        (deudor.sucursalId ? `#${deudor.sucursalId}` : "Consolidado"),
    },
    { label: "Saldo actual", value: formatMoney(deudor.saldo, deudor.monedaSimbolo) },
    { label: "Actualizado", value: formatDate(deudor.updatedAt) },
  ]

  const circuitFields = [
    { label: "Alerta de cartera", value: getPortfolioAlert(deudor.saldo) },
    { label: "Último movimiento", value: movementSummary.lastMovement },
    { label: "Flujo neto", value: movementSummary.netFlow },
    { label: "Movimientos cargados", value: String(movementSummary.total) },
    { label: "Movimientos con comprobante", value: String(movementSummary.withVoucher) },
    {
      label: "Cobertura por sucursal",
      value:
        saldos.length > 0 ? `${saldos.length} posiciones activas` : "Sin posiciones detalladas",
    },
    {
      label: "Moneda principal",
      value: saldoPrincipal
        ? `${saldoPrincipal.monedaSimbolo} actualizada ${formatDate(saldoPrincipal.updatedAt)}`
        : deudor.monedaSimbolo,
    },
    {
      label: "Estado consolidado",
      value:
        deudor.saldo > 0
          ? `Debe ${formatMoney(deudor.saldo, deudor.monedaSimbolo)}`
          : deudor.saldo < 0
            ? `Tiene a favor ${formatMoney(Math.abs(deudor.saldo), deudor.monedaSimbolo)}`
            : "Sin saldo pendiente",
    },
  ]

  const customerFields = [
    { label: "Razón social", value: customer?.razonSocial ?? deudor.terceroRazonSocial },
    { label: "Fantasia", value: customer?.nombreFantasia ?? "-" },
    { label: "CUIT", value: customer?.nroDocumento ?? "-" },
    { label: "Condición IVA", value: customer?.condicionIvaDescripcion ?? "-" },
    { label: "Domicilio", value: formatCustomerAddress(customer) },
    { label: "Contacto", value: customer?.email ?? customer?.telefono ?? customer?.celular ?? "-" },
    {
      label: "Límite crédito",
      value:
        typeof customer?.limiteCredito === "number" ? formatMoney(customer.limiteCredito) : "-",
    },
    { label: "Facturable", value: customer ? (customer.facturable ? "Sí" : "No") : "-" },
  ]

  return (
    <Tabs defaultValue="principal" className="w-full">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="principal">Principal</TabsTrigger>
        <TabsTrigger value="circuito">Circuito</TabsTrigger>
        <TabsTrigger value="saldos">Saldos</TabsTrigger>
        <TabsTrigger value="movimientos">Movimientos</TabsTrigger>
        <TabsTrigger value="legado">Legado</TabsTrigger>
      </TabsList>

      <TabsContent value="principal" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="h-4 w-4" /> Resumen de cuenta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DetailFieldGrid fields={headerFields} />
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">Saldo consolidado</p>
                  <p
                    className={`mt-2 text-2xl font-bold ${deudor.saldo > 0 ? "text-red-600" : deudor.saldo < 0 ? "text-emerald-600" : ""}`}
                  >
                    {formatMoney(Math.abs(deudor.saldo), deudor.monedaSimbolo)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {deudor.saldo > 0
                      ? "El cliente mantiene deuda pendiente."
                      : deudor.saldo < 0
                        ? "El cliente tiene saldo a favor."
                        : "La cuenta quedó saldada."}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">Saldos por sucursal</p>
                  <p className="mt-2 text-2xl font-bold">{saldos.length}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Posiciones activas detectadas en API.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">Moneda principal</p>
                  <p className="mt-2 text-2xl font-bold">{deudor.monedaSimbolo}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {saldoPrincipal
                      ? `Última actualización ${formatDate(saldoPrincipal.updatedAt)}`
                      : "Sin saldo detallado cargado."}
                  </p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cliente vinculado</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailFieldGrid fields={customerFields} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="circuito" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4" /> Estado operativo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DetailFieldGrid fields={circuitFields} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="saldos" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Saldos por sucursal y moneda</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loadingSaldos ? (
              <div className="py-10 text-center text-muted-foreground">
                <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin" />
                Cargando saldos...
              </div>
            ) : errorSaldos ? (
              <div className="px-6 pb-6">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{errorSaldos}</AlertDescription>
                </Alert>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sucursal</TableHead>
                    <TableHead>Moneda</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead>Actualizado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {saldos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                        No hay saldos detallados disponibles para este tercero.
                      </TableCell>
                    </TableRow>
                  ) : (
                    saldos.map((saldo: SaldoCuentaCorriente) => (
                      <TableRow key={`${saldo.terceroId}-${saldo.sucursalId}-${saldo.monedaId}`}>
                        <TableCell>
                          {sucursales.find((sucursal) => sucursal.id === saldo.sucursalId)
                            ?.descripcion ??
                            (saldo.sucursalId ? `#${saldo.sucursalId}` : "Consolidado")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{saldo.monedaSimbolo}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          <span
                            className={
                              saldo.saldo > 0
                                ? "text-red-600"
                                : saldo.saldo < 0
                                  ? "text-emerald-600"
                                  : ""
                            }
                          >
                            {formatMoney(saldo.saldo, saldo.monedaSimbolo)}
                          </span>
                        </TableCell>
                        <TableCell>{formatDate(saldo.updatedAt)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="movimientos" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filtros operativos</CardTitle>
            <CardDescription>
              Filtre movimientos por sucursal, moneda y rango de fechas usando el backend real de
              cuenta corriente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-[220px_180px_1fr_1fr_auto]">
              <div className="space-y-1.5">
                <Label>Sucursal</Label>
                <Select
                  value={sucursalId ? String(sucursalId) : "all"}
                  onValueChange={(value) =>
                    setSucursalId(value === "all" ? undefined : Number(value))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {sucursales.map((sucursal) => (
                      <SelectItem key={sucursal.id} value={String(sucursal.id)}>
                        {sucursal.descripcion}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Moneda</Label>
                <Select
                  value={monedaId ? String(monedaId) : "all"}
                  onValueChange={(value) =>
                    setMonedaId(value === "all" ? undefined : Number(value))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {monedaOptions.map((moneda) => (
                      <SelectItem key={moneda.id} value={String(moneda.id)}>
                        {moneda.simbolo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Desde</Label>
                <Input
                  type="date"
                  value={desde}
                  onChange={(event) => setDesde(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Hasta</Label>
                <Input
                  type="date"
                  value={hasta}
                  onChange={(event) => setHasta(event.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button variant="outline" className="bg-transparent" onClick={() => refetch()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Recargar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Movimientos documentales</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loadingMovimientos ? (
              <div className="py-10 text-center text-muted-foreground">
                <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin" />
                Cargando movimientos...
              </div>
            ) : errorMovimientos ? (
              <div className="px-6 pb-6">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{errorMovimientos}</AlertDescription>
                </Alert>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="text-right">Debe</TableHead>
                      <TableHead className="text-right">Haber</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                      <TableHead>Comprobante</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movimientos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                          No se encontraron movimientos para los filtros actuales.
                        </TableCell>
                      </TableRow>
                    ) : (
                      movimientos.map((movimiento: MovimientoCuentaCorriente) => (
                        <TableRow key={movimiento.id}>
                          <TableCell>{formatDate(movimiento.fecha)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm">
                              {movementIcon(movimiento.tipoMovimiento)}
                              <span className="capitalize">
                                {movementLabel(movimiento.tipoMovimiento)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {movimiento.descripcion}
                          </TableCell>
                          <TableCell className="text-right">
                            {movimiento.debe > 0 ? (
                              <span className="font-medium text-red-600">
                                {formatMoney(movimiento.debe, "")}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {movimiento.haber > 0 ? (
                              <span className="font-medium text-emerald-600">
                                {formatMoney(movimiento.haber, "")}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            <span
                              className={
                                movimiento.saldo > 0
                                  ? "text-red-600"
                                  : movimiento.saldo < 0
                                    ? "text-emerald-600"
                                    : ""
                              }
                            >
                              {formatMoney(movimiento.saldo, "")}
                            </span>
                          </TableCell>
                          <TableCell>
                            {movimiento.comprobanteId ? (
                              <Badge variant="outline">#{movimiento.comprobanteId}</Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 border-t px-6 py-4">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage(page - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Página {page} de {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage(page + 1)}
                    >
                      Siguiente
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="legado" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Landmark className="h-4 w-4" /> Bloques reservados del legado
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm text-muted-foreground md:grid-cols-2">
            <div className="rounded-lg border p-4">
              La vista ya deja visible saldo, flujo reciente y cobertura por sucursal; recibos
              masivos, agenda de cobranzas y cobrador asignado siguen reservados.
            </div>
            <div className="rounded-lg border p-4">
              Conciliación entre cobros y comprobantes, reimpresión de extractos y alertas
              preventivas de mora con reglas de negocio quedan reservadas para la siguiente fase.
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <div className="flex justify-end border-t pt-4">
        <Button variant="outline" className="bg-transparent" onClick={onClose}>
          Cerrar
        </Button>
      </div>
    </Tabs>
  )
}

export default function CuentaCorrientePage() {
  const { deudores, loading, error, refetch } = useDeudores(undefined, undefined, false)
  const { sucursales } = useSucursales()
  const { terceros } = useTerceros()
  const [searchTerm, setSearchTerm] = useState("")
  const [balanceFilter, setBalanceFilter] = useState<"todos" | "deudor" | "acreedor" | "cero">(
    "todos"
  )
  const [currencyFilter, setCurrencyFilter] = useState("todos")
  const [branchFilter, setBranchFilter] = useState("todos")
  const [selectedDeudor, setSelectedDeudor] = useState<Deudor | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const currencyOptions = useMemo(() => {
    const map = new Map<number, string>()
    deudores.forEach((deudor) => map.set(deudor.monedaId, deudor.monedaSimbolo))
    return Array.from(map.entries()).map(([id, simbolo]) => ({ id, simbolo }))
  }, [deudores])

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return deudores.filter((deudor) => {
      const matchesSearch =
        term === "" ||
        deudor.terceroRazonSocial.toLowerCase().includes(term) ||
        String(deudor.terceroId).includes(term)

      const matchesBalance =
        balanceFilter === "todos" ||
        (balanceFilter === "deudor" && deudor.saldo > 0) ||
        (balanceFilter === "acreedor" && deudor.saldo < 0) ||
        (balanceFilter === "cero" && deudor.saldo === 0)

      const matchesCurrency =
        currencyFilter === "todos" || String(deudor.monedaId) === currencyFilter

      const matchesBranch =
        branchFilter === "todos" || String(deudor.sucursalId ?? "consolidado") === branchFilter

      return matchesSearch && matchesBalance && matchesCurrency && matchesBranch
    })
  }, [balanceFilter, branchFilter, currencyFilter, deudores, searchTerm])

  const filteredKpis = useMemo(
    () => ({
      total: filtered.length,
      debtors: filtered.filter((deudor) => deudor.saldo > 0).length,
      creditors: filtered.filter((deudor) => deudor.saldo < 0).length,
      zero: filtered.filter((deudor) => deudor.saldo === 0).length,
      totalDebt: filtered
        .filter((deudor) => deudor.saldo > 0)
        .reduce((acc, deudor) => acc + deudor.saldo, 0),
    }),
    [filtered]
  )

  const getCustomer = (terceroId: number) =>
    terceros.find((tercero) => tercero.id === terceroId) ?? null

  const currentSelectedDeudor = selectedDeudor
    ? deudores.find(
        (deudor) =>
          deudor.terceroId === selectedDeudor.terceroId &&
          deudor.monedaId === selectedDeudor.monedaId &&
          (deudor.sucursalId ?? null) === (selectedDeudor.sucursalId ?? null)
      ) ?? null
    : null

  const highlightedDebtor =
    currentSelectedDeudor &&
    filtered.some(
      (deudor) =>
        deudor.terceroId === currentSelectedDeudor.terceroId &&
        deudor.monedaId === currentSelectedDeudor.monedaId &&
        (deudor.sucursalId ?? null) === (currentSelectedDeudor.sucursalId ?? null)
    )
      ? currentSelectedDeudor
      : filtered[0] ?? null
  const highlightedCustomer = highlightedDebtor ? getCustomer(highlightedDebtor.terceroId) : null
  const highlightedFields = highlightedDebtor
    ? [
        {
          label: "Cliente",
          value: highlightedCustomer?.razonSocial ?? highlightedDebtor.terceroRazonSocial,
        },
        { label: "Moneda", value: highlightedDebtor.monedaSimbolo },
        {
          label: "Sucursal",
          value:
            sucursales.find((sucursal) => sucursal.id === highlightedDebtor.sucursalId)
              ?.descripcion ??
            (highlightedDebtor.sucursalId ? `#${highlightedDebtor.sucursalId}` : "Consolidado"),
        },
        {
          label: "Saldo",
          value: formatMoney(highlightedDebtor.saldo, highlightedDebtor.monedaSimbolo),
        },
        { label: "Alerta cartera", value: getPortfolioAlert(highlightedDebtor.saldo) },
        { label: "Domicilio", value: formatCustomerAddress(highlightedCustomer) },
      ]
    : []

  const openDetail = (deudor: Deudor) => {
    setSelectedDeudor(deudor)
    setIsDetailOpen(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cuenta Corriente</h1>
          <p className="text-muted-foreground">
            Saldos, posiciones por sucursal y movimientos documentales de clientes sobre la cuenta
            corriente real del backend.
          </p>
        </div>
        <Button variant="outline" className="bg-transparent" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Recargar
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <SummaryCards deudores={deudores} />

      {highlightedDebtor ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardDescription>Cuenta destacada</CardDescription>
              <CardTitle className="mt-1 text-xl">
                {highlightedCustomer?.razonSocial ?? highlightedDebtor.terceroRazonSocial}
              </CardTitle>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                {getPortfolioAlert(highlightedDebtor.saldo)}.{" "}
                {highlightedCustomer?.email ??
                  highlightedCustomer?.telefono ??
                  "Sin contacto principal informado."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={debtorStatus(highlightedDebtor.saldo).variant}
                className={debtorStatus(highlightedDebtor.saldo).className}
              >
                {debtorStatus(highlightedDebtor.saldo).label}
              </Badge>
              <Badge variant="outline">
                {formatMoney(highlightedDebtor.saldo, highlightedDebtor.monedaSimbolo)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <DetailFieldGrid fields={highlightedFields} />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Combine búsqueda, balance, moneda y sucursal para revisar la cartera activa con el mismo
            enfoque operativo del sistema legado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-[1fr_220px_180px_220px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-10"
                placeholder="Buscar por cliente o ID..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            <Select
              value={balanceFilter}
              onValueChange={(value) => setBalanceFilter(value as typeof balanceFilter)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Balance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los balances</SelectItem>
                <SelectItem value="deudor">Solo deudores</SelectItem>
                <SelectItem value="acreedor">Solo acreedores</SelectItem>
                <SelectItem value="cero">Saldo cero</SelectItem>
              </SelectContent>
            </Select>
            <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Moneda" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas las monedas</SelectItem>
                {currencyOptions.map((currency) => (
                  <SelectItem key={currency.id} value={String(currency.id)}>
                    {currency.simbolo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Sucursal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas las sucursales</SelectItem>
                <SelectItem value="consolidado">Consolidado</SelectItem>
                {sucursales.map((sucursal) => (
                  <SelectItem key={sucursal.id} value={String(sucursal.id)}>
                    {sucursal.descripcion}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cartera de clientes ({filtered.length})</CardTitle>
          <CardDescription>
            Vista consolidada por tercero, moneda y sucursal para seguimiento de deuda, saldo a
            favor y último movimiento informado.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Sucursal</TableHead>
                <TableHead>Moneda</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Cartera</TableHead>
                <TableHead>Actualizado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    No se encontraron registros para los filtros actuales.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((deudor) => {
                  const status = debtorStatus(deudor.saldo)
                  return (
                    <TableRow
                      key={`${deudor.terceroId}-${deudor.monedaId}-${deudor.sucursalId ?? "consolidado"}`}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => openDetail(deudor)}
                    >
                      <TableCell>
                        <p className="font-semibold text-sm">{deudor.terceroRazonSocial}</p>
                        <p className="text-xs text-muted-foreground">ID: {deudor.terceroId}</p>
                      </TableCell>
                      <TableCell>
                        {sucursales.find((sucursal) => sucursal.id === deudor.sucursalId)
                          ?.descripcion ??
                          (deudor.sucursalId ? `#${deudor.sucursalId}` : "Consolidado")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{deudor.monedaSimbolo}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        <span
                          className={
                            deudor.saldo > 0
                              ? "text-red-600"
                              : deudor.saldo < 0
                                ? "text-emerald-600"
                                : ""
                          }
                        >
                          {formatMoney(deudor.saldo, deudor.monedaSimbolo)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant} className={status.className}>
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-65 text-sm text-muted-foreground">
                        {getPortfolioAlert(deudor.saldo)}
                      </TableCell>
                      <TableCell>{formatDate(deudor.updatedAt)}</TableCell>
                      <TableCell
                        className="text-right"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Button variant="ghost" size="icon" onClick={() => openDetail(deudor)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="h-4 w-4" /> Saldos reales
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {filteredKpis.total} posiciones activas para los filtros actuales y{" "}
            {filteredKpis.debtors} clientes con deuda visible sobre endpoints reales.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4" /> Seguimiento operativo
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {filteredKpis.creditors} clientes a favor y {filteredKpis.zero} con saldo cero permiten
            depurar la cartera sin salir del circuito actual.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" /> Próxima capa
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            La cartera visible suma {formatMoney(filteredKpis.totalDebt)} a cobrar; recibos, gestión
            de cobranzas, alertas de mora y conciliación avanzada siguen reservados.
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-h-[92vh] max-w-6xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              {currentSelectedDeudor?.terceroRazonSocial ?? "Detalle de cuenta corriente"}
            </DialogTitle>
            <DialogDescription>
              {currentSelectedDeudor ? `Tercero #${currentSelectedDeudor.terceroId}` : "Cargando..."}
            </DialogDescription>
          </DialogHeader>
          {selectedDeudor && (
          {currentSelectedDeudor && (
              deudor={selectedDeudor}
              deudor={currentSelectedDeudor}
              customer={getCustomer(currentSelectedDeudor.terceroId)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
