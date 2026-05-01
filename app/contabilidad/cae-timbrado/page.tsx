"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { BadgeAlert, Eye, FileText, Receipt, RefreshCw, Search, ShieldCheck } from "lucide-react"

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
import { usePeriodosIva } from "@/lib/hooks/usePeriodosIva"
import { useDefaultSucursalId } from "@/lib/hooks/useSucursales"
import { useTimbrados } from "@/lib/hooks/useTimbrados"
import type { Comprobante } from "@/lib/types/comprobantes"
import type { Timbrado } from "@/lib/types/timbrado"

type DocumentFilter = "todos" | "con-cae" | "sin-cae" | "anulados" | "borradores"

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

function daysUntil(value?: string | null) {
  if (!value) return null

  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return null

  return Math.ceil((parsed.getTime() - Date.now()) / 86400000)
}

function getDocumentFilterValue(document: Comprobante): DocumentFilter {
  const status = (document.estado ?? "").trim().toUpperCase()

  if (status === "ANULADO") return "anulados"
  if (status === "BORRADOR") return "borradores"
  if (document.cae) return "con-cae"
  return "sin-cae"
}

function getFiscalStatus(document: Comprobante) {
  const status = (document.estado ?? "").trim().toUpperCase()

  if (status === "ANULADO") return "Circuito fiscal cerrado por anulación"
  if (document.cae) {
    return document.caeFechaVto
      ? `CAE vigente hasta ${formatDate(document.caeFechaVto)}`
      : "CAE asignado"
  }
  if (status === "BORRADOR") return "Pendiente de emisión fiscal"
  return "CAE pendiente"
}

function getFiscalBadge(document: Comprobante) {
  const status = (document.estado ?? "").trim().toUpperCase()

  if (status === "ANULADO") {
    return <Badge variant="destructive">Anulado</Badge>
  }
  if (status === "BORRADOR") {
    return <Badge variant="secondary">Borrador</Badge>
  }
  if (document.cae) {
    return <Badge>Con CAE</Badge>
  }
  return <Badge variant="outline">CAE pendiente</Badge>
}

