"use client"

import { Suspense, useMemo, useState } from "react"

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
import { Textarea } from "@/components/ui/textarea"
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Ban,
  CalendarClock,
  ClipboardList,
  Eye,
  Landmark,
  Plus,
  RefreshCcw,
  ScrollText,
  Search,
  Wallet,
  X,
} from "lucide-react"

import { useConfiguracion } from "@/lib/hooks/useConfiguracion"
import { useCobros } from "@/lib/hooks/useCobros"
import { useCajas } from "@/lib/hooks/useCajas"
import { usePagos } from "@/lib/hooks/usePagos"
import { useDefaultSucursalId } from "@/lib/hooks/useSucursales"
import { useProveedores, useTerceros, useTercerosConfig } from "@/lib/hooks/useTerceros"
import type { CobroDetalle, RegistrarCobroDto } from "@/lib/types/cobros"
import type { Caja } from "@/lib/types/cajas"
import type { FormaPago, Moneda } from "@/lib/types/configuracion"
import type { PagoDetalle, RegistrarPagoDto } from "@/lib/types/pagos"
import type { Tercero } from "@/lib/types/terceros"
import Loading from "./loading"

function fmtARS(value: number) {
  return Number(value ?? 0).toLocaleString("es-AR", { minimumFractionDigits: 2 })
}

function formatCurrencyBreakdown(
  movements: Array<{ total: number; monedaSimbolo?: string | null }>
) {
  const totalsBySymbol = new Map<string, number>()

  movements.forEach((movement) => {
    const symbol = movement.monedaSimbolo?.trim() || "$"
    totalsBySymbol.set(symbol, (totalsBySymbol.get(symbol) ?? 0) + Number(movement.total ?? 0))
  })

  const orderedTotals = [...totalsBySymbol.entries()].sort(([left], [right]) => {
    if (left === right) return 0
    if (left === "$") return -1
    if (right === "$") return 1
    return left.localeCompare(right)
  })

  return orderedTotals.length > 0
    ? orderedTotals.map(([symbol, total]) => `${symbol}${fmtARS(total)}`).join(" + ")
    : "$0,00"
}

function formatDate(value?: string) {
  if (!value) return "-"
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch
    return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString("es-AR")
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("es-AR")
}

function formatDateTime(value?: string) {
  return value
    ? new Date(value).toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-"
}

function getMovementStatus(kind: MovimientoKind, estado: string) {
  if (estado === "ANULADO") {
    return {
      label: "Fuera de circuito",
      detail:
        kind === "pago"
          ? "El egreso fue anulado y no debe computarse como cancelación operativa."
          : "El ingreso fue anulado y quedó fuera del circuito de cobranza.",
    }
  }

  if (estado === "PENDIENTE") {
    return {
      label: "Pendiente",
      detail:
        kind === "pago"
          ? "El pago todavía no consolidó su cierre operativo."
          : "El cobro aún no consolidó el ingreso definitivo.",
    }
  }

  return {
    label: kind === "pago" ? "Pago registrado" : "Cobro registrado",
    detail:
      kind === "pago"
        ? "El movimiento quedó asentado como egreso sobre backend real."
        : "El movimiento quedó asentado como ingreso sobre backend real.",
  }
}

function formatAddress(tercero?: Tercero | null) {
  if (!tercero) return "Sin domicilio visible"

  const parts = [
    [tercero.calle, tercero.nro].filter(Boolean).join(" "),
    tercero.piso ? `Piso ${tercero.piso}` : null,
    tercero.dpto ? `Dto ${tercero.dpto}` : null,
    tercero.localidadDescripcion,
    tercero.codigoPostal,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(" · ") : "Sin domicilio visible"
}

function DetailFieldGrid({ fields }: { fields: Array<{ label: string; value: string }> }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {fields.map((field) => (
        <div key={field.label} className="rounded-lg bg-muted/40 p-3">
          <Label>{field.label}</Label>
          <p className="text-sm font-medium">{field.value}</p>
        </div>
      ))}
    </div>
  )
}

