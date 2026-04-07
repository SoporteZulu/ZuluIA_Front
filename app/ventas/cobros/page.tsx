"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertCircle,
  CalendarRange,
  Eye,
  Filter,
  Landmark,
  Layers3,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  Wallet,
} from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
import { Tabs, TabsContent, TabsTrigger } from "@/components/ui/tabs"
import { SalesDialogContent, SalesTabsList } from "@/components/ventas/sales-responsive"
import { Textarea } from "@/components/ui/textarea"
import { useCajas } from "@/lib/hooks/useCajas"
import { useCheques } from "@/lib/hooks/useCheques"
import { useComprobantes } from "@/lib/hooks/useComprobantes"
import { useConfiguracion } from "@/lib/hooks/useConfiguracion"
import { useCobros } from "@/lib/hooks/useCobros"
import { useDefaultSucursalId, useSucursales } from "@/lib/hooks/useSucursales"
import { useTerceros } from "@/lib/hooks/useTerceros"
import type { Cobro, CobroDetalle, RegistrarCobroDto } from "@/lib/types/cobros"
import type { Cheque } from "@/lib/types/cheques"
import type { Comprobante } from "@/lib/types/comprobantes"

type CobroMode = "simple" | "ventanilla" | "recibo-masivo"

type DraftPayment = {
  id: string
  formaPagoId: string
  cajaId: string
  chequeId: string
  importe: string
}

type DraftAllocation = {
  id: string
  comprobanteId: string
  importe: string
}

type DraftForm = {
  terceroId: string
  fecha: string
  mode: CobroMode
  observacion: string
  medios: DraftPayment[]
  imputaciones: DraftAllocation[]
}

const MODE_LABELS: Record<CobroMode, string> = {
  simple: "Cobro simple",
  ventanilla: "Cobro por ventanilla",
  "recibo-masivo": "Recibo masivo",
}

const MODE_DESCRIPTIONS: Record<CobroMode, string> = {
  simple: "Recibo estándar con uno o varios medios y aplicación puntual.",
  ventanilla: "Cobro presencial con foco en caja, medios rápidos y registración inmediata.",
  "recibo-masivo": "Aplicación intensiva para varios documentos o lotes del mismo cliente.",
}

function formatMoney(value: number) {
  return value.toLocaleString("es-AR", { style: "currency", currency: "ARS" })
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString("es-AR") : "-"
}

function parseAmount(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".").trim()
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

function renderStatusBadge(status: string) {
  if (status === "ANULADO") return <Badge variant="destructive">Anulado</Badge>
  if (status === "APLICADO") return <Badge>Aplicado</Badge>
  return <Badge variant="secondary">{status}</Badge>
}

function createPayment(): DraftPayment {
  return {
    id: `medio-${globalThis.crypto.randomUUID()}`,
    formaPagoId: "",
    cajaId: "",
    chequeId: "",
    importe: "",
  }
}

function createAllocation(): DraftAllocation {
  return {
    id: `imputacion-${globalThis.crypto.randomUUID()}`,
    comprobanteId: "",
    importe: "",
  }
}

function createEmptyForm(): DraftForm {
  return {
    terceroId: "",
    fecha: new Date().toISOString().slice(0, 10),
    mode: "simple",
    observacion: "",
    medios: [createPayment()],
    imputaciones: [],
  }
}

function formatCobroReference(cobro: Cobro, customerName: string) {
  return `Cobro #${cobro.id} · ${customerName}`
}

function formatComprobanteReference(comprobante: Comprobante) {
  const ref = comprobante.nroComprobante ?? `#${comprobante.id}`
  const type = comprobante.tipoComprobanteDescripcion ?? "Comprobante"
  return `${type} · ${ref}`
}