function getTimbradoBadge(timbrado: Timbrado) {
  return timbrado.activo ? <Badge>Activo</Badge> : <Badge variant="outline">Inactivo</Badge>
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

export default function ContabilidadCaeTimbradoPage() {
  const sucursalId = useDefaultSucursalId()
  const { periodos } = usePeriodosIva(sucursalId)
  const {
    timbrados,
    loading: timbradosLoading,
    error: timbradosError,
    refetch: refetchTimbrados,
  } = useTimbrados({ sucursalId })
  const {
    comprobantes,
    loading: comprobantesLoading,
    error: comprobantesError,
    totalCount,
    refetch: refetchComprobantes,
  } = useComprobantes({ sucursalId })

  const [search, setSearch] = useState("")
  const [documentFilter, setDocumentFilter] = useState<DocumentFilter>("todos")
  const [selectedTimbradoId, setSelectedTimbradoId] = useState<number | null>(null)
  const [selectedComprobanteId, setSelectedComprobanteId] = useState<number | null>(null)

  useEffect(() => {
    if (timbrados.length === 0) {
      setSelectedTimbradoId(null)
      return
    }

    setSelectedTimbradoId((current) =>
      current && timbrados.some((timbrado) => timbrado.id === current) ? current : timbrados[0].id
    )
  }, [timbrados])

  useEffect(() => {
    if (comprobantes.length === 0) {
      setSelectedComprobanteId(null)
      return
    }

    setSelectedComprobanteId((current) =>
      current && comprobantes.some((document) => document.id === current)
        ? current
        : comprobantes[0].id
    )
  }, [comprobantes])

  const filteredTimbrados = useMemo(() => {
    const term = search.trim().toLowerCase()

    return timbrados.filter((timbrado) => {
      if (!term) return true

      return [
        timbrado.nroTimbrado,
        String(timbrado.id),
        String(timbrado.puntoFacturacionId),
        timbrado.observacion ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    })
  }, [search, timbrados])

  const filteredComprobantes = useMemo(() => {
    const term = search.trim().toLowerCase()

    return comprobantes.filter((document) => {
      if (documentFilter !== "todos" && getDocumentFilterValue(document) !== documentFilter) {
        return false
      }

      if (!term) return true

      return [
        String(document.id),
        document.nroComprobante ?? "",
        document.tipoComprobanteDescripcion ?? "",
        document.terceroRazonSocial ?? "",
        document.cae ?? "",
        document.estado ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    })
  }, [comprobantes, documentFilter, search])

  const selectedTimbrado =
    filteredTimbrados.find((timbrado) => timbrado.id === selectedTimbradoId) ??
    timbrados.find((timbrado) => timbrado.id === selectedTimbradoId) ??
    filteredTimbrados[0] ??
    timbrados[0] ??
    null

  const selectedComprobante =
    filteredComprobantes.find((document) => document.id === selectedComprobanteId) ??
    comprobantes.find((document) => document.id === selectedComprobanteId) ??
    filteredComprobantes[0] ??
    comprobantes[0] ??
    null

  const kpis = useMemo(() => {
    const nextTimbradoExpiry = timbrados
      .filter((timbrado) => timbrado.activo)
      .map((timbrado) => daysUntil(timbrado.fechaFin))
      .filter((value): value is number => value !== null)
      .sort((a, b) => a - b)[0]

    return {
      activeTimbrados: timbrados.filter((timbrado) => timbrado.activo).length,
      activeTimbradosInSucursal: timbrados.filter((timbrado) => timbrado.activo).length,
      withCae: comprobantes.filter((document) => Boolean(document.cae)).length,
      withoutCae: comprobantes.filter((document) => getDocumentFilterValue(document) === "sin-cae")
        .length,
      nextTimbradoExpiry: nextTimbradoExpiry ?? null,
    }
  }, [comprobantes, timbrados])

  const combinedError = timbradosError ?? comprobantesError

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">CAE y timbrado</h1>
          <p className="mt-1 text-muted-foreground">
            Vista real fiscal basada en timbrados de punto de venta y en el estado de los
            comprobantes reales de la sucursal activa.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="bg-transparent"
            onClick={() => {
              void refetchTimbrados()
              void refetchComprobantes()
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Actualizar
          </Button>
          <Button asChild variant="outline" className="bg-transparent">
            <Link href="/ventas/facturas">Facturas</Link>
          </Button>
          <Button asChild>
            <Link href="/contabilidad/reportes">Reportes</Link>
          </Button>
        </div>
      </div>

      <Alert>
        <ShieldCheck className="h-4 w-4" />
        <AlertDescription>
          La pantalla deja de depender de timbrados simulados y ahora muestra los timbrados reales
          del circuito de punto de venta junto con la cobertura fiscal efectiva de los comprobantes
          emitidos.
        </AlertDescription>
      </Alert>

      {combinedError ? (
        <Alert>
          <AlertDescription>{combinedError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Timbrados activos</p>
            <p className="mt-2 text-2xl font-bold">{kpis.activeTimbrados}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Comprobantes con CAE</p>
            <p className="mt-2 text-2xl font-bold text-emerald-600">{kpis.withCae}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">CAE pendiente</p>
            <p className="mt-2 text-2xl font-bold text-amber-600">{kpis.withoutCae}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Próximo vencimiento</p>
            <p className="mt-2 text-2xl font-bold">
              {kpis.nextTimbradoExpiry !== null ? `${kpis.nextTimbradoExpiry} d` : "Sin dato"}
            </p>
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
                placeholder="Buscar por timbrado, comprobante, tercero o tipo..."
              />
            </div>
            <Select
              value={documentFilter}
              onValueChange={(value) => setDocumentFilter(value as DocumentFilter)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Estado fiscal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los comprobantes</SelectItem>
                <SelectItem value="con-cae">Con CAE</SelectItem>
                <SelectItem value="sin-cae">CAE pendiente</SelectItem>
                <SelectItem value="borradores">Borradores</SelectItem>
                <SelectItem value="anulados">Anulados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BadgeAlert className="h-4 w-4" /> Timbrados reales visibles
              </CardTitle>
              <CardDescription>
                Timbrados reales del circuito de punto de venta para la sucursal activa.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timbrado</TableHead>
                    <TableHead>Sucursal</TableHead>
                    <TableHead>Punto venta</TableHead>
                    <TableHead>Observación</TableHead>
                    <TableHead>Vigencia</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTimbrados.map((timbrado) => (
                    <TableRow key={timbrado.id}>
                      <TableCell className="font-medium">{timbrado.nroTimbrado}</TableCell>
                      <TableCell>{timbrado.sucursalId}</TableCell>
                      <TableCell>{timbrado.puntoFacturacionId}</TableCell>
                      <TableCell>{timbrado.observacion || "Sin observación"}</TableCell>
                      <TableCell>
                        {formatDate(timbrado.fechaInicio)} al {formatDate(timbrado.fechaFin)}
                      </TableCell>
                      <TableCell>{getTimbradoBadge(timbrado)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedTimbradoId(timbrado.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!timbradosLoading && filteredTimbrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                        No hay timbrados reales publicados para la sucursal activa.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Receipt className="h-4 w-4" /> Cobertura fiscal de comprobantes
              </CardTitle>
              <CardDescription>
                Estado fiscal real sobre comprobantes emitidos y registrados por backend.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Comprobante</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tercero</TableHead>
                    <TableHead>Estado fiscal</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredComprobantes.map((document) => (
                    <TableRow key={document.id}>
                      <TableCell className="font-medium">
                        {document.nroComprobante ?? `#${document.id}`}
                      </TableCell>
                      <TableCell>{formatDate(document.fecha)}</TableCell>
                      <TableCell>
                        {document.terceroRazonSocial ?? `Tercero ${document.terceroId}`}
                      </TableCell>
                      <TableCell>{getFiscalBadge(document)}</TableCell>
                      <TableCell className="text-right">
                        {formatMoney(document.total, document.monedaSimbolo ?? "$")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedComprobanteId(document.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!comprobantesLoading && filteredComprobantes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                        No hay comprobantes que coincidan con los filtros actuales.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detalle del timbrado</CardTitle>
              <CardDescription>
                {selectedTimbrado
                  ? `Timbrado ${selectedTimbrado.nroTimbrado} para la sucursal ${selectedTimbrado.sucursalId} y el punto ${selectedTimbrado.puntoFacturacionId}.`
                  : "Selecciona un timbrado real para ver su detalle."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedTimbrado ? (
                <div className="space-y-4">
                  <DetailFieldGrid
                    fields={[
                      { label: "Timbrado", value: selectedTimbrado.nroTimbrado },
                      { label: "Sucursal", value: String(selectedTimbrado.sucursalId) },
                      {
                        label: "Punto facturación",
                        value: String(selectedTimbrado.puntoFacturacionId),
                      },
                      {
                        label: "Observación",
                        value: selectedTimbrado.observacion || "Sin observación",
                      },
                      { label: "Inicio", value: formatDate(selectedTimbrado.fechaInicio) },
                      { label: "Fin", value: formatDate(selectedTimbrado.fechaFin) },
                      {
                        label: "Creado",
                        value: formatDateTime(selectedTimbrado.createdAt),
                      },
                      {
                        label: "Estado",
                        value: selectedTimbrado.activo ? "Activo" : "Inactivo",
                      },
                    ]}
                  />
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground">Vigencia restante</p>
                    <p className="mt-1 text-sm font-medium">
                      {daysUntil(selectedTimbrado.fechaFin) !== null
                        ? `${daysUntil(selectedTimbrado.fechaFin)} día(s)`
                        : "Sin dato"}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No hay timbrados reales publicados para la sucursal activa.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" /> Detalle fiscal del comprobante
              </CardTitle>
              <CardDescription>
                {selectedComprobante
                  ? `${selectedComprobante.tipoComprobanteDescripcion ?? "Comprobante"} ${selectedComprobante.nroComprobante ?? `#${selectedComprobante.id}`}.`
                  : "Selecciona un comprobante para revisar su estado fiscal real."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedComprobante ? (
                <div className="space-y-4">
                  <DetailFieldGrid
                    fields={[
                      {
                        label: "Comprobante",
                        value: selectedComprobante.nroComprobante ?? `#${selectedComprobante.id}`,
                      },
                      {
                        label: "Tipo",
                        value: selectedComprobante.tipoComprobanteDescripcion ?? "Sin tipo",
                      },
                      { label: "Fecha", value: formatDate(selectedComprobante.fecha) },
                      { label: "Estado", value: selectedComprobante.estado },
                      {
                        label: "Estado fiscal",
                        value: getFiscalStatus(selectedComprobante),
                      },
                      {
                        label: "CAE",
                        value: selectedComprobante.cae || "Sin CAE",
                      },
                      {
                        label: "Vto. CAE",
                        value: formatDate(selectedComprobante.caeFechaVto),
                      },
                      {
                        label: "Total",
                        value: formatMoney(
                          selectedComprobante.total,
                          selectedComprobante.monedaSimbolo ?? "$"
                        ),
                      },
                      {
                        label: "Tercero",
                        value:
                          selectedComprobante.terceroRazonSocial ??
                          `Tercero ${selectedComprobante.terceroId}`,
                      },
                      {
                        label: "Creado",
                        value: formatDateTime(selectedComprobante.createdAt),
                      },
                    ]}
                  />
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground">Observación</p>
                    <p className="mt-1 text-sm font-medium">
                      {selectedComprobante.observacion || "Sin observaciones"}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No hay comprobantes reales visibles para esta sucursal.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contexto fiscal real</CardTitle>
              <CardDescription>
                Resumen operativo del backend para dimensionar cobertura fiscal actual.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-sm font-medium">Períodos IVA visibles</p>
                <p className="mt-2 text-2xl font-bold">{periodos.length}</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-sm font-medium">Timbrados en sucursal activa</p>
                <p className="mt-2 text-2xl font-bold">{kpis.activeTimbradosInSucursal}</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-sm font-medium">Comprobantes relevados</p>
                <p className="mt-2 text-2xl font-bold">{totalCount}</p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Lectura operativa</p>
                <p className="mt-1 text-sm font-medium">
                  {kpis.withCae > 0
                    ? `${kpis.withCae} comprobante(s) ya exponen CAE desde backend.`
                    : "Todavía no hay comprobantes con CAE asignado en los datos reales actuales."}
                </p>
              </div>
              <Button asChild className="w-full">
                <Link href="/ventas/facturas">Ir a facturas</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
