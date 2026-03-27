"use client"

import { useMemo, useState } from "react"
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Eye,
  FileText,
  Landmark,
  Plus,
  ReceiptText,
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
import { useCajas } from "@/lib/hooks/useCajas"
import { useCedulones } from "@/lib/hooks/useCedulones"
import { useDefaultSucursalId, useSucursales } from "@/lib/hooks/useSucursales"
import { useProveedores } from "@/lib/hooks/useTerceros"
import type { Cedulon, CreateCedulonDto } from "@/lib/types/cedulones"
import type { Tercero } from "@/lib/types/terceros"

const estadoBadgeVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  PENDIENTE: "secondary",
  PAGADO: "default",
  VENCIDO: "destructive",
  ANULADO: "outline",
}

function formatMoney(value: number) {
  return value.toLocaleString("es-AR", { style: "currency", currency: "ARS" })
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString("es-AR") : "-"
}

function formatSupplierAddress(supplier?: Tercero | null) {
  if (!supplier) return "-"
  const parts = [
    [supplier.calle, supplier.nro].filter(Boolean).join(" "),
    supplier.piso ? `Piso ${supplier.piso}` : null,
    supplier.dpto ? `Dto ${supplier.dpto}` : null,
    supplier.localidadDescripcion,
    supplier.codigoPostal,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(", ") : "-"
}

function getDaysPastDue(value?: string | null) {
  if (!value) return null
  const dueDate = new Date(value)
  const today = new Date()
  dueDate.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  return Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
}

function getCedulonPaymentStatus(cedulon: Cedulon) {
  if (cedulon.estado === "ANULADO") return "Documento fuera de circuito"
  if (cedulon.estado === "PAGADO" || cedulon.saldo <= 0) return "Cedulón cancelado"
  if (cedulon.estado === "VENCIDO") {
    const daysPastDue = getDaysPastDue(cedulon.fechaVencimiento)
    return daysPastDue && daysPastDue > 0
      ? `Pago pendiente con ${daysPastDue} días de mora`
      : "Pago pendiente vencido"
  }
  if (cedulon.fechaVencimiento)
    return `Pago pendiente hasta ${formatDate(cedulon.fechaVencimiento)}`
  return "Pago pendiente sin vencimiento informado"
}

function getCedulonOperationalStatus(cedulon: Cedulon) {
  if (cedulon.estado === "ANULADO") return "Sin operatoria vigente"
  if (cedulon.estado === "PAGADO") return "Cobro registrado en caja"
  if (cedulon.saldo < cedulon.importe) return "Cobro parcial visible en saldo"
  return "Pendiente de registración de pago"
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

function createCedulonFormState(defaultSucursalId?: number): CreateCedulonDto {
  return {
    terceroId: 0,
    sucursalId: defaultSucursalId,
    descripcion: "",
    importe: 0,
    fechaVencimiento: "",
  }
}

function CedulonForm({
  defaultSucursalId,
  onClose,
  onSaved,
}: {
  defaultSucursalId?: number
  onClose: () => void
  onSaved: () => void
}) {
  const { proveedores } = useProveedores()
  const { sucursales } = useSucursales()
  const { crear } = useCedulones()
  const [form, setForm] = useState<CreateCedulonDto>(() =>
    createCedulonFormState(defaultSucursalId)
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    if (!form.terceroId || !form.sucursalId || !form.importe) {
      setError("Proveedor, sucursal e importe son obligatorios")
      return
    }

    setSaving(true)
    setError(null)
    const ok = await crear({
      ...form,
      descripcion: form.descripcion?.trim() || undefined,
      fechaVencimiento: form.fechaVencimiento || undefined,
    })
    setSaving(false)

    if (ok) onSaved()
    else setError("No se pudo crear el cedulón")
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="principal" className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-3">
          <TabsTrigger value="principal" className="py-2 text-xs">
            Principal
          </TabsTrigger>
          <TabsTrigger value="vencimiento" className="py-2 text-xs">
            Vencimiento
          </TabsTrigger>
          <TabsTrigger value="legado" className="py-2 text-xs">
            Legado
          </TabsTrigger>
        </TabsList>

        <TabsContent value="principal" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <Label>Proveedor</Label>
              <Select
                value={form.terceroId ? String(form.terceroId) : ""}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, terceroId: Number(value) }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar proveedor" />
                </SelectTrigger>
                <SelectContent>
                  {proveedores.map((proveedor) => (
                    <SelectItem key={proveedor.id} value={String(proveedor.id)}>
                      {proveedor.razonSocial}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Sucursal</Label>
              <Select
                value={form.sucursalId ? String(form.sucursalId) : ""}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, sucursalId: Number(value) }))
                }
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
              <Label>Importe</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.importe || ""}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, importe: parseFloat(event.target.value) || 0 }))
                }
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Descripción</Label>
              <Textarea
                rows={4}
                value={form.descripcion ?? ""}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, descripcion: event.target.value }))
                }
                placeholder="Concepto operativo del cedulón"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="vencimiento" className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label>Fecha de vencimiento</Label>
            <Input
              type="date"
              value={form.fechaVencimiento ?? ""}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, fechaVencimiento: event.target.value }))
              }
            />
          </div>
        </TabsContent>

        <TabsContent value="legado" className="mt-4 space-y-4">
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              El circuito legado de cedulones solía convivir con emisión masiva, impresión, lotes
              por colegio o convenio y posteriores registraciones de cobro. Esta base deja el alta y
              cobro reales sin inventar procesos que hoy la API no devuelve.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2 border-t pt-3">
        <Button variant="outline" className="bg-transparent" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Guardando..." : "Crear cedulón"}
        </Button>
      </div>
    </div>
  )
}