export default function CobrosVentasPage() {
  const sucursalId = useDefaultSucursalId()
  const {
    cobros,
    loading,
    error,
    registrar,
    anular,
    getById,
    refetch,
    page,
    setPage,
    totalPages,
    desde,
    setDesde,
    hasta,
    setHasta,
  } = useCobros({ sucursalId })
  const { cajas } = useCajas(sucursalId)
  const { formasPago } = useConfiguracion()
  const { comprobantes } = useComprobantes({ esVenta: true, sucursalId })
  const { terceros } = useTerceros({ soloActivos: false, sucursalId: sucursalId ?? null })
  const { sucursales } = useSucursales()
  const { getCartera } = useCheques()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [form, setForm] = useState<DraftForm>(() => createEmptyForm())
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [detail, setDetail] = useState<CobroDetalle | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("todos")
  const [customerFilter, setCustomerFilter] = useState("todos")
  const [carteraByCaja, setCarteraByCaja] = useState<Record<number, Cheque[]>>({})
  const [loadingCartera, setLoadingCartera] = useState<Record<number, boolean>>({})

  const clientes = useMemo(() => terceros.filter((row) => row.esCliente), [terceros])
  const customerMap = useMemo(() => new Map(clientes.map((row) => [row.id, row])), [clientes])
  const sucursalMap = useMemo(() => new Map(sucursales.map((row) => [row.id, row])), [sucursales])
  const currentCustomer = form.terceroId ? customerMap.get(Number(form.terceroId)) : null
  const currentSucursal = sucursalId ? (sucursalMap.get(sucursalId) ?? null) : null

  const pendingDocs = useMemo(
    () =>
      form.terceroId
        ? comprobantes.filter(
            (row) =>
              row.terceroId === Number(form.terceroId) && row.saldo > 0 && row.estado !== "ANULADO"
          )
        : [],
    [comprobantes, form.terceroId]
  )

  const activeCajaIds = useMemo(
    () => Array.from(new Set(form.medios.map((medio) => Number(medio.cajaId)).filter(Boolean))),
    [form.medios]
  )

  useEffect(() => {
    let cancelled = false

    async function loadCartera() {
      for (const cajaId of activeCajaIds) {
        if (carteraByCaja[cajaId] || loadingCartera[cajaId]) continue
        setLoadingCartera((prev) => ({ ...prev, [cajaId]: true }))
        const cartera = await getCartera(cajaId)
        if (cancelled) return
        setCarteraByCaja((prev) => ({ ...prev, [cajaId]: cartera }))
        setLoadingCartera((prev) => ({ ...prev, [cajaId]: false }))
      }
    }

    void loadCartera()

    return () => {
      cancelled = true
    }
  }, [activeCajaIds, carteraByCaja, getCartera, loadingCartera])

  const totals = useMemo(
    () => ({
      count: cobros.length,
      amount: cobros.reduce((sum, row) => sum + Number(row.total ?? 0), 0),
      annulled: cobros.filter((row) => row.estado === "ANULADO").length,
      active: cobros.filter((row) => row.estado !== "ANULADO").length,
      customers: new Set(cobros.map((row) => row.terceroId)).size,
    }),
    [cobros]
  )

  const formTotals = useMemo(() => {
    const medios = form.medios.reduce((sum, row) => sum + parseAmount(row.importe), 0)
    const imputaciones = form.imputaciones.reduce((sum, row) => sum + parseAmount(row.importe), 0)
    return {
      medios,
      imputaciones,
      aCuentaCorriente: Math.max(medios - imputaciones, 0),
    }
  }, [form.imputaciones, form.medios])

  const pendingTotal = useMemo(
    () => pendingDocs.reduce((sum, row) => sum + Number(row.saldo ?? 0), 0),
    [pendingDocs]
  )

  const filteredCobros = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return cobros.filter((row) => {
      const customerName = customerMap.get(row.terceroId)?.razonSocial ?? `#${row.terceroId}`
      const matchesSearch =
        term === "" ||
        String(row.id).includes(term) ||
        customerName.toLowerCase().includes(term) ||
        row.estado.toLowerCase().includes(term)
      const matchesStatus = statusFilter === "todos" || row.estado === statusFilter
      const matchesCustomer = customerFilter === "todos" || row.terceroId === Number(customerFilter)
      return matchesSearch && matchesStatus && matchesCustomer
    })
  }, [cobros, customerFilter, customerMap, searchTerm, statusFilter])

  const highlighted =
    filteredCobros.find((row) => row.estado !== "ANULADO") ?? filteredCobros[0] ?? null

  const formWarnings = useMemo(() => {
    const warnings: string[] = []
    if (!form.terceroId) warnings.push("Falta seleccionar el cliente del recibo.")
    if (!form.medios.some((row) => parseAmount(row.importe) > 0)) {
      warnings.push("Cargá al menos un medio de cobro con importe válido.")
    }
    if (form.imputaciones.length === 0) {
      warnings.push("Si no imputás documentos, el cobro quedará totalmente a cuenta corriente.")
    }
    if (formTotals.imputaciones > formTotals.medios) {
      warnings.push("La suma imputada supera el total de medios cargados.")
    }
    form.imputaciones.forEach((row) => {
      const comprobante = pendingDocs.find((item) => item.id === Number(row.comprobanteId))
      if (comprobante && parseAmount(row.importe) > comprobante.saldo) {
        warnings.push(
          `La imputación supera el saldo de ${formatComprobanteReference(comprobante)}.`
        )
      }
    })
    return Array.from(new Set(warnings))
  }, [
    form.imputaciones,
    form.medios,
    form.terceroId,
    formTotals.imputaciones,
    formTotals.medios,
    pendingDocs,
  ])

  const resetForm = () => {
    setForm(createEmptyForm())
    setFormError(null)
  }

  const updatePayment = (id: string, patch: Partial<DraftPayment>) => {
    setForm((prev) => ({
      ...prev,
      medios: prev.medios.map((row) => {
        if (row.id !== id) return row
        const next = { ...row, ...patch }
        if (patch.cajaId && patch.cajaId !== row.cajaId) {
          next.chequeId = ""
        }
        return next
      }),
    }))
  }

  const updateAllocation = (id: string, patch: Partial<DraftAllocation>) => {
    setForm((prev) => ({
      ...prev,
      imputaciones: prev.imputaciones.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    }))
  }

  const addPayment = () => {
    setForm((prev) => ({ ...prev, medios: [...prev.medios, createPayment()] }))
  }

  const removePayment = (id: string) => {
    setForm((prev) => ({
      ...prev,
      medios: prev.medios.length === 1 ? prev.medios : prev.medios.filter((row) => row.id !== id),
    }))
  }

  const addAllocation = () => {
    setForm((prev) => ({ ...prev, imputaciones: [...prev.imputaciones, createAllocation()] }))
  }

  const removeAllocation = (id: string) => {
    setForm((prev) => ({
      ...prev,
      imputaciones: prev.imputaciones.filter((row) => row.id !== id),
    }))
  }

  const handleSave = async () => {
    if (!sucursalId) {
      setFormError("No hay sucursal operativa disponible.")
      return
    }
    if (!form.terceroId) {
      setFormError("El cliente es obligatorio.")
      return
    }

    const mediosValidos = form.medios.filter(
      (row) => row.formaPagoId && row.cajaId && parseAmount(row.importe) > 0
    )
    if (mediosValidos.length === 0) {
      setFormError("Debe cargar al menos un medio válido con forma de pago, caja e importe.")
      return
    }

    if (
      form.medios.some(
        (row) => (row.formaPagoId || row.cajaId || row.importe) && parseAmount(row.importe) <= 0
      )
    ) {
      setFormError("Los importes de medios deben ser mayores a cero.")
      return
    }

    if (
      form.imputaciones.some(
        (row) =>
          !row.comprobanteId ||
          parseAmount(row.importe) <= 0 ||
          Number.isNaN(parseAmount(row.importe))
      )
    ) {
      setFormError("Cada imputación debe indicar comprobante e importe válido.")
      return
    }

    const comprobantesDuplicados = new Set<string>()
    for (const row of form.imputaciones) {
      if (comprobantesDuplicados.has(row.comprobanteId)) {
        setFormError("No puede repetir el mismo comprobante en varias imputaciones.")
        return
      }
      comprobantesDuplicados.add(row.comprobanteId)

      const comprobante = pendingDocs.find((item) => item.id === Number(row.comprobanteId))
      if (comprobante && parseAmount(row.importe) > comprobante.saldo) {
        setFormError(`La imputación supera el saldo de ${formatComprobanteReference(comprobante)}.`)
        return
      }
    }

    const chequesDuplicados = new Set<string>()
    for (const row of mediosValidos) {
      if (!row.chequeId) continue
      if (chequesDuplicados.has(row.chequeId)) {
        setFormError("No puede repetir el mismo cheque en varios medios del recibo.")
        return
      }
      chequesDuplicados.add(row.chequeId)
    }

    if (formTotals.imputaciones > formTotals.medios) {
      setFormError("La suma imputada no puede superar el total cobrado.")
      return
    }

    const dto: RegistrarCobroDto = {
      sucursalId,
      terceroId: Number(form.terceroId),
      fecha: form.fecha,
      medios: mediosValidos.map((row) => {
        const selectedCaja = cajas.find((item) => item.id === Number(row.cajaId))
        return {
          formaPagoId: Number(row.formaPagoId),
          cajaId: Number(row.cajaId),
          importe: parseAmount(row.importe),
          monedaId: selectedCaja?.monedaId ?? currentCustomer?.monedaId ?? 1,
          cotizacion: 1,
          chequeId: row.chequeId ? Number(row.chequeId) : undefined,
        }
      }),
      imputaciones:
        form.imputaciones.length > 0
          ? form.imputaciones.map((row) => ({
              comprobanteId: Number(row.comprobanteId),
              importe: parseAmount(row.importe),
            }))
          : undefined,
    }

    setSaving(true)
    setFormError(null)
    const ok = await registrar(dto)
    setSaving(false)

    if (!ok) {
      setFormError("No se pudo registrar el cobro.")
      return
    }

    resetForm()
    setIsFormOpen(false)
    await refetch()
  }

  const handleDetail = async (id: number) => {
    setDetailOpen(true)
    setDetailLoading(true)
    const loaded = await getById(id)
    setDetail(loaded)
    setDetailLoading(false)
  }

  const handleAnnul = async (id: number) => {
    if (!window.confirm(`¿Anular cobro #${id}?`)) return
    const ok = await anular(id)
    if (ok) await refetch()
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cobros</h1>
          <p className="mt-1 text-muted-foreground">
            Mesa de recibos y cobranza con múltiples medios, imputación parcial y lectura operativa
            de cartera usando el contrato real hoy disponible.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="bg-transparent" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Recargar
          </Button>
          <Button
            onClick={() => {
              resetForm()
              setIsFormOpen(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Nuevo cobro
          </Button>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertDescription>
          Esta pantalla ya soporta recibos compuestos, ventanilla, cheque de cartera opcional e
          imputación parcial. La conciliación avanzada y los lotes automáticos siguen dependiendo de
          backend específico.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-slate-200 bg-slate-50/70">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Cobros</p>
            <p className="mt-2 text-2xl font-bold text-slate-950">{totals.count}</p>
            <p className="mt-1 text-xs text-slate-600">
              {totals.active} activos y {totals.annulled} anulados.
            </p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50/80">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs uppercase tracking-[0.18em] text-emerald-700">Importe visible</p>
            <p className="mt-2 text-2xl font-bold text-emerald-950">{formatMoney(totals.amount)}</p>
            <p className="mt-1 text-xs text-emerald-800">
              Movimiento acumulado para la sucursal actual.
            </p>
          </CardContent>
        </Card>
        <Card className="border-sky-200 bg-sky-50/80">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs uppercase tracking-[0.18em] text-sky-700">Clientes</p>
            <p className="mt-2 text-2xl font-bold text-sky-950">{totals.customers}</p>
            <p className="mt-1 text-xs text-sky-800">
              Terceros con cobros visibles en esta bandeja.
            </p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/80">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs uppercase tracking-[0.18em] text-amber-700">Saldo pendiente</p>
            <p className="mt-2 text-2xl font-bold text-amber-950">{formatMoney(pendingTotal)}</p>
            <p className="mt-1 text-xs text-amber-800">
              Sobre {pendingDocs.length} documentos del cliente en edición.
            </p>
          </CardContent>
        </Card>
      </div>

      {highlighted ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardDescription>Recibo destacado</CardDescription>
              <CardTitle className="mt-1 text-xl">
                {formatCobroReference(
                  highlighted,
                  customerMap.get(highlighted.terceroId)?.razonSocial ??
                    `Cliente #${highlighted.terceroId}`
                )}
              </CardTitle>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                Registrado el {formatDate(highlighted.fecha)} con total{" "}
                {formatMoney(highlighted.total)}.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {renderStatusBadge(highlighted.estado)}
              <Badge variant="outline">Sucursal {highlighted.sucursalId}</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-4">
            <div className="rounded-lg bg-background/70 p-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Cliente</p>
              <p className="mt-1 text-sm font-medium wrap-break-word">
                {customerMap.get(highlighted.terceroId)?.razonSocial ?? `#${highlighted.terceroId}`}
              </p>
            </div>
            <div className="rounded-lg bg-background/70 p-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Fecha</p>
              <p className="mt-1 text-sm font-medium">{formatDate(highlighted.fecha)}</p>
            </div>
            <div className="rounded-lg bg-background/70 p-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Estado</p>
              <p className="mt-1 text-sm font-medium">{highlighted.estado}</p>
            </div>
            <div className="rounded-lg bg-background/70 p-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Importe</p>
              <p className="mt-1 text-sm font-medium">{formatMoney(highlighted.total)}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" /> Filtros de recibos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_220px_260px_180px_180px]">
            <div className="relative md:col-span-2 xl:col-span-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-10"
                placeholder="Buscar por recibo, cliente o estado..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="APLICADO">Aplicado</SelectItem>
                <SelectItem value="ANULADO">Anulado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={customerFilter} onValueChange={setCustomerFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los clientes</SelectItem>
                {clientes.map((row) => (
                  <SelectItem key={row.id} value={String(row.id)}>
                    {row.razonSocial}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="space-y-1.5">
              <Label>Desde</Label>
              <Input type="date" value={desde} onChange={(event) => setDesde(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Hasta</Label>
              <Input type="date" value={hasta} onChange={(event) => setHasta(event.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Cobros registrados ({filteredCobros.length})</CardTitle>
              <CardDescription>
                Lectura operativa del circuito actual con anulación y detalle por medios.
              </CardDescription>
            </div>
            <Button variant="outline" className="bg-transparent" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" /> Recargar
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recibo</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!loading && filteredCobros.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                        No hay cobros visibles para los filtros actuales.
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {filteredCobros.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">#{row.id}</TableCell>
                      <TableCell>
                        {customerMap.get(row.terceroId)?.razonSocial ?? `#${row.terceroId}`}
                      </TableCell>
                      <TableCell>{formatDate(row.fecha)}</TableCell>
                      <TableCell>{renderStatusBadge(row.estado)}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatMoney(row.total)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="icon" variant="ghost" onClick={() => handleDetail(row.id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {row.estado !== "ANULADO" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-transparent"
                              onClick={() => handleAnnul(row.id)}
                            >
                              Anular
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-base">Cobertura operativa</CardTitle>
              <CardDescription>Qué cubre hoy la pantalla de cobros.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-lg border bg-muted/30 p-3">
                Múltiples medios de cobro en un mismo recibo con caja y forma de pago reales.
              </div>
              <div className="rounded-lg border bg-muted/30 p-3">
                Imputación parcial a comprobantes pendientes y remanente explícito a cuenta
                corriente.
              </div>
              <div className="rounded-lg border bg-muted/30 p-3">
                Cheques de cartera opcionales cuando la caja dispone documentos vinculables.
              </div>
            </CardContent>
          </Card>

          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-base">Cliente en edición</CardTitle>
              <CardDescription>Resumen de la cartera del recibo en armado.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center gap-2 font-medium">
                  <Layers3 className="h-4 w-4" /> Cliente
                </div>
                <p className="mt-2 text-muted-foreground wrap-break-word">
                  {currentCustomer?.razonSocial ?? "Sin seleccionar"}
                </p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center gap-2 font-medium">
                  <CalendarRange className="h-4 w-4" /> Documentos pendientes
                </div>
                <p className="mt-2 text-muted-foreground">
                  {pendingDocs.length} pendientes por {formatMoney(pendingTotal)}.
                </p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center gap-2 font-medium">
                  <Wallet className="h-4 w-4" /> Sucursal operativa
                </div>
                <p className="mt-2 text-muted-foreground">
                  {currentSucursal?.descripcion ?? "Sin sucursal activa"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
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
          </Button>
        </div>
      ) : null}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <SalesDialogContent size="xl">
          <DialogHeader>
            <DialogTitle>Nuevo cobro</DialogTitle>
            <DialogDescription>
              Alta real con múltiples medios e imputaciones, alineada al contrato vigente del
              backend.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card className="border-slate-200 bg-slate-50/70">
              <CardContent className="space-y-1 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Modo</p>
                <p className="text-base font-semibold text-slate-950">{MODE_LABELS[form.mode]}</p>
                <p className="text-xs text-slate-600">{MODE_DESCRIPTIONS[form.mode]}</p>
              </CardContent>
            </Card>
            <Card className="border-emerald-200 bg-emerald-50/80">
              <CardContent className="space-y-1 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-emerald-700">Medios</p>
                <p className="text-base font-semibold text-emerald-950">
                  {formatMoney(formTotals.medios)}
                </p>
                <p className="text-xs text-emerald-800">{form.medios.length} medio(s) cargados</p>
              </CardContent>
            </Card>
            <Card className="border-sky-200 bg-sky-50/80">
              <CardContent className="space-y-1 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-sky-700">Imputado</p>
                <p className="text-base font-semibold text-sky-950">
                  {formatMoney(formTotals.imputaciones)}
                </p>
                <p className="text-xs text-sky-800">
                  {form.imputaciones.length} aplicación(es) cargadas
                </p>
              </CardContent>
            </Card>
            <Card className="border-amber-200 bg-amber-50/80">
              <CardContent className="space-y-1 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-amber-700">A cuenta</p>
                <p className="text-base font-semibold text-amber-950">
                  {formatMoney(formTotals.aCuentaCorriente)}
                </p>
                <p className="text-xs text-amber-800">Remanente que no se asigna a documentos.</p>
              </CardContent>
            </Card>
          </div>

          {formWarnings.length > 0 ? (
            <Card className="border-amber-200 bg-amber-50/60">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-amber-950">
                  <AlertCircle className="h-4 w-4" /> Pendientes antes de registrar
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 md:grid-cols-2">
                {formWarnings.map((warning) => (
                  <div
                    key={warning}
                    className="rounded-lg border border-amber-200 bg-background/80 px-3 py-2 text-sm text-slate-700"
                  >
                    {warning}
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-[1.35fr_0.95fr]">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Cabecera del recibo</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5 md:col-span-2">
                    <Label>Cliente</Label>
                    <Select
                      value={form.terceroId}
                      onValueChange={(value) =>
                        setForm((prev) => ({ ...prev, terceroId: value, imputaciones: [] }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clientes.map((row) => (
                          <SelectItem key={row.id} value={String(row.id)}>
                            {row.razonSocial}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Fecha</Label>
                    <Input
                      type="date"
                      value={form.fecha}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, fecha: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Modo operativo</Label>
                    <Select
                      value={form.mode}
                      onValueChange={(value: CobroMode) =>
                        setForm((prev) => ({ ...prev, mode: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="simple">Cobro simple</SelectItem>
                        <SelectItem value="ventanilla">Cobro por ventanilla</SelectItem>
                        <SelectItem value="recibo-masivo">Recibo masivo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label>Observaciones operativas</Label>
                    <Textarea
                      rows={3}
                      value={form.observacion}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, observacion: event.target.value }))
                      }
                      placeholder="Referencia interna, lote, comentario de cobranza o aclaración de caja"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-base">Medios de cobro</CardTitle>
                    <CardDescription>
                      El recibo puede concentrar efectivo, transferencias, cheques y otros medios en
                      una sola registración.
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="bg-transparent"
                    onClick={addPayment}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Agregar medio
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {form.medios.map((medio, index) => {
                    const cajaId = Number(medio.cajaId)
                    const cartera = cajaId ? (carteraByCaja[cajaId] ?? []) : []
                    const isLoadingCartera = cajaId ? loadingCartera[cajaId] : false
                    return (
                      <div key={medio.id} className="rounded-lg border p-4">
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">Medio {index + 1}</p>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => removePayment(medio.id)}
                            disabled={form.medios.length === 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                          <div className="space-y-1.5">
                            <Label>Forma de pago</Label>
                            <Select
                              value={medio.formaPagoId}
                              onValueChange={(value) =>
                                updatePayment(medio.id, { formaPagoId: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar forma" />
                              </SelectTrigger>
                              <SelectContent>
                                {formasPago.map((row) => (
                                  <SelectItem key={row.id} value={String(row.id)}>
                                    {row.descripcion}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label>Caja</Label>
                            <Select
                              value={medio.cajaId}
                              onValueChange={(value) => updatePayment(medio.id, { cajaId: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar caja" />
                              </SelectTrigger>
                              <SelectContent>
                                {cajas.map((row) => (
                                  <SelectItem key={row.id} value={String(row.id)}>
                                    {row.nombre}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label>Cheque de cartera</Label>
                            <Select
                              value={medio.chequeId}
                              onValueChange={(value) => {
                                const cheque = cartera.find((item) => item.id === Number(value))
                                updatePayment(medio.id, {
                                  chequeId: value,
                                  importe: cheque ? String(cheque.importe) : medio.importe,
                                })
                              }}
                              disabled={!medio.cajaId || cartera.length === 0}
                            >
                              <SelectTrigger>
                                <SelectValue
                                  placeholder={
                                    !medio.cajaId
                                      ? "Primero seleccione caja"
                                      : isLoadingCartera
                                        ? "Cargando cartera..."
                                        : cartera.length === 0
                                          ? "Sin cheques disponibles"
                                          : "Cheque opcional"
                                  }
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {cartera.map((cheque) => (
                                  <SelectItem key={cheque.id} value={String(cheque.id)}>
                                    {`${cheque.nroCheque} · ${formatMoney(cheque.importe)} · ${cheque.banco ?? "Banco"}`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label>Importe</Label>
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              value={medio.importe}
                              onChange={(event) =>
                                updatePayment(medio.id, { importe: event.target.value })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-base">Imputaciones</CardTitle>
                    <CardDescription>
                      Aplicación contra comprobantes pendientes del cliente. Lo no imputado queda a
                      cuenta corriente.
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="bg-transparent"
                    onClick={addAllocation}
                    disabled={!form.terceroId || pendingDocs.length === 0}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Agregar imputación
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!form.terceroId ? (
                    <p className="text-sm text-muted-foreground">
                      Seleccione un cliente para ver comprobantes pendientes.
                    </p>
                  ) : null}
                  {form.terceroId && pendingDocs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      El cliente no tiene comprobantes con saldo pendiente.
                    </p>
                  ) : null}
                  {form.imputaciones.map((imputacion, index) => (
                    <div key={imputacion.id} className="rounded-lg border p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">Imputación {index + 1}</p>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => removeAllocation(imputacion.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid gap-4 md:grid-cols-[1fr_180px]">
                        <div className="space-y-1.5">
                          <Label>Comprobante</Label>
                          <Select
                            value={imputacion.comprobanteId}
                            onValueChange={(value) =>
                              updateAllocation(imputacion.id, { comprobanteId: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar comprobante" />
                            </SelectTrigger>
                            <SelectContent>
                              {pendingDocs.map((row) => (
                                <SelectItem key={row.id} value={String(row.id)}>
                                  {`${formatComprobanteReference(row)} · saldo ${formatMoney(row.saldo)}`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Importe</Label>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={imputacion.importe}
                            onChange={(event) =>
                              updateAllocation(imputacion.id, { importe: event.target.value })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Resumen operativo</CardTitle>
                  <CardDescription>
                    Lectura del recibo antes de registrar el movimiento real.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Modo</span>
                    <Badge variant="secondary">{MODE_LABELS[form.mode]}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total medios</span>
                    <span className="font-medium">{formatMoney(formTotals.medios)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total imputado</span>
                    <span className="font-medium">{formatMoney(formTotals.imputaciones)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t pt-3">
                    <span className="text-muted-foreground">A cuenta corriente</span>
                    <span className="font-medium">{formatMoney(formTotals.aCuentaCorriente)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Cliente y cartera</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Cliente:{" "}
                    <span className="font-medium text-foreground">
                      {currentCustomer?.razonSocial ?? "Sin seleccionar"}
                    </span>
                  </p>
                  <p>Sucursal: {currentSucursal?.descripcion ?? "Sin sucursal"}</p>
                  <p>Comprobantes pendientes: {pendingDocs.length}</p>
                  <p>Saldo pendiente visible: {formatMoney(pendingTotal)}</p>
                  <p>
                    Cobertura actual: cobros reales, múltiples medios, cheques de cartera opcionales
                    e imputación puntual por documento.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Pendientes del cliente</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {pendingDocs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No hay documentos pendientes para el cliente actual.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Comprobante</TableHead>
                            <TableHead>Fecha</TableHead>
                            <TableHead className="text-right">Saldo</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pendingDocs.slice(0, 6).map((row) => (
                            <TableRow key={row.id}>
                              <TableCell>{formatComprobanteReference(row)}</TableCell>
                              <TableCell>{formatDate(row.fecha)}</TableCell>
                              <TableCell className="text-right">{formatMoney(row.saldo)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {formError ? <p className="text-sm text-red-500">{formError}</p> : null}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              className="bg-transparent"
              onClick={() => {
                setIsFormOpen(false)
                resetForm()
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Guardando..." : "Registrar cobro"}
            </Button>
          </div>
        </SalesDialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <SalesDialogContent size="md">
          <DialogHeader>
            <DialogTitle>Detalle de cobro</DialogTitle>
            <DialogDescription>
              Medios registrados y cobertura disponible para el recibo seleccionado.
            </DialogDescription>
          </DialogHeader>
          {detailLoading ? (
            <div className="py-10 text-center text-muted-foreground">Cargando detalle...</div>
          ) : detail ? (
            <Tabs defaultValue="principal" className="w-full">
              <SalesTabsList className="md:grid-cols-3">
                <TabsTrigger value="principal">Principal</TabsTrigger>
                <TabsTrigger value="medios">Medios</TabsTrigger>
                <TabsTrigger value="cobertura">Cobertura</TabsTrigger>
              </SalesTabsList>
              <TabsContent value="principal" className="space-y-4 pt-4">
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-lg bg-muted/40 p-3">
                    <span className="mb-1 block text-xs text-muted-foreground">Cliente</span>
                    <p className="text-sm font-medium">
                      {customerMap.get(detail.terceroId)?.razonSocial ?? `#${detail.terceroId}`}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <span className="mb-1 block text-xs text-muted-foreground">Fecha</span>
                    <p className="text-sm font-medium">{formatDate(detail.fecha)}</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <span className="mb-1 block text-xs text-muted-foreground">Estado</span>
                    <p className="text-sm font-medium">{detail.estado}</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <span className="mb-1 block text-xs text-muted-foreground">Total</span>
                    <p className="text-sm font-medium">{formatMoney(detail.total)}</p>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="medios" className="space-y-4 pt-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Forma pago</TableHead>
                        <TableHead>Caja</TableHead>
                        <TableHead>Moneda</TableHead>
                        <TableHead className="text-right">Importe</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.medios.map((medio) => (
                        <TableRow key={medio.id}>
                          <TableCell>{medio.formaPagoDescripcion}</TableCell>
                          <TableCell>{medio.cajaDescripcion}</TableCell>
                          <TableCell>{medio.monedaSimbolo}</TableCell>
                          <TableCell className="text-right">{formatMoney(medio.importe)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
              <TabsContent value="cobertura" className="space-y-4 pt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Landmark className="h-4 w-4" /> Cobertura actual
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 text-sm text-muted-foreground md:grid-cols-2">
                    <div className="rounded-lg border p-4">
                      El backend devuelve el encabezado del cobro y sus medios registrados.
                    </div>
                    <div className="rounded-lg border p-4">
                      La trazabilidad completa de imputaciones y conciliación avanzada sigue
                      reservada para una integración posterior.
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="py-10 text-center text-muted-foreground">
              No se pudo cargar el detalle del cobro.
            </div>
          )}
        </SalesDialogContent>
      </Dialog>
    </div>
  )
}
