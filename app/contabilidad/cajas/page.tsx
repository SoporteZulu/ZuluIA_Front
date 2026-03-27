"use client"

import { useEffect, useMemo, useState } from "react"
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
  Vault,
  AlertCircle,
  Plus,
  Edit,
  Eye,
  Landmark,
  Building2,
  Wallet,
  ArrowRightLeft,
  CalendarClock,
  ShieldAlert,
} from "lucide-react"
import { useCajas } from "@/lib/hooks/useCajas"
import { useSucursales, useDefaultSucursalId } from "@/lib/hooks/useSucursales"
import { useTercerosConfig } from "@/lib/hooks/useTerceros"
import type { Caja, CreateCajaDto, TipoCaja } from "@/lib/types/cajas"

const EMPTY_FORM: CreateCajaDto = {
  sucursalId: 0,
  tipoCajaId: 0,
  nombre: "",
  descripcion: "",
  monedaId: undefined,
}

function buildForm(caja?: Caja | null, selectedSucursalId?: number): CreateCajaDto {
  if (!caja) {
    return { ...EMPTY_FORM, sucursalId: selectedSucursalId ?? EMPTY_FORM.sucursalId }
  }

  return {
    sucursalId: caja.sucursalId,
    tipoCajaId: caja.tipoCajaId,
    nombre: caja.nombre,
    descripcion: caja.descripcion ?? "",
    monedaId: caja.monedaId,
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

function formatCurrency(value?: number, symbol = "$") {
  const amount = Number(value ?? 0)
  return `${symbol} ${amount.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleDateString("es-AR") : "-"
}

function getCajaStatus(caja: Caja) {
  if (!caja.activa) {
    return {
      label: "Inactiva",
      tone: "secondary" as const,
      detail: "La caja está fuera del circuito operativo visible.",
    }
  }

  if (!caja.fechaApertura) {
    return {
      label: "Pendiente de apertura",
      tone: "secondary" as const,
      detail: "No hay fecha de apertura registrada en el contrato actual.",
    }
  }

  if (Number(caja.saldoActual ?? 0) < 0) {
    return {
      label: "Saldo comprometido",
      tone: "destructive" as const,
      detail: "El saldo visible quedó por debajo de cero y conviene revisar sus movimientos.",
    }
  }

  return {
    label: "Operativa",
    tone: "default" as const,
    detail: "La caja está activa y con apertura registrada en la API actual.",
  }
}

function getCajaCircuit(caja: Caja) {
  const tipo = (caja.tipoCajaDescripcion ?? "").toLowerCase()

  if (!caja.activa) {
    return {
      label: "Fuera de circuito",
      detail: "Se conserva en el maestro pero no participa del flujo diario actual.",
    }
  }

  if (tipo.includes("banco") || tipo.includes("cuenta")) {
    return {
      label: "Tesorería bancaria",
      detail: "Se comporta como cuenta bancaria dentro del circuito visible de tesorería.",
    }
  }

  if (caja.monedaId) {
    return {
      label: "Caja monetizada",
      detail: "Tiene una moneda asociada y queda lista para trazabilidad por divisa.",
    }
  }

  return {
    label: "Caja operativa",
    detail: "Opera como caja diaria sin atributos bancarios expuestos en este contrato.",
  }
}

function getLegacyCoverage(caja: Caja) {
  const available = [
    caja.descripcion ? 1 : 0,
    caja.monedaId ? 1 : 0,
    caja.fechaApertura ? 1 : 0,
    typeof caja.saldoInicial === "number" ? 1 : 0,
  ].reduce((sum, value) => sum + value, 0)

  if (available >= 4) {
    return {
      label: "Cobertura amplia",
      detail: "La caja expone saldos, apertura, moneda y descripción dentro del contrato actual.",
    }
  }

  if (available >= 2) {
    return {
      label: "Cobertura parcial",
      detail:
        "Hay datos operativos suficientes para seguimiento, pero faltan bloques bancarios del legado.",
    }
  }

  return {
    label: "Cobertura mínima",
    detail:
      "La API actual sólo expone el núcleo maestro y deja afuera atributos bancarios históricos.",
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

interface CajaFormProps {
  caja: Caja | null
  selectedSucursalId?: number
  onClose: () => void
  onSaved: () => void
}

function CajaForm({ caja, selectedSucursalId, onClose, onSaved }: CajaFormProps) {
  const { crear, actualizar, getTipos } = useCajas(selectedSucursalId)
  const { sucursales } = useSucursales()
  const { monedas } = useTercerosConfig()
  const [tipos, setTipos] = useState<TipoCaja[]>([])
  const [tab, setTab] = useState("principal")
  const [form, setForm] = useState<CreateCajaDto>(() => buildForm(caja, selectedSucursalId))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getTipos().then(setTipos)
  }, [getTipos])

  const set = (key: keyof CreateCajaDto, value: string | number | undefined) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    if (!form.sucursalId || !form.tipoCajaId || !form.nombre.trim()) {
      setError("Sucursal, tipo y nombre son obligatorios")
      return
    }

    setSaving(true)
    setError(null)
    const ok = caja ? await actualizar(caja.id, form) : await crear(form)
    setSaving(false)

    if (ok) onSaved()
    else setError("No se pudo guardar la caja")
  }

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid h-auto w-full grid-cols-3">
          <TabsTrigger value="principal" className="py-2 text-xs">
            Principal
          </TabsTrigger>
          <TabsTrigger value="sucursales" className="py-2 text-xs">
            Sucursales
          </TabsTrigger>
          <TabsTrigger value="formas" className="py-2 text-xs">
            Legado
          </TabsTrigger>
        </TabsList>

        <TabsContent value="principal" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Sucursal</Label>
              <Select
                value={form.sucursalId ? String(form.sucursalId) : ""}
                onValueChange={(value) => set("sucursalId", Number(value))}
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
              <Label>Tipo de Caja</Label>
              <Select
                value={form.tipoCajaId ? String(form.tipoCajaId) : ""}
                onValueChange={(value) => set("tipoCajaId", Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {tipos.map((tipo) => (
                    <SelectItem key={tipo.id} value={String(tipo.id)}>
                      {tipo.descripcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <Input
                value={form.nombre}
                onChange={(e) => set("nombre", e.target.value)}
                placeholder="Caja principal"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Moneda</Label>
              <Select
                value={form.monedaId ? String(form.monedaId) : "__none__"}
                onValueChange={(value) =>
                  set("monedaId", value === "__none__" ? undefined : Number(value))
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
            <div className="space-y-1.5 md:col-span-2">
              <Label>Descripción</Label>
              <Textarea
                value={form.descripcion ?? ""}
                onChange={(e) => set("descripcion", e.target.value)}
                rows={4}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="sucursales" className="mt-4 space-y-4">
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              <div className="space-y-3">
                <p>
                  El legado administraba una grilla explícita de sucursales asociadas a cada caja o
                  cuenta bancaria. En la API actual, la relación principal se resuelve por
                  sucursalId.
                </p>
                <DetailFieldGrid
                  fields={[
                    {
                      label: "Sucursal operativa",
                      value:
                        sucursales.find((sucursal) => sucursal.id === form.sucursalId)
                          ?.descripcion ?? "Sin sucursal asociada",
                    },
                    {
                      label: "Cobertura actual",
                      value: "Relación simple por sucursal, sin asociación múltiple expuesta.",
                    },
                  ]}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="formas" className="mt-4 space-y-4">
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              <div className="space-y-3">
                <p>
                  El modelo vigente todavía no expone banco, CBU, cuenta, permisos de
                  entrada/salida/tesorería ni vínculos de formas de pago. La pantalla los deja
                  identificados para la próxima fase de integración.
                </p>
                <DetailFieldGrid
                  fields={[
                    {
                      label: "Visible hoy",
                      value: "Sucursal, tipo, nombre, descripción y moneda.",
                    },
                    {
                      label: "Pendiente del contrato",
                      value: "Datos bancarios y relaciones auxiliares del maestro legacy.",
                    },
                  ]}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {error && (
        <p className="flex items-center gap-1 text-sm text-red-500">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 border-t pt-3">
        <Button variant="outline" className="bg-transparent" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Guardando..." : caja ? "Guardar cambios" : "Crear caja"}
        </Button>
      </div>
    </div>
  )
}

function CajaDetail({
  caja,
  sucursalNombre,
  monedaLabel,
}: {
  caja: Caja
  sucursalNombre: string
  monedaLabel: string
}) {
  const cajaStatus = getCajaStatus(caja)
  const circuit = getCajaCircuit(caja)
  const legacyCoverage = getLegacyCoverage(caja)

  const principalFields = [
    { label: "Nombre", value: caja.nombre },
    { label: "Tipo", value: caja.tipoCajaDescripcion ?? `#${caja.tipoCajaId}` },
    { label: "Sucursal", value: sucursalNombre },
    { label: "Descripción", value: caja.descripcion ?? "-" },
    { label: "Estado", value: caja.activa ? "Activa" : "Inactiva" },
  ]

  const financieraFields = [
    { label: "Saldo Inicial", value: formatCurrency(caja.saldoInicial) },
    { label: "Saldo Actual", value: formatCurrency(caja.saldoActual) },
    { label: "Fecha Apertura", value: formatDate(caja.fechaApertura) },
    { label: "Moneda", value: monedaLabel },
  ]

  const circuitoFields = [
    { label: "Circuito", value: circuit.label },
    { label: "Estado operativo", value: cajaStatus.label },
    { label: "Cobertura legacy", value: legacyCoverage.label },
    {
      label: "Lectura operativa",
      value:
        Number(caja.saldoActual ?? 0) >= Number(caja.saldoInicial ?? 0)
          ? "Saldo actual sostenido o superior al inicial visible."
          : "El saldo actual quedó por debajo del saldo inicial visible.",
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
              <Building2 className="h-4 w-4" /> Datos Principales
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
              <Wallet className="h-4 w-4" /> Datos Financieros
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
                El formulario legacy de cajas y cuentas bancarias incluía banco, número de cuenta,
                CBU, banderas de entrada/salida/tesorería, sucursales múltiples y formas de pago. El
                contrato actual no las expone todavía y esta vista las deja documentadas.
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

export default function CajasPage() {
  const defaultSucursalId = useDefaultSucursalId()
  const { sucursales } = useSucursales()
  const { monedas } = useTercerosConfig()
  const [selectedSucursalId, setSelectedSucursalId] = useState<number | undefined>(
    defaultSucursalId
  )
  const effectiveSucursalId = selectedSucursalId ?? defaultSucursalId
  const { cajas, loading, error, refetch, getTipos } = useCajas(effectiveSucursalId)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [selectedCajaId, setSelectedCajaId] = useState<number | null>(null)
  const [detailCajaId, setDetailCajaId] = useState<number | null>(null)
  const [tipos, setTipos] = useState<TipoCaja[]>([])

  const selectedCaja = useMemo(
    () => cajas.find((caja) => caja.id === selectedCajaId) ?? null,
    [cajas, selectedCajaId]
  )

  useEffect(() => {
    getTipos().then(setTipos)
  }, [getTipos])

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()

    return cajas.filter((caja) => {
      const matchesSearch =
        !term ||
        caja.nombre.toLowerCase().includes(term) ||
        (caja.tipoCajaDescripcion ?? "").toLowerCase().includes(term) ||
        (caja.descripcion ?? "").toLowerCase().includes(term)

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && caja.activa) ||
        (statusFilter === "inactive" && !caja.activa) ||
        (statusFilter === "negative" && Number(caja.saldoActual ?? 0) < 0) ||
        (statusFilter === "opening" && !caja.fechaApertura)

      const matchesType = typeFilter === "all" || String(caja.tipoCajaId) === typeFilter

      return matchesSearch && matchesStatus && matchesType
    })
  }, [cajas, searchTerm, statusFilter, typeFilter])

  const detailCaja = useMemo(() => {
    if (!filtered.length) {
      return null
    }

    return filtered.find((caja) => caja.id === detailCajaId) ?? filtered[0]
  }, [detailCajaId, filtered])

  const totalVisibleBalance = filtered.reduce((sum, caja) => sum + Number(caja.saldoActual ?? 0), 0)
  const activeCount = filtered.filter((caja) => caja.activa).length
  const negativeBalanceCount = filtered.filter((caja) => Number(caja.saldoActual ?? 0) < 0).length
  const withCurrencyCount = filtered.filter((caja) => caja.monedaId).length
  const selectedSucursal = sucursales.find((sucursal) => sucursal.id === effectiveSucursalId)
  const selectedTipo = tipos.find((tipo) => String(tipo.id) === typeFilter)
  const selectedCajaStatus = detailCaja ? getCajaStatus(detailCaja) : null
  const selectedCajaCircuit = detailCaja ? getCajaCircuit(detailCaja) : null
  const selectedCajaCoverage = detailCaja ? getLegacyCoverage(detailCaja) : null

  const handleFormOpenChange = (open: boolean) => {
    setIsFormOpen(open)
    if (!open) {
      setSelectedCajaId(null)
    }
  }

  const handleDetailOpenChange = (open: boolean) => {
    setIsDetailOpen(open)
    if (!open) {
      setDetailCajaId(null)
    }
  }

  const getMonedaLabel = (monedaId?: number) => {
    if (!monedaId) return "Sin moneda asociada"
    const moneda = monedas.find((item) => item.id === monedaId)
    return moneda ? `${moneda.descripcion} (${moneda.simbolo})` : `Moneda #${monedaId}`
  }

  const clearFilters = () => {
    setSearchTerm("")
    setStatusFilter("all")
    setTypeFilter("all")
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cajas</h1>
          <p className="text-muted-foreground">
            Gestión de cajas y cuentas bancarias con lectura operativa real de sucursal, saldos,
            apertura y cobertura visible del contrato actual.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="bg-transparent" onClick={clearFilters}>
            Limpiar filtros
          </Button>
          <Button
            onClick={() => {
              setSelectedCajaId(null)
              setIsFormOpen(true)
            }}
            disabled={!effectiveSucursalId}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nueva Caja
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
          <div className="grid gap-4 xl:grid-cols-[240px_240px_220px_1fr]">
            <div className="space-y-1.5">
              <Label>Sucursal</Label>
              <Select
                value={effectiveSucursalId ? String(effectiveSucursalId) : ""}
                onValueChange={(value) => setSelectedSucursalId(Number(value))}
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
              <Label>Estado</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="active">Activas</SelectItem>
                  <SelectItem value="inactive">Inactivas</SelectItem>
                  <SelectItem value="negative">Saldo comprometido</SelectItem>
                  <SelectItem value="opening">Sin apertura</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  {tipos.map((tipo) => (
                    <SelectItem key={tipo.id} value={String(tipo.id)}>
                      {tipo.descripcion}
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
                  placeholder="Buscar por nombre o tipo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            <div className="rounded-lg border p-3 text-sm">
              <p className="text-muted-foreground">Lectura del filtro</p>
              <p className="mt-1 font-medium">
                {filtered.length} cajas visibles en{" "}
                {selectedSucursal?.descripcion ?? "sin sucursal"}
              </p>
              <p className="mt-2 text-muted-foreground">
                {statusFilter === "all"
                  ? "Sin restricción por estado operativo."
                  : `Filtro activo: ${statusFilter}.`}
              </p>
            </div>
            <div className="rounded-lg border p-3 text-sm">
              <p className="text-muted-foreground">Cobertura del maestro</p>
              <p className="mt-1 font-medium">
                {withCurrencyCount} con moneda y{" "}
                {filtered.filter((caja) => caja.fechaApertura).length} con apertura registrada
              </p>
              <p className="mt-2 text-muted-foreground">
                {selectedTipo
                  ? `Tipo filtrado: ${selectedTipo.descripcion}.`
                  : "Todos los tipos vigentes del catálogo visible."}
              </p>
            </div>
            <div className="rounded-lg border p-3 text-sm">
              <p className="text-muted-foreground">Gap legacy identificado</p>
              <p className="mt-1 font-medium">
                Banco, CBU y formas de pago siguen fuera del contrato
              </p>
              <p className="mt-2 text-muted-foreground">
                Esta vista prioriza exponer lo que sí existe hoy sin fabricar atributos no
                publicados.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-4">
        <SummaryCard
          title="Cajas visibles"
          value={String(filtered.length)}
          description="Resultado del filtro actual sobre la sucursal y los tipos visibles."
        />
        <SummaryCard
          title="Activas"
          value={String(activeCount)}
          description="Cajas actualmente habilitadas para el circuito operativo visible."
        />
        <SummaryCard
          title="Saldo visible"
          value={formatCurrency(totalVisibleBalance)}
          description="Suma de saldos actuales sobre la selección filtrada."
        />
        <SummaryCard
          title="En seguimiento"
          value={String(negativeBalanceCount)}
          description="Cajas con saldo actual por debajo de cero dentro de la vista vigente."
        />
      </div>

      {detailCaja && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ArrowRightLeft className="h-5 w-5" />
              Caja destacada: {detailCaja.nombre}
            </CardTitle>
            <CardDescription>
              Resumen operativo de la selección actual antes de abrir el detalle completo.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <div className="space-y-4">
              <DetailFieldGrid
                fields={[
                  {
                    label: "Sucursal",
                    value:
                      sucursales.find((sucursal) => sucursal.id === detailCaja.sucursalId)
                        ?.descripcion ?? `Sucursal #${detailCaja.sucursalId}`,
                  },
                  {
                    label: "Tipo",
                    value: detailCaja.tipoCajaDescripcion ?? `#${detailCaja.tipoCajaId}`,
                  },
                  { label: "Moneda", value: getMonedaLabel(detailCaja.monedaId) },
                  { label: "Fecha de apertura", value: formatDate(detailCaja.fechaApertura) },
                  { label: "Saldo inicial", value: formatCurrency(detailCaja.saldoInicial) },
                  { label: "Saldo actual", value: formatCurrency(detailCaja.saldoActual) },
                ]}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Wallet className="h-4 w-4" /> Estado operativo
                </div>
                <p className="mt-3 font-semibold">{selectedCajaStatus?.label}</p>
                <p className="mt-2 text-sm text-muted-foreground">{selectedCajaStatus?.detail}</p>
              </div>
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarClock className="h-4 w-4" /> Circuito
                </div>
                <p className="mt-3 font-semibold">{selectedCajaCircuit?.label}</p>
                <p className="mt-2 text-sm text-muted-foreground">{selectedCajaCircuit?.detail}</p>
              </div>
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldAlert className="h-4 w-4" /> Cobertura legacy
                </div>
                <p className="mt-3 font-semibold">{selectedCajaCoverage?.label}</p>
                <p className="mt-2 text-sm text-muted-foreground">{selectedCajaCoverage?.detail}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Maestro visible</CardTitle>
          <CardDescription>
            La grilla prioriza lectura operativa y deja explícito el circuito de cada caja con la
            información hoy disponible.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Sucursal</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Circuito</TableHead>
                <TableHead>Saldo Actual</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Cargando...
                  </TableCell>
                </TableRow>
              )}
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <Vault className="mx-auto mb-2 h-8 w-8 opacity-50" />
                    No hay cajas registradas
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((caja) => {
                const status = getCajaStatus(caja)
                const circuit = getCajaCircuit(caja)

                return (
                  <TableRow
                    key={caja.id}
                    className="cursor-pointer hover:bg-muted/40"
                    onClick={() => {
                      setDetailCajaId(caja.id)
                      setIsDetailOpen(true)
                    }}
                  >
                    <TableCell className="font-medium">{caja.nombre}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {sucursales.find((sucursal) => sucursal.id === caja.sucursalId)
                        ?.descripcion ?? `#${caja.sucursalId}`}
                    </TableCell>
                    <TableCell>{caja.tipoCajaDescripcion ?? "-"}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{circuit.label}</p>
                        <p className="text-xs text-muted-foreground">{circuit.detail}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">{formatCurrency(caja.saldoActual)}</TableCell>
                    <TableCell>
                      <Badge variant={status.tone}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDetailCajaId(caja.id)
                            setIsDetailOpen(true)
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedCajaId(caja.id)
                            setIsFormOpen(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={handleFormOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedCaja ? "Editar Caja" : "Nueva Caja"}</DialogTitle>
            <DialogDescription>
              Formulario real sobre la API actual, con lectura explícita de la cobertura legacy ya
              disponible y de los bloques todavía pendientes del contrato.
            </DialogDescription>
          </DialogHeader>
          <CajaForm
            key={
              selectedCaja ? `edit-${selectedCaja.id}` : `create-${effectiveSucursalId ?? "none"}`
            }
            caja={selectedCaja}
            selectedSucursalId={effectiveSucursalId}
            onClose={() => handleFormOpenChange(false)}
            onSaved={() => {
              handleFormOpenChange(false)
              refetch()
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailOpen && !!detailCaja} onOpenChange={handleDetailOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailCaja?.nombre ?? "Detalle de caja"}</DialogTitle>
            <DialogDescription>
              {detailCaja
                ? `${sucursales.find((sucursal) => sucursal.id === detailCaja.sucursalId)?.descripcion ?? `Sucursal #${detailCaja.sucursalId}`} · ${detailCaja.tipoCajaDescripcion ?? "Sin tipo"}`
                : "Sin selección"}
            </DialogDescription>
          </DialogHeader>
          {detailCaja && (
            <CajaDetail
              caja={detailCaja}
              sucursalNombre={
                sucursales.find((sucursal) => sucursal.id === detailCaja.sucursalId)?.descripcion ??
                `Sucursal #${detailCaja.sucursalId}`
              }
              monedaLabel={getMonedaLabel(detailCaja.monedaId)}
            />
          )}
          <DialogFooter>
            <Button
              variant="outline"
              className="bg-transparent"
              onClick={() => handleDetailOpenChange(false)}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
