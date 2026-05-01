"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  ArrowRightLeft,
  CalendarClock,
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
import { useToast } from "@/hooks/use-toast"
import { useAsientos } from "@/lib/hooks/useAsientos"
import { useCajas } from "@/lib/hooks/useCajas"
import { useCotizaciones } from "@/lib/hooks/useCotizaciones"
import { useEjercicioVigente } from "@/lib/hooks/useEjercicios"
import { useDefaultSucursalId, useSucursales } from "@/lib/hooks/useSucursales"
import { useTransferenciasCaja } from "@/lib/hooks/useTransferenciasCaja"
import type {
  RegistrarTransferenciaCajaDto,
  TransferenciaCaja,
} from "@/lib/types/transferencias-caja"

type TransferFormState = {
  cajaOrigenId: string
  cajaDestinoId: string
  fecha: string
  importe: string
  monedaId: string
  cotizacion: string
  concepto: string
}

function getTodayDateString() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, "0")
  const day = String(today.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function buildEmptyTransferForm(): TransferFormState {
  return {
    cajaOrigenId: "",
    cajaDestinoId: "",
    fecha: getTodayDateString(),
    importe: "",
    monedaId: "",
    cotizacion: "1",
    concepto: "",
  }
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

function formatDateTime(value?: string | null) {
  if (!value) return "-"
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString("es-AR")
}

function formatMoney(value: number, currencyCode?: string) {
  if (currencyCode && currencyCode.length === 3) {
    return value.toLocaleString("es-AR", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  return value.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function matchesTerm(item: TransferenciaCaja, term: string) {
  if (term === "") {
    return true
  }

  return [
    String(item.id),
    item.origenNombre,
    item.destinoNombre,
    item.concepto,
    String(item.monedaId),
  ]
    .join(" ")
    .toLowerCase()
    .includes(term)
}

function parseRequiredNumber(value: string) {
  return Number(value.replace(",", "."))
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

export default function ContabilidadTransferenciasPage() {
  const sucursalId = useDefaultSucursalId() ?? 1
  const { toast } = useToast()
  const { sucursales } = useSucursales()
  const { ejercicio } = useEjercicioVigente()
  const { cajas, loading: cajasLoading, error: cajasError } = useCajas(sucursalId)
  const { cotizaciones } = useCotizaciones()
  const { asientos } = useAsientos({ ejercicioId: ejercicio?.id, sucursalId })
  const {
    transferencias,
    loading: transferenciasLoading,
    error: transferenciasError,
    registrar,
    refetch,
  } = useTransferenciasCaja({
    cajas,
    enabled: !cajasLoading,
  })
  const [search, setSearch] = useState("")
  const [currencyFilter, setCurrencyFilter] = useState("todos")
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [submittingCreate, setSubmittingCreate] = useState(false)
  const [createForm, setCreateForm] = useState<TransferFormState>(buildEmptyTransferForm)

  const activeCajas = useMemo(() => cajas.filter((caja) => caja.activa), [cajas])

  const latestCurrencyMeta = useMemo(() => {
    const mapped = new Map<
      number,
      { code?: string; label: string; at: number; cotizacion: number }
    >()

    for (const item of cotizaciones) {
      const at = new Date(item.fecha).getTime()
      const current = mapped.get(item.monedaId)

      if (!current || at >= current.at) {
        mapped.set(item.monedaId, {
          code: item.monedaCodigo,
          label: item.monedaCodigo || item.monedaDescripcion || `Moneda ${item.monedaId}`,
          at,
          cotizacion: Number(item.cotizacion ?? 1),
        })
      }
    }

    return mapped
  }, [cotizaciones])

  useEffect(() => {
    if (activeCajas.length === 0) {
      return
    }

    setCreateForm((current) => {
      const currentOriginStillVisible = activeCajas.some(
        (caja) => String(caja.id) === current.cajaOrigenId
      )
      const cajaOrigenId = currentOriginStillVisible
        ? current.cajaOrigenId
        : String(activeCajas[0].id)
      const fallbackDestino = activeCajas.find((caja) => String(caja.id) !== cajaOrigenId)
      const currentDestinoStillVisible = activeCajas.some(
        (caja) => String(caja.id) === current.cajaDestinoId && String(caja.id) !== cajaOrigenId
      )
      const cajaDestinoId = currentDestinoStillVisible
        ? current.cajaDestinoId
        : String(fallbackDestino?.id ?? "")
      const monedaOrigenId = activeCajas.find((caja) => String(caja.id) === cajaOrigenId)?.monedaId
      const monedaId =
        current.monedaId ||
        (monedaOrigenId
          ? String(monedaOrigenId)
          : String(Array.from(latestCurrencyMeta.keys())[0] ?? ""))
      const cotizacionDefault = latestCurrencyMeta.get(Number(monedaId))?.cotizacion ?? 1

      return {
        ...current,
        cajaOrigenId,
        cajaDestinoId,
        monedaId,
        cotizacion: current.cotizacion || String(cotizacionDefault),
      }
    })
  }, [activeCajas, latestCurrencyMeta])

  const handleCajaOrigenChange = (value: string) => {
    setCreateForm((current) => {
      const cajaOrigen = activeCajas.find((caja) => String(caja.id) === value)
      const nextDestino =
        current.cajaDestinoId && current.cajaDestinoId !== value
          ? current.cajaDestinoId
          : String(activeCajas.find((caja) => String(caja.id) !== value)?.id ?? "")
      const nextMonedaId = cajaOrigen?.monedaId ? String(cajaOrigen.monedaId) : current.monedaId
      const nextCotizacion = latestCurrencyMeta.get(Number(nextMonedaId))?.cotizacion ?? 1

      return {
        ...current,
        cajaOrigenId: value,
        cajaDestinoId: nextDestino,
        monedaId: nextMonedaId,
        cotizacion: String(nextCotizacion),
      }
    })
  }

  const handleMonedaChange = (value: string) => {
    setCreateForm((current) => ({
      ...current,
      monedaId: value,
      cotizacion: String(latestCurrencyMeta.get(Number(value))?.cotizacion ?? 1),
    }))
  }

  const handleCreateTransferencia = async () => {
    const cajaOrigenId = Number(createForm.cajaOrigenId)
    const cajaDestinoId = Number(createForm.cajaDestinoId)
    const monedaId = Number(createForm.monedaId)
    const importe = parseRequiredNumber(createForm.importe)
    const cotizacion = parseRequiredNumber(createForm.cotizacion)

    if (!Number.isFinite(cajaOrigenId) || !Number.isFinite(cajaDestinoId)) {
      toast({
        title: "Faltan cajas",
        description: "Selecciona una caja origen y una caja destino visibles en la sucursal.",
        variant: "destructive",
      })
      return
    }

    if (cajaOrigenId === cajaDestinoId) {
      toast({
        title: "Origen y destino inválidos",
        description: "La caja origen y la caja destino no pueden ser la misma.",
        variant: "destructive",
      })
      return
    }

    if (!createForm.fecha) {
      toast({
        title: "Falta la fecha",
        description: "Indica la fecha operativa de la transferencia.",
        variant: "destructive",
      })
      return
    }

    if (!Number.isFinite(monedaId)) {
      toast({
        title: "Falta la moneda",
        description: "Selecciona la moneda con la que se registrará la transferencia.",
        variant: "destructive",
      })
      return
    }

    if (!Number.isFinite(importe) || importe <= 0) {
      toast({
        title: "Importe inválido",
        description: "El importe debe ser un número mayor a cero.",
        variant: "destructive",
      })
      return
    }

    if (!Number.isFinite(cotizacion) || cotizacion <= 0) {
      toast({
        title: "Cotización inválida",
        description: "La cotización debe ser un número mayor a cero.",
        variant: "destructive",
      })
      return
    }

    const payload: RegistrarTransferenciaCajaDto = {
      sucursalId,
      cajaOrigenId,
      cajaDestinoId,
      fecha: createForm.fecha,
      importe,
      monedaId,
      cotizacion,
      concepto: createForm.concepto.trim() || undefined,
    }

    setSubmittingCreate(true)

    try {
      const transferId = await registrar(payload)
      setSelectedId(transferId)
      setSearch("")
      setCurrencyFilter("todos")
      setCreateForm((current) => ({
        ...current,
        fecha: getTodayDateString(),
        importe: "",
        concepto: "",
      }))
      toast({
        title: "Transferencia registrada",
        description: `La transferencia #${transferId} ya figura en el ledger real.`,
      })
    } catch (cause) {
      toast({
        title: "No se pudo registrar la transferencia",
        description: cause instanceof Error ? cause.message : "Error al registrar transferencia.",
        variant: "destructive",
      })
    } finally {
      setSubmittingCreate(false)
    }
  }

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim()

    return transferencias.filter(
      (item) =>
        matchesTerm(item, term) &&
        (currencyFilter === "todos" || item.monedaId === Number(currencyFilter))
    )
  }, [transferencias, search, currencyFilter])

  const selected = filtered.find((item) => item.id === selectedId) ?? null
  const highlighted = filtered[0] ?? null
  const kpis = useMemo(
    () => ({
      total: transferencias.length,
      cajasInvolucradas: new Set(
        transferencias.flatMap((item) => [item.cajaOrigenId, item.cajaDestinoId])
      ).size,
      volumenArs: transferencias.reduce((acc, item) => acc + item.equivalenteArs, 0),
      ultimaFecha: transferencias[0]?.fecha ?? null,
    }),
    [transferencias]
  )
  const activeSucursal = sucursales.find((item) => item.id === sucursalId)

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transferencias</h1>
          <p className="mt-1 text-muted-foreground">
            Vista real de transferencias registradas entre cajas y cuentas bancarias sobre el
            backend actual de Cajas para la sucursal activa.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="bg-transparent" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Actualizar
          </Button>
          <Button asChild variant="outline" className="bg-transparent">
            <Link href="/contabilidad/cajas">Cajas</Link>
          </Button>
          <Button asChild>
            <Link href="/contabilidad/cheques">Cheques</Link>
          </Button>
        </div>
      </div>

      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertDescription>
          La pantalla deja de depender del fixture local y ahora lee el ledger real de
          transferencias expuesto por /api/cajas. El backend todavia no modela clearing bancario,
          acreditacion diferida ni observaciones operativas, por eso esta vista muestra las
          transferencias efectivamente registradas y no un workflow de seguimiento bancario.
        </AlertDescription>
      </Alert>

      {cajasError || transferenciasError ? (
        <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>{transferenciasError || cajasError}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registrar transferencia real</CardTitle>
          <CardDescription>
            Alta directa sobre POST /api/cajas/transferencias para la sucursal activa.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="transferencia-origen">Caja origen</Label>
              <Select value={createForm.cajaOrigenId} onValueChange={handleCajaOrigenChange}>
                <SelectTrigger id="transferencia-origen">
                  <SelectValue placeholder="Selecciona origen" />
                </SelectTrigger>
                <SelectContent>
                  {activeCajas.map((caja) => (
                    <SelectItem key={caja.id} value={String(caja.id)}>
                      {(caja.descripcion?.trim() || caja.nombre?.trim() || `Caja ${caja.id}`) +
                        (caja.monedaId
                          ? ` · ${latestCurrencyMeta.get(caja.monedaId)?.code || `Moneda ${caja.monedaId}`}`
                          : "")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="transferencia-destino">Caja destino</Label>
              <Select
                value={createForm.cajaDestinoId}
                onValueChange={(value) =>
                  setCreateForm((current) => ({ ...current, cajaDestinoId: value }))
                }
              >
                <SelectTrigger id="transferencia-destino">
                  <SelectValue placeholder="Selecciona destino" />
                </SelectTrigger>
                <SelectContent>
                  {activeCajas
                    .filter((caja) => String(caja.id) !== createForm.cajaOrigenId)
                    .map((caja) => (
                      <SelectItem key={caja.id} value={String(caja.id)}>
                        {(caja.descripcion?.trim() || caja.nombre?.trim() || `Caja ${caja.id}`) +
                          (caja.monedaId
                            ? ` · ${latestCurrencyMeta.get(caja.monedaId)?.code || `Moneda ${caja.monedaId}`}`
                            : "")}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="transferencia-fecha">Fecha</Label>
              <Input
                id="transferencia-fecha"
                type="date"
                value={createForm.fecha}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, fecha: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="transferencia-importe">Importe</Label>
              <Input
                id="transferencia-importe"
                inputMode="decimal"
                placeholder="0,00"
                value={createForm.importe}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, importe: event.target.value }))
                }
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_2fr]">
            <div className="space-y-2">
              <Label htmlFor="transferencia-moneda">Moneda</Label>
              <Select value={createForm.monedaId} onValueChange={handleMonedaChange}>
                <SelectTrigger id="transferencia-moneda">
                  <SelectValue placeholder="Selecciona moneda" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from(latestCurrencyMeta.entries()).map(([monedaId, meta]) => (
                    <SelectItem key={monedaId} value={String(monedaId)}>
                      {meta.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="transferencia-cotizacion">Cotización</Label>
              <Input
                id="transferencia-cotizacion"
                inputMode="decimal"
                value={createForm.cotizacion}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, cotizacion: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="transferencia-concepto">Concepto</Label>
              <Input
                id="transferencia-concepto"
                placeholder="Motivo operativo de la transferencia"
                value={createForm.concepto}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, concepto: event.target.value }))
                }
              />
            </div>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-muted-foreground">
              {activeCajas.length >= 2
                ? "El backend validará que ambas cajas existan y estén operables. Si alguna caja está cerrada, la API rechazará el movimiento."
                : "Se necesitan al menos dos cajas activas en la sucursal para registrar una transferencia."}
            </p>
            <Button
              onClick={handleCreateTransferencia}
              disabled={submittingCreate || cajasLoading || activeCajas.length < 2}
            >
              {submittingCreate ? "Registrando..." : "Registrar transferencia"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Transferencias reales</p>
            <p className="mt-2 text-2xl font-bold text-amber-600">{kpis.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Cajas involucradas</p>
            <p className="mt-2 text-2xl font-bold">{kpis.cajasInvolucradas}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Volumen equivalente ARS</p>
            <p className="mt-2 text-2xl font-bold">{formatMoney(kpis.volumenArs, "ARS")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Ultima fecha visible</p>
            <p className="mt-2 text-2xl font-bold">{formatDate(kpis.ultimaFecha)}</p>
          </CardContent>
        </Card>
      </div>

      {highlighted ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardDescription>Ultima transferencia registrada</CardDescription>
            <CardTitle className="mt-1 text-xl">#{highlighted.id}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-4">
            <div className="rounded-lg bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Origen</p>
              <p className="text-sm font-medium">{highlighted.origenNombre}</p>
            </div>
            <div className="rounded-lg bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Destino</p>
              <p className="text-sm font-medium">{highlighted.destinoNombre}</p>
            </div>
            <div className="rounded-lg bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Moneda</p>
              <p className="text-sm font-medium">
                {latestCurrencyMeta.get(highlighted.monedaId)?.label ||
                  `Moneda ${highlighted.monedaId}`}
              </p>
            </div>
            <div className="rounded-lg bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Importe</p>
              <p className="text-sm font-medium">
                {formatMoney(
                  highlighted.importe,
                  latestCurrencyMeta.get(highlighted.monedaId)?.code
                )}
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
                placeholder="Buscar por origen, destino, concepto o ID..."
              />
            </div>
            <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Moneda" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas las monedas</SelectItem>
                {Array.from(latestCurrencyMeta.entries()).map(([monedaId, meta]) => (
                  <SelectItem key={monedaId} value={String(monedaId)}>
                    {meta.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowRightLeft className="h-4 w-4" /> Transferencias reales visibles
            </CardTitle>
            <CardDescription>
              Ledger de movimientos registrados entre cajas y cuentas visibles en la sucursal
              activa.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Origen</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead>Moneda</TableHead>
                  <TableHead className="text-right">Importe</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transferenciasLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      Cargando transferencias reales...
                    </TableCell>
                  </TableRow>
                ) : filtered.length > 0 ? (
                  filtered.map((item) => {
                    const currencyMeta = latestCurrencyMeta.get(item.monedaId)

                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">#{item.id}</TableCell>
                        <TableCell>{formatDate(item.fecha)}</TableCell>
                        <TableCell>{item.origenNombre}</TableCell>
                        <TableCell>{item.destinoNombre}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {currencyMeta?.label || `Moneda ${item.monedaId}`}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatMoney(item.importe, currencyMeta?.code)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedId(item.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No hay transferencias reales registradas para las cajas visibles de la
                      sucursal activa.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cobertura backend actual</CardTitle>
            <CardDescription>
              Referencias vivas para ubicar el alcance real disponible hoy en esta sucursal.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Wallet className="h-4 w-4" /> Cajas visibles
              </div>
              <p className="mt-2 text-2xl font-bold">{cajas.length}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ArrowRightLeft className="h-4 w-4" /> Transferencias reales
              </div>
              <p className="mt-2 text-2xl font-bold">{transferencias.length}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Landmark className="h-4 w-4" /> Asientos visibles
              </div>
              <p className="mt-2 text-2xl font-bold">{asientos.length}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CalendarClock className="h-4 w-4" /> Cotizaciones visibles
              </div>
              <p className="mt-2 text-2xl font-bold">{cotizaciones.length}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3 text-sm">
              <p className="text-xs text-muted-foreground">Lectura operativa</p>
              <p className="mt-1 font-medium">
                {transferencias.length > 0
                  ? "La sucursal ya expone transferencias reales registradas entre cajas/cuentas."
                  : "El endpoint real esta disponible, pero la sucursal activa todavia no tiene transferencias registradas."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {selected ? `Transferencia #${selected.id}` : "Transferencia"}
            </DialogTitle>
            <DialogDescription>
              {selected
                ? `${selected.origenNombre} -> ${selected.destinoNombre} · ${activeSucursal?.nombre ?? `Sucursal ${sucursalId}`}`
                : "Detalle operativo de transferencia"}
            </DialogDescription>
          </DialogHeader>
          {selected ? (
            <div className="grid gap-4 md:grid-cols-[1.3fr_1fr]">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Cabecera operativa</CardTitle>
                </CardHeader>
                <CardContent>
                  <DetailFieldGrid
                    fields={[
                      { label: "Fecha", value: formatDate(selected.fecha) },
                      { label: "Fecha/hora", value: formatDateTime(selected.fecha) },
                      { label: "Origen", value: selected.origenNombre },
                      { label: "Destino", value: selected.destinoNombre },
                      {
                        label: "Moneda",
                        value:
                          latestCurrencyMeta.get(selected.monedaId)?.label ||
                          `Moneda ${selected.monedaId}`,
                      },
                      {
                        label: "Importe",
                        value: formatMoney(
                          selected.importe,
                          latestCurrencyMeta.get(selected.monedaId)?.code
                        ),
                      },
                      {
                        label: "Cotizacion",
                        value: selected.cotizacion.toLocaleString("es-AR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 4,
                        }),
                      },
                      {
                        label: "Equivalente ARS",
                        value: formatMoney(selected.equivalenteArs, "ARS"),
                      },
                      { label: "Caja origen ID", value: String(selected.cajaOrigenId) },
                      { label: "Caja destino ID", value: String(selected.cajaDestinoId) },
                      { label: "Concepto", value: selected.concepto },
                      {
                        label: "Cobertura",
                        value: "Movimiento real registrado entre cajas/cuentas visibles.",
                      },
                    ]}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Alcance real disponible</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">Lo que ya cubre backend</p>
                    <p className="mt-1 text-muted-foreground">
                      Registro real de la transferencia y publicacion del historial por caja.
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">Lo que todavia no publica</p>
                    <p className="mt-1 text-muted-foreground">
                      Clearing bancario, comprobante de destino, acreditacion diferida u
                      observaciones posteriores a la registracion.
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">Sucursal activa</p>
                    <p className="mt-1 text-muted-foreground">
                      {activeSucursal?.nombre ?? `Sucursal ${sucursalId}`}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
