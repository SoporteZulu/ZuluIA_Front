"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  ArrowUpRight,
  CreditCard,
  Eye,
  Landmark,
  RefreshCw,
  Search,
  ShieldAlert,
  Wallet,
} from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { useCajas } from "@/lib/hooks/useCajas"
import { usePagos } from "@/lib/hooks/usePagos"
import { useDefaultSucursalId } from "@/lib/hooks/useSucursales"
import type { Pago, PagoDetalle } from "@/lib/types/pagos"

type StatusFilter = "todos" | "activos" | "anulados" | "otros"

function formatDate(value?: string | null) {
  if (!value) return "-"

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).toLocaleDateString(
      "es-AR"
    )
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("es-AR")
}

function formatDateTime(value?: string | null) {
  if (!value) return "-"

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
}

function formatMoney(value: number, symbol = "$") {
  return `${symbol} ${Number(value ?? 0).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function getStatusFilterValue(status?: string | null): Exclude<StatusFilter, "todos"> {
  const normalized = (status ?? "").trim().toUpperCase()
  if (normalized === "ACTIVO" || normalized === "REGISTRADO") return "activos"
  if (normalized === "ANULADO") return "anulados"
  return "otros"
}

function getStatusBadge(status?: string | null) {
  const normalized = (status ?? "").trim().toUpperCase()

  if (normalized === "ACTIVO" || normalized === "REGISTRADO") {
    return <Badge>Activo</Badge>
  }

  if (normalized === "ANULADO") {
    return <Badge variant="destructive">Anulado</Badge>
  }

  return <Badge variant="outline">{status || "Sin estado"}</Badge>
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

export default function ContabilidadEgresosPage() {
  const sucursalId = useDefaultSucursalId()
  const { cajas } = useCajas(sucursalId)
  const { pagos, loading, error, totalCount, getById, refetch } = usePagos({ sucursalId })

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos")
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selectedDetail, setSelectedDetail] = useState<PagoDetalle | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    if (pagos.length === 0) {
      setSelectedId(null)
      setSelectedDetail(null)
      return
    }

    setSelectedId((current) =>
      current && pagos.some((pago) => pago.id === current) ? current : pagos[0].id
    )
  }, [pagos])

  useEffect(() => {
    let cancelled = false

    if (!selectedId) {
      setSelectedDetail(null)
      return
    }

    setDetailLoading(true)
    getById(selectedId)
      .then((detail) => {
        if (!cancelled) {
          setSelectedDetail(detail)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setDetailLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [getById, selectedId])

  const cajaMap = useMemo(() => {
    return new Map(
      cajas.map((caja) => [
        caja.id,
        caja.descripcion?.trim() || caja.nombre?.trim() || `Caja ${caja.id}`,
      ])
    )
  }, [cajas])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()

    return pagos.filter((pago) => {
      const mappedStatus = getStatusFilterValue(pago.estado)
      if (statusFilter !== "todos" && mappedStatus !== statusFilter) return false

      if (!term) return true

      return [String(pago.id), pago.terceroRazonSocial, pago.monedaSimbolo, pago.estado]
        .join(" ")
        .toLowerCase()
        .includes(term)
    })
  }, [pagos, search, statusFilter])

  const selected =
    filtered.find((pago) => pago.id === selectedId) ??
    pagos.find((pago) => pago.id === selectedId) ??
    filtered[0] ??
    pagos[0] ??
    null

  const selectedSummary: Pago | PagoDetalle | null = selectedDetail ?? selected

  const kpis = useMemo(
    () => ({
      activos: pagos.filter((pago) => getStatusFilterValue(pago.estado) === "activos").length,
      anulados: pagos.filter((pago) => getStatusFilterValue(pago.estado) === "anulados").length,
      montoTotal: pagos
        .filter((pago) => getStatusFilterValue(pago.estado) !== "anulados")
        .reduce((acc, pago) => acc + Number(pago.total ?? 0), 0),
      retenciones: pagos.length,
    }),
    [pagos]
  )

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Egresos</h1>
          <p className="mt-1 text-muted-foreground">
            Vista real de egresos sobre <span className="font-medium">/api/pagos</span>, con lectura
            directa de pagos publicados por backend para la sucursal activa.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="bg-transparent" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Actualizar
          </Button>
          <Button asChild variant="outline" className="bg-transparent">
            <Link href="/contabilidad/pagos">Pagos</Link>
          </Button>
          <Button asChild>
            <Link href="/contabilidad/cajas">Control de cajas</Link>
          </Button>
        </div>
      </div>

      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertDescription>
          La consola deja de proyectar egresos simulados y pasa a mostrar pagos reales con su
          detalle y medios desde backend.
        </AlertDescription>
      </Alert>

      {error ? (
        <Alert>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Total real</p>
            <p className="mt-2 text-2xl font-bold">{totalCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Activos</p>
            <p className="mt-2 text-2xl font-bold text-emerald-600">{kpis.activos}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Anulados</p>
            <p className="mt-2 text-2xl font-bold text-destructive">{kpis.anulados}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Monto total</p>
            <p className="mt-2 text-2xl font-bold">{formatMoney(kpis.montoTotal)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 lg:grid-cols-[1.8fr_1fr]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-10"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por tercero, moneda, estado o identificador..."
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as StatusFilter)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="activos">Activos</SelectItem>
                <SelectItem value="anulados">Anulados</SelectItem>
                <SelectItem value="otros">Otros estados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowUpRight className="h-4 w-4" /> Egresos reales visibles
            </CardTitle>
            <CardDescription>
              Proyeccion operacional de pagos reales, sin consola local de seguimiento manual.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tercero</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Moneda</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((pago) => (
                  <TableRow key={pago.id}>
                    <TableCell className="font-medium">#{pago.id}</TableCell>
                    <TableCell>{formatDate(pago.fecha)}</TableCell>
                    <TableCell>{pago.terceroRazonSocial}</TableCell>
                    <TableCell>{getStatusBadge(pago.estado)}</TableCell>
                    <TableCell>{pago.monedaSimbolo ?? "$"}</TableCell>
                    <TableCell className="text-right">
                      {formatMoney(pago.total, pago.monedaSimbolo ?? "$")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => setSelectedId(pago.id)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No hay egresos reales para los filtros actuales.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detalle del egreso</CardTitle>
              <CardDescription>
                {selectedSummary
                  ? `Pago #${selectedSummary.id} a ${selectedSummary.terceroRazonSocial}.`
                  : "Selecciona un egreso real para ver su detalle."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedSummary ? (
                <div className="space-y-4">
                  <DetailFieldGrid
                    fields={[
                      { label: "Tercero", value: selectedSummary.terceroRazonSocial },
                      { label: "Fecha", value: formatDate(selectedSummary.fecha) },
                      { label: "Estado", value: selectedSummary.estado || "Sin estado" },
                      { label: "Moneda", value: selectedSummary.monedaSimbolo ?? "$" },
                      {
                        label: "Cotizacion",
                        value: Number(
                          ("cotizacion" in selectedSummary ? selectedSummary.cotizacion : 1) ?? 1
                        ).toLocaleString("es-AR"),
                      },
                      {
                        label: "Total",
                        value: formatMoney(
                          selectedSummary.total,
                          selectedSummary.monedaSimbolo ?? "$"
                        ),
                      },
                      { label: "Creado", value: formatDateTime(selectedSummary.createdAt) },
                      {
                        label: "Retenciones",
                        value:
                          "retenciones" in selectedSummary
                            ? String(selectedSummary.retenciones.length)
                            : "-",
                      },
                    ]}
                  />

                  {"observacion" in selectedSummary ? (
                    <div className="rounded-lg border bg-muted/20 p-3">
                      <p className="text-xs text-muted-foreground">Observacion</p>
                      <p className="mt-1 text-sm font-medium">
                        {selectedSummary.observacion || "Sin observaciones"}
                      </p>
                    </div>
                  ) : null}

                  <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground">Lectura operativa</p>
                    <p className="mt-1 text-sm font-medium">
                      {detailLoading
                        ? "Cargando medios y retenciones del pago..."
                        : selectedDetail
                          ? `${selectedDetail.medios.length} medio(s) y ${selectedDetail.retenciones.length} retencion(es) expuestos por backend.`
                          : "Selecciona un pago para cargar su detalle real."}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No hay egresos reales cargados para esta sucursal.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-4 w-4" /> Medios del pago
              </CardTitle>
              <CardDescription>
                Detalle real obtenido desde <span className="font-medium">/api/pagos/:id</span>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {detailLoading ? (
                <p className="text-sm text-muted-foreground">Cargando detalle del pago...</p>
              ) : selectedDetail?.medios.length ? (
                selectedDetail.medios.map((medio) => (
                  <div key={medio.id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">
                          {medio.formaPagoDescripcion} ·{" "}
                          {medio.cajaDescripcion ||
                            cajaMap.get(medio.cajaId) ||
                            `Caja ${medio.cajaId}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Moneda {medio.monedaSimbolo} · Cotizacion{" "}
                          {Number(medio.cotizacion ?? 1).toLocaleString("es-AR")}
                        </p>
                      </div>
                      <span className="text-sm font-medium">
                        {formatMoney(medio.importe, medio.monedaSimbolo || "$")}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Selecciona un pago para revisar sus medios reales.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Landmark className="h-4 w-4" /> Retenciones y contexto
              </CardTitle>
              <CardDescription>
                El circuito conserva el nexo con cajas reales y muestra retenciones informadas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Wallet className="h-4 w-4" /> Cajas visibles
                </div>
                <p className="mt-2 text-2xl font-bold">{cajas.length}</p>
              </div>
              {detailLoading ? (
                <p className="text-sm text-muted-foreground">Cargando retenciones...</p>
              ) : selectedDetail?.retenciones.length ? (
                selectedDetail.retenciones.map((retencion) => (
                  <div key={retencion.id} className="rounded-lg border p-3">
                    <p className="text-sm font-medium">{retencion.tipo}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(retencion.fecha)}</p>
                    <p className="mt-1 text-sm font-medium">{formatMoney(retencion.importe)}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  El pago seleccionado no informa retenciones.
                </p>
              )}
              <Button asChild className="w-full">
                <Link href="/contabilidad/pagos">Ir a pagos</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
