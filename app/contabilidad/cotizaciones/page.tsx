"use client"

import { useMemo, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { useCotizaciones } from "@/lib/hooks/useCotizaciones"
import { useTercerosConfig } from "@/lib/hooks/useTerceros"
import {
  AlertCircle,
  CalendarClock,
  ClipboardList,
  Coins,
  Plus,
  RefreshCcw,
  Search,
  ShieldCheck,
  TrendingUp,
  Waypoints,
} from "lucide-react"

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleDateString("es-AR") : "-"
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10)
}

function fmtQuote(value: number) {
  return Number(value ?? 0).toLocaleString("es-AR", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  })
}

function getQuoteStatus(fecha: string) {
  const today = todayInputValue()

  if (fecha === today) {
    return {
      label: "Cierre del día",
      detail: "La cotización corresponde a la fecha actual.",
    }
  }

  if (fecha < today) {
    return {
      label: "Histórica",
      detail: "La cotización queda como referencia previa para liquidaciones y cierre.",
    }
  }

  return {
    label: "Futura",
    detail:
      "La cotización tiene fecha posterior al día actual y conviene validar su vigencia operativa.",
  }
}

function getCurrencyCoverage(totalMonedas: number, latestCount: number) {
  if (totalMonedas === 0) return "0/0"
  return `${latestCount}/${totalMonedas}`
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

export default function CotizacionesPage() {
  const { cotizaciones, loading, error, crear, getCotizacionPorFecha, refetch } = useCotizaciones()
  const { monedas, loading: loadingMonedas } = useTercerosConfig()

  const [search, setSearch] = useState("")
  const [monedaFiltro, setMonedaFiltro] = useState("all")
  const [saveError, setSaveError] = useState<string | null>(null)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupResult, setLookupResult] = useState<number | null>(null)
  const [draft, setDraft] = useState({
    monedaId: "",
    fecha: todayInputValue(),
    cotizacion: "",
  })
  const [lookup, setLookup] = useState({
    monedaId: "",
    fecha: todayInputValue(),
  })

  const sortedCotizaciones = useMemo(
    () =>
      [...cotizaciones].sort((a, b) => {
        const dateCompare = b.fecha.localeCompare(a.fecha)
        if (dateCompare !== 0) return dateCompare
        return (b.monedaCodigo ?? "").localeCompare(a.monedaCodigo ?? "")
      }),
    [cotizaciones]
  )

  const filteredCotizaciones = useMemo(() => {
    const term = search.trim().toLowerCase()

    return sortedCotizaciones.filter((cotizacion) => {
      const matchesMoneda = monedaFiltro === "all" || String(cotizacion.monedaId) === monedaFiltro
      const matchesTerm =
        !term ||
        (cotizacion.monedaDescripcion ?? "").toLowerCase().includes(term) ||
        (cotizacion.monedaCodigo ?? "").toLowerCase().includes(term) ||
        cotizacion.fecha.includes(term)

      return matchesMoneda && matchesTerm
    })
  }, [monedaFiltro, search, sortedCotizaciones])

  const latestByCurrency = useMemo(() => {
    const latest = new Map<number, (typeof cotizaciones)[number]>()

    for (const cotizacion of sortedCotizaciones) {
      if (!latest.has(cotizacion.monedaId)) {
        latest.set(cotizacion.monedaId, cotizacion)
      }
    }

    return Array.from(latest.values())
  }, [sortedCotizaciones])

  const latestRecord = sortedCotizaciones[0] ?? null
  const selectedCurrencyName =
    monedas.find((moneda) => String(moneda.id) === monedaFiltro)?.descripcion ?? "Todas"
  const totalMonedas = monedas.length
  const cotizacionesHoy = sortedCotizaciones.filter(
    (cotizacion) => cotizacion.fecha === todayInputValue()
  ).length
  const selectedCurrencyHistory =
    monedaFiltro === "all"
      ? []
      : sortedCotizaciones.filter((cotizacion) => String(cotizacion.monedaId) === monedaFiltro)
  const selectedLatest = selectedCurrencyHistory[0] ?? null
  const selectedPrevious = selectedCurrencyHistory[1] ?? null
  const selectedVariation =
    selectedLatest && selectedPrevious
      ? selectedLatest.cotizacion - selectedPrevious.cotizacion
      : null

  const handleSave = async () => {
    setSaveError(null)

    const monedaId = Number(draft.monedaId)
    const cotizacion = Number(draft.cotizacion)

    if (!monedaId || !draft.fecha || cotizacion <= 0) {
      setSaveError("Completá moneda, fecha y una cotización mayor a cero.")
      return
    }

    setSaving(true)
    const ok = await crear({ monedaId, fecha: draft.fecha, cotizacion })
    setSaving(false)

    if (!ok) {
      setSaveError("No se pudo registrar la cotización en backend.")
      return
    }

    setDraft({ monedaId: draft.monedaId, fecha: todayInputValue(), cotizacion: "" })
  }

  const handleLookup = async () => {
    setLookupError(null)
    setLookupResult(null)

    const monedaId = Number(lookup.monedaId)
    if (!monedaId || !lookup.fecha) {
      setLookupError("Seleccioná moneda y fecha para consultar la vigencia.")
      return
    }

    setLookupLoading(true)
    const value = await getCotizacionPorFecha(monedaId, lookup.fecha)
    setLookupLoading(false)
    setLookupResult(value)
  }

  const clearFilters = () => {
    setSearch("")
    setMonedaFiltro("all")
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cotizaciones</h1>
          <p className="text-muted-foreground">
            Mesa de cambios contable para registrar valores, consultar vigencias históricas y seguir
            el último cierre informado por moneda.
          </p>
        </div>
        <Button variant="outline" onClick={refetch} disabled={loading}>
          <RefreshCcw className="h-4 w-4" />
          Actualizar
        </Button>
      </div>

      {(error || saveError || lookupError) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{saveError || lookupError || error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Registros históricos"
          value={String(cotizaciones.length)}
          description="Cotizaciones recuperadas desde backend para todas las monedas."
        />
        <SummaryCard
          title="Monedas con cierre"
          value={String(latestByCurrency.length)}
          description="Cada moneda muestra su última cotización disponible."
        />
        <SummaryCard
          title="Última actualización"
          value={latestRecord ? formatDate(latestRecord.fecha) : "Sin datos"}
          description={
            latestRecord
              ? `${latestRecord.monedaCodigo ?? "MON"} ${fmtQuote(latestRecord.cotizacion)}.`
              : "Todavía no hay cierres registrados."
          }
        />
        <SummaryCard
          title="Filtro activo"
          value={selectedCurrencyName}
          description={
            monedaFiltro === "all"
              ? "Vista consolidada de todas las monedas configuradas."
              : "El historial se reduce a la moneda seleccionada."
          }
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4" /> Cobertura por moneda
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {getCurrencyCoverage(totalMonedas, latestByCurrency.length)} monedas configuradas tienen
            al menos un cierre visible en backend.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4" /> Cierres del día
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {cotizacionesHoy} cotizaciones corresponden a la fecha actual y sirven como referencia
            operativa inmediata.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Waypoints className="h-4 w-4" /> Alcance de fase actual
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            La pantalla cubre alta manual, consulta histórica y lectura de último cierre. Quedan
            afuera fuentes automáticas, arbitrajes y reglas por mercado.
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Registrar cotización</CardTitle>
            </div>
            <CardDescription>
              Alta manual soportada por backend para actualizar el valor de una moneda en una fecha
              determinada.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="draft-moneda">Moneda</Label>
                <Select
                  value={draft.monedaId}
                  onValueChange={(value) =>
                    setDraft((current) => ({ ...current, monedaId: value }))
                  }
                >
                  <SelectTrigger id="draft-moneda" className="w-full">
                    <SelectValue placeholder="Seleccionar moneda" />
                  </SelectTrigger>
                  <SelectContent>
                    {monedas.map((moneda) => (
                      <SelectItem key={moneda.id} value={String(moneda.id)}>
                        {moneda.codigo} · {moneda.descripcion}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="draft-fecha">Fecha</Label>
                <Input
                  id="draft-fecha"
                  type="date"
                  value={draft.fecha}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, fecha: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="draft-cotizacion">Cotización</Label>
                <Input
                  id="draft-cotizacion"
                  type="number"
                  min="0"
                  step="0.0001"
                  placeholder="0.0000"
                  value={draft.cotizacion}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, cotizacion: event.target.value }))
                  }
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">
                {loadingMonedas
                  ? "Cargando catálogo de monedas..."
                  : "Usá el mismo catálogo de monedas configurado para terceros y documentos."}
              </p>
              <Button onClick={handleSave} disabled={saving || loadingMonedas}>
                <Plus className="h-4 w-4" />
                {saving ? "Guardando..." : "Registrar cotización"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Consultar vigencia</CardTitle>
            </div>
            <CardDescription>
              Obtiene la cotización aplicable para una moneda en una fecha puntual usando el
              endpoint de consulta histórica.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lookup-moneda">Moneda</Label>
              <Select
                value={lookup.monedaId}
                onValueChange={(value) => setLookup((current) => ({ ...current, monedaId: value }))}
              >
                <SelectTrigger id="lookup-moneda" className="w-full">
                  <SelectValue placeholder="Seleccionar moneda" />
                </SelectTrigger>
                <SelectContent>
                  {monedas.map((moneda) => (
                    <SelectItem key={moneda.id} value={String(moneda.id)}>
                      {moneda.codigo} · {moneda.descripcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lookup-fecha">Fecha</Label>
              <Input
                id="lookup-fecha"
                type="date"
                value={lookup.fecha}
                onChange={(event) =>
                  setLookup((current) => ({ ...current, fecha: event.target.value }))
                }
              />
            </div>
            <Button
              className="w-full"
              variant="outline"
              onClick={handleLookup}
              disabled={lookupLoading}
            >
              <Search className="h-4 w-4" />
              {lookupLoading ? "Consultando..." : "Consultar cotización vigente"}
            </Button>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Resultado</p>
              <p className="mt-2 text-2xl font-semibold">
                {lookupResult === null ? "Sin consulta" : fmtQuote(lookupResult)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Si no existe un valor histórico específico, el backend devuelve la referencia por
                defecto que tenga disponible.
              </p>
              {lookupResult !== null && (
                <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Consulta resuelta para {lookup.fecha}.</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Historial operativo</CardTitle>
            <CardDescription>
              Filtrá por moneda o texto para revisar el detalle cronológico informado por backend.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_240px_auto]">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Buscar por código, moneda o fecha..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <Select value={monedaFiltro} onValueChange={setMonedaFiltro}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todas las monedas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las monedas</SelectItem>
                  {monedas.map((moneda) => (
                    <SelectItem key={moneda.id} value={String(moneda.id)}>
                      {moneda.codigo} · {moneda.descripcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={clearFilters}>
                Limpiar
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Moneda</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Circuito</TableHead>
                  <TableHead className="text-right">Cotización</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      Cargando historial de cotizaciones...
                    </TableCell>
                  </TableRow>
                )}
                {!loading && filteredCotizaciones.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      No hay cotizaciones para los filtros elegidos.
                    </TableCell>
                  </TableRow>
                )}
                {filteredCotizaciones.map((cotizacion) => {
                  const status = getQuoteStatus(cotizacion.fecha)

                  return (
                    <TableRow key={cotizacion.id}>
                      <TableCell>{formatDate(cotizacion.fecha)}</TableCell>
                      <TableCell className="font-medium">
                        {cotizacion.monedaDescripcion ?? "Moneda sin descripción"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{cotizacion.monedaCodigo ?? "MON"}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm font-medium">{status.label}</div>
                          <p className="text-xs text-muted-foreground">{status.detail}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {fmtQuote(cotizacion.cotizacion)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Último cierre por moneda</CardTitle>
            </div>
            <CardDescription>
              Resumen compacto para validar qué monedas tienen valor actualizado en la vista actual.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedLatest && (
              <div className="rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Lectura de la moneda filtrada</p>
                <p>
                  Último cierre: {selectedLatest.monedaCodigo ?? "MON"}{" "}
                  {fmtQuote(selectedLatest.cotizacion)} el {formatDate(selectedLatest.fecha)}.
                  {selectedVariation !== null
                    ? ` Variación contra el cierre previo: ${selectedVariation >= 0 ? "+" : ""}${fmtQuote(selectedVariation)}.`
                    : " No hay un cierre previo visible para comparar."}
                </p>
              </div>
            )}
            {latestByCurrency.length === 0 && !loading && (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No hay cierres disponibles todavía.
              </div>
            )}
            {latestByCurrency.map((cotizacion) => {
              const status = getQuoteStatus(cotizacion.fecha)

              return (
                <div key={cotizacion.monedaId} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        {cotizacion.monedaDescripcion ?? "Moneda sin descripción"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {cotizacion.monedaCodigo ?? "MON"} · {formatDate(cotizacion.fecha)}
                      </p>
                      <p className="text-xs text-muted-foreground">{status.label}</p>
                    </div>
                    <Coins className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="mt-3 font-mono text-lg font-semibold">
                    {fmtQuote(cotizacion.cotizacion)}
                  </p>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
