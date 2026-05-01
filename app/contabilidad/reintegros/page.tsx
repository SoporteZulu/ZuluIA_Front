"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Eye, RefreshCw, Search, ShieldCheck, Undo2, Wallet, XCircle } from "lucide-react"

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
import { useToast } from "@/hooks/use-toast"
import { apiGet } from "@/lib/api"
import { useCajas } from "@/lib/hooks/useCajas"
import { useReintegros } from "@/lib/hooks/useReintegros"
import { useDefaultSucursalId } from "@/lib/hooks/useSucursales"
import type { PagedResult } from "@/lib/types/items"
import type { Reintegro } from "@/lib/types/tesoreria"
import type { Tercero } from "@/lib/types/terceros"

type StatusFilter = "todos" | "vigentes" | "anulados"

function formatDate(value?: string | null) {
  if (!value) return "-"

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).toLocaleDateString(
      "es-AR"
    )
  }

  const parsed = new Date(value)
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString("es-AR")
  }

  return value
}

function formatMoney(value: number) {
  return value.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
  })
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

export default function ContabilidadReintegrosPage() {
  const sucursalId = useDefaultSucursalId()
  const { toast } = useToast()
  const { cajas } = useCajas(sucursalId)
  const { reintegros, loading, error, totalCount, anular, refetch } = useReintegros({ sucursalId })

  const [terceros, setTerceros] = useState<Tercero[]>([])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos")
  const [selectedId, setSelectedId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false

    apiGet<PagedResult<Tercero>>("/api/terceros?soloActivos=true&page=1&pageSize=100&search=")
      .then((result) => {
        if (!cancelled) {
          setTerceros(result.items ?? [])
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTerceros([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (reintegros.length === 0) {
      setSelectedId(null)
      return
    }

    setSelectedId((current) =>
      current && reintegros.some((reintegro) => reintegro.id === current)
        ? current
        : reintegros[0].id
    )
  }, [reintegros])

  const cajaMap = useMemo(() => {
    return new Map(
      cajas.map((caja) => [
        caja.id,
        caja.descripcion?.trim() || caja.nombre?.trim() || `Caja ${caja.id}`,
      ])
    )
  }, [cajas])

  const terceroMap = useMemo(() => {
    return new Map(terceros.map((tercero) => [tercero.id, tercero.razonSocial]))
  }, [terceros])

  const resolveCaja = (reintegro: Reintegro) => {
    return (
      cajaMap.get(reintegro.cajaCuentaId) ??
      reintegro.cajaCuentaDescripcion ??
      `Caja ${reintegro.cajaCuentaId}`
    )
  }

  const resolveTercero = (reintegro: Reintegro) => {
    if (reintegro.terceroNombre?.trim()) return reintegro.terceroNombre
    if (reintegro.terceroId)
      return terceroMap.get(reintegro.terceroId) ?? `Tercero ${reintegro.terceroId}`
    return "Sin tercero"
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()

    return reintegros.filter((reintegro) => {
      if (statusFilter === "vigentes" && reintegro.anulado) return false
      if (statusFilter === "anulados" && !reintegro.anulado) return false
      if (!term) return true

      const haystack = [
        String(reintegro.id),
        String(reintegro.valeId ?? reintegro.referenciaId ?? ""),
        resolveCaja(reintegro),
        resolveTercero(reintegro),
        reintegro.observacion ?? "",
      ]
        .join(" ")
        .toLowerCase()

      return haystack.includes(term)
    })
  }, [reintegros, search, statusFilter, cajaMap, terceroMap])

  const selected =
    filtered.find((reintegro) => reintegro.id === selectedId) ??
    reintegros.find((reintegro) => reintegro.id === selectedId) ??
    filtered[0] ??
    reintegros[0] ??
    null

  const kpis = useMemo(
    () => ({
      activos: reintegros.filter((reintegro) => !reintegro.anulado).length,
      anulados: reintegros.filter((reintegro) => reintegro.anulado).length,
      montoTotal: reintegros
        .filter((reintegro) => !reintegro.anulado)
        .reduce((acc, reintegro) => acc + reintegro.importe, 0),
    }),
    [reintegros]
  )

  const handleAnular = async (reintegro: Reintegro) => {
    const confirmed = window.confirm(`Anular el reintegro ${reintegro.id}?`)
    if (!confirmed) return

    const ok = await anular(reintegro.id)
    if (!ok) {
      toast({
        title: "No se pudo anular el reintegro",
        description: "El backend no acepto la anulacion del movimiento.",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Reintegro anulado",
      description: `El movimiento ${reintegro.id} fue marcado como anulado.`,
    })
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reintegros</h1>
          <p className="mt-1 text-muted-foreground">
            Vista real de reintegros publicada por{" "}
            <span className="font-medium">/api/reintegros</span>.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="bg-transparent" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Actualizar
          </Button>
          <Button variant="outline" className="bg-transparent" asChild>
            <Link href="/contabilidad/vales">Ir a vales</Link>
          </Button>
        </div>
      </div>

      <Alert>
        <ShieldCheck className="h-4 w-4" />
        <AlertDescription>
          La pantalla deja de usar rendiciones legacy locales y ahora muestra los reintegros reales
          creados desde tesoreria.
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
                placeholder="Buscar por vale, caja, tercero u observacion..."
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
                <SelectItem value="vigentes">Activos</SelectItem>
                <SelectItem value="anulados">Anulados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Undo2 className="h-4 w-4" /> Reintegros reales
            </CardTitle>
            <CardDescription>
              Movimientos de ingreso vinculados a vales ya rendidos en backend.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Vale</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Caja</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Importe</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((reintegro) => (
                  <TableRow key={reintegro.id}>
                    <TableCell className="font-medium">#{reintegro.id}</TableCell>
                    <TableCell>#{reintegro.valeId ?? reintegro.referenciaId ?? "-"}</TableCell>
                    <TableCell>{formatDate(reintegro.fecha)}</TableCell>
                    <TableCell>{resolveCaja(reintegro)}</TableCell>
                    <TableCell>
                      {reintegro.anulado ? (
                        <Badge variant="destructive">Anulado</Badge>
                      ) : (
                        <Badge>Activo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{formatMoney(reintegro.importe)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedId(reintegro.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={reintegro.anulado}
                          onClick={() => handleAnular(reintegro)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No hay reintegros reales para los filtros actuales.
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
              <CardTitle className="text-base">Detalle del reintegro</CardTitle>
              <CardDescription>
                {selected
                  ? `Movimiento #${selected.id} vinculado al vale #${selected.valeId ?? selected.referenciaId ?? "-"}.`
                  : "Selecciona un reintegro real para ver su detalle."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selected ? (
                <div className="space-y-4">
                  <DetailFieldGrid
                    fields={[
                      {
                        label: "Vale origen",
                        value: `#${selected.valeId ?? selected.referenciaId ?? "-"}`,
                      },
                      { label: "Caja", value: resolveCaja(selected) },
                      { label: "Fecha", value: formatDate(selected.fecha) },
                      { label: "Beneficiario", value: resolveTercero(selected) },
                      { label: "Importe", value: formatMoney(selected.importe) },
                      { label: "Cotizacion", value: selected.cotizacion.toLocaleString("es-AR") },
                      { label: "Tipo", value: selected.tipoOperacion },
                      { label: "Sentido", value: selected.sentido },
                    ]}
                  />

                  <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground">Observacion</p>
                    <p className="mt-1 text-sm font-medium">
                      {selected.observacion || "Sin observaciones"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" className="bg-transparent" asChild>
                      <Link href="/contabilidad/vales">Ver vale relacionado</Link>
                    </Button>
                    <Button
                      variant="outline"
                      className="bg-transparent"
                      disabled={selected.anulado}
                      onClick={() => handleAnular(selected)}
                    >
                      <XCircle className="mr-2 h-4 w-4" /> Anular reintegro
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No hay reintegros reales cargados para esta sucursal.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Wallet className="h-4 w-4" /> Origen del circuito
              </CardTitle>
              <CardDescription>
                Los reintegros se generan desde la pantalla real de vales al rendir un vale
                pendiente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/contabilidad/vales">Ir a vales</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
