"use client"

import { useMemo, useState } from "react"
import {
  AlertCircle,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Eye,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
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
import { useCajas } from "@/lib/hooks/useCajas"
import { useCheques } from "@/lib/hooks/useCheques"
import { useDefaultSucursalId, useSucursales } from "@/lib/hooks/useSucursales"
import { useTerceros } from "@/lib/hooks/useTerceros"
import type { Cheque, CreateChequeDto } from "@/lib/types/cheques"
import type { Tercero } from "@/lib/types/terceros"

function formatMoney(value: number) {
  return value.toLocaleString("es-AR", { style: "currency", currency: "ARS" })
}

function formatDate(value?: string | null) {
  if (!value) return "-"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString("es-AR")
}

function buildOffsetIsoDate(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

function getChequeKind(row: Cheque) {
  return row.terceroId ? "Cheque de tercero" : "Cheque propio"
}

function getStateMeta(status: string) {
  if (status === "RECHAZADO") {
    return { label: "Rechazado", variant: "destructive" as const, note: "Exige revisión y reprocesamiento." }
  }
  if (status === "ACREDITADO") {
    return { label: "Acreditado", variant: "default" as const, note: "Ya impactó como valor acreditado." }
  }
  if (status === "DEPOSITADO") {
    return { label: "Depositado", variant: "secondary" as const, note: "Pendiente de acreditación bancaria." }
  }
  if (status === "ENTREGADO") {
    return { label: "Entregado", variant: "outline" as const, note: "Salió de cartera por entrega a tercero." }
  }
  return { label: "Emitido", variant: "outline" as const, note: "Sigue disponible en cartera operativa." }
}

function getDueStatus(row: Cheque) {
  if (!row.fechaVencimiento) return "Sin vencimiento informado"

  const today = new Date()
  const target = new Date(row.fechaVencimiento)
  if (Number.isNaN(target.getTime())) return "Vencimiento inválido"

  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  const offset = Math.floor((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (row.estado === "RECHAZADO") return "Fuera de circuito por rechazo"
  if (row.estado === "ACREDITADO" || row.estado === "ENTREGADO") return "Circuito resuelto"
  if (offset < 0) return `Vencido hace ${Math.abs(offset)} días`
  if (offset === 0) return "Vence hoy"
  if (offset <= 7) return `Vence en ${offset} días`
  return `Vence en ${offset} días`
}

function formatCustomerAddress(customer?: Tercero | null) {
  if (!customer) return "Sin domicilio visible"

  const parts = [
    [customer.calle, customer.nro].filter(Boolean).join(" "),
    customer.localidadDescripcion,
    customer.codigoPostal,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(" · ") : "Sin domicilio visible"
}

function MetricCard({
  title,
  value,
  description,
}: {
  title: string
  value: string | number
  description: string
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

function DetailFieldGrid({ fields }: { fields: Array<{ label: string; value: string }> }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {fields.map((field) => (
        <div key={field.label} className="rounded-xl border bg-muted/30 p-3">
          <span className="mb-1 block text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {field.label}
          </span>
          <p className="text-sm font-medium wrap-break-word">{field.value}</p>
        </div>
      ))}
    </div>
  )
}

type DraftForm = {
  cajaId: string
  terceroId: string
  nroCheque: string
  banco: string
  importe: string
  fechaEmision: string
  fechaVencimiento: string
}

const EMPTY_FORM: DraftForm = {
  cajaId: "",
  terceroId: "none",
  nroCheque: "",
  banco: "",
  importe: "",
  fechaEmision: new Date().toISOString().slice(0, 10),
  fechaVencimiento: "",
}

function ChequeForm({
  cajas,
  terceros,
  onClose,
  onSaved,
  crear,
}: {
  cajas: Array<{ id: number; nombre: string; saldoActual?: number }>
  terceros: Tercero[]
  onClose: () => void
  onSaved: () => void
  crear: (dto: CreateChequeDto) => Promise<boolean>
}) {
  const [tab, setTab] = useState("ficha")
  const [form, setForm] = useState<DraftForm>(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const selectedCaja = cajas.find((row) => row.id === Number(form.cajaId)) ?? null
  const selectedTercero =
    form.terceroId !== "none"
      ? terceros.find((row) => row.id === Number(form.terceroId)) ?? null
      : null
  const formAmount = Number(form.importe || 0)

  const handleSave = async () => {
    if (!form.cajaId || !form.nroCheque.trim() || !form.importe || !form.fechaEmision) {
      setError("Caja, número, importe y fecha de emisión son obligatorios")
      return
    }

    const dto: CreateChequeDto = {
      cajaId: Number(form.cajaId),
      terceroId: form.terceroId === "none" ? undefined : Number(form.terceroId),
      nroCheque: form.nroCheque.trim(),
      banco: form.banco.trim() || undefined,
      importe: Number(form.importe),
      monedaId: 1,
      fechaEmision: form.fechaEmision,
      fechaVencimiento: form.fechaVencimiento || undefined,
    }

    setSaving(true)
    setError(null)
    const ok = await crear(dto)
    setSaving(false)

    if (!ok) {
      setError("No se pudo registrar el cheque")
      return
    }

    onSaved()
  }

  return (
    <div className="space-y-5">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          El legado también manejaba chequeras, rango de numeración, cheques cruzados, a la orden y
          validaciones por forma de pago/caja. El backend actual todavía expone sólo registro básico
          y transiciones de cartera, así que esta pantalla cubre ese alcance de forma explícita.
        </AlertDescription>
      </Alert>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid h-auto w-full grid-cols-3">
          <TabsTrigger value="ficha" className="py-2 text-xs">
            Ficha
          </TabsTrigger>
          <TabsTrigger value="origen" className="py-2 text-xs">
            Origen
          </TabsTrigger>
          <TabsTrigger value="control" className="py-2 text-xs">
            Control
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ficha" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Caja</Label>
              <Select value={form.cajaId} onValueChange={(value) => setForm((prev) => ({ ...prev, cajaId: value }))}>
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
              <Label>Número de cheque</Label>
              <Input
                value={form.nroCheque}
                onChange={(event) => setForm((prev) => ({ ...prev, nroCheque: event.target.value }))}
                placeholder="Numeración bancaria o interna"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Banco</Label>
              <Input
                value={form.banco}
                onChange={(event) => setForm((prev) => ({ ...prev, banco: event.target.value }))}
                placeholder="Banco emisor"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Importe</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.importe}
                onChange={(event) => setForm((prev) => ({ ...prev, importe: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha emisión</Label>
              <Input
                type="date"
                value={form.fechaEmision}
                onChange={(event) => setForm((prev) => ({ ...prev, fechaEmision: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha vencimiento</Label>
              <Input
                type="date"
                value={form.fechaVencimiento}
                onChange={(event) => setForm((prev) => ({ ...prev, fechaVencimiento: event.target.value }))}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="origen" className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <div className="space-y-1.5">
              <Label>Tercero librador</Label>
              <Select
                value={form.terceroId}
                onValueChange={(value) => setForm((prev) => ({ ...prev, terceroId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tercero" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin tercero asociado</SelectItem>
                  {terceros.map((row) => (
                    <SelectItem key={row.id} value={String(row.id)}>
                      {row.razonSocial}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Lectura comercial</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="rounded-xl border p-3">
                  <p className="font-medium">Tipo inferido</p>
                  <p className="text-muted-foreground">
                    {selectedTercero ? "Cheque de tercero en cartera" : "Cheque propio o sin librador externo"}
                  </p>
                </div>
                <div className="rounded-xl border p-3">
                  <p className="font-medium">Tercero</p>
                  <p className="text-muted-foreground wrap-break-word">
                    {selectedTercero?.razonSocial ?? "Sin tercero asociado"}
                  </p>
                </div>
                <div className="rounded-xl border p-3">
                  <p className="font-medium">Domicilio</p>
                  <p className="text-muted-foreground wrap-break-word">
                    {formatCustomerAddress(selectedTercero)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="control" className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.9fr]">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cobertura actual</CardTitle>
              </CardHeader>
              <CardContent>
                <DetailFieldGrid
                  fields={[
                    { label: "Caja", value: selectedCaja?.nombre ?? "Sin caja" },
                    {
                      label: "Saldo caja",
                      value:
                        selectedCaja?.saldoActual !== undefined
                          ? formatMoney(selectedCaja.saldoActual)
                          : "Sin saldo visible",
                    },
                    {
                      label: "Importe cheque",
                      value: formAmount > 0 ? formatMoney(formAmount) : "Sin importe",
                    },
                    { label: "Emisión", value: formatDate(form.fechaEmision) },
                    { label: "Vencimiento", value: formatDate(form.fechaVencimiento) },
                    {
                      label: "Pendiente backend",
                      value: "Chequera, cruzado, no a la orden y cuenta bancaria aún no expuestos.",
                    },
                  ]}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Resumen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="rounded-xl border p-3 text-muted-foreground">
                  La pantalla ya cubre el alta real y las transiciones básicas de cartera.
                </div>
                <div className="rounded-xl border p-3 text-muted-foreground">
                  El legado validaba rango por chequera y forma de pago habilitada por caja.
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button variant="outline" className="bg-transparent" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Registrando..." : "Registrar cheque"}
        </Button>
      </div>
    </div>
  )
}

function ChequeDetail({
  cheque,
  customer,
  cajaNombre,
}: {
  cheque: Cheque
  customer?: Tercero | null
  cajaNombre: string
}) {
  const status = getStateMeta(cheque.estado)

  return (
    <Tabs defaultValue="ficha" className="w-full">
      <TabsList className="grid h-auto w-full grid-cols-3">
        <TabsTrigger value="ficha">Ficha</TabsTrigger>
        <TabsTrigger value="comercial">Comercial</TabsTrigger>
        <TabsTrigger value="control">Control</TabsTrigger>
      </TabsList>

      <TabsContent value="ficha" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cabecera documental</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailFieldGrid
              fields={[
                { label: "Número", value: cheque.nroCheque },
                { label: "Tipo", value: getChequeKind(cheque) },
                { label: "Caja", value: cajaNombre },
                { label: "Banco", value: cheque.banco ?? "Sin banco informado" },
                { label: "Importe", value: formatMoney(cheque.importe) },
                { label: "Estado", value: status.label },
                { label: "Fecha emisión", value: formatDate(cheque.fechaEmision) },
                { label: "Fecha vencimiento", value: formatDate(cheque.fechaVencimiento) },
              ]}
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="comercial" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Librador y contexto</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailFieldGrid
              fields={[
                { label: "Tercero", value: customer?.razonSocial ?? "Sin tercero asociado" },
                {
                  label: "Condición IVA",
                  value: customer?.condicionIvaDescripcion ?? "Sin condición visible",
                },
                { label: "Documento", value: customer?.nroDocumento ?? "Sin documento" },
                { label: "Domicilio", value: formatCustomerAddress(customer) },
                {
                  label: "Canales",
                  value:
                    [customer?.telefono, customer?.celular, customer?.email].filter(Boolean).join(" · ") ||
                    "Sin canales visibles",
                },
                {
                  label: "Observación",
                  value: customer?.observacion ?? "Sin observaciones visibles",
                },
              ]}
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="control" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estado y acción</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailFieldGrid
              fields={[
                { label: "Estado operativo", value: status.note },
                { label: "Vencimiento", value: getDueStatus(cheque) },
                {
                  label: "Cobertura actual",
                  value:
                    "Depósito, acreditación, rechazo y entrega disponibles. Chequera, cruzado, a la orden y boleta siguen fuera del contrato.",
                },
              ]}
            />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

export default function VentasChequesPage() {
  const sucursalId = useDefaultSucursalId()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("todos")
  const [cajaFilter, setCajaFilter] = useState("todos")
  const [kindFilter, setKindFilter] = useState("todos")
  const [desde, setDesde] = useState("")
  const [hasta, setHasta] = useState("")
  const [detailId, setDetailId] = useState<number | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)

  const effectiveCajaId = cajaFilter === "todos" ? undefined : Number(cajaFilter)
  const effectiveStatus = statusFilter === "todos" ? undefined : statusFilter

  const { cheques, loading, error, crear, depositar, acreditar, rechazar, entregar, refetch, page, setPage, totalPages } =
    useCheques({
      cajaId: effectiveCajaId,
      estado: effectiveStatus,
      desde: desde || undefined,
      hasta: hasta || undefined,
    })
  const { cajas } = useCajas(sucursalId)
  const { sucursales } = useSucursales()
  const { terceros } = useTerceros({ soloActivos: false, sucursalId: sucursalId ?? null })

  const thirdPartyMap = useMemo(() => new Map(terceros.map((row) => [row.id, row])), [terceros])
  const cajaMap = useMemo(() => new Map(cajas.map((row) => [row.id, row])), [cajas])
  const currentSucursal = sucursales.find((row) => row.id === sucursalId) ?? null

  const filtered = useMemo(() => {
    const normalized = searchTerm.toLowerCase().trim()

    return cheques.filter((row) => {
      const customerName = row.terceroId
        ? thirdPartyMap.get(row.terceroId)?.razonSocial ?? `#${row.terceroId}`
        : "sin tercero"
      const matchesSearch =
        normalized === "" ||
        [row.nroCheque, row.banco ?? "", customerName, getChequeKind(row)]
          .join(" ")
          .toLowerCase()
          .includes(normalized)
      const matchesKind =
        kindFilter === "todos" ||
        (kindFilter === "terceros" ? Boolean(row.terceroId) : !row.terceroId)

      return matchesSearch && matchesKind
    })
  }, [cheques, kindFilter, searchTerm, thirdPartyMap])

  const totals = useMemo(
    () => ({
      count: filtered.length,
      amount: filtered.reduce((sum, row) => sum + Number(row.importe ?? 0), 0),
      pending: filtered.filter((row) => row.estado === "EMITIDO" || row.estado === "DEPOSITADO").length,
      rejected: filtered.filter((row) => row.estado === "RECHAZADO").length,
      upcoming: filtered.filter((row) => {
        if (!row.fechaVencimiento) return false
        const target = new Date(row.fechaVencimiento)
        const now = new Date()
        const diff = target.getTime() - now.getTime()
        return diff >= 0 && diff <= 1000 * 60 * 60 * 24 * 7
      }).length,
      terceros: filtered.filter((row) => Boolean(row.terceroId)).length,
    }),
    [filtered]
  )

  const highlighted = useMemo(
    () => filtered.find((row) => row.estado === "DEPOSITADO") ?? filtered.find((row) => row.estado === "EMITIDO") ?? filtered[0] ?? null,
    [filtered]
  )
  const highlightedCustomer = highlighted?.terceroId ? thirdPartyMap.get(highlighted.terceroId) ?? null : null
  const detailCheque = detailId !== null ? filtered.find((row) => row.id === detailId) ?? cheques.find((row) => row.id === detailId) ?? null : null

  const handleCreateSaved = async () => {
    setIsFormOpen(false)
    await refetch()
  }

  const handleDeposit = async (id: number) => {
    if (!window.confirm(`¿Depositar cheque #${id}?`)) return
    const today = new Date().toISOString().slice(0, 10)
    const accreditation = buildOffsetIsoDate(2)
    await depositar(id, today, accreditation)
  }

  const handleAccredit = async (id: number) => {
    if (!window.confirm(`¿Acreditar cheque #${id}?`)) return
    const today = new Date().toISOString().slice(0, 10)
    await acreditar(id, today)
  }

  const handleReject = async (id: number) => {
    if (!window.confirm(`¿Rechazar cheque #${id}?`)) return
    await rechazar(id, "Rechazo operativo registrado desde ventas")
  }

  const handleDeliver = async (id: number) => {
    if (!window.confirm(`¿Entregar cheque #${id}?`)) return
    await entregar(id)
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Cheques</h1>
          <p className="text-muted-foreground">
            Consola de cartera para cheques propios y de terceros. Reinterpreta el flujo legado de
            cheques, ventanilla y control bancario, pero sin simular chequeras ni datos de banco que
            el contrato actual todavía no expone.
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo cheque
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Cheques visibles"
          value={totals.count}
          description="Cartera filtrada con lectura operativa actual." 
        />
        <MetricCard
          title="Importe visible"
          value={formatMoney(totals.amount)}
          description="Suma de la cartera filtrada en pantalla."
        />
        <MetricCard
          title="Pendientes de banco"
          value={totals.pending}
          description="Emitidos o depositados que aún no cerraron el circuito."
        />
        <MetricCard
          title="Rechazados"
          value={totals.rejected}
          description="Casos que requieren revisión comercial o bancaria."
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Vencen en 7 días"
          value={totals.upcoming}
          description="Ayuda a priorizar depósito, entrega o gestión previa al vencimiento."
        />
        <MetricCard
          title="Cheques de terceros"
          value={totals.terceros}
          description="Referencias con librador comercial asociado."
        />
        <MetricCard
          title="Caja operativa"
          value={cajas.length}
          description="Cajas visibles en la sucursal actual para registrar cartera."
        />
        <MetricCard
          title="Sucursal"
          value={currentSucursal?.descripcion ?? "Sin sucursal"}
          description="Contexto operativo actual para la cartera de ventas."
        />
      </div>

      {highlighted ? (
        <Card className="overflow-hidden border-none bg-linear-to-br from-emerald-950 via-slate-900 to-stone-900 text-emerald-50 shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl">Cheque destacado</CardTitle>
            <CardDescription className="text-emerald-200">
              {highlighted.nroCheque} · {highlightedCustomer?.razonSocial ?? getChequeKind(highlighted)}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-[1.2fr_0.9fr]">
            <div className="grid gap-3 md:grid-cols-2">
              {[
                { label: "Caja", value: cajaMap.get(highlighted.cajaId)?.nombre ?? `#${highlighted.cajaId}` },
                { label: "Banco", value: highlighted.banco ?? "Sin banco informado" },
                { label: "Tipo", value: getChequeKind(highlighted) },
                { label: "Estado", value: getStateMeta(highlighted.estado).label },
                { label: "Importe", value: formatMoney(highlighted.importe) },
                { label: "Vencimiento", value: getDueStatus(highlighted) },
              ].map((field) => (
                <div key={field.label} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-emerald-300">{field.label}</p>
                  <p className="mt-2 text-sm font-medium wrap-break-word text-emerald-50">{field.value}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-3 text-sm text-emerald-100">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                {getStateMeta(highlighted.estado).note}
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                Librador: {highlightedCustomer?.razonSocial ?? "Sin tercero asociado"}. Domicilio: {formatCustomerAddress(highlightedCustomer)}.
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                El legado manejaba cheques propios y de terceros con chequera, moneda y forma de pago por caja. Hoy se cubre registro, depósito, acreditación, rechazo y entrega.
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Filtros de cartera</CardTitle>
          <CardDescription>
            Combinan filtros reales del backend con búsqueda operativa local para número, banco y librador.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 xl:grid-cols-[1fr_220px_220px_220px_180px_180px_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-10"
                placeholder="Buscar por número, banco, tipo o tercero..."
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
                <SelectItem value="EMITIDO">Emitido</SelectItem>
                <SelectItem value="DEPOSITADO">Depositado</SelectItem>
                <SelectItem value="ACREDITADO">Acreditado</SelectItem>
                <SelectItem value="RECHAZADO">Rechazado</SelectItem>
                <SelectItem value="ENTREGADO">Entregado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={cajaFilter} onValueChange={setCajaFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Caja" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas las cajas</SelectItem>
                {cajas.map((row) => (
                  <SelectItem key={row.id} value={String(row.id)}>
                    {row.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={kindFilter} onValueChange={setKindFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los tipos</SelectItem>
                <SelectItem value="terceros">Cheques de terceros</SelectItem>
                <SelectItem value="propios">Cheques propios</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" value={desde} onChange={(event) => setDesde(event.target.value)} />
            <Input type="date" value={hasta} onChange={(event) => setHasta(event.target.value)} />
            <Button variant="outline" className="bg-transparent" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Recargar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cartera operativa ({filtered.length})</CardTitle>
          <CardDescription>
            Acciones habilitadas según el estado reportado por el backend y lectura comercial del cheque.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="w-full whitespace-nowrap">
            <Table className="min-w-7xl">
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Caja</TableHead>
                  <TableHead>Tercero</TableHead>
                  <TableHead>Banco</TableHead>
                  <TableHead>Emisión</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Importe</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!loading && filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-12 text-center text-muted-foreground">
                      No hay cheques visibles con los filtros actuales.
                    </TableCell>
                  </TableRow>
                ) : null}
                {filtered.map((row) => {
                  const status = getStateMeta(row.estado)
                  return (
                    <TableRow key={row.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setDetailId(row.id)}>
                      <TableCell className="font-medium">{row.nroCheque}</TableCell>
                      <TableCell>{getChequeKind(row)}</TableCell>
                      <TableCell>{cajaMap.get(row.cajaId)?.nombre ?? `#${row.cajaId}`}</TableCell>
                      <TableCell className="max-w-55 whitespace-normal">
                        {row.terceroId ? thirdPartyMap.get(row.terceroId)?.razonSocial ?? `#${row.terceroId}` : "Sin tercero"}
                      </TableCell>
                      <TableCell className="max-w-45 whitespace-normal">{row.banco ?? "-"}</TableCell>
                      <TableCell>{formatDate(row.fechaEmision)}</TableCell>
                      <TableCell>{formatDate(row.fechaVencimiento)}</TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">{formatMoney(row.importe)}</TableCell>
                      <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => setDetailId(row.id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {row.estado === "EMITIDO" ? (
                            <Button size="sm" variant="outline" className="bg-transparent" onClick={() => handleDeposit(row.id)}>
                              Depositar
                            </Button>
                          ) : null}
                          {row.estado === "DEPOSITADO" ? (
                            <Button size="sm" variant="outline" className="bg-transparent" onClick={() => handleAccredit(row.id)}>
                              Acreditar
                            </Button>
                          ) : null}
                          {row.estado !== "RECHAZADO" && row.estado !== "ENTREGADO" && row.estado !== "ACREDITADO" ? (
                            <Button size="sm" variant="outline" className="bg-transparent" onClick={() => handleReject(row.id)}>
                              Rechazar
                            </Button>
                          ) : null}
                          {row.estado === "EMITIDO" ? (
                            <Button size="sm" variant="outline" className="bg-transparent" onClick={() => handleDeliver(row.id)}>
                              Entregar
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="h-4 w-4" /> Cartera y caja
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            El legado cruzaba cheques con caja, forma de pago y moneda. Esta pantalla mantiene la lectura por caja y la operativa esencial mientras ese modelo se expande.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4" /> Seguimiento bancario
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Vencimiento, depósito y acreditación quedan visibles sin esconder el hecho de que todavía faltan boleta, cuenta destino y chequera.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4" /> Cobertura actual
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Alta real, depósito, acreditación, rechazo y entrega ya están resueltos sobre el backend actual. El resto se expone como límite conocido, no como placeholder engañoso.
          </CardContent>
        </Card>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo cheque</DialogTitle>
            <DialogDescription>
              Registro real de la cartera actual, con lectura más cercana al circuito histórico de ventas.
            </DialogDescription>
          </DialogHeader>
          <ChequeForm cajas={cajas} terceros={terceros} onClose={() => setIsFormOpen(false)} onSaved={handleCreateSaved} crear={crear} />
        </DialogContent>
      </Dialog>

      <Dialog open={detailCheque !== null} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailCheque?.nroCheque ?? "Detalle de cheque"}</DialogTitle>
            <DialogDescription>
              {detailCheque ? getChequeKind(detailCheque) : "Detalle operativo de la cartera"}
            </DialogDescription>
          </DialogHeader>
          {detailCheque ? (
            <ChequeDetail
              cheque={detailCheque}
              customer={detailCheque.terceroId ? thirdPartyMap.get(detailCheque.terceroId) ?? null : null}
              cajaNombre={cajaMap.get(detailCheque.cajaId)?.nombre ?? `Caja #${detailCheque.cajaId}`}
            />
          ) : null}
          <DialogFooter>
            <Button variant="outline" className="bg-transparent" onClick={() => setDetailId(null)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}