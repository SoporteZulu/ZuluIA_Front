"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Ban, Eye, RefreshCw, Search, ShieldAlert, Wallet } from "lucide-react"

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
import { useAsientos } from "@/lib/hooks/useAsientos"
import { useCobros } from "@/lib/hooks/useCobros"
import { useEjercicioVigente } from "@/lib/hooks/useEjercicios"
import { usePagos } from "@/lib/hooks/usePagos"
import { useReintegros } from "@/lib/hooks/useReintegros"
import { useDefaultSucursalId } from "@/lib/hooks/useSucursales"

type CancellationModule = "Cobros" | "Pagos" | "Reintegros"

type CancellationRecord = {
  key: string
  module: CancellationModule
  recordId: number
  documentLabel: string
  referenceLabel: string
  tercero: string
  fecha: string
  importe: number
  currencyLabel: string
  sourceState: string
  note: string
  originPath: string
}

function formatDate(value?: string | null) {
  if (!value) return "-"
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch
    return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString("es-AR")
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("es-AR")
}

function formatMoney(value: number, currencyLabel = "$") {
  const amount = Number(value ?? 0)
  const normalizedLabel = currencyLabel.trim() || "$"

  if (normalizedLabel.length === 3) {
    return amount.toLocaleString("es-AR", {
      style: "currency",
      currency: normalizedLabel,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  return `${normalizedLabel} ${amount.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function matchesTerm(item: CancellationRecord, term: string) {
  if (term === "") return true

  return [
    item.module,
    item.documentLabel,
    item.referenceLabel,
    item.tercero,
    item.sourceState,
    item.note,
  ]
    .join(" ")
    .toLowerCase()
    .includes(term)
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

function sortCancellationRecords(left: CancellationRecord, right: CancellationRecord) {
  const leftDate = new Date(left.fecha).getTime()
  const rightDate = new Date(right.fecha).getTime()

  if (leftDate !== rightDate) {
    return rightDate - leftDate
  }

  return right.recordId - left.recordId
}

export default function ContabilidadAnulacionesPage() {
  const sucursalId = useDefaultSucursalId() ?? 1
  const { ejercicio } = useEjercicioVigente()
  const {
    pagos,
    loading: pagosLoading,
    error: pagosError,
    refetch: refetchPagos,
  } = usePagos({ sucursalId })
  const {
    cobros,
    loading: cobrosLoading,
    error: cobrosError,
    refetch: refetchCobros,
  } = useCobros({ sucursalId })
  const {
    reintegros,
    loading: reintegrosLoading,
    error: reintegrosError,
    refetch: refetchReintegros,
  } = useReintegros({ sucursalId, pageSize: 100 })
  const { asientos } = useAsientos({ ejercicioId: ejercicio?.id, sucursalId })
  const [search, setSearch] = useState("")
  const [moduleFilter, setModuleFilter] = useState<"todos" | CancellationModule>("todos")
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  const items = useMemo(() => {
    const pagoItems: CancellationRecord[] = pagos
      .filter((pago) => pago.estado?.toUpperCase() === "ANULADO")
      .map((pago) => ({
        key: `pago-${pago.id}`,
        module: "Pagos",
        recordId: pago.id,
        documentLabel: `Pago #${pago.id}`,
        referenceLabel: `Tercero #${pago.terceroId}`,
        tercero: pago.terceroRazonSocial?.trim() || "Sin tercero",
        fecha: pago.fecha,
        importe: Number(pago.total ?? 0),
        currencyLabel: pago.monedaSimbolo?.trim() || "$",
        sourceState: pago.estado,
        note: "El pago ya figura como anulado en el backend de egresos.",
        originPath: "/contabilidad/egresos",
      }))

    const cobroItems: CancellationRecord[] = cobros
      .filter((cobro) => cobro.estado?.toUpperCase() === "ANULADO")
      .map((cobro) => ({
        key: `cobro-${cobro.id}`,
        module: "Cobros",
        recordId: cobro.id,
        documentLabel: `Cobro #${cobro.id}`,
        referenceLabel: cobro.nroCierre
          ? `Cierre #${cobro.nroCierre}`
          : `Tercero #${cobro.terceroId}`,
        tercero: cobro.terceroRazonSocial?.trim() || "Sin tercero",
        fecha: cobro.fecha,
        importe: Number(cobro.total ?? 0),
        currencyLabel: cobro.monedaSimbolo?.trim() || "$",
        sourceState: cobro.estado,
        note: "El cobro ya figura como anulado en el backend de ingresos.",
        originPath: "/contabilidad/ingresos",
      }))

    const reintegroItems: CancellationRecord[] = reintegros
      .filter((reintegro) => reintegro.anulado)
      .map((reintegro) => ({
        key: `reintegro-${reintegro.id}`,
        module: "Reintegros",
        recordId: reintegro.id,
        documentLabel: `Reintegro #${reintegro.id}`,
        referenceLabel: reintegro.valeId ? `Vale #${reintegro.valeId}` : "Sin referencia",
        tercero: reintegro.terceroNombre?.trim() || "Sin tercero",
        fecha: reintegro.fecha,
        importe: Number(reintegro.importe ?? 0),
        currencyLabel: reintegro.monedaCodigo?.trim() || (reintegro.monedaId === 1 ? "ARS" : "$"),
        sourceState: "ANULADO",
        note:
          reintegro.observacion?.trim() || "El reintegro quedó anulado en el backend de tesorería.",
        originPath: "/contabilidad/reintegros",
      }))

    return [...pagoItems, ...cobroItems, ...reintegroItems].sort(sortCancellationRecords)
  }, [cobros, pagos, reintegros])

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim()

    return items.filter(
      (item) =>
        matchesTerm(item, term) && (moduleFilter === "todos" || item.module === moduleFilter)
    )
  }, [items, moduleFilter, search])

  const selected = filtered.find((item) => item.key === selectedKey) ?? filtered[0] ?? null
  const highlighted = filtered[0] ?? null
  const loading = pagosLoading || cobrosLoading || reintegrosLoading
  const error = cobrosError || pagosError || reintegrosError

  const kpis = useMemo(
    () => ({
      total: items.length,
      cobros: items.filter((item) => item.module === "Cobros").length,
      pagos: items.filter((item) => item.module === "Pagos").length,
      reintegros: items.filter((item) => item.module === "Reintegros").length,
      modules: new Set(items.map((item) => item.module)).size,
    }),
    [items]
  )

  const handleRefresh = async () => {
    await Promise.all([refetchPagos(), refetchCobros(), refetchReintegros()])
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Anulaciones</h1>
          <p className="mt-1 text-muted-foreground">
            Tablero real de operaciones ya anuladas en backend, consolidado desde cobros, pagos y
            reintegros sin sostener el workflow local del legacy.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="bg-transparent" onClick={() => handleRefresh()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Actualizar
          </Button>
          <Button asChild variant="outline" className="bg-transparent">
            <Link href="/contabilidad/ingresos">Ingresos</Link>
          </Button>
          <Button asChild>
            <Link href="/contabilidad/egresos">Egresos</Link>
          </Button>
        </div>
      </div>

      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertDescription>
          El backend actual no expone una cola transversal de solicitud, aprobación y ejecución de
          anulaciones. Esta vista deja de simular ese workflow y pasa a consolidar las anulaciones
          ya ejecutadas y publicadas por los módulos reales que sí las soportan.
        </AlertDescription>
      </Alert>

      {error ? (
        <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Anulaciones reales</p>
            <p className="mt-2 text-2xl font-bold text-amber-600">{kpis.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Cobros anulados</p>
            <p className="mt-2 text-2xl font-bold">{kpis.cobros}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Pagos anulados</p>
            <p className="mt-2 text-2xl font-bold">{kpis.pagos}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Reintegros anulados</p>
            <p className="mt-2 text-2xl font-bold text-emerald-600">{kpis.reintegros}</p>
          </CardContent>
        </Card>
      </div>

      {highlighted ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardDescription>Última anulación visible</CardDescription>
            <CardTitle className="mt-1 text-xl">{highlighted.documentLabel}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-4">
            <div className="rounded-lg bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Módulo</p>
              <p className="text-sm font-medium">{highlighted.module}</p>
            </div>
            <div className="rounded-lg bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Referencia</p>
              <p className="text-sm font-medium">{highlighted.referenceLabel}</p>
            </div>
            <div className="rounded-lg bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Tercero</p>
              <p className="text-sm font-medium">{highlighted.tercero}</p>
            </div>
            <div className="rounded-lg bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Importe</p>
              <p className="text-sm font-medium">
                {formatMoney(highlighted.importe, highlighted.currencyLabel)}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 lg:grid-cols-[1.8fr_1fr]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-10"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por módulo, documento, tercero o referencia..."
              />
            </div>
            <Select
              value={moduleFilter}
              onValueChange={(value) => setModuleFilter(value as "todos" | CancellationModule)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Módulo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los módulos</SelectItem>
                <SelectItem value="Cobros">Cobros</SelectItem>
                <SelectItem value="Pagos">Pagos</SelectItem>
                <SelectItem value="Reintegros">Reintegros</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Ban className="h-4 w-4" /> Anulaciones reales visibles
            </CardTitle>
            <CardDescription>
              Operaciones ya anuladas y publicadas por los módulos reales que hoy exponen ese estado
              en backend.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Módulo</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tercero / ref.</TableHead>
                  <TableHead>Estado fuente</TableHead>
                  <TableHead className="text-right">Importe</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      Cargando anulaciones reales...
                    </TableCell>
                  </TableRow>
                ) : filtered.length > 0 ? (
                  filtered.map((item) => (
                    <TableRow key={item.key}>
                      <TableCell>
                        <Badge variant="outline">{item.module}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{item.documentLabel}</TableCell>
                      <TableCell>{formatDate(item.fecha)}</TableCell>
                      <TableCell>{`${item.tercero} · ${item.referenceLabel}`}</TableCell>
                      <TableCell>
                        <Badge variant="destructive">{item.sourceState}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMoney(item.importe, item.currencyLabel)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedKey(item.key)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No hay anulaciones reales que coincidan con los filtros actuales.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detalle de la anulación</CardTitle>
              <CardDescription>
                Selecciona una operación anulada para revisar su origen real y su referencia.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selected ? (
                <div className="space-y-4">
                  <DetailFieldGrid
                    fields={[
                      { label: "Módulo", value: selected.module },
                      { label: "Documento", value: selected.documentLabel },
                      { label: "Referencia", value: selected.referenceLabel },
                      { label: "Fecha", value: formatDate(selected.fecha) },
                      { label: "Tercero", value: selected.tercero },
                      { label: "Estado fuente", value: selected.sourceState },
                      {
                        label: "Importe",
                        value: formatMoney(selected.importe, selected.currencyLabel),
                      },
                      { label: "Ruta origen", value: selected.originPath },
                    ]}
                  />
                  <div className="rounded-lg bg-muted/40 p-3 text-sm">
                    <p className="text-xs text-muted-foreground">Lectura operativa</p>
                    <p className="mt-1 font-medium">{selected.note}</p>
                  </div>
                  <Button asChild className="w-full">
                    <Link href={selected.originPath}>Ir al módulo origen</Link>
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No hay anulaciones reales visibles para la sucursal activa.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cobertura backend actual</CardTitle>
              <CardDescription>
                Referencias vivas para dimensionar qué parte del universo de anulaciones ya es real.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Wallet className="h-4 w-4" /> Cobros visibles
                </div>
                <p className="mt-2 text-2xl font-bold">{cobros.length}</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Wallet className="h-4 w-4" /> Pagos visibles
                </div>
                <p className="mt-2 text-2xl font-bold">{pagos.length}</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Wallet className="h-4 w-4" /> Reintegros visibles
                </div>
                <p className="mt-2 text-2xl font-bold">{reintegros.length}</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Wallet className="h-4 w-4" /> Asientos visibles
                </div>
                <p className="mt-2 text-2xl font-bold">{asientos.length}</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3 text-sm">
                <p className="text-xs text-muted-foreground">Lectura operativa</p>
                <p className="mt-1 font-medium">
                  {kpis.total > 0
                    ? `${kpis.total} anulacion(es) ya quedaron ejecutadas y visibles desde ${kpis.modules} módulo(s) reales.`
                    : "Todavía no hay operaciones anuladas visibles en los módulos reales consultados."}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
