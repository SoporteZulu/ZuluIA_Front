"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Eye, GitCompareArrows, RefreshCw, Search, ShieldAlert, Unplug, Wallet } from "lucide-react"

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
import { useComprobantes } from "@/lib/hooks/useComprobantes"
import { useImputacionesHistorial } from "@/lib/hooks/useImputaciones"
import { useDefaultSucursalId, useSucursales } from "@/lib/hooks/useSucursales"
import { useProveedores, useTerceros } from "@/lib/hooks/useTerceros"
import type { Comprobante } from "@/lib/types/comprobantes"
import type { ImputacionDto } from "@/lib/types/imputaciones"
import type { Tercero } from "@/lib/types/terceros"

type RecordStatus = "ACTIVA" | "DESIMPUTADA"

type DesimputacionRecord = {
  key: string
  imputacionId: number
  status: RecordStatus
  fecha: string
  createdAt: string
  importe: number
  tercero: string
  sucursal: string
  comprobanteOrigen: string
  comprobanteDestino: string
  rol: string
  note: string
  permiteDesimputar: boolean
}

function formatMoney(value: number) {
  return Number(value ?? 0).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatDate(value?: string | null) {
  if (!value) return "-"
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

function buildComprobanteLabel(
  comprobante: Comprobante | undefined,
  fallbackTipo: string,
  fallbackNumero: string
) {
  const type = comprobante?.tipoComprobanteDescripcion ?? fallbackTipo
  const number = comprobante?.nroComprobante ?? fallbackNumero
  return `${type} ${number}`.trim()
}

function buildTerceroMap(clientes: Tercero[], proveedores: Tercero[]) {
  const rows = new Map<number, Tercero>()
  clientes.forEach((tercero) => rows.set(tercero.id, tercero))
  proveedores.forEach((tercero) => {
    if (!rows.has(tercero.id)) {
      rows.set(tercero.id, tercero)
    }
  })
  return rows
}

function buildRecord(
  entry: ImputacionDto,
  comprobanteById: Map<number, Comprobante>,
  terceroById: Map<number, Tercero>,
  sucursalById: Map<number, string>
): DesimputacionRecord {
  const origin = comprobanteById.get(entry.comprobanteOrigenId)
  const destination = comprobanteById.get(entry.comprobanteDestinoId)
  const terceroId = destination?.terceroId ?? origin?.terceroId ?? null
  const terceroLabel =
    (terceroId ? terceroById.get(terceroId)?.razonSocial : null) ??
    (terceroId ? `Tercero #${terceroId}` : "Sin tercero visible")
  const sucursalId = destination?.sucursalId ?? origin?.sucursalId ?? null

  return {
    key: `imputacion-${entry.id}`,
    imputacionId: entry.id,
    status: entry.anulada ? "DESIMPUTADA" : "ACTIVA",
    fecha: entry.anulada
      ? (entry.fechaDesimputacion ?? entry.desimputadaAt ?? entry.fecha)
      : entry.fecha,
    createdAt: entry.createdAt,
    importe: Number(entry.importe ?? 0),
    tercero: terceroLabel,
    sucursal: sucursalId ? (sucursalById.get(sucursalId) ?? `Sucursal #${sucursalId}`) : "-",
    comprobanteOrigen: buildComprobanteLabel(
      origin,
      entry.tipoComprobanteOrigen,
      entry.numeroOrigen
    ),
    comprobanteDestino: buildComprobanteLabel(
      destination,
      entry.tipoComprobanteDestino,
      entry.numeroDestino
    ),
    rol: entry.rolComprobante === "DESTINO" ? "Historial recibido" : "Historial emitido",
    note: entry.anulada
      ? entry.motivoDesimputacion?.trim() || "La desimputación ya fue registrada en backend."
      : "La imputación sigue activa y todavía puede desimputarse desde el backend actual.",
    permiteDesimputar: !entry.anulada,
  }
}

function matchesTerm(item: DesimputacionRecord, term: string) {
  if (term === "") return true

  return [
    item.status,
    item.tercero,
    item.sucursal,
    item.comprobanteOrigen,
    item.comprobanteDestino,
    item.rol,
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

function statusBadge(status: RecordStatus) {
  if (status === "DESIMPUTADA") {
    return <Badge variant="destructive">Desimputada</Badge>
  }

  return <Badge variant="outline">Activa</Badge>
}

export default function ContabilidadDesimputacionesPage() {
  const sucursalId = useDefaultSucursalId() ?? 1
  const {
    comprobantes,
    loading: loadingComprobantes,
    error: errorComprobantes,
    refetch: refetchComprobantes,
  } = useComprobantes({ sucursalId })
  const {
    terceros: clientes,
    loading: loadingClientes,
    error: errorClientes,
  } = useTerceros({
    sucursalId,
  })
  const {
    terceros: proveedores,
    loading: loadingProveedores,
    error: errorProveedores,
  } = useProveedores()
  const { sucursales } = useSucursales()
  const {
    imputaciones,
    loading: loadingImputaciones,
    error: errorImputaciones,
    desimputar,
    refetch: refetchImputaciones,
  } = useImputacionesHistorial(comprobantes.map((row) => row.id))

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"todos" | "activas" | "desimputadas">("todos")
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<number | null>(null)

  const comprobanteById = useMemo(
    () => new Map(comprobantes.map((comprobante) => [comprobante.id, comprobante])),
    [comprobantes]
  )
  const terceroById = useMemo(() => buildTerceroMap(clientes, proveedores), [clientes, proveedores])
  const sucursalById = useMemo(
    () => new Map(sucursales.map((sucursal) => [sucursal.id, sucursal.descripcion])),
    [sucursales]
  )

  const items = useMemo(
    () =>
      imputaciones
        .map((entry) => buildRecord(entry, comprobanteById, terceroById, sucursalById))
        .sort((left, right) =>
          String(right.fecha || right.createdAt).localeCompare(left.fecha || left.createdAt)
        ),
    [comprobanteById, imputaciones, sucursalById, terceroById]
  )

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim()

    return items.filter(
      (item) =>
        matchesTerm(item, term) &&
        (statusFilter === "todos" ||
          (statusFilter === "activas" && item.status === "ACTIVA") ||
          (statusFilter === "desimputadas" && item.status === "DESIMPUTADA"))
    )
  }, [items, search, statusFilter])

  const selected = filtered.find((item) => item.key === selectedKey) ?? filtered[0] ?? null
  const highlighted =
    filtered.find((item) => item.status === "DESIMPUTADA") ?? filtered[0] ?? items[0] ?? null
  const loading =
    loadingComprobantes || loadingImputaciones || loadingClientes || loadingProveedores
  const error =
    actionError || errorComprobantes || errorImputaciones || errorClientes || errorProveedores

  const kpis = useMemo(
    () => ({
      total: items.length,
      activas: items.filter((item) => item.status === "ACTIVA").length,
      desimputadas: items.filter((item) => item.status === "DESIMPUTADA").length,
      importe: items.reduce((sum, item) => sum + item.importe, 0),
    }),
    [items]
  )

  const comprobantesConSaldo = comprobantes.filter(
    (comprobante) => comprobante.saldo > 0 && comprobante.estado !== "ANULADO"
  ).length

  const handleRefresh = async () => {
    await Promise.all([refetchComprobantes(), refetchImputaciones()])
  }

  const handleDesimputar = async (record: DesimputacionRecord) => {
    setActionError(null)
    setSavingId(record.imputacionId)

    const ok = await desimputar({
      imputacionId: record.imputacionId,
      fecha: new Date().toISOString().slice(0, 10),
      motivo: "Desimputación solicitada desde Contabilidad",
    })

    setSavingId(null)

    if (!ok) {
      setActionError("No se pudo desimputar la aplicación seleccionada.")
      return
    }

    await refetchComprobantes()
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Desimputaciones</h1>
          <p className="mt-1 text-muted-foreground">
            Tablero real del historial de imputaciones sobre comprobantes visibles, con reversa en
            backend cuando la aplicación sigue activa.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="bg-transparent" onClick={() => void handleRefresh()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Actualizar
          </Button>
          <Button asChild variant="outline" className="bg-transparent">
            <Link href="/ventas/imputaciones">Ventas Imputaciones</Link>
          </Button>
          <Button asChild>
            <Link href="/contabilidad/pagos">Pagos</Link>
          </Button>
        </div>
      </div>

      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertDescription>
          Esta vista deja atrás el fixture local y consolida el historial real de imputaciones para
          los comprobantes visibles de la sucursal activa. La reaplicación masiva o la mesa de
          trabajo extendida siguen fuera del contrato backend actual.
        </AlertDescription>
      </Alert>

      {error ? (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Historial visible</p>
            <p className="mt-2 text-2xl font-bold">{kpis.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Aplicaciones activas</p>
            <p className="mt-2 text-2xl font-bold text-amber-600">{kpis.activas}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Desimputadas</p>
            <p className="mt-2 text-2xl font-bold text-destructive">{kpis.desimputadas}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Importe visible</p>
            <p className="mt-2 text-2xl font-bold">{formatMoney(kpis.importe)}</p>
          </CardContent>
        </Card>
      </div>

      {highlighted ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardDescription>
              {highlighted.status === "DESIMPUTADA"
                ? "Última reversa visible"
                : "Aplicación reversible destacada"}
            </CardDescription>
            <CardTitle className="mt-1 text-xl">{highlighted.comprobanteOrigen}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-4">
            <div className="rounded-lg bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Estado</p>
              <p className="text-sm font-medium">{highlighted.status}</p>
            </div>
            <div className="rounded-lg bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Destino</p>
              <p className="text-sm font-medium">{highlighted.comprobanteDestino}</p>
            </div>
            <div className="rounded-lg bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Tercero</p>
              <p className="text-sm font-medium">{highlighted.tercero}</p>
            </div>
            <div className="rounded-lg bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Importe</p>
              <p className="text-sm font-medium">{formatMoney(highlighted.importe)}</p>
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
                placeholder="Buscar por tercero, comprobante, rol o motivo..."
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as "todos" | "activas" | "desimputadas")
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todo el historial</SelectItem>
                <SelectItem value="activas">Aplicaciones activas</SelectItem>
                <SelectItem value="desimputadas">Sólo desimputadas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Unplug className="h-4 w-4" /> Historial de imputaciones
            </CardTitle>
            <CardDescription>
              Aplicaciones visibles del backend y reversas ya ejecutadas sobre comprobantes del lote
              actual de la sucursal.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estado</TableHead>
                  <TableHead>Origen</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tercero</TableHead>
                  <TableHead className="text-right">Importe</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      Cargando historial real de imputaciones...
                    </TableCell>
                  </TableRow>
                ) : filtered.length > 0 ? (
                  filtered.map((item) => (
                    <TableRow key={item.key}>
                      <TableCell>{statusBadge(item.status)}</TableCell>
                      <TableCell className="font-medium">{item.comprobanteOrigen}</TableCell>
                      <TableCell>{item.comprobanteDestino}</TableCell>
                      <TableCell>{formatDate(item.fecha)}</TableCell>
                      <TableCell>{item.tercero}</TableCell>
                      <TableCell className="text-right">{formatMoney(item.importe)}</TableCell>
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
                      No hay imputaciones o desimputaciones reales que coincidan con los filtros.
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
              <CardTitle className="text-base">Detalle del circuito</CardTitle>
              <CardDescription>
                Selecciona una fila para revisar su origen, destino y disponibilidad real de
                reversa.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selected ? (
                <div className="space-y-4">
                  <DetailFieldGrid
                    fields={[
                      { label: "Estado", value: selected.status },
                      { label: "Rol", value: selected.rol },
                      { label: "Fecha operativa", value: formatDate(selected.fecha) },
                      { label: "Alta visible", value: formatDateTime(selected.createdAt) },
                      { label: "Origen", value: selected.comprobanteOrigen },
                      { label: "Destino", value: selected.comprobanteDestino },
                      { label: "Tercero", value: selected.tercero },
                      { label: "Sucursal", value: selected.sucursal },
                      { label: "Importe", value: formatMoney(selected.importe) },
                      {
                        label: "Puede desimputarse",
                        value: selected.permiteDesimputar ? "Sí" : "No, ya fue revertida",
                      },
                    ]}
                  />
                  <div className="rounded-lg bg-muted/40 p-3 text-sm">
                    <p className="text-xs text-muted-foreground">Lectura operativa</p>
                    <p className="mt-1 font-medium">{selected.note}</p>
                  </div>
                  {selected.permiteDesimputar ? (
                    <Button
                      className="w-full"
                      onClick={() => void handleDesimputar(selected)}
                      disabled={savingId === selected.imputacionId}
                    >
                      <GitCompareArrows className="mr-2 h-4 w-4" />
                      {savingId === selected.imputacionId
                        ? "Desimputando..."
                        : "Desimputar en backend"}
                    </Button>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No hay historial visible para la sucursal activa con los filtros actuales.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cobertura backend actual</CardTitle>
              <CardDescription>
                Medidas del lote realmente consultado para dimensionar el alcance de esta pantalla.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Wallet className="h-4 w-4" /> Comprobantes visibles
                </div>
                <p className="mt-2 text-2xl font-bold">{comprobantes.length}</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Wallet className="h-4 w-4" /> Imputaciones visibles
                </div>
                <p className="mt-2 text-2xl font-bold">{items.length}</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Wallet className="h-4 w-4" /> Comprobantes con saldo
                </div>
                <p className="mt-2 text-2xl font-bold">{comprobantesConSaldo}</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3 text-sm">
                <p className="text-xs text-muted-foreground">Límite honesto</p>
                <p className="mt-1 font-medium">
                  La pantalla consolida desimputaciones y aplicaciones del historial publicado para
                  el lote actual de comprobantes. La reaplicación masiva y la mesa documental
                  ampliada siguen remitiendo a módulos especializados.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
