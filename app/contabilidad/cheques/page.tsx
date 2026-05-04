"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Search,
  CreditCard,
  AlertCircle,
  Plus,
  Landmark,
  ChevronLeft,
  ChevronRight,
  ArrowRightLeft,
  CalendarClock,
  ShieldAlert,
  Wallet,
} from "lucide-react"
import { useCheques } from "@/lib/hooks/useCheques"
import { useCajas } from "@/lib/hooks/useCajas"
import { useSucursales, useDefaultSucursalId } from "@/lib/hooks/useSucursales"
import { useTercerosConfig } from "@/lib/hooks/useTerceros"
import type { Cheque, CreateChequeDto } from "@/lib/types/cheques"

const estadoVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  cartera: "default",
  depositado: "outline",
  acreditado: "secondary",
  rechazado: "destructive",
  entregado: "outline",
}

const estadoLabel: Record<string, string> = {
  cartera: "En Cartera",
  depositado: "Depositado",
  acreditado: "Acreditado",
  rechazado: "Rechazado",
  entregado: "Entregado",
}

const EMPTY_FORM: CreateChequeDto = {
  cajaId: 0,
  terceroId: undefined,
  nroCheque: "",
  banco: "",
  importe: 0,
  monedaId: undefined,
  fechaEmision: new Date().toISOString().split("T")[0],
  fechaVencimiento: "",
}