function CedulonPaymentForm({
  cedulon,
  defaultSucursalId,
  onClose,
  onSaved,
}: {
  cedulon: Cedulon
  defaultSucursalId?: number
  onClose: () => void
  onSaved: () => void
}) {
  const effectiveSucursalId = cedulon.sucursalId ?? defaultSucursalId
  const { cajas } = useCajas(effectiveSucursalId)
  const { pagar } = useCedulones()
  const [importe, setImporte] = useState(cedulon.saldo)
  const [selectedCajaId, setSelectedCajaId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const effectiveCajaId = selectedCajaId ?? cajas[0]?.id ?? null

  const handleSave = async () => {
    if (!effectiveCajaId || importe <= 0) {
      setError("Caja e importe son obligatorios")
      return
    }

    setSaving(true)
    setError(null)
    const ok = await pagar(cedulon.id, importe, effectiveCajaId)
    setSaving(false)

    if (ok) onSaved()
    else setError("No se pudo registrar el pago del cedulón")
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Importe a registrar</Label>
          <Input
            type="number"
            min={0}
            step={0.01}
            value={importe || ""}
            onChange={(event) => setImporte(parseFloat(event.target.value) || 0)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Caja</Label>
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
      </div>

      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Se registra un pago contra el endpoint real del cedulón. No se simulan recibos,
          compensaciones ni conciliaciones adicionales mientras la API no las exponga.
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2 border-t pt-3">
        <Button variant="outline" className="bg-transparent" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Registrando..." : "Confirmar pago"}
        </Button>
      </div>
    </div>
  )
}

export default function CedulonesPage() {
  const defaultSucursalId = useDefaultSucursalId()
  const [todayTimestamp] = useState(() => Date.now())
  const [filterEstado, setFilterEstado] = useState("")
  const [searchText, setSearchText] = useState("")
  const { cedulones, loading, error, page, setPage, totalCount, totalPages, refetch } =
    useCedulones({ estado: filterEstado || undefined })
  const { proveedores } = useProveedores()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const proveedorById = useMemo(
    () => new Map(proveedores.map((proveedor) => [proveedor.id, proveedor])),
    [proveedores]
  )
  const selected = useMemo(
    () => cedulones.find((cedulon) => cedulon.id === selectedId) ?? null,
    [cedulones, selectedId]
  )
  const detailOpen = isDetailOpen && selected !== null
  const paymentOpen = isPaymentOpen && selected !== null

  const getProveedor = (id: number) => proveedorById.get(id) ?? null

  const getTerceroName = (id: number) => getProveedor(id)?.razonSocial ?? String(id)

  const visible = useMemo(() => {
    const term = searchText.trim().toLowerCase()
    return term
      ? cedulones.filter((cedulon) => {
          const terceroName = (
            proveedorById.get(cedulon.terceroId)?.razonSocial ?? String(cedulon.terceroId)
          ).toLowerCase()
          return (
            (cedulon.numero ?? "").toLowerCase().includes(term) ||
            terceroName.includes(term) ||
            (cedulon.descripcion ?? "").toLowerCase().includes(term)
          )
        })
      : cedulones
  }, [cedulones, proveedorById, searchText])

  const vencidos = useMemo(
    () =>
      cedulones.filter((cedulon) => {
        if (!cedulon.fechaVencimiento || cedulon.saldo <= 0 || cedulon.estado === "ANULADO") {
          return false
        }

        return new Date(cedulon.fechaVencimiento).getTime() < todayTimestamp
      }),
    [cedulones, todayTimestamp]
  )
  const loadingVencidos = loading

  const pendientes = cedulones.filter((cedulon) => cedulon.estado === "PENDIENTE").length
  const pagados = cedulones.filter((cedulon) => cedulon.estado === "PAGADO").length
  const saldoAbierto = cedulones.reduce((sum, cedulon) => sum + cedulon.saldo, 0)
  const highlightedCedulon =
    selected && visible.some((cedulon) => cedulon.id === selected.id)
      ? selected
      : (visible[0] ?? null)
  const highlightedSupplier = highlightedCedulon ? getProveedor(highlightedCedulon.terceroId) : null

  const highlightedFields = highlightedCedulon
    ? [
        {
          label: "Proveedor",
          value: highlightedSupplier?.razonSocial ?? `#${highlightedCedulon.terceroId}`,
        },
        { label: "Vencimiento", value: formatDate(highlightedCedulon.fechaVencimiento) },
        { label: "Saldo", value: formatMoney(highlightedCedulon.saldo) },
        { label: "Estado de pago", value: getCedulonPaymentStatus(highlightedCedulon) },
        { label: "Operación", value: getCedulonOperationalStatus(highlightedCedulon) },
        { label: "Domicilio proveedor", value: formatSupplierAddress(highlightedSupplier) },
      ]
    : []

  const detailFields = selected
    ? [
        { label: "Número", value: selected.numero ?? `#${selected.id}` },
        { label: "Estado", value: selected.estado },
        { label: "Proveedor", value: getTerceroName(selected.terceroId) },
        { label: "Descripción", value: selected.descripcion ?? "-" },
        { label: "Importe", value: formatMoney(selected.importe) },
        { label: "Saldo", value: formatMoney(selected.saldo) },
        { label: "Emisión", value: formatDate(selected.fechaEmision) },
        { label: "Vencimiento", value: formatDate(selected.fechaVencimiento) },
      ]
    : []

  const supplierFields = selected
    ? (() => {
        const supplier = getProveedor(selected.terceroId)
        return [
          { label: "Razón social", value: supplier?.razonSocial ?? `#${selected.terceroId}` },
          { label: "Fantasia", value: supplier?.nombreFantasia ?? "-" },
          { label: "CUIT", value: supplier?.nroDocumento ?? "-" },
          { label: "Condición IVA", value: supplier?.condicionIvaDescripcion ?? "-" },
          { label: "Domicilio", value: formatSupplierAddress(supplier) },
          {
            label: "Contacto",
            value: supplier?.email ?? supplier?.telefono ?? supplier?.celular ?? "-",
          },
          {
            label: "Límite crédito",
            value:
              typeof supplier?.limiteCredito === "number"
                ? formatMoney(supplier.limiteCredito)
                : "-",
          },
          { label: "Facturable", value: supplier?.facturable ? "Sí" : "No" },
        ]
      })()
    : []

  const circuitFields = selected
    ? [
        { label: "Estado operativo", value: getCedulonOperationalStatus(selected) },
        { label: "Estado de pago", value: getCedulonPaymentStatus(selected) },
        {
          label: "Cobertura del importe",
          value:
            selected.importe > 0
              ? `${(((selected.importe - selected.saldo) / selected.importe) * 100).toFixed(0)}% registrado`
              : "Sin importe base",
        },
        {
          label: "Proveedor asociado",
          value: getTerceroName(selected.terceroId),
        },
      ]
    : []

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cedulones</h1>
          <p className="mt-1 text-muted-foreground">
            Consola operativa para alta, seguimiento y pago de cédulas de compra sobre la API
            vigente.
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo cedulón
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
            <p className="mt-1 text-xs text-muted-foreground">Cedulones registrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendientes}</div>
            <p className="mt-1 text-xs text-muted-foreground">Sin registrar pago</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagados</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pagados}</div>
            <p className="mt-1 text-xs text-muted-foreground">Cedulones cancelados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo abierto</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(saldoAbierto)}</div>
            <p className="mt-1 text-xs text-muted-foreground">Compromiso pendiente</p>
          </CardContent>
        </Card>
      </div>

      {highlightedCedulon ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardDescription>Cedulón destacado</CardDescription>
              <CardTitle className="mt-1 text-xl">
                {highlightedCedulon.numero ?? `#${highlightedCedulon.id}`} ·{" "}
                {highlightedSupplier?.razonSocial ?? `Proveedor #${highlightedCedulon.terceroId}`}
              </CardTitle>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                {highlightedCedulon.descripcion?.trim() ||
                  "Sin descripción operativa informada para este cedulón."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={estadoBadgeVariant[highlightedCedulon.estado] ?? "outline"}>
                {highlightedCedulon.estado}
              </Badge>
              <Badge variant="outline">{getCedulonPaymentStatus(highlightedCedulon)}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <DetailFieldGrid fields={highlightedFields} />
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-[1fr_180px]">
              <Input
                placeholder="Buscar por número, proveedor o descripción..."
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                className="w-full"
              />
              <Select
                value={filterEstado || "todos"}
                onValueChange={(value) => {
                  setFilterEstado(value === "todos" ? "" : value)
                  setPage(1)
                }}
              >
                <SelectTrigger className="w-45">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los estados</SelectItem>
                  <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                  <SelectItem value="PAGADO">Pagado</SelectItem>
                  <SelectItem value="VENCIDO">Vencido</SelectItem>
                  <SelectItem value="ANULADO">Anulado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4" /> Vencidos reales
            </CardTitle>
            <CardDescription>
              Cedulones vencidos según el endpoint específico del backend.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingVencidos ? (
              <p className="text-sm text-muted-foreground">Cargando vencidos...</p>
            ) : vencidos.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay vencidos para la sucursal activa.
              </p>
            ) : (
              <div className="space-y-3">
                {vencidos.slice(0, 4).map((cedulon) => (
                  <div key={cedulon.id} className="rounded-lg border p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{cedulon.numero ?? `#${cedulon.id}`}</p>
                      <Badge variant="destructive">Vencido</Badge>
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      {getTerceroName(cedulon.terceroId)}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatDate(cedulon.fechaVencimiento)}</span>
                      <span>{formatMoney(cedulon.saldo)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Cedulones</CardTitle>
          <CardDescription>{visible.length} visibles en la página actual</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Importe</TableHead>
                <TableHead>Saldo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Circuito</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : visible.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                    No hay cedulones para mostrar.
                  </TableCell>
                </TableRow>
              ) : (
                visible.map((cedulon) => (
                  <TableRow key={cedulon.id} className="cursor-pointer hover:bg-muted/40">
                    <TableCell className="font-medium">
                      {cedulon.numero ?? `#${cedulon.id}`}
                    </TableCell>
                    <TableCell>{getTerceroName(cedulon.terceroId)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {cedulon.descripcion ?? "-"}
                    </TableCell>
                    <TableCell className="font-semibold">{formatMoney(cedulon.importe)}</TableCell>
                    <TableCell className="font-semibold">{formatMoney(cedulon.saldo)}</TableCell>
                    <TableCell>
                      <Badge variant={estadoBadgeVariant[cedulon.estado] ?? "outline"}>
                        {cedulon.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-65 text-sm text-muted-foreground">
                      {getCedulonPaymentStatus(cedulon)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(cedulon.fechaVencimiento)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedId(cedulon.id)
                            setIsDetailOpen(true)
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {cedulon.saldo > 0 && cedulon.estado !== "ANULADO" && (
                          <Button
                            variant="outline"
                            className="bg-transparent"
                            onClick={() => {
                              setSelectedId(cedulon.id)
                              setIsPaymentOpen(true)
                            }}
                          >
                            Pagar
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Página {page} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={page >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ReceiptText className="h-4 w-4" /> Alta operativa
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {totalCount} cedulones registrados con alta real sobre la API actual y {pendientes} aún
            abiertos para seguimiento.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-4 w-4" /> Pago real
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {pagados} ya figuran cancelados y el saldo abierto actual es {formatMoney(saldoAbierto)}{" "}
            sin simular conciliaciones paralelas.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Landmark className="h-4 w-4" /> Segunda fase
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {vencidos.length} vencidos detectados ya quedan visibles; emisión masiva, impresión
            específica y agrupaciones por convenio siguen reservadas.
          </CardContent>
        </Card>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo cedulón</DialogTitle>
            <DialogDescription>
              Alta real de una cédula de pago dentro del circuito de compras.
            </DialogDescription>
          </DialogHeader>
          <CedulonForm
            key={`create-${defaultSucursalId ?? 0}`}
            defaultSucursalId={defaultSucursalId}
            onClose={() => setIsCreateOpen(false)}
            onSaved={async () => {
              setIsCreateOpen(false)
              await refetch()
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={paymentOpen}
        onOpenChange={(open) => {
          if (!open) setIsPaymentOpen(false)
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Registrar pago</DialogTitle>
            <DialogDescription>
              {selected
                ? `${selected.numero ?? `#${selected.id}`} · ${getTerceroName(selected.terceroId)}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <CedulonPaymentForm
              key={`pay-${selected.id}-${selected.sucursalId ?? defaultSucursalId ?? 0}`}
              cedulon={selected}
              defaultSucursalId={defaultSucursalId}
              onClose={() => setIsPaymentOpen(false)}
              onSaved={async () => {
                setIsPaymentOpen(false)
                await refetch()
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={detailOpen}
        onOpenChange={(open) => {
          if (!open) setIsDetailOpen(false)
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Cedulón {selected?.numero ?? `#${selected?.id}`}
            </DialogTitle>
            <DialogDescription>
              {selected ? getTerceroName(selected.terceroId) : ""}
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <Tabs defaultValue="principal" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="principal">Principal</TabsTrigger>
                <TabsTrigger value="circuito">Circuito</TabsTrigger>
                <TabsTrigger value="vencimiento">Vencimiento</TabsTrigger>
                <TabsTrigger value="legado">Legado</TabsTrigger>
              </TabsList>

              <TabsContent value="principal" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Datos del cedulón</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DetailFieldGrid fields={detailFields} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Proveedor vinculado</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DetailFieldGrid fields={supplierFields} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="circuito" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Estado operativo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DetailFieldGrid fields={circuitFields} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="vencimiento" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Estado de cobro</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    {getCedulonPaymentStatus(selected)}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="legado" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Bloques reservados</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    La vista ya deja visible saldo, mora y cobertura del importe. Impresión
                    dedicada, generación masiva, agrupación institucional y conciliación ampliada
                    quedan pendientes hasta que el backend los exponga de forma formal.
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              className="bg-transparent"
              onClick={() => setIsDetailOpen(false)}
            >
              Cerrar
            </Button>
            {selected && selected.saldo > 0 && selected.estado !== "ANULADO" && (
              <Button
                onClick={() => {
                  setIsDetailOpen(false)
                  setIsPaymentOpen(true)
                }}
              >
                Registrar pago
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
