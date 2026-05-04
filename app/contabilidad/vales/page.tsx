"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Eye, Plus, RefreshCw, Search, ShieldCheck, Ticket, Undo2, XCircle } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { apiGet } from "@/lib/api"
import { useCajas } from "@/lib/hooks/useCajas"
import { useDefaultSucursalId } from "@/lib/hooks/useSucursales"
import { useTercerosConfig } from "@/lib/hooks/useTerceros"
import { useVales } from "@/lib/hooks/useVales"
import type { PagedResult } from "@/lib/types/items"
import type { Vale } from "@/lib/types/tesoreria"
import type { Tercero } from "@/lib/types/terceros"

type StatusFilter = "todos" | "vigentes" | "reintegrados" | "anulados"

type ValeFormState = {
  cajaCuentaId: string
  fecha: string
  importe: string
  monedaId: string
  cotizacion: string
  terceroId: string
  observacion: string
}

function todayAsInputValue() {
  return new Date().toISOString().slice(0, 10)
}

function buildEmptyValeForm(): ValeFormState {
  return {
    cajaCuentaId: "",
    fecha: todayAsInputValue(),
    importe: "",
    monedaId: "",
    cotizacion: "1",
    terceroId: "__none__",
    observacion: "",
  }
}

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

function formatMoney(value: number, currencyCode = "ARS") {
  try {
    return value.toLocaleString("es-AR", {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 2,
    })
  } catch {
    return value.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
}

function parseRequiredNumber(value: string) {
  return Number(value.replace(",", "."))
}

function parseOptionalNumber(value: string) {
  if (!value || value === "__none__") {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
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

export default function ContabilidadValesPage() {
  const sucursalId = useDefaultSucursalId()
  const { toast } = useToast()
  const { cajas, loading: cajasLoading } = useCajas(sucursalId)
  const { monedas } = useTercerosConfig()
  const { vales, pendientes, loading, error, totalCount, registrar, reintegrar, anular, refetch } =
    useVales({ sucursalId })

  const [terceros, setTerceros] = useState<Tercero[]>([])
  const [tercerosError, setTercerosError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos")
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [reintegroOpen, setReintegroOpen] = useState(false)
  const [submittingCreate, setSubmittingCreate] = useState(false)
  const [submittingReintegro, setSubmittingReintegro] = useState(false)
  const [createForm, setCreateForm] = useState<ValeFormState>(buildEmptyValeForm)
  const [reintegroForm, setReintegroForm] = useState<ValeFormState>(buildEmptyValeForm)

  const activeCajas = useMemo(() => cajas.filter((caja) => caja.activa), [cajas])

  useEffect(() => {
    let cancelled = false

    apiGet<PagedResult<Tercero>>("/api/terceros?soloActivos=true&page=1&pageSize=100&search=")
      .then((result) => {
        if (cancelled) return

        setTerceros(
          (result.items ?? [])
            .slice()
            .sort((left, right) => left.razonSocial.localeCompare(right.razonSocial))
        )
        setTercerosError(null)
      })
      .catch((reason) => {
        if (cancelled) return
        setTerceros([])
        setTercerosError(reason instanceof Error ? reason.message : "Error al cargar terceros")
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (vales.length === 0) {
      setSelectedId(null)
      return
    }

    setSelectedId((current) =>
      current && vales.some((vale) => vale.id === current) ? current : vales[0].id
    )
  }, [vales])

  useEffect(() => {
    if (activeCajas.length === 0) return

    setCreateForm((current) => {
      if (activeCajas.some((caja) => String(caja.id) === current.cajaCuentaId)) {
        return current
      }

      const firstCaja = activeCajas[0]
      return {
        ...current,
        cajaCuentaId: String(firstCaja.id),
        monedaId: firstCaja.monedaId ? String(firstCaja.monedaId) : current.monedaId,
      }
    })
  }, [activeCajas])

  const cajaMap = useMemo(() => {
    return new Map(
      cajas.map((caja) => [
        caja.id,
        caja.descripcion?.trim() || caja.nombre?.trim() || `Caja ${caja.id}`,
      ])
    )
  }, [cajas])

  const monedaMap = useMemo(() => {
    return new Map(monedas.map((moneda) => [moneda.id, moneda.codigo]))
  }, [monedas])

  const terceroMap = useMemo(() => {
    return new Map(terceros.map((tercero) => [tercero.id, tercero.razonSocial]))
  }, [terceros])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()

    return vales.filter((vale) => {
      if (statusFilter === "vigentes" && (vale.anulado || vale.reintegrado)) return false
      if (statusFilter === "reintegrados" && (!vale.reintegrado || vale.anulado)) return false
      if (statusFilter === "anulados" && !vale.anulado) return false

      if (!term) return true

      const haystack = [
        String(vale.id),
        cajaMap.get(vale.cajaCuentaId) ?? vale.cajaCuentaDescripcion ?? "",
        vale.terceroNombre ?? "",
        terceroMap.get(vale.terceroId ?? -1) ?? "",
        vale.observacion ?? "",
        vale.referenciaTipo ?? "",
      ]
        .join(" ")
        .toLowerCase()

      return haystack.includes(term)
    })
  }, [cajaMap, search, statusFilter, terceroMap, vales])

  const selected =
    filtered.find((vale) => vale.id === selectedId) ??
    vales.find((vale) => vale.id === selectedId) ??
    filtered[0] ??
    vales[0] ??
    null

  const kpis = useMemo(
    () => ({
      pendientes: vales.filter((vale) => !vale.anulado && !vale.reintegrado).length,
      reintegrados: vales.filter((vale) => !vale.anulado && vale.reintegrado).length,
      montoPendiente: vales
        .filter((vale) => !vale.anulado && !vale.reintegrado)
        .reduce((acc, vale) => acc + vale.importe, 0),
    }),
    [vales]
  )

  const resolveCaja = (vale: Vale) => {
    return (
      cajaMap.get(vale.cajaCuentaId) ?? vale.cajaCuentaDescripcion ?? `Caja ${vale.cajaCuentaId}`
    )
  }

  const resolveTercero = (vale: Vale) => {
    if (vale.terceroNombre?.trim()) return vale.terceroNombre
    if (vale.terceroId) return terceroMap.get(vale.terceroId) ?? `Tercero ${vale.terceroId}`
    return "Sin tercero"
  }

  const resolveCurrencyCode = (vale: Vale) => {
    return monedaMap.get(vale.monedaId) ?? vale.monedaCodigo ?? "ARS"
  }

  const syncCreateCaja = (nextCajaId: string) => {
    const caja = activeCajas.find((candidate) => String(candidate.id) === nextCajaId)
    setCreateForm((current) => ({
      ...current,
      cajaCuentaId: nextCajaId,
      monedaId: caja?.monedaId ? String(caja.monedaId) : current.monedaId,
    }))
  }

  const openReintegroDialog = (vale: Vale) => {
    setSelectedId(vale.id)
    setReintegroForm({
      cajaCuentaId: String(vale.cajaCuentaId),
      fecha: todayAsInputValue(),
      importe: String(vale.importe),
      monedaId: String(vale.monedaId),
      cotizacion: String(vale.cotizacion || 1),
      terceroId: vale.terceroId ? String(vale.terceroId) : "__none__",
      observacion: vale.observacion ?? "",
    })
    setReintegroOpen(true)
  }

  const handleCreate = async () => {
    if (!sucursalId) return

    const payload = {
      sucursalId,
      cajaCuentaId: parseRequiredNumber(createForm.cajaCuentaId),
      fecha: createForm.fecha,
      importe: parseRequiredNumber(createForm.importe),
      monedaId: parseRequiredNumber(createForm.monedaId),
      cotizacion: parseRequiredNumber(createForm.cotizacion),
      terceroId: parseOptionalNumber(createForm.terceroId),
      observacion: createForm.observacion,
    }

    if (
      !payload.cajaCuentaId ||
      !payload.fecha ||
      !payload.importe ||
      !payload.monedaId ||
      !payload.cotizacion
    ) {
      toast({
        title: "Datos incompletos",
        description: "Caja, fecha, importe, moneda y cotizacion son obligatorios.",
        variant: "destructive",
      })
      return
    }

    setSubmittingCreate(true)
    const ok = await registrar(payload)
    setSubmittingCreate(false)

    if (!ok) {
      toast({
        title: "No se pudo registrar el vale",
        description: "Revisa los datos cargados o el mensaje devuelto por backend.",
        variant: "destructive",
      })
      return
    }

    setCreateOpen(false)
    setCreateForm(buildEmptyValeForm())
    toast({ title: "Vale registrado", description: "El movimiento ya figura en la lista real." })
  }

  const handleReintegrar = async () => {
    if (!selected || !sucursalId) return

    const payload = {
      sucursalId,
      cajaCuentaId: parseRequiredNumber(reintegroForm.cajaCuentaId),
      fecha: reintegroForm.fecha,
      importe: parseRequiredNumber(reintegroForm.importe),
      monedaId: parseRequiredNumber(reintegroForm.monedaId),
      cotizacion: parseRequiredNumber(reintegroForm.cotizacion),
      terceroId: parseOptionalNumber(reintegroForm.terceroId),
      observacion: reintegroForm.observacion,
    }

    if (
      !payload.cajaCuentaId ||
      !payload.fecha ||
      !payload.importe ||
      !payload.monedaId ||
      !payload.cotizacion
    ) {
      toast({
        title: "Datos incompletos",
        description: "Caja, fecha, importe, moneda y cotizacion son obligatorios.",
        variant: "destructive",
      })
      return
    }

    setSubmittingReintegro(true)
    const ok = await reintegrar(selected.id, payload)
    setSubmittingReintegro(false)

    if (!ok) {
      toast({
        title: "No se pudo registrar el reintegro",
        description: "El backend rechazo el movimiento o la caja elegida.",
        variant: "destructive",
      })
      return
    }

    setReintegroOpen(false)
    toast({
      title: "Reintegro registrado",
      description: `El vale ${selected.id} ya quedo rendido.`,
    })
  }

  const handleAnular = async (vale: Vale) => {
    const confirmed = window.confirm(`Anular el vale ${vale.id}?`)
    if (!confirmed) return

    const ok = await anular(vale.id)
    if (!ok) {
      toast({
        title: "No se pudo anular el vale",
        description: "El backend no acepto la anulacion.",
        variant: "destructive",
      })
      return
    }

    toast({ title: "Vale anulado", description: `El vale ${vale.id} fue marcado como anulado.` })
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vales</h1>
          <p className="mt-1 text-muted-foreground">
            Vista real de tesoreria sobre <span className="font-medium">/api/vales</span>, sin
            relleno legacy cuando no existen movimientos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="bg-transparent" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Actualizar
          </Button>
          <Button variant="outline" className="bg-transparent" asChild>
            <Link href="/contabilidad/reintegros">Reintegros</Link>
          </Button>
          <Button onClick={() => setCreateOpen(true)} disabled={!sucursalId || cajasLoading}>
            <Plus className="mr-2 h-4 w-4" /> Nuevo vale
          </Button>
        </div>
      </div>

      <Alert>
        <ShieldCheck className="h-4 w-4" />
        <AlertDescription>
          La pantalla ahora consume el backend real. Si la base devuelve cero registros, se muestra
          estado vacio en lugar de vales simulados del legado.
        </AlertDescription>
      </Alert>

      {error || tercerosError ? (
        <Alert>
          <AlertDescription>{error ?? tercerosError}</AlertDescription>
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
            <p className="text-xs text-muted-foreground">Pendientes</p>
            <p className="mt-2 text-2xl font-bold text-amber-600">{kpis.pendientes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Reintegrados</p>
            <p className="mt-2 text-2xl font-bold text-emerald-600">{kpis.reintegrados}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Saldo pendiente</p>
            <p className="mt-2 text-2xl font-bold">{formatMoney(kpis.montoPendiente)}</p>
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
                placeholder="Buscar por caja, tercero, observacion o referencia..."
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
                <SelectItem value="vigentes">Pendientes</SelectItem>
                <SelectItem value="reintegrados">Reintegrados</SelectItem>
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
              <Ticket className="h-4 w-4" /> Vales reales de tesoreria
            </CardTitle>
            <CardDescription>
              Alta, reintegro y anulacion contra el contrato ya publicado por backend.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Caja</TableHead>
                  <TableHead>Beneficiario</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Importe</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((vale) => (
                  <TableRow key={vale.id}>
                    <TableCell className="font-medium">#{vale.id}</TableCell>
                    <TableCell>{formatDate(vale.fecha)}</TableCell>
                    <TableCell>{resolveCaja(vale)}</TableCell>
                    <TableCell>{resolveTercero(vale)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {vale.anulado ? <Badge variant="destructive">Anulado</Badge> : null}
                        {!vale.anulado && vale.reintegrado ? <Badge>Reintegrado</Badge> : null}
                        {!vale.anulado && !vale.reintegrado ? (
                          <Badge variant="secondary">Pendiente</Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatMoney(vale.importe, resolveCurrencyCode(vale))}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setSelectedId(vale.id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={vale.anulado || vale.reintegrado}
                          onClick={() => openReintegroDialog(vale)}
                        >
                          <Undo2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={vale.anulado}
                          onClick={() => handleAnular(vale)}
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
                      No hay vales reales que coincidan con los filtros actuales.
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
              <CardTitle className="text-base">Detalle del vale</CardTitle>
              <CardDescription>
                {selected
                  ? `Movimiento #${selected.id} sobre la caja ${resolveCaja(selected)}.`
                  : "Selecciona un vale real para ver su detalle."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selected ? (
                <div className="space-y-4">
                  <DetailFieldGrid
                    fields={[
                      { label: "Beneficiario", value: resolveTercero(selected) },
                      { label: "Caja", value: resolveCaja(selected) },
                      { label: "Fecha", value: formatDate(selected.fecha) },
                      {
                        label: "Importe",
                        value: formatMoney(selected.importe, resolveCurrencyCode(selected)),
                      },
                      { label: "Moneda", value: resolveCurrencyCode(selected) },
                      { label: "Cotizacion", value: selected.cotizacion.toLocaleString("es-AR") },
                      { label: "Referencia", value: selected.referenciaTipo ?? "-" },
                      { label: "Creado", value: formatDate(selected.createdAt) },
                    ]}
                  />

                  <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground">Observacion</p>
                    <p className="mt-1 text-sm font-medium">
                      {selected.observacion || "Sin observaciones"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      className="bg-transparent"
                      disabled={selected.anulado || selected.reintegrado}
                      onClick={() => openReintegroDialog(selected)}
                    >
                      <Undo2 className="mr-2 h-4 w-4" /> Registrar reintegro
                    </Button>
                    <Button
                      variant="outline"
                      className="bg-transparent"
                      disabled={selected.anulado}
                      onClick={() => handleAnular(selected)}
                    >
                      <XCircle className="mr-2 h-4 w-4" /> Anular vale
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No hay vales reales cargados para esta sucursal.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pendientes de reintegro</CardTitle>
              <CardDescription>
                Fuente real de <span className="font-medium">/api/vales/pendientes</span>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendientes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No hay vales pendientes de rendicion en backend.
                </p>
              ) : (
                pendientes.map((vale) => (
                  <div key={vale.id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">
                          #{vale.id} · {resolveTercero(vale)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {resolveCaja(vale)} · {formatDate(vale.fecha)}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => openReintegroDialog(vale)}>
                        Reintegrar
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar vale</DialogTitle>
            <DialogDescription>
              Alta minima sobre el contrato real de tesoreria, sin campos ficticios del legado.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Caja</label>
              <Select value={createForm.cajaCuentaId} onValueChange={syncCreateCaja}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar caja" />
                </SelectTrigger>
                <SelectContent>
                  {activeCajas.map((caja) => (
                    <SelectItem key={caja.id} value={String(caja.id)}>
                      {caja.descripcion?.trim() || caja.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Fecha</label>
                <Input
                  type="date"
                  value={createForm.fecha}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, fecha: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Importe</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={createForm.importe}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, importe: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Moneda</label>
                <Select
                  value={createForm.monedaId}
                  onValueChange={(value) =>
                    setCreateForm((current) => ({ ...current, monedaId: value }))
                  }
                >
                  <SelectTrigger>
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
                <label className="text-sm font-medium">Cotizacion</label>
                <Input
                  type="number"
                  min="0"
                  step="0.0001"
                  value={createForm.cotizacion}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, cotizacion: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Beneficiario</label>
              <Select
                value={createForm.terceroId}
                onValueChange={(value) =>
                  setCreateForm((current) => ({ ...current, terceroId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tercero" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin tercero</SelectItem>
                  {terceros.map((tercero) => (
                    <SelectItem key={tercero.id} value={String(tercero.id)}>
                      {tercero.razonSocial}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Observacion</label>
              <Textarea
                rows={4}
                value={createForm.observacion}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, observacion: event.target.value }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="bg-transparent"
              onClick={() => setCreateOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={submittingCreate || !sucursalId}>
              {submittingCreate ? "Registrando..." : "Registrar vale"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reintegroOpen} onOpenChange={setReintegroOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar reintegro</DialogTitle>
            <DialogDescription>
              El reintegro usa el endpoint real asociado al vale seleccionado.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Caja</label>
              <Select
                value={reintegroForm.cajaCuentaId}
                onValueChange={(value) =>
                  setReintegroForm((current) => ({ ...current, cajaCuentaId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar caja" />
                </SelectTrigger>
                <SelectContent>
                  {activeCajas.map((caja) => (
                    <SelectItem key={caja.id} value={String(caja.id)}>
                      {caja.descripcion?.trim() || caja.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Fecha</label>
                <Input
                  type="date"
                  value={reintegroForm.fecha}
                  onChange={(event) =>
                    setReintegroForm((current) => ({ ...current, fecha: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Importe</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={reintegroForm.importe}
                  onChange={(event) =>
                    setReintegroForm((current) => ({ ...current, importe: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Moneda</label>
                <Select
                  value={reintegroForm.monedaId}
                  onValueChange={(value) =>
                    setReintegroForm((current) => ({ ...current, monedaId: value }))
                  }
                >
                  <SelectTrigger>
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
                <label className="text-sm font-medium">Cotizacion</label>
                <Input
                  type="number"
                  min="0"
                  step="0.0001"
                  value={reintegroForm.cotizacion}
                  onChange={(event) =>
                    setReintegroForm((current) => ({ ...current, cotizacion: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Beneficiario</label>
              <Select
                value={reintegroForm.terceroId}
                onValueChange={(value) =>
                  setReintegroForm((current) => ({ ...current, terceroId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tercero" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin tercero</SelectItem>
                  {terceros.map((tercero) => (
                    <SelectItem key={tercero.id} value={String(tercero.id)}>
                      {tercero.razonSocial}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Observacion</label>
              <Textarea
                rows={4}
                value={reintegroForm.observacion}
                onChange={(event) =>
                  setReintegroForm((current) => ({ ...current, observacion: event.target.value }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="bg-transparent"
              onClick={() => setReintegroOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleReintegrar} disabled={submittingReintegro || !selected}>
              {submittingReintegro ? "Registrando..." : "Confirmar reintegro"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