function formatCurrency(value: number, symbol = "$") {
  return `${symbol} ${Number(value ?? 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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

function getDaysToDueDate(value?: string) {
  if (!value) return null

  const dueDate = new Date(`${value}T00:00:00`)
  const today = new Date()
  const todayFloor = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const diff = dueDate.getTime() - todayFloor.getTime()
  return Math.round(diff / 86400000)
}

function getChequeStatus(cheque: Cheque) {
  const daysToDue = getDaysToDueDate(cheque.fechaVencimiento)

  if (cheque.estado === "rechazado") {
    return {
      label: "Rechazado",
      tone: "destructive" as const,
      detail: "El cheque quedó observado dentro del circuito visible y requiere seguimiento.",
    }
  }

  if (cheque.estado === "acreditado") {
    return {
      label: "Acreditado",
      tone: "secondary" as const,
      detail: "El importe ya figura acreditado en el flujo de tesorería visible.",
    }
  }

  if (cheque.estado === "depositado") {
    return {
      label: "Pendiente de acreditación",
      tone: "outline" as const,
      detail: "El cheque fue depositado y todavía espera acreditación final.",
    }
  }

  if (cheque.estado === "entregado") {
    return {
      label: "Entregado",
      tone: "outline" as const,
      detail: "El valor salió de cartera y ya no integra la disponibilidad inmediata.",
    }
  }

  if (daysToDue !== null && daysToDue < 0) {
    return {
      label: "Vencido en cartera",
      tone: "destructive" as const,
      detail: "La fecha de vencimiento ya pasó y el cheque sigue en cartera visible.",
    }
  }

  if (daysToDue !== null && daysToDue <= 7) {
    return {
      label: "Próximo a vencer",
      tone: "outline" as const,
      detail: "Conviene revisar el destino de depósito o entrega dentro de la semana.",
    }
  }

  return {
    label: "Disponible en cartera",
    tone: "default" as const,
    detail: "El cheque sigue disponible dentro de la cartera operativa actual.",
  }
}

function getChequeCircuit(cheque: Cheque) {
  if (cheque.estado === "cartera") {
    return {
      label: "Cartera activa",
      detail: "El valor está disponible para depósito o entrega desde la caja seleccionada.",
    }
  }

  if (cheque.estado === "depositado") {
    return {
      label: "En clearing",
      detail: "El cheque ya salió de cartera y se encuentra en etapa intermedia de acreditación.",
    }
  }

  if (cheque.estado === "acreditado") {
    return {
      label: "Tesorería cerrada",
      detail: "El flujo principal de depósito quedó completado dentro del backend visible.",
    }
  }

  if (cheque.estado === "rechazado") {
    return {
      label: "Incidencia de cobro",
      detail: "La operatoria se interrumpió y requiere gestión manual posterior.",
    }
  }

  return {
    label: "Aplicado a pagos",
    detail: "El cheque salió del circuito de cartera para cumplir una entrega o cancelación.",
  }
}

function getLegacyCoverage(cheque: Cheque) {
  const available = [
    cheque.banco ? 1 : 0,
    cheque.monedaId ? 1 : 0,
    cheque.terceroId ? 1 : 0,
    cheque.fechaVencimiento ? 1 : 0,
  ].reduce((sum, value) => sum + value, 0)

  if (available >= 4) {
    return {
      label: "Cobertura amplia",
      detail: "El cheque visible ya incluye banco, tercero, moneda y vencimiento.",
    }
  }

  if (available >= 2) {
    return {
      label: "Cobertura parcial",
      detail:
        "La API ya cubre parte del legajo operativo, aunque faltan datos de depósito heredado.",
    }
  }

  return {
    label: "Cobertura mínima",
    detail: "Sólo se expone el núcleo de caja, número, importe, fechas y estado del valor.",
  }
}

function DetailFieldGrid({ fields }: { fields: Array<{ label: string; value: string }> }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {fields.map((field) => (
        <div key={field.label} className="rounded-lg bg-muted/40 p-3">
          <span className="mb-1 block text-xs text-muted-foreground">{field.label}</span>
          <p className="text-sm font-medium wrap-break-word">{field.value}</p>
        </div>
      ))}
    </div>
  )
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

function ChequeDetail({
  cheque,
  cajaNombre,
  monedaLabel,
}: {
  cheque: Cheque
  cajaNombre: string
  monedaLabel: string
}) {
  const status = getChequeStatus(cheque)
  const circuit = getChequeCircuit(cheque)
  const legacyCoverage = getLegacyCoverage(cheque)
  const daysToDue = getDaysToDueDate(cheque.fechaVencimiento)

  const principalFields = [
    { label: "N° cheque", value: cheque.nroCheque },
    { label: "Caja origen", value: cajaNombre },
    { label: "Banco", value: cheque.banco ?? "-" },
    { label: "Estado", value: estadoLabel[cheque.estado] ?? cheque.estado },
    { label: "Moneda", value: monedaLabel },
    {
      label: "Tercero visible",
      value: cheque.terceroId ? `#${cheque.terceroId}` : "Sin tercero asociado",
    },
  ]

  const financieraFields = [
    { label: "Importe", value: formatCurrency(cheque.importe) },
    { label: "Emisión", value: formatDate(cheque.fechaEmision) },
    { label: "Vencimiento", value: formatDate(cheque.fechaVencimiento) },
    {
      label: "Lectura de vencimiento",
      value:
        daysToDue === null
          ? "Sin vencimiento informado"
          : daysToDue < 0
            ? `${Math.abs(daysToDue)} día(s) vencido`
            : `${daysToDue} día(s) hasta el vencimiento`,
    },
  ]

  const circuitoFields = [
    { label: "Estado operativo", value: status.label },
    { label: "Circuito", value: circuit.label },
    { label: "Cobertura legacy", value: legacyCoverage.label },
    {
      label: "Bloques pendientes",
      value: "Cuenta destino, boleta de depósito y cotización de emisión aún no expuestas.",
    },
  ]

  return (
    <Tabs defaultValue="principal" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="principal">Principal</TabsTrigger>
        <TabsTrigger value="financiera">Financiera</TabsTrigger>
        <TabsTrigger value="legado">Legado</TabsTrigger>
      </TabsList>

      <TabsContent value="principal">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-4 w-4" /> Datos del cheque
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DetailFieldGrid fields={principalFields} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="financiera">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="h-4 w-4" /> Lectura financiera
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DetailFieldGrid fields={financieraFields} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="legado">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Landmark className="h-4 w-4" /> Estructura heredada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <DetailFieldGrid fields={circuitoFields} />
            <div className="rounded-lg border border-dashed p-4">
              <p className="font-medium text-foreground">{legacyCoverage.detail}</p>
              <p className="mt-2">
                El circuito legacy de cheques de terceros incluía cuenta bancaria destino, boleta de
                depósito, cotización de emisión e importes agrupados por operación. Esta pantalla
                deja esos faltantes documentados sin inventar atributos que la API todavía no
                publica.
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

export default function ChequesPage() {
  const defaultSucursalId = useDefaultSucursalId()
  const { sucursales } = useSucursales()
  const [selectedSucursalId, setSelectedSucursalId] = useState<number | undefined>(
    defaultSucursalId
  )
  const effectiveSucursalId = selectedSucursalId ?? defaultSucursalId
  const { cajas } = useCajas(effectiveSucursalId)
  const [selectedCajaId, setSelectedCajaId] = useState<number | undefined>(undefined)
  const { monedas } = useTercerosConfig()
  const [searchTerm, setSearchTerm] = useState("")
  const [filterEstado, setFilterEstado] = useState<string>("todos")
  const [desde, setDesde] = useState("")
  const [hasta, setHasta] = useState("")
  const effectiveCajaId = selectedCajaId ?? cajas[0]?.id
  const {
    cheques,
    loading,
    error,
    page,
    setPage,
    totalCount,
    totalPages,
    crear,
    depositar,
    acreditar,
    rechazar,
    entregar,
    refetch,
  } = useCheques({
    cajaId: effectiveCajaId,
    estado: filterEstado === "todos" ? undefined : filterEstado,
    desde: desde || undefined,
    hasta: hasta || undefined,
  })

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [actionCheque, setActionCheque] = useState<Cheque | null>(null)
  const [detailCheque, setDetailCheque] = useState<Cheque | null>(null)
  const [actionType, setActionType] = useState<"depositar" | "acreditar" | "rechazar" | null>(null)
  const [form, setForm] = useState<CreateChequeDto>(EMPTY_FORM)
  const [actionDate, setActionDate] = useState(new Date().toISOString().split("T")[0])
  const [actionNote, setActionNote] = useState("")

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()

    return cheques.filter((cheque) => {
      if (!term) return true

      return (
        cheque.nroCheque.toLowerCase().includes(term) ||
        (cheque.banco ?? "").toLowerCase().includes(term)
      )
    })
  }, [cheques, searchTerm])

  const activeDetailCheque =
    detailCheque && filtered.some((cheque) => cheque.id === detailCheque.id)
      ? detailCheque
      : (filtered[0] ?? null)

  const selectedSucursal = sucursales.find((sucursal) => sucursal.id === effectiveSucursalId)
  const selectedCaja = cajas.find((caja) => caja.id === effectiveCajaId)
  const carteraCount = filtered.filter((cheque) => cheque.estado === "cartera").length
  const acreditadoCount = filtered.filter((cheque) => cheque.estado === "acreditado").length
  const rejectedCount = filtered.filter((cheque) => cheque.estado === "rechazado").length
  const totalVisible = filtered.reduce((sum, cheque) => sum + cheque.importe, 0)
  const dueSoonCount = filtered.filter((cheque) => {
    const days = getDaysToDueDate(cheque.fechaVencimiento)
    return days !== null && days >= 0 && days <= 7 && cheque.estado === "cartera"
  }).length
  const selectedChequeStatus = activeDetailCheque ? getChequeStatus(activeDetailCheque) : null
  const selectedChequeCircuit = activeDetailCheque ? getChequeCircuit(activeDetailCheque) : null
  const selectedChequeCoverage = activeDetailCheque ? getLegacyCoverage(activeDetailCheque) : null
  const canCreateCheque = Boolean(
    form.cajaId && form.nroCheque.trim() && form.fechaEmision && Number(form.importe) > 0
  )

  const getMonedaLabel = (monedaId?: number) => {
    if (!monedaId) return "Sin moneda asociada"
    const moneda = monedas.find((item) => item.id === monedaId)
    return moneda ? `${moneda.descripcion} (${moneda.simbolo})` : `Moneda #${monedaId}`
  }

  const clearFilters = () => {
    setSearchTerm("")
    setFilterEstado("todos")
    setDesde("")
    setHasta("")
    setPage(1)
  }

  const handleCreate = async () => {
    if (!canCreateCheque) return
    const created = await crear(form)
    if (!created) return
    setIsCreateOpen(false)
    setForm({
      ...EMPTY_FORM,
      cajaId: effectiveCajaId ?? 0,
      fechaEmision: new Date().toISOString().split("T")[0],
    })
    refetch()
  }

  const handleAction = async () => {
    if (!actionCheque || !actionType) return

    if (actionType === "depositar") {
      await depositar(actionCheque.id, actionDate)
    }
    if (actionType === "acreditar") {
      await acreditar(actionCheque.id, actionDate)
    }
    if (actionType === "rechazar") {
      await rechazar(actionCheque.id, actionNote || undefined)
    }

    setActionCheque(null)
    setActionType(null)
    setActionDate(new Date().toISOString().split("T")[0])
    setActionNote("")
    refetch()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cheques</h1>
          <p className="text-muted-foreground">
            Consola operativa de cartera, depósito y acreditación con lectura real de caja, banco,
            moneda, vencimiento y estado del valor.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="bg-transparent" onClick={clearFilters}>
            Limpiar filtros
          </Button>
          <Button
            onClick={() => {
              setForm({
                ...EMPTY_FORM,
                cajaId: effectiveCajaId ?? 0,
                fechaEmision: new Date().toISOString().split("T")[0],
              })
              setIsCreateOpen(true)
            }}
            disabled={!effectiveCajaId}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Cheque
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 xl:grid-cols-[210px_220px_1fr_180px_170px_170px]">
            <div className="space-y-1.5">
              <Label>Sucursal</Label>
              <Select
                value={effectiveSucursalId ? String(effectiveSucursalId) : ""}
                onValueChange={(value) => {
                  setSelectedSucursalId(Number(value))
                  setSelectedCajaId(undefined)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar sucursal" />
                </SelectTrigger>
                <SelectContent>
                  {sucursales.map((sucursal) => (
                    <SelectItem key={sucursal.id} value={String(sucursal.id)}>
                      {sucursal.descripcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Caja / Cuenta</Label>
              <Select
                value={effectiveCajaId ? String(effectiveCajaId) : ""}
                onValueChange={(value) => setSelectedCajaId(Number(value))}
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
            <div className="space-y-1.5">
              <Label>Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por N° cheque o banco..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Select
                value={filterEstado}
                onValueChange={(value) => {
                  setFilterEstado(value)
                  setPage(1)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {Object.entries(estadoLabel).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Desde</Label>
              <Input
                type="date"
                value={desde}
                onChange={(e) => {
                  setDesde(e.target.value)
                  setPage(1)
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Hasta</Label>
              <Input
                type="date"
                value={hasta}
                onChange={(e) => {
                  setHasta(e.target.value)
                  setPage(1)
                }}
              />
            </div>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            <div className="rounded-lg border p-3 text-sm">
              <p className="text-muted-foreground">Lectura del lote</p>
              <p className="mt-1 font-medium">
                {totalCount} cheque(s) backend, {filtered.length} visibles tras búsqueda local
              </p>
              <p className="mt-2 text-muted-foreground">
                {selectedCaja
                  ? `Caja seleccionada: ${selectedCaja.nombre}.`
                  : "Sin caja seleccionada."}
              </p>
            </div>
            <div className="rounded-lg border p-3 text-sm">
              <p className="text-muted-foreground">Seguimiento de cartera</p>
              <p className="mt-1 font-medium">
                {dueSoonCount} por vencer y {rejectedCount} rechazado(s) en la selección actual
              </p>
              <p className="mt-2 text-muted-foreground">
                El vencimiento usa las fechas visibles de cada cheque sin inferir clearing bancario.
              </p>
            </div>
            <div className="rounded-lg border p-3 text-sm">
              <p className="text-muted-foreground">Gap legacy identificado</p>
              <p className="mt-1 font-medium">
                Cuenta destino, boleta y cotización siguen fuera del contrato
              </p>
              <p className="mt-2 text-muted-foreground">
                La pantalla documenta el faltante y aprovecha al máximo el flujo publicado hoy.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-5">
        <SummaryCard
          title="Visibles"
          value={String(filtered.length)}
          description="Cheques del filtro actual sobre caja, fechas, estado y búsqueda local."
        />
        <SummaryCard
          title="En cartera"
          value={String(carteraCount)}
          description="Valores todavía disponibles para depósito o entrega."
        />
        <SummaryCard
          title="Acreditados"
          value={String(acreditadoCount)}
          description="Operaciones ya cerradas dentro del circuito visible."
        />
        <SummaryCard
          title="Importe visible"
          value={formatCurrency(totalVisible)}
          description="Suma de importes del lote actualmente filtrado."
        />
        <SummaryCard
          title="Próximos a vencer"
          value={String(dueSoonCount)}
          description="Cheques en cartera con vencimiento dentro de los próximos siete días."
        />
      </div>

      {activeDetailCheque && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ArrowRightLeft className="h-5 w-5" />
              Cheque destacado: {activeDetailCheque.nroCheque}
            </CardTitle>
            <CardDescription>
              Resumen operativo del cheque seleccionado dentro de{" "}
              {selectedSucursal?.descripcion ?? "la sucursal actual"}.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <div className="space-y-4">
              <DetailFieldGrid
                fields={[
                  {
                    label: "Caja",
                    value:
                      cajas.find((caja) => caja.id === activeDetailCheque.cajaId)?.nombre ??
                      `Caja #${activeDetailCheque.cajaId}`,
                  },
                  { label: "Banco", value: activeDetailCheque.banco ?? "-" },
                  { label: "Moneda", value: getMonedaLabel(activeDetailCheque.monedaId) },
                  { label: "Emisión", value: formatDate(activeDetailCheque.fechaEmision) },
                  { label: "Vencimiento", value: formatDate(activeDetailCheque.fechaVencimiento) },
                  { label: "Importe", value: formatCurrency(activeDetailCheque.importe) },
                ]}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Wallet className="h-4 w-4" /> Estado operativo
                </div>
                <p className="mt-3 font-semibold">{selectedChequeStatus?.label}</p>
                <p className="mt-2 text-sm text-muted-foreground">{selectedChequeStatus?.detail}</p>
              </div>
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarClock className="h-4 w-4" /> Circuito
                </div>
                <p className="mt-3 font-semibold">{selectedChequeCircuit?.label}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {selectedChequeCircuit?.detail}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldAlert className="h-4 w-4" /> Cobertura legacy
                </div>
                <p className="mt-3 font-semibold">{selectedChequeCoverage?.label}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {selectedChequeCoverage?.detail}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cartera visible</CardTitle>
          <CardDescription>
            La grilla combina lectura de caja, circuito y fechas para anticipar depósito,
            acreditación o incidencias sin salir del flujo principal.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° Cheque</TableHead>
                <TableHead>Caja</TableHead>
                <TableHead>Banco</TableHead>
                <TableHead>Circuito</TableHead>
                <TableHead>Importe</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    Cargando...
                  </TableCell>
                </TableRow>
              )}
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    <CreditCard className="mx-auto mb-2 h-8 w-8 opacity-50" />
                    No hay cheques registrados
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((cheque) => {
                const status = getChequeStatus(cheque)
                const circuit = getChequeCircuit(cheque)
                const days = getDaysToDueDate(cheque.fechaVencimiento)

                return (
                  <TableRow
                    key={cheque.id}
                    className="cursor-pointer hover:bg-muted/40"
                    onClick={() => {
                      setDetailCheque(cheque)
                      setIsDetailOpen(true)
                    }}
                  >
                    <TableCell className="font-mono">{cheque.nroCheque}</TableCell>
                    <TableCell>
                      {cajas.find((caja) => caja.id === cheque.cajaId)?.nombre ??
                        `#${cheque.cajaId}`}
                    </TableCell>
                    <TableCell>{cheque.banco ?? "-"}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{circuit.label}</p>
                        <p className="text-xs text-muted-foreground">{circuit.detail}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">{formatCurrency(cheque.importe)}</TableCell>
                    <TableCell>
                      <div>
                        <p>{formatDate(cheque.fechaVencimiento)}</p>
                        <p className="text-xs text-muted-foreground">
                          {days === null
                            ? "Sin fecha"
                            : days < 0
                              ? `${Math.abs(days)} día(s) vencido`
                              : `${days} día(s)`}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={estadoVariant[cheque.estado] ?? status.tone}>
                        {estadoLabel[cheque.estado] ?? status.label}
                      </Badge>
                    </TableCell>
                    <TableCell onClick={(event) => event.stopPropagation()}>
                      <div className="flex flex-wrap gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setDetailCheque(cheque)
                            setIsDetailOpen(true)
                          }}
                        >
                          Ver
                        </Button>
                        {cheque.estado === "cartera" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setActionCheque(cheque)
                                setActionType("depositar")
                              }}
                            >
                              Depositar
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => entregar(cheque.id)}>
                              Entregar
                            </Button>
                          </>
                        )}
                        {cheque.estado === "depositado" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setActionCheque(cheque)
                                setActionType("acreditar")
                              }}
                            >
                              Acreditar
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setActionCheque(cheque)
                                setActionType("rechazar")
                              }}
                            >
                              Rechazar
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
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
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo Cheque</DialogTitle>
            <DialogDescription>
              Alta operativa del cheque sobre la caja seleccionada, con lectura explícita de la
              cobertura actual y del bloque legado todavía pendiente.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="principal" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="principal">Principal</TabsTrigger>
              <TabsTrigger value="fechas">Fechas</TabsTrigger>
              <TabsTrigger value="legado">Legado</TabsTrigger>
            </TabsList>

            <TabsContent value="principal" className="mt-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Caja</Label>
                  <Select
                    value={form.cajaId ? String(form.cajaId) : ""}
                    onValueChange={(value) =>
                      setForm((prev) => ({ ...prev, cajaId: Number(value) }))
                    }
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
                <div className="space-y-1.5">
                  <Label>N° Cheque</Label>
                  <Input
                    value={form.nroCheque}
                    onChange={(e) => setForm((prev) => ({ ...prev, nroCheque: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Banco</Label>
                  <Input
                    value={form.banco ?? ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, banco: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Importe</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.importe}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, importe: parseFloat(e.target.value) || 0 }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Moneda</Label>
                  <Select
                    value={form.monedaId ? String(form.monedaId) : "__none__"}
                    onValueChange={(value) =>
                      setForm((prev) => ({
                        ...prev,
                        monedaId: value === "__none__" ? undefined : Number(value),
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar moneda" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sin moneda</SelectItem>
                      {monedas.map((moneda) => (
                        <SelectItem key={moneda.id} value={String(moneda.id)}>
                          {moneda.descripcion} ({moneda.simbolo})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>ID Tercero</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.terceroId ?? ""}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        terceroId: e.target.value ? Number(e.target.value) : undefined,
                      }))
                    }
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="fechas" className="mt-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Fecha Emisión</Label>
                  <Input
                    type="date"
                    value={form.fechaEmision}
                    onChange={(e) => setForm((prev) => ({ ...prev, fechaEmision: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Fecha Vencimiento</Label>
                  <Input
                    type="date"
                    value={form.fechaVencimiento ?? ""}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, fechaVencimiento: e.target.value }))
                    }
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="legado" className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Landmark className="h-4 w-4" /> Flujo heredado reservado
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    El formulario VB6 de depósito de cheques de terceros incluía cuenta bancaria
                    destino, boleta de depósito, cotización de emisión e importe total agrupado.
                  </p>
                  <DetailFieldGrid
                    fields={[
                      {
                        label: "Visible hoy",
                        value: "Caja, número, banco, importe, moneda, tercero y fechas del valor.",
                      },
                      {
                        label: "Pendiente del contrato",
                        value: "Cuenta destino, boleta de depósito y cotización de la operación.",
                      },
                    ]}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button
              variant="outline"
              className="bg-transparent"
              onClick={() => setIsCreateOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={!canCreateCheque}>
              Crear cheque
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{activeDetailCheque?.nroCheque ?? "Detalle de cheque"}</DialogTitle>
            <DialogDescription>
              {activeDetailCheque
                ? `${cajas.find((caja) => caja.id === activeDetailCheque.cajaId)?.nombre ?? `Caja #${activeDetailCheque.cajaId}`} · ${estadoLabel[activeDetailCheque.estado] ?? activeDetailCheque.estado}`
                : "Sin selección"}
            </DialogDescription>
          </DialogHeader>
          {activeDetailCheque && (
            <ChequeDetail
              cheque={activeDetailCheque}
              cajaNombre={
                cajas.find((caja) => caja.id === activeDetailCheque.cajaId)?.nombre ??
                `Caja #${activeDetailCheque.cajaId}`
              }
              monedaLabel={getMonedaLabel(activeDetailCheque.monedaId)}
            />
          )}
          <DialogFooter>
            <Button
              variant="outline"
              className="bg-transparent"
              onClick={() => setIsDetailOpen(false)}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!actionType && !!actionCheque}
        onOpenChange={(open) => {
          if (!open) {
            setActionCheque(null)
            setActionType(null)
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {actionType === "depositar" && "Depositar cheque"}
              {actionType === "acreditar" && "Acreditar cheque"}
              {actionType === "rechazar" && "Rechazar cheque"}
            </DialogTitle>
            <DialogDescription>{actionCheque?.nroCheque}</DialogDescription>
          </DialogHeader>

          {actionType !== "rechazar" ? (
            <div className="space-y-1.5">
              <Label>Fecha</Label>
              <Input
                type="date"
                value={actionDate}
                onChange={(e) => setActionDate(e.target.value)}
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Observación</Label>
              <Textarea
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                rows={4}
              />
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              className="bg-transparent"
              onClick={() => {
                setActionCheque(null)
                setActionType(null)
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleAction}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