function getEstadoBadge(estado: string) {
  switch (estado?.toUpperCase()) {
    case "REGISTRADO":
      return <Badge variant="default">Registrado</Badge>
    case "ANULADO":
      return <Badge variant="destructive">Anulado</Badge>
    case "PENDIENTE":
      return <Badge variant="secondary">Pendiente</Badge>
    default:
      return <Badge variant="outline">{estado}</Badge>
  }
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

type DetailState =
  | { kind: "pago"; data: PagoDetalle }
  | { kind: "cobro"; data: CobroDetalle }
  | null

type MovimientoKind = "pago" | "cobro"

type TerceroOption = {
  id: number
  label: string
}

type MedioDraft = {
  id: string
  formaPagoId: string
  cajaId: string
  importe: string
  monedaId: string
  cotizacion: string
  chequeId: string
}

type MovimientoFormState = {
  terceroId: string
  fecha: string
  monedaId: string
  cotizacion: string
  observacion: string
}

function getDefaultMonedaId(monedas: Moneda[]) {
  return monedas[0] ? String(monedas[0].id) : ""
}

function resolveCajaMonedaId(cajas: Caja[], cajaId?: string, fallbackMonedaId = "") {
  if (!cajaId) {
    return fallbackMonedaId
  }

  const caja = cajas.find((item) => String(item.id) === cajaId)
  return caja?.monedaId ? String(caja.monedaId) : fallbackMonedaId
}

function createEmptyMedio(monedas: Moneda[], cajas: Caja[], formasPago: FormaPago[]): MedioDraft {
  const fallbackMonedaId = getDefaultMonedaId(monedas)
  const defaultCajaId = cajas[0] ? String(cajas[0].id) : ""

  return {
    id: `medio-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    formaPagoId: formasPago[0] ? String(formasPago[0].id) : "",
    cajaId: defaultCajaId,
    importe: "",
    monedaId: resolveCajaMonedaId(cajas, defaultCajaId, fallbackMonedaId),
    cotizacion: "1",
    chequeId: "",
  }
}

function buildInitialForm(monedas: Moneda[], cajas: Caja[]): MovimientoFormState {
  const fallbackMonedaId = getDefaultMonedaId(monedas)
  const defaultCajaId = cajas[0] ? String(cajas[0].id) : undefined

  return {
    terceroId: "",
    fecha: new Date().toISOString().slice(0, 10),
    monedaId: resolveCajaMonedaId(cajas, defaultCajaId, fallbackMonedaId),
    cotizacion: "1",
    observacion: "",
  }
}

function resolvePrimaryCurrency(
  form: MovimientoFormState,
  medios: Array<{ monedaId: number; cotizacion: number }>
) {
  const distinctMonedaIds = Array.from(
    new Set(medios.map((medio) => medio.monedaId).filter(Boolean))
  )
  const distinctCotizaciones = Array.from(new Set(medios.map((medio) => medio.cotizacion)))

  return {
    monedaId: distinctMonedaIds.length === 1 ? distinctMonedaIds[0] : Number(form.monedaId),
    cotizacion:
      distinctMonedaIds.length === 1 && distinctCotizaciones.length === 1
        ? distinctCotizaciones[0]
        : Number(form.cotizacion || 1),
  }
}

function MovimientoDialog({
  open,
  onOpenChange,
  kind,
  sucursalId,
  cajas,
  formasPago,
  monedas,
  terceros,
  loadingCatalogs,
  registrarPago,
  registrarCobro,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  kind: MovimientoKind
  sucursalId: number
  cajas: Caja[]
  formasPago: FormaPago[]
  monedas: Moneda[]
  terceros: TerceroOption[]
  loadingCatalogs: boolean
  registrarPago: (dto: RegistrarPagoDto) => Promise<boolean>
  registrarCobro: (dto: RegistrarCobroDto) => Promise<boolean>
  onSaved: () => Promise<void>
}) {
  const [tab, setTab] = useState("principal")
  const [form, setForm] = useState<MovimientoFormState>(() => buildInitialForm(monedas, cajas))
  const [medios, setMedios] = useState<MedioDraft[]>(() => [
    createEmptyMedio(monedas, cajas, formasPago),
  ])
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const total = useMemo(
    () => medios.reduce((sum, medio) => sum + Number(medio.importe || 0), 0),
    [medios]
  )

  const terceroName = useMemo(
    () => terceros.find((tercero) => String(tercero.id) === form.terceroId)?.label ?? null,
    [form.terceroId, terceros]
  )

  function updateMedio(id: string, key: keyof MedioDraft, value: string) {
    setMedios((current) =>
      current.map((medio) => {
        if (medio.id !== id) {
          return medio
        }

        if (key === "cajaId") {
          const monedaId = resolveCajaMonedaId(cajas, value, medio.monedaId || form.monedaId)

          if (current.length === 1) {
            setForm((formCurrent) =>
              formCurrent.monedaId === monedaId ? formCurrent : { ...formCurrent, monedaId }
            )
          }

          return { ...medio, cajaId: value, monedaId }
        }

        if (current.length === 1 && key === "monedaId") {
          setForm((formCurrent) =>
            formCurrent.monedaId === value ? formCurrent : { ...formCurrent, monedaId: value }
          )
        }

        if (current.length === 1 && key === "cotizacion") {
          setForm((formCurrent) =>
            formCurrent.cotizacion === value ? formCurrent : { ...formCurrent, cotizacion: value }
          )
        }

        return { ...medio, [key]: value }
      })
    )
  }

  function addMedio() {
    setMedios((current) => [...current, createEmptyMedio(monedas, cajas, formasPago)])
  }

  function removeMedio(id: string) {
    setMedios((current) => current.filter((medio) => medio.id !== id))
  }

  async function handleSubmit() {
    setFormError(null)

    if (!form.terceroId || !form.fecha) {
      setFormError("Tercero y fecha son obligatorios.")
      return
    }

    if (medios.length === 0) {
      setFormError("Debe existir al menos un medio registrado.")
      return
    }

    const mediosPayload = medios.map((medio) => ({
      formaPagoId: Number(medio.formaPagoId),
      cajaId: Number(medio.cajaId),
      importe: Number(medio.importe),
      monedaId: Number(medio.monedaId || form.monedaId),
      cotizacion: Number(medio.cotizacion || form.cotizacion || 1),
      chequeId: medio.chequeId ? Number(medio.chequeId) : null,
    }))

    if (
      mediosPayload.some(
        (medio) =>
          !medio.formaPagoId ||
          !medio.cajaId ||
          !medio.monedaId ||
          Number.isNaN(medio.importe) ||
          medio.importe <= 0
      )
    ) {
      setFormError("Cada medio debe informar forma de pago, caja, moneda e importe válido.")
      return
    }

    const { monedaId: primaryMonedaId, cotizacion: primaryCotizacion } = resolvePrimaryCurrency(
      form,
      mediosPayload
    )

    setSaving(true)

    const ok =
      kind === "pago"
        ? await registrarPago({
            sucursalId,
            terceroId: Number(form.terceroId),
            fecha: form.fecha,
            monedaId: primaryMonedaId,
            cotizacion: primaryCotizacion,
            observacion: form.observacion.trim() || undefined,
            medios: mediosPayload,
          })
        : await registrarCobro({
            sucursalId,
            terceroId: Number(form.terceroId),
            fecha: form.fecha,
            monedaId: primaryMonedaId,
            cotizacion: primaryCotizacion,
            observacion: form.observacion.trim() || undefined,
            medios: mediosPayload,
            comprobantesAImputar: [],
          })

    setSaving(false)

    if (!ok) {
      setFormError(
        kind === "pago"
          ? "No se pudo registrar el pago seleccionado."
          : "No se pudo registrar el cobro seleccionado."
      )
      return
    }

    onOpenChange(false)
    await onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{kind === "pago" ? "Nuevo pago" : "Nuevo cobro"}</DialogTitle>
          <DialogDescription>
            Alta operativa básica sobre endpoints reales, con tercero, medios, caja y moneda. Las
            imputaciones avanzadas quedan reservadas para la siguiente fase.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="principal">Principal</TabsTrigger>
              <TabsTrigger value="medios">Medios</TabsTrigger>
              <TabsTrigger value="totales">Totales</TabsTrigger>
              <TabsTrigger value="legado">Legado</TabsTrigger>
            </TabsList>

            <TabsContent value="principal" className="space-y-4 pt-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`${kind}-tercero`}>Tercero</Label>
                  <Input
                    id={`${kind}-tercero`}
                    type="number"
                    list={`${kind}-terceros`}
                    value={form.terceroId}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, terceroId: event.target.value }))
                    }
                    placeholder={kind === "pago" ? "ID de proveedor" : "ID de cliente"}
                  />
                  <datalist id={`${kind}-terceros`}>
                    {terceros.map((tercero) => (
                      <option key={tercero.id} value={tercero.id} label={tercero.label} />
                    ))}
                  </datalist>
                  <p className="text-xs text-muted-foreground">
                    {terceroName
                      ? `Detectado: ${terceroName}`
                      : "Podés escribir el ID directamente o usar uno de los sugeridos por el maestro cargado."}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${kind}-fecha`}>Fecha</Label>
                  <Input
                    id={`${kind}-fecha`}
                    type="date"
                    value={form.fecha}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, fecha: event.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Moneda principal</Label>
                  <Select
                    value={form.monedaId}
                    onValueChange={(value) => {
                      setForm((current) => ({ ...current, monedaId: value }))

                      if (medios.length === 1) {
                        setMedios((current) =>
                          current.map((medio, index) =>
                            index === 0 ? { ...medio, monedaId: value } : medio
                          )
                        )
                      }
                    }}
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
                  <Label htmlFor={`${kind}-cotizacion`}>Cotización</Label>
                  <Input
                    id={`${kind}-cotizacion`}
                    type="number"
                    min="0.0001"
                    step="0.0001"
                    value={form.cotizacion}
                    onChange={(event) => {
                      const { value } = event.target

                      setForm((current) => ({ ...current, cotizacion: value }))

                      if (medios.length === 1) {
                        setMedios((current) =>
                          current.map((medio, index) =>
                            index === 0 ? { ...medio, cotizacion: value } : medio
                          )
                        )
                      }
                    }}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor={`${kind}-observacion`}>Observación</Label>
                  <Textarea
                    id={`${kind}-observacion`}
                    rows={4}
                    value={form.observacion}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, observacion: event.target.value }))
                    }
                    placeholder="Detalle operativo, referencia o nota interna"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="medios" className="space-y-4 pt-4">
              <div className="flex justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  Registrá uno o varios medios sobre cajas y formas de pago reales.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addMedio}
                  disabled={loadingCatalogs}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar medio
                </Button>
              </div>

              {medios.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>No hay medios cargados todavía.</AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {medios.map((medio, index) => (
                    <Card key={medio.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">Medio #{index + 1}</CardTitle>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeMedio(medio.id)}
                            disabled={medios.length === 1}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <div className="space-y-2">
                          <Label>Forma de pago</Label>
                          <Select
                            value={medio.formaPagoId}
                            onValueChange={(value) => updateMedio(medio.id, "formaPagoId", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar forma" />
                            </SelectTrigger>
                            <SelectContent>
                              {formasPago.map((forma) => (
                                <SelectItem key={forma.id} value={String(forma.id)}>
                                  {forma.descripcion}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Caja</Label>
                          <Select
                            value={medio.cajaId}
                            onValueChange={(value) => updateMedio(medio.id, "cajaId", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar caja" />
                            </SelectTrigger>
                            <SelectContent>
                              {cajas.map((caja) => (
                                <SelectItem key={caja.id} value={String(caja.id)}>
                                  {caja.nombre}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Importe</Label>
                          <Input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={medio.importe}
                            onChange={(event) =>
                              updateMedio(medio.id, "importe", event.target.value)
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Moneda</Label>
                          <Select
                            value={medio.monedaId}
                            onValueChange={(value) => updateMedio(medio.id, "monedaId", value)}
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
                          <Label>Cotización</Label>
                          <Input
                            type="number"
                            min="0.0001"
                            step="0.0001"
                            value={medio.cotizacion}
                            onChange={(event) =>
                              updateMedio(medio.id, "cotizacion", event.target.value)
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Cheque ID</Label>
                          <Input
                            type="number"
                            min="1"
                            value={medio.chequeId}
                            onChange={(event) =>
                              updateMedio(medio.id, "chequeId", event.target.value)
                            }
                            placeholder="Opcional"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="totales" className="space-y-4 pt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Resumen del movimiento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sucursal</span>
                    <span>{sucursalId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Medios cargados</span>
                    <span>{medios.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Moneda principal</span>
                    <span>
                      {monedas.find((moneda) => String(moneda.id) === form.monedaId)?.codigo ?? "-"}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-3 text-base font-semibold">
                    <span>Total</span>
                    <span>${fmtARS(total)}</span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="legado" className="space-y-4 pt-4">
              <Card>
                <CardContent className="pt-6 text-sm text-muted-foreground">
                  Quedan reservadas para la siguiente etapa la imputación contra comprobantes,
                  retenciones complejas, cheques de terceros, conciliación bancaria y formularios
                  avanzados por medio de pago.
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {formError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          {loadingCatalogs && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Se están cargando catálogos de cajas, monedas o formas de pago.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={() => void handleSubmit()} disabled={saving || loadingCatalogs}>
              {saving
                ? kind === "pago"
                  ? "Registrando pago..."
                  : "Registrando cobro..."
                : kind === "pago"
                  ? "Registrar pago"
                  : "Registrar cobro"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function PagosContent() {
  const sucursalId = useDefaultSucursalId() ?? 1
  const {
    pagos,
    loading: loadingPagos,
    error: errorPagos,
    totalCount: totalPagos,
    totalPages: totalPagesPagos,
    page: pagePagos,
    setPage: setPagePagos,
    desde: desdePagos,
    setDesde: setDesdePagos,
    hasta: hastaPagos,
    setHasta: setHastaPagos,
    getById: getPagoById,
    registrar: registrarPago,
    anular: anularPago,
    refetch: refetchPagos,
  } = usePagos({ sucursalId })
  const {
    cobros,
    loading: loadingCobros,
    error: errorCobros,
    totalCount: totalCobros,
    totalPages: totalPagesCobros,
    page: pageCobros,
    setPage: setPageCobros,
    setDesde: setDesdeCobros,
    setHasta: setHastaCobros,
    getById: getCobroById,
    registrar: registrarCobro,
    anular: anularCobro,
    refetch: refetchCobros,
  } = useCobros({ sucursalId })
  const { cajas, loading: loadingCajas, error: errorCajas } = useCajas(sucursalId)
  const { formasPago, loading: loadingConfiguracion } = useConfiguracion()
  const { monedas, loading: loadingMonedas } = useTercerosConfig()
  const { terceros: clientes } = useTerceros()
  const { terceros: proveedores } = useProveedores()

  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState("cobros")
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detail, setDetail] = useState<DetailState>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [movementDialog, setMovementDialog] = useState<MovimientoKind | null>(null)

  const clientesOptions = useMemo<TerceroOption[]>(
    () =>
      clientes.map((cliente) => ({
        id: cliente.id,
        label: cliente.razonSocial,
      })),
    [clientes]
  )

  const proveedoresOptions = useMemo<TerceroOption[]>(
    () =>
      proveedores.map((proveedor) => ({
        id: proveedor.id,
        label: proveedor.razonSocial,
      })),
    [proveedores]
  )

  const clienteNameById = useMemo(
    () => new Map(clientesOptions.map((cliente) => [cliente.id, cliente.label])),
    [clientesOptions]
  )

  const clienteById = useMemo(
    () => new Map(clientes.map((cliente) => [cliente.id, cliente])),
    [clientes]
  )

  const proveedorById = useMemo(
    () => new Map(proveedores.map((proveedor) => [proveedor.id, proveedor])),
    [proveedores]
  )

  const cajasById = useMemo(() => new Map(cajas.map((caja) => [caja.id, caja])), [cajas])

  const filteredPagos = useMemo(
    () =>
      pagos.filter((pago) => {
        const term = search.toLowerCase().trim()
        return (
          !term ||
          pago.terceroRazonSocial?.toLowerCase().includes(term) ||
          String(pago.id).includes(search) ||
          (pago.monedaSimbolo ?? "").toLowerCase().includes(term) ||
          (proveedorById.get(pago.terceroId)?.nroDocumento ?? "").toLowerCase().includes(term)
        )
      }),
    [pagos, proveedorById, search]
  )

  const filteredCobros = useMemo(
    () =>
      cobros.filter((cobro) => {
        const term = search.toLowerCase().trim()
        const cliente = clienteNameById.get(cobro.terceroId) ?? `Cliente #${cobro.terceroId}`
        return (
          !term ||
          cliente.toLowerCase().includes(term) ||
          String(cobro.terceroId).includes(search) ||
          String(cobro.id).includes(search) ||
          (clienteById.get(cobro.terceroId)?.nroDocumento ?? "").toLowerCase().includes(term) ||
          String(cobro.monedaSimbolo ?? "")
            .toLowerCase()
            .includes(term)
        )
      }),
    [clienteById, clienteNameById, cobros, search]
  )

  const pagosActivos = pagos.filter((pago) => pago.estado !== "ANULADO")
  const cobrosActivos = cobros.filter((cobro) => cobro.estado !== "ANULADO")
  const totalPagarLabel = formatCurrencyBreakdown(pagosActivos)
  const totalCobrarLabel = formatCurrencyBreakdown(cobrosActivos)
  const ultimoPago = pagos[0] ?? null
  const ultimoCobro = cobros[0] ?? null
  const catalogLoading = loadingCajas || loadingConfiguracion || loadingMonedas
  const cajasActivas = cajas.filter((caja) => caja.activa).length
  const saldoCajas = cajas.reduce((sum, caja) => sum + Number(caja.saldoActual ?? 0), 0)
  const proveedoresConDocumento = proveedores.filter((proveedor) =>
    Boolean(proveedor.nroDocumento)
  ).length
  const clientesConDocumento = clientes.filter((cliente) => Boolean(cliente.nroDocumento)).length
  const anuladosVisibles =
    pagos.filter((pago) => pago.estado === "ANULADO").length +
    cobros.filter((cobro) => cobro.estado === "ANULADO").length

  const setSharedDesde = (value: string) => {
    setDesdePagos(value)
    setDesdeCobros(value)
    setPagePagos(1)
    setPageCobros(1)
  }

  const setSharedHasta = (value: string) => {
    setHastaPagos(value)
    setHastaCobros(value)
    setPagePagos(1)
    setPageCobros(1)
  }

  const clearFilters = () => {
    setSearch("")
    setSharedDesde("")
    setSharedHasta("")
  }

  const refreshAll = async () => {
    await Promise.all([refetchPagos(), refetchCobros()])
  }

  const handleViewPago = async (id: number) => {
    setDetailOpen(true)
    setDetailLoading(true)
    const data = await getPagoById(id)
    setDetail(data ? { kind: "pago", data } : null)
    setDetailLoading(false)
  }

  const handleViewCobro = async (id: number) => {
    setDetailOpen(true)
    setDetailLoading(true)
    const data = await getCobroById(id)
    setDetail(data ? { kind: "cobro", data } : null)
    setDetailLoading(false)
  }

  const handleAnularPago = async (id: number) => {
    setActionError(null)
    setSaving(`pago-${id}`)
    const ok = await anularPago(id)
    setSaving(null)
    if (!ok) {
      setActionError("No se pudo anular el pago seleccionado.")
      return
    }
    await refetchPagos()
  }

  const handleAnularCobro = async (id: number) => {
    setActionError(null)
    setSaving(`cobro-${id}`)
    const ok = await anularCobro(id)
    setSaving(null)
    if (!ok) {
      setActionError("No se pudo anular el cobro seleccionado.")
      return
    }
    await refetchCobros()
  }

  const error = actionError || errorPagos || errorCobros || errorCajas

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pagos y Cobros</h1>
          <p className="text-muted-foreground">
            Consola financiera para consultar movimientos, registrarlos de forma básica con medios
            reales y anular transacciones ya persistidas en backend.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={refreshAll} disabled={loadingPagos || loadingCobros}>
            <RefreshCcw className="h-4 w-4" />
            Actualizar
          </Button>
          <Button
            variant="outline"
            onClick={() => setMovementDialog("pago")}
            disabled={catalogLoading}
          >
            <ArrowUpRight className="mr-2 h-4 w-4" />
            Nuevo Pago
          </Button>
          <Button onClick={() => setMovementDialog("cobro")} disabled={catalogLoading}>
            <ArrowDownLeft className="mr-2 h-4 w-4" />
            Nuevo Cobro
          </Button>
        </div>
      </div>

      <Alert>
        <Wallet className="h-4 w-4" />
        <AlertDescription>
          La consulta, el alta básica y la anulación ya están soportadas por backend. Siguen
          reservadas para una segunda fase las imputaciones avanzadas, retenciones complejas y la
          conciliación ampliada por medio de pago.
        </AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total cobrado"
          value={totalCobrarLabel}
          description={`${cobrosActivos.length} cobros activos en sucursal ${sucursalId}.`}
        />
        <SummaryCard
          title="Total pagado"
          value={totalPagarLabel}
          description={`${pagosActivos.length} pagos activos en sucursal ${sucursalId}.`}
        />
        <SummaryCard
          title="Último cobro"
          value={ultimoCobro ? formatDate(ultimoCobro.fecha) : "Sin datos"}
          description={
            ultimoCobro
              ? `Cobro #${ultimoCobro.id} por ${ultimoCobro.monedaSimbolo?.trim() || "$"}${fmtARS(ultimoCobro.total)}.`
              : "No hay cobros cargados."
          }
        />
        <SummaryCard
          title="Último pago"
          value={ultimoPago ? formatDate(ultimoPago.fecha) : "Sin datos"}
          description={
            ultimoPago
              ? `Pago #${ultimoPago.id} por ${ultimoPago.monedaSimbolo?.trim() || "$"}${fmtARS(ultimoPago.total)}.`
              : "No hay pagos cargados."
          }
        />
        <SummaryCard
          title="Anulados visibles"
          value={String(anuladosVisibles)}
          description="Pagos y cobros ya revertidos y publicados por backend en la sucursal activa."
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Landmark className="h-4 w-4" /> Cajas operativas
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {cajasActivas} cajas activas y un saldo visible de ${fmtARS(saldoCajas)} en la sucursal{" "}
            {sucursalId}. Esto recupera lectura de tesorería sin salir del circuito actual.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4" /> Legajo de terceros
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {proveedoresConDocumento} proveedores y {clientesConDocumento} clientes exponen
            documento visible, suficiente para acercar la lectura fiscal/comercial del sistema
            viejo.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ScrollText className="h-4 w-4" /> Alcance de fase actual
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            La pantalla ya cubre consulta, alta simple y anulación. Quedan afuera imputaciones,
            conciliación bancaria y formularios especializados por retención o cheque.
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros operativos</CardTitle>
          <CardDescription>
            El rango de fechas consulta pagos y cobros en backend; la búsqueda textual refina la
            página descargada en cada pestaña.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_180px_180px_auto]">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por tercero, número o moneda..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Input
              type="date"
              value={desdePagos}
              onChange={(e) => setSharedDesde(e.target.value)}
            />
            <Input
              type="date"
              value={hastaPagos}
              onChange={(e) => setSharedHasta(e.target.value)}
            />
            <Button variant="outline" onClick={clearFilters}>
              Limpiar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="cobros">Cobros ({totalCobros})</TabsTrigger>
              <TabsTrigger value="pagos">Pagos ({totalPagos})</TabsTrigger>
            </TabsList>

            <TabsContent value="cobros" className="space-y-4">
              {loadingCobros ? (
                <p className="py-6 text-center text-muted-foreground">Cargando cobros...</p>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nº</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Alta</TableHead>
                        <TableHead>Circuito</TableHead>
                        <TableHead>Moneda</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCobros.map((cobro) => {
                        const cliente = clienteById.get(cobro.terceroId)
                        const movementStatus = getMovementStatus("cobro", cobro.estado)

                        return (
                          <TableRow key={cobro.id}>
                            <TableCell className="font-mono text-sm">
                              COB-{String(cobro.id).padStart(4, "0")}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatDate(cobro.fecha)}
                            </TableCell>
                            <TableCell className="font-medium">
                              <div className="space-y-1">
                                <div>
                                  {clienteNameById.get(cobro.terceroId) ??
                                    `Cliente #${cobro.terceroId}`}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {cliente?.nroDocumento
                                    ? `CUIT ${cliente.nroDocumento}`
                                    : "Sin CUIT visible"}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDate(cobro.createdAt)}
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="text-sm font-medium">{movementStatus.label}</div>
                                <p className="text-xs text-muted-foreground">
                                  Ingreso en sucursal {cobro.sucursalId}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{cobro.monedaSimbolo ?? "-"}</TableCell>
                            <TableCell className="text-right font-medium">
                              ${fmtARS(cobro.total)}
                            </TableCell>
                            <TableCell>{getEstadoBadge(cobro.estado)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleViewCobro(cobro.id)}
                                >
                                  <Eye className="h-4 w-4" />
                                  Ver
                                </Button>
                                {cobro.estado !== "ANULADO" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleAnularCobro(cobro.id)}
                                    disabled={saving === `cobro-${cobro.id}`}
                                  >
                                    <Ban className="h-4 w-4" />
                                    {saving === `cobro-${cobro.id}` ? "Anulando..." : "Anular"}
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                      {filteredCobros.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                            No hay cobros registrados.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>

                  <div className="flex items-center justify-between border-t pt-4">
                    <p className="text-sm text-muted-foreground">
                      Página {pageCobros} de {Math.max(totalPagesCobros, 1)}.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pageCobros <= 1}
                        onClick={() => setPageCobros(pageCobros - 1)}
                      >
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pageCobros >= totalPagesCobros}
                        onClick={() => setPageCobros(pageCobros + 1)}
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="pagos" className="space-y-4">
              {loadingPagos ? (
                <p className="py-6 text-center text-muted-foreground">Cargando pagos...</p>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nº</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Proveedor</TableHead>
                        <TableHead>Alta</TableHead>
                        <TableHead>Circuito</TableHead>
                        <TableHead>Moneda</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPagos.map((pago) => {
                        const proveedor = proveedorById.get(pago.terceroId)
                        const movementStatus = getMovementStatus("pago", pago.estado)

                        return (
                          <TableRow key={pago.id}>
                            <TableCell className="font-mono text-sm">
                              PAG-{String(pago.id).padStart(4, "0")}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatDate(pago.fecha)}
                            </TableCell>
                            <TableCell className="font-medium">
                              <div className="space-y-1">
                                <div>{pago.terceroRazonSocial ?? `Prov. #${pago.terceroId}`}</div>
                                <p className="text-xs text-muted-foreground">
                                  {proveedor?.nroDocumento
                                    ? `CUIT ${proveedor.nroDocumento}`
                                    : "Sin CUIT visible"}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDate(pago.createdAt)}
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="text-sm font-medium">{movementStatus.label}</div>
                                <p className="text-xs text-muted-foreground">
                                  Egreso en sucursal {pago.sucursalId}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{pago.monedaSimbolo}</TableCell>
                            <TableCell className="text-right font-medium">
                              ${fmtARS(pago.total)}
                            </TableCell>
                            <TableCell>{getEstadoBadge(pago.estado)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleViewPago(pago.id)}
                                >
                                  <Eye className="h-4 w-4" />
                                  Ver
                                </Button>
                                {pago.estado !== "ANULADO" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleAnularPago(pago.id)}
                                    disabled={saving === `pago-${pago.id}`}
                                  >
                                    <Ban className="h-4 w-4" />
                                    {saving === `pago-${pago.id}` ? "Anulando..." : "Anular"}
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                      {filteredPagos.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                            No hay pagos registrados.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>

                  <div className="flex items-center justify-between border-t pt-4">
                    <p className="text-sm text-muted-foreground">
                      Página {pagePagos} de {Math.max(totalPagesPagos, 1)}.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pagePagos <= 1}
                        onClick={() => setPagePagos(pagePagos - 1)}
                      >
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pagePagos >= totalPagesPagos}
                        onClick={() => setPagePagos(pagePagos + 1)}
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {detail?.kind === "pago" ? "Detalle de pago" : "Detalle de cobro"}
            </DialogTitle>
            <DialogDescription>
              Consulta completa del movimiento financiero con sus medios registrados.
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <p className="py-8 text-center text-muted-foreground">Cargando detalle...</p>
          ) : !detail ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>No se pudo recuperar el detalle seleccionado.</AlertDescription>
            </Alert>
          ) : (
            (() => {
              const movementStatus = getMovementStatus(detail.kind, detail.data.estado)
              const thirdParty =
                detail.kind === "pago"
                  ? (proveedorById.get(detail.data.terceroId) ?? null)
                  : (clienteById.get(detail.data.terceroId) ?? null)
              const cajasUsadas = Array.from(
                new Set(detail.data.medios.map((medio) => medio.cajaId))
              ).length
              const mediosConCheque = detail.data.medios.filter((medio) =>
                Boolean(medio.chequeId)
              ).length
              const totalRetenciones =
                detail.kind === "pago"
                  ? detail.data.retenciones.reduce((sum, retencion) => sum + retencion.importe, 0)
                  : 0

              return (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <SummaryCard
                      title="Comprobante"
                      value={
                        detail.kind === "pago"
                          ? `PAG-${String(detail.data.id).padStart(4, "0")}`
                          : `COB-${String(detail.data.id).padStart(4, "0")}`
                      }
                      description={`Fecha ${formatDate(detail.data.fecha)}`}
                    />
                    <SummaryCard
                      title="Estado"
                      value={detail.data.estado}
                      description={`Sucursal ${detail.data.sucursalId}`}
                    />
                    <SummaryCard
                      title="Total"
                      value={`$${fmtARS(detail.data.total)}`}
                      description={
                        detail.kind === "pago" ? "Movimiento de egreso." : "Movimiento de ingreso."
                      }
                    />
                    <SummaryCard
                      title="Alta"
                      value={formatDate(detail.data.createdAt)}
                      description={
                        detail.kind === "pago"
                          ? `Tercero: ${detail.data.terceroRazonSocial}`
                          : `Cliente: ${detail.data.terceroRazonSocial ?? clienteNameById.get(detail.data.terceroId) ?? `Cliente #${detail.data.terceroId}`}`
                      }
                    />
                  </div>

                  <Tabs defaultValue="general" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="general">General</TabsTrigger>
                      <TabsTrigger value="tercero">Tercero</TabsTrigger>
                      <TabsTrigger value="medios">Medios</TabsTrigger>
                      <TabsTrigger value="circuito">Circuito</TabsTrigger>
                    </TabsList>

                    <TabsContent value="general" className="space-y-4 pt-4">
                      <DetailFieldGrid
                        fields={[
                          {
                            label: "Movimiento",
                            value:
                              detail.kind === "pago"
                                ? `PAG-${String(detail.data.id).padStart(4, "0")}`
                                : `COB-${String(detail.data.id).padStart(4, "0")}`,
                          },
                          { label: "Fecha", value: formatDate(detail.data.fecha) },
                          { label: "Alta", value: formatDateTime(detail.data.createdAt) },
                          { label: "Estado", value: detail.data.estado },
                          { label: "Moneda", value: detail.data.monedaSimbolo ?? "-" },
                          { label: "Total", value: `$${fmtARS(detail.data.total)}` },
                          {
                            label: "Cotización",
                            value:
                              detail.kind === "pago" ? String(detail.data.cotizacion ?? 1) : "1",
                          },
                          {
                            label: "Observación",
                            value:
                              detail.kind === "pago"
                                ? (detail.data.observacion ?? "Sin observación visible")
                                : "Sin observación expuesta por la API de cobros",
                          },
                        ]}
                      />
                    </TabsContent>

                    <TabsContent value="tercero" className="space-y-4 pt-4">
                      <DetailFieldGrid
                        fields={[
                          {
                            label: "Razón social",
                            value:
                              detail.kind === "pago"
                                ? detail.data.terceroRazonSocial
                                : (clienteNameById.get(detail.data.terceroId) ??
                                  `Cliente #${detail.data.terceroId}`),
                          },
                          { label: "ID tercero", value: String(detail.data.terceroId) },
                          {
                            label: "CUIT / Documento",
                            value: thirdParty?.nroDocumento ?? "Sin documento visible",
                          },
                          {
                            label: "Condición IVA",
                            value: thirdParty?.condicionIvaDescripcion ?? "Sin condición visible",
                          },
                          {
                            label: "Contacto",
                            value:
                              thirdParty?.telefono ?? thirdParty?.celular ?? "Sin teléfono visible",
                          },
                          { label: "Correo", value: thirdParty?.email ?? "Sin correo visible" },
                          { label: "Domicilio", value: formatAddress(thirdParty) },
                          {
                            label: "Observaciones del legajo",
                            value: thirdParty?.observacion ?? "Sin observaciones visibles",
                          },
                        ]}
                      />
                    </TabsContent>

                    <TabsContent value="medios" className="space-y-4 pt-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Medios registrados</CardTitle>
                          <CardDescription>
                            {detail.data.medios.length} medios, {cajasUsadas} cajas y{" "}
                            {mediosConCheque} referencias de cheque visibles.
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Forma de pago</TableHead>
                                <TableHead>Caja</TableHead>
                                <TableHead>Moneda</TableHead>
                                <TableHead>Cheque</TableHead>
                                <TableHead className="text-right">Importe</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {detail.data.medios.map((medio) => (
                                <TableRow key={medio.id}>
                                  <TableCell>{medio.formaPagoDescripcion}</TableCell>
                                  <TableCell>
                                    <div className="space-y-1">
                                      <div>{medio.cajaDescripcion}</div>
                                      <p className="text-xs text-muted-foreground">
                                        {cajasById.get(medio.cajaId)?.tipoCajaDescripcion ??
                                          "Caja operativa"}
                                      </p>
                                    </div>
                                  </TableCell>
                                  <TableCell>{medio.monedaSimbolo}</TableCell>
                                  <TableCell>
                                    {medio.chequeId ? `#${medio.chequeId}` : "-"}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    ${fmtARS(medio.importe)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="circuito" className="space-y-4 pt-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-base">
                            <CalendarClock className="h-4 w-4" /> Estado operativo
                          </CardTitle>
                          <CardDescription>{movementStatus.detail}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <DetailFieldGrid
                            fields={[
                              { label: "Circuito", value: movementStatus.label },
                              { label: "Sucursal", value: String(detail.data.sucursalId) },
                              { label: "Cajas utilizadas", value: String(cajasUsadas) },
                              { label: "Medios con cheque", value: String(mediosConCheque) },
                              {
                                label: "Retenciones",
                                value:
                                  detail.kind === "pago"
                                    ? `${detail.data.retenciones.length} por $${fmtARS(totalRetenciones)}`
                                    : "No aplica en cobros",
                              },
                              {
                                label: "Sentido contable",
                                value:
                                  detail.kind === "pago"
                                    ? "Egreso de tesorería"
                                    : "Ingreso de tesorería",
                              },
                            ]}
                          />
                        </CardContent>
                      </Card>

                      <Alert>
                        <Wallet className="h-4 w-4" />
                        <AlertDescription>
                          La imputación avanzada, la conciliación ampliada y el seguimiento
                          posterior de retenciones siguen fuera del contrato actual. Cuando ese
                          circuito exista, debe venir desde backend y no desde notas guardadas sólo
                          en este navegador.
                        </AlertDescription>
                      </Alert>

                      {detail.kind === "pago" && detail.data.retenciones.length > 0 && (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">Retenciones</CardTitle>
                            <CardDescription>
                              Retenciones asociadas al pago consultado.
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            {detail.data.retenciones.map((retencion) => (
                              <div
                                key={retencion.id}
                                className="flex items-center justify-between rounded-lg border p-3 text-sm"
                              >
                                <div>
                                  <p className="font-medium">{retencion.tipo}</p>
                                  <p className="text-muted-foreground">
                                    {retencion.nroCertificado
                                      ? `Certificado ${retencion.nroCertificado}`
                                      : "Sin certificado"}{" "}
                                    · {formatDate(retencion.fecha)}
                                  </p>
                                </div>
                                <span className="font-medium">${fmtARS(retencion.importe)}</span>
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              )
            })()
          )}
        </DialogContent>
      </Dialog>

      {movementDialog && (
        <MovimientoDialog
          open={Boolean(movementDialog)}
          onOpenChange={(open) => {
            if (!open) setMovementDialog(null)
          }}
          kind={movementDialog}
          sucursalId={sucursalId}
          cajas={cajas}
          formasPago={formasPago}
          monedas={monedas}
          terceros={movementDialog === "pago" ? proveedoresOptions : clientesOptions}
          loadingCatalogs={catalogLoading}
          registrarPago={registrarPago}
          registrarCobro={registrarCobro}
          onSaved={movementDialog === "pago" ? refetchPagos : refetchCobros}
        />
      )}
    </div>
  )
}

export default function PagosPage() {
  return (
    <Suspense fallback={<Loading />}>
      <PagosContent />
    </Suspense>
  )
}
