"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Building2,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  ShieldCheck,
  BriefcaseBusiness,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  AlertCircle,
  Landmark,
  Wallet,
} from "lucide-react"
import { buildLegacySupplierOverlay } from "@/lib/compras-legacy-data"
import { useProveedores, useTercerosConfig } from "@/lib/hooks/useTerceros"
import { useGeografia } from "@/lib/hooks/useGeografia"
import type { Tercero, CreateTerceroDto } from "@/lib/types/terceros"

const EMPTY_SUPPLIER_FORM: CreateTerceroDto = {
  razonSocial: "",
  nombreFantasia: null,
  nroDocumento: null,
  condicionIvaId: 0,
  esCliente: false,
  esProveedor: true,
  esEmpleado: false,
  calle: null,
  nro: null,
  piso: null,
  dpto: null,
  codigoPostal: null,
  localidadId: null,
  barrioId: null,
  nroIngresosBrutos: null,
  nroMunicipal: null,
  telefono: null,
  celular: null,
  email: null,
  web: null,
  monedaId: null,
  categoriaId: null,
  limiteCredito: null,
  facturable: true,
  cobradorId: null,
  pctComisionCobrador: 0,
  vendedorId: null,
  pctComisionVendedor: 0,
  observacion: null,
}

function buildSupplierForm(supplier?: Tercero | null): CreateTerceroDto {
  if (!supplier) return { ...EMPTY_SUPPLIER_FORM }

  return {
    razonSocial: supplier.razonSocial,
    nombreFantasia: supplier.nombreFantasia,
    nroDocumento: supplier.nroDocumento,
    condicionIvaId: supplier.condicionIvaId,
    esCliente: false,
    esProveedor: true,
    esEmpleado: false,
    calle: supplier.calle,
    nro: supplier.nro,
    piso: supplier.piso,
    dpto: supplier.dpto,
    codigoPostal: supplier.codigoPostal,
    localidadId: supplier.localidadId,
    barrioId: supplier.barrioId,
    nroIngresosBrutos: supplier.nroIngresosBrutos,
    nroMunicipal: supplier.nroMunicipal,
    telefono: supplier.telefono,
    celular: supplier.celular,
    email: supplier.email,
    web: supplier.web,
    monedaId: supplier.monedaId,
    categoriaId: supplier.categoriaId,
    limiteCredito: supplier.limiteCredito,
    facturable: supplier.facturable,
    cobradorId: supplier.cobradorId,
    pctComisionCobrador: supplier.pctComisionCobrador,
    vendedorId: supplier.vendedorId,
    pctComisionVendedor: supplier.pctComisionVendedor,
    observacion: supplier.observacion,
  }
}

function supplierStatusBadge(active: boolean) {
  return <Badge variant={active ? "default" : "secondary"}>{active ? "Activo" : "Inactivo"}</Badge>
}

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value ?? 0)
}

function getSupplierCircuit(supplier: Tercero) {
  if (!supplier.activo) return "Maestro inactivo"
  if (!supplier.facturable && supplier.limiteCredito) return "Credito sin facturacion"
  if (supplier.facturable && supplier.limiteCredito) return "Credito habilitado"
  if (supplier.facturable) return "Operacion corriente"
  return "Cobertura administrativa"
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

interface SupplierFormProps {
  supplier: Tercero | null
  onClose: () => void
  onSaved: () => void
  createProveedor: (dto: CreateTerceroDto) => Promise<boolean>
  updateProveedor: (id: number, dto: Partial<CreateTerceroDto>) => Promise<boolean>
}

function SupplierForm({
  supplier,
  onClose,
  onSaved,
  createProveedor,
  updateProveedor,
}: SupplierFormProps) {
  const { condicionesIva, monedas } = useTercerosConfig()
  const [tab, setTab] = useState("principales")
  const [form, setForm] = useState<CreateTerceroDto>(() => buildSupplierForm(supplier))
  const legacyPreview = buildLegacySupplierOverlay(supplier)
  const { localidades, barrios } = useGeografia({
    autoFetchLocalidades: true,
    localidadId: form.localidadId,
  })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const set = (key: keyof CreateTerceroDto, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const str = (value: string) => value || null
  const num = (value: string) => (value ? Number(value) : null)

  const handleSave = async () => {
    if (!form.razonSocial.trim()) {
      setFormError("La razón social es obligatoria")
      return
    }
    if (!form.condicionIvaId) {
      setFormError("Seleccione una condición IVA")
      return
    }

    setSaving(true)
    setFormError(null)

    const ok = supplier ? await updateProveedor(supplier.id, form) : await createProveedor(form)

    setSaving(false)
    if (ok) onSaved()
    else setFormError("No se pudo guardar el proveedor")
  }

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid h-auto w-full grid-cols-5">
          <TabsTrigger value="principales" className="py-2 text-xs">
            Principales
          </TabsTrigger>
          <TabsTrigger value="ubicacion" className="py-2 text-xs">
            Ubicación
          </TabsTrigger>
          <TabsTrigger value="fiscal" className="py-2 text-xs">
            Fiscal
          </TabsTrigger>
          <TabsTrigger value="comercial" className="py-2 text-xs">
            Comercial
          </TabsTrigger>
          <TabsTrigger value="otros" className="py-2 text-xs">
            Otros
          </TabsTrigger>
        </TabsList>

        <TabsContent value="principales" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>
                Razón Social <span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.razonSocial}
                onChange={(e) => set("razonSocial", e.target.value)}
                placeholder="Proveedor SA"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nombre Comercial</Label>
              <Input
                value={form.nombreFantasia ?? ""}
                onChange={(e) => set("nombreFantasia", str(e.target.value))}
                placeholder="Nombre comercial"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                value={form.email ?? ""}
                onChange={(e) => set("email", str(e.target.value))}
                type="email"
                placeholder="compras@proveedor.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Sitio Web</Label>
              <Input
                value={form.web ?? ""}
                onChange={(e) => set("web", str(e.target.value))}
                placeholder="https://proveedor.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Teléfono</Label>
              <Input
                value={form.telefono ?? ""}
                onChange={(e) => set("telefono", str(e.target.value))}
                placeholder="011-1234-5678"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Celular</Label>
              <Input
                value={form.celular ?? ""}
                onChange={(e) => set("celular", str(e.target.value))}
                placeholder="11-1234-5678"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="ubicacion" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <Label>Calle</Label>
              <Input
                value={form.calle ?? ""}
                onChange={(e) => set("calle", str(e.target.value))}
                placeholder="Av. Corrientes"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Número</Label>
              <Input
                value={form.nro ?? ""}
                onChange={(e) => set("nro", str(e.target.value))}
                placeholder="1234"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Piso</Label>
              <Input
                value={form.piso ?? ""}
                onChange={(e) => set("piso", str(e.target.value))}
                placeholder="8"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Departamento</Label>
              <Input
                value={form.dpto ?? ""}
                onChange={(e) => set("dpto", str(e.target.value))}
                placeholder="B"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Código Postal</Label>
              <Input
                value={form.codigoPostal ?? ""}
                onChange={(e) => set("codigoPostal", str(e.target.value))}
                placeholder="C1043"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Localidad</Label>
              <Select
                value={form.localidadId ? String(form.localidadId) : "__none__"}
                onValueChange={(value) => {
                  const nextLocalidadId = value === "__none__" ? null : Number(value)
                  setForm((prev) => ({
                    ...prev,
                    localidadId: nextLocalidadId,
                    barrioId: nextLocalidadId === prev.localidadId ? prev.barrioId : null,
                  }))
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar localidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin localidad</SelectItem>
                  {localidades.map((localidad) => (
                    <SelectItem key={localidad.id} value={String(localidad.id)}>
                      {localidad.descripcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Barrio</Label>
              <Select
                value={form.barrioId ? String(form.barrioId) : "__none__"}
                onValueChange={(value) =>
                  set("barrioId", value === "__none__" ? null : Number(value))
                }
                disabled={!form.localidadId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar barrio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin barrio</SelectItem>
                  {barrios.map((barrio) => (
                    <SelectItem key={barrio.id} value={String(barrio.id)}>
                      {barrio.descripcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="fiscal" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>CUIT / Documento</Label>
              <Input
                value={form.nroDocumento ?? ""}
                onChange={(e) => set("nroDocumento", str(e.target.value))}
                placeholder="30-12345678-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                Condición IVA <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.condicionIvaId ? String(form.condicionIvaId) : ""}
                onValueChange={(value) => set("condicionIvaId", Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {condicionesIva.map((condicion) => (
                    <SelectItem key={condicion.id} value={String(condicion.id)}>
                      {condicion.descripcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Nro. Ingresos Brutos</Label>
              <Input
                value={form.nroIngresosBrutos ?? ""}
                onChange={(e) => set("nroIngresosBrutos", str(e.target.value))}
                placeholder="IB-001"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nro. Municipal</Label>
              <Input
                value={form.nroMunicipal ?? ""}
                onChange={(e) => set("nroMunicipal", str(e.target.value))}
                placeholder="MUN-001"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="comercial" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Moneda</Label>
              <Select
                value={form.monedaId ? String(form.monedaId) : "__none__"}
                onValueChange={(value) =>
                  set("monedaId", value === "__none__" ? null : Number(value))
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
              <Label>Límite de Crédito</Label>
              <Input
                type="number"
                min={0}
                value={form.limiteCredito ?? ""}
                onChange={(e) =>
                  set("limiteCredito", e.target.value ? parseFloat(e.target.value) : null)
                }
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Categoría</Label>
              <Input
                type="number"
                min={0}
                value={form.categoriaId ?? ""}
                onChange={(e) => set("categoriaId", num(e.target.value))}
                placeholder="ID de categoría"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Cobrador</Label>
              <Input
                type="number"
                min={0}
                value={form.cobradorId ?? ""}
                onChange={(e) => set("cobradorId", num(e.target.value))}
                placeholder="ID cobrador"
              />
            </div>
            <div className="space-y-1.5">
              <Label>% Comisión Cobrador</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={form.pctComisionCobrador}
                onChange={(e) => set("pctComisionCobrador", parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Vendedor</Label>
              <Input
                type="number"
                min={0}
                value={form.vendedorId ?? ""}
                onChange={(e) => set("vendedorId", num(e.target.value))}
                placeholder="ID vendedor"
              />
            </div>
            <div className="space-y-1.5">
              <Label>% Comisión Vendedor</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={form.pctComisionVendedor}
                onChange={(e) => set("pctComisionVendedor", parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="flex items-center gap-2 pt-7">
              <Switch
                id="facturable"
                checked={form.facturable}
                onCheckedChange={(checked) => set("facturable", checked)}
              />
              <Label htmlFor="facturable">Facturable</Label>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="otros" className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label>Observaciones</Label>
            <Textarea
              value={form.observacion ?? ""}
              onChange={(e) => set("observacion", str(e.target.value))}
              rows={5}
            />
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Overlay heredado visible</CardTitle>
              <CardDescription>
                Datos históricos en lectura mientras la API publica estos contratos.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Retenciones</p>
                <p className="mt-2 text-sm font-medium">{legacyPreview.retenciones.join(" · ")}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">CBU</p>
                <p className="mt-2 text-sm font-medium">{legacyPreview.cbu}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Cuenta contable</p>
                <p className="mt-2 text-sm font-medium">{legacyPreview.cuentaContable}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Condición de pago</p>
                <p className="mt-2 text-sm font-medium">{legacyPreview.condicionPago}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {formError && (
        <p className="flex items-center gap-1 text-sm text-red-500">
          <AlertCircle className="h-4 w-4" />
          {formError}
        </p>
      )}

      <div className="flex justify-end gap-2 border-t pt-3">
        <Button variant="outline" className="bg-transparent" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Guardando..." : supplier ? "Guardar cambios" : "Crear proveedor"}
        </Button>
      </div>
    </div>
  )
}

function SupplierDetail({ supplier }: { supplier: Tercero }) {
  const legacyFields = buildLegacySupplierOverlay(supplier)

  const principalFields = [
    { label: "Razón Social", value: supplier.razonSocial },
    { label: "Nombre Comercial", value: supplier.nombreFantasia ?? "-" },
    { label: "Email", value: supplier.email ?? "-" },
    { label: "Teléfono", value: supplier.telefono ?? "-" },
    { label: "Celular", value: supplier.celular ?? "-" },
    { label: "Sitio Web", value: supplier.web ?? "-" },
  ]

  const locationFields = [
    { label: "Calle", value: supplier.calle ?? "-" },
    { label: "Número", value: supplier.nro ?? "-" },
    { label: "Piso", value: supplier.piso ?? "-" },
    { label: "Departamento", value: supplier.dpto ?? "-" },
    { label: "Código Postal", value: supplier.codigoPostal ?? "-" },
    {
      label: "Localidad",
      value:
        supplier.localidadDescripcion ?? (supplier.localidadId ? `#${supplier.localidadId}` : "-"),
    },
  ]

  const fiscalFields = [
    { label: "CUIT / Documento", value: supplier.nroDocumento ?? "-" },
    {
      label: "Condición IVA",
      value: supplier.condicionIvaDescripcion ?? `Cond. ${supplier.condicionIvaId}`,
    },
    { label: "Nro. Ingresos Brutos", value: supplier.nroIngresosBrutos ?? "-" },
    { label: "Nro. Municipal", value: supplier.nroMunicipal ?? "-" },
  ]

  const comercialFields = [
    { label: "Moneda", value: supplier.monedaId ? `#${supplier.monedaId}` : "-" },
    { label: "Categoría", value: supplier.categoriaId ? `#${supplier.categoriaId}` : "-" },
    {
      label: "Límite de Crédito",
      value:
        supplier.limiteCredito !== null
          ? supplier.limiteCredito.toLocaleString("es-AR", { style: "currency", currency: "ARS" })
          : "Sin límite",
    },
    { label: "Cobrador", value: supplier.cobradorId ? `#${supplier.cobradorId}` : "-" },
    { label: "% Comisión Cobrador", value: `${supplier.pctComisionCobrador}%` },
    { label: "Vendedor", value: supplier.vendedorId ? `#${supplier.vendedorId}` : "-" },
    { label: "% Comisión Vendedor", value: `${supplier.pctComisionVendedor}%` },
    { label: "Facturable", value: supplier.facturable ? "Sí" : "No" },
  ]

  return (
    <Tabs defaultValue="general" className="w-full">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="ubicacion">Ubicación</TabsTrigger>
        <TabsTrigger value="fiscal">Fiscal</TabsTrigger>
        <TabsTrigger value="comercial">Comercial</TabsTrigger>
        <TabsTrigger value="heredado">Legado</TabsTrigger>
      </TabsList>

      <TabsContent value="general" className="space-y-4">
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

      <TabsContent value="ubicacion" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4" /> Ubicación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DetailFieldGrid fields={locationFields} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="fiscal" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4" /> Datos Fiscales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DetailFieldGrid fields={fiscalFields} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="comercial" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BriefcaseBusiness className="h-4 w-4" /> Datos Comerciales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DetailFieldGrid fields={comercialFields} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="heredado" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-4 w-4" /> Circuito heredado visible
            </CardTitle>
            <CardDescription>
              Campos históricos visibles sin inventar escrituras nuevas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <DetailFieldGrid
              fields={[
                { label: "Tipo de persona", value: legacyFields.tipoPersona },
                { label: "Personería", value: legacyFields.personeria },
                { label: "Condición de pago", value: legacyFields.condicionPago },
                { label: "Categoría de riesgo", value: legacyFields.categoriaRiesgo },
                { label: "Cuenta contable", value: legacyFields.cuentaContable },
                { label: "CBU", value: legacyFields.cbu },
                { label: "Fecha de alta", value: legacyFields.fechaAlta },
                { label: "Última actualización", value: legacyFields.ultimaActualizacion },
                { label: "Usuario alta", value: legacyFields.usuarioAlta },
              ]}
            />
            <div className="grid gap-4 md:grid-cols-2 text-sm">
              <div className="rounded-lg border p-4">
                <p className="font-medium">Retenciones activas</p>
                <p className="mt-2 text-muted-foreground">{legacyFields.retenciones.join(" · ")}</p>
              </div>
              <div className="rounded-lg border p-4 text-muted-foreground">
                {legacyFields.observacionExtendida}
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

export default function ProveedoresPage() {
  const {
    terceros,
    loading,
    error,
    totalCount,
    totalPages,
    page,
    setPage,
    search,
    setSearch,
    createProveedor,
    updateProveedor,
    deleteProveedor,
    refetch,
  } = useProveedores({ soloActivos: false })

  const [filterEstado, setFilterEstado] = useState<string>("todos")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [detailSupplierId, setDetailSupplierId] = useState<number | null>(null)

  const filteredSuppliers = useMemo(() => {
    return terceros.filter((supplier) => {
      if (filterEstado === "activo") return supplier.activo
      if (filterEstado === "inactivo") return !supplier.activo
      return true
    })
  }, [filterEstado, terceros])

  const visibleSummary = useMemo(() => {
    const activos = filteredSuppliers.filter((supplier) => supplier.activo)
    const facturables = filteredSuppliers.filter((supplier) => supplier.facturable)
    const conCredito = filteredSuppliers.filter(
      (supplier) => supplier.limiteCredito !== null && supplier.limiteCredito > 0
    )
    const observados = filteredSuppliers.filter(
      (supplier) =>
        !supplier.activo || !supplier.facturable || !supplier.email || !supplier.telefono
    )

    return {
      visibles: filteredSuppliers.length,
      activos: activos.length,
      facturables: facturables.length,
      conCredito: conCredito.length,
      creditoVisible: conCredito.reduce(
        (sum, supplier) => sum + Number(supplier.limiteCredito ?? 0),
        0
      ),
      observados: observados.length,
    }
  }, [filteredSuppliers])

  const coberturaFiscal = useMemo(() => {
    return filteredSuppliers
      .reduce<Array<{ condicion: string; total: number; activos: number }>>((acc, supplier) => {
        const condicion = supplier.condicionIvaDescripcion ?? `Cond. ${supplier.condicionIvaId}`
        const existing = acc.find((item) => item.condicion === condicion)

        if (existing) {
          existing.total += 1
          if (supplier.activo) existing.activos += 1
          return acc
        }

        acc.push({
          condicion,
          total: 1,
          activos: supplier.activo ? 1 : 0,
        })
        return acc
      }, [])
      .sort((a, b) => b.total - a.total)
      .slice(0, 6)
  }, [filteredSuppliers])

  const supplierAlerts = useMemo(() => {
    return filteredSuppliers
      .map((supplier) => ({
        id: supplier.id,
        razonSocial: supplier.razonSocial,
        circuito: getSupplierCircuit(supplier),
        motivo: !supplier.activo
          ? "Proveedor inactivo dentro del maestro visible."
          : !supplier.email && !supplier.telefono
            ? "Sin vias de contacto visibles en la pagina actual."
            : !supplier.facturable
              ? "Marcado como no facturable en el contrato actual."
              : supplier.limiteCredito !== null && supplier.limiteCredito > 0
                ? `Limite visible ${formatCurrency(supplier.limiteCredito)}.`
                : "Operacion corriente sin limite de credito configurado.",
        score:
          (!supplier.activo ? 3 : 0) +
          (!supplier.facturable ? 2 : 0) +
          (!supplier.email && !supplier.telefono ? 2 : 0) +
          (supplier.limiteCredito !== null && supplier.limiteCredito > 0 ? 1 : 0),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
  }, [filteredSuppliers])

  const selectedSupplier = useMemo(
    () => terceros.find((supplier) => supplier.id === selectedSupplierId) ?? null,
    [selectedSupplierId, terceros]
  )
  const detailSupplier = useMemo(
    () => terceros.find((supplier) => supplier.id === detailSupplierId) ?? null,
    [detailSupplierId, terceros]
  )
  const formOpen = isFormOpen && (selectedSupplierId === null || selectedSupplier !== null)
  const detailOpen = isDetailOpen && detailSupplier !== null

  const highlightedSupplier =
    detailSupplier && filteredSuppliers.some((supplier) => supplier.id === detailSupplier.id)
      ? detailSupplier
      : (filteredSuppliers[0] ?? null)

  const handleNew = () => {
    setSelectedSupplierId(null)
    setIsFormOpen(true)
  }

  const handleEdit = (supplier: Tercero) => {
    setSelectedSupplierId(supplier.id)
    setIsFormOpen(true)
  }

  const handleViewDetail = (supplier: Tercero) => {
    setDetailSupplierId(supplier.id)
    setIsDetailOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (confirm("¿Está seguro de desactivar este proveedor?")) {
      const ok = await deleteProveedor(id)
      if (!ok) return

      if (detailSupplierId === id) {
        setDetailSupplierId(null)
        setIsDetailOpen(false)
      }

      if (selectedSupplierId === id) {
        setSelectedSupplierId(null)
        setIsFormOpen(false)
      }

      refetch()
    }
  }

  const handleSaved = () => {
    setIsFormOpen(false)
    setSelectedSupplierId(null)
    refetch()
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Proveedores</h1>
          <p className="text-muted-foreground">
            Maestro operativo de proveedores con lectura fiscal, comercial y administrativa del
            backend actual
          </p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Proveedor
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Visibles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{visibleSummary.visibles}</div>
            <p className="mt-1 text-xs text-muted-foreground">{totalCount} encontrados en total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Activos visibles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{visibleSummary.activos}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Inactivos visibles: {visibleSummary.visibles - visibleSummary.activos}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Facturables visibles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{visibleSummary.facturables}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Observados en pagina: {visibleSummary.observados}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Credito visible</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(visibleSummary.creditoVisible)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {visibleSummary.conCredito} con limite configurado en esta pagina
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Radar de cartera</CardTitle>
            <CardDescription>
              Alertas del maestro visible sin simular cuenta corriente ni retenciones no publicadas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {supplierAlerts.length > 0 ? (
              supplierAlerts.map((supplier) => (
                <div key={supplier.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{supplier.razonSocial}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{supplier.circuito}</p>
                    </div>
                    <Badge
                      variant={
                        supplier.score >= 4
                          ? "destructive"
                          : supplier.score >= 2
                            ? "secondary"
                            : "outline"
                      }
                    >
                      Prioridad {supplier.score}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{supplier.motivo}</p>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                No hay proveedores visibles para construir el radar actual.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Proveedor destacado</CardTitle>
            <CardDescription>
              Lectura rápida del registro principal dentro de la página filtrada.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {highlightedSupplier ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{highlightedSupplier.razonSocial}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {highlightedSupplier.condicionIvaDescripcion ??
                        `Cond. ${highlightedSupplier.condicionIvaId}`}
                    </p>
                  </div>
                  {supplierStatusBadge(highlightedSupplier.activo)}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Circuito</p>
                    <p className="mt-2 font-medium">{getSupplierCircuit(highlightedSupplier)}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Localidad</p>
                    <p className="mt-2 font-medium">
                      {highlightedSupplier.localidadDescripcion ?? "Sin localidad"}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Credito</p>
                    <p className="mt-2 font-medium">
                      {formatCurrency(highlightedSupplier.limiteCredito)}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Facturable</p>
                    <p className="mt-2 font-medium">
                      {highlightedSupplier.facturable ? "Si" : "No"}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
                  La vista actual ya cubre datos fiscales, ubicación, crédito, contacto y estado.
                  Retenciones por régimen, CBU, documentos y cuenta corriente extendida siguen fuera
                  del backend publicado y no se simulan.
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                No hay proveedores visibles para construir el resumen destacado.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cobertura fiscal</CardTitle>
            <CardDescription>
              Distribucion visible por condicion IVA dentro de la pagina filtrada.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {coberturaFiscal.length > 0 ? (
              coberturaFiscal.map((item) => (
                <div key={item.condicion} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.condicion}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.total} registros visibles
                      </p>
                    </div>
                    <p className="text-sm font-medium">{item.activos} activos</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                No hay condiciones fiscales visibles para resumir.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estado de paginacion</CardTitle>
            <CardDescription>
              La busqueda resetea a pagina 1 para no mezclar filtros nuevos con offsets viejos.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Landmark className="h-4 w-4 text-sky-600" />
                Cobertura del maestro
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Se muestran activos e inactivos cuando el backend los devuelve; los KPIs distinguen
                visibles en pagina frente al total encontrado.
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Wallet className="h-4 w-4 text-amber-600" />
                Lectura comercial
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                El credito visible se calcula con limites configurados en la pagina actual, sin
                inventar saldos de cuenta corriente ni scoring externo.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="min-w-70 flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por razón social o CUIT..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={filterEstado} onValueChange={setFilterEstado}>
              <SelectTrigger className="w-45">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="activo">Activo</SelectItem>
                <SelectItem value="inactivo">Inactivo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Proveedores ({filteredSuppliers.length})</CardTitle>
          <CardDescription>
            Maestro enriquecido con datos fiscales, ubicación y comerciales visibles hoy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Razón Social</TableHead>
                <TableHead>CUIT</TableHead>
                <TableHead>Localidad</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Límite Crédito</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin" />
                    Cargando proveedores...
                  </TableCell>
                </TableRow>
              )}
              {error && (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-destructive">
                    {error}
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                !error &&
                filteredSuppliers.map((supplier) => (
                  <TableRow
                    key={supplier.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleViewDetail(supplier)}
                  >
                    <TableCell className="font-mono text-sm">#{supplier.id}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{supplier.razonSocial}</p>
                        {supplier.nombreFantasia && (
                          <p className="text-sm text-muted-foreground">{supplier.nombreFantasia}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{supplier.nroDocumento ?? "-"}</TableCell>
                    <TableCell>{supplier.localidadDescripcion ?? "-"}</TableCell>
                    <TableCell>
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Phone className="h-3 w-3" /> {supplier.telefono ?? "-"}
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Mail className="h-3 w-3" /> {supplier.email ?? "-"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {supplier.limiteCredito !== null
                        ? supplier.limiteCredito.toLocaleString("es-AR", {
                            style: "currency",
                            currency: "ARS",
                          })
                        : "Sin límite"}
                    </TableCell>
                    <TableCell>{supplierStatusBadge(supplier.activo)}</TableCell>
                    <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewDetail(supplier)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(supplier)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(supplier.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              {!loading && !error && filteredSuppliers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    No se encontraron proveedores.
                  </TableCell>
                </TableRow>
              )}
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

      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open)
          if (!open) setSelectedSupplierId(null)
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedSupplier ? "Editar Proveedor" : "Nuevo Proveedor"}</DialogTitle>
            <DialogDescription>
              Formulario estructurado sobre el esquema del legado y adaptado al DTO actual.
            </DialogDescription>
          </DialogHeader>
          <SupplierForm
            key={`${selectedSupplier ? `edit-${selectedSupplier.id}` : "new-supplier"}-${isFormOpen ? "open" : "closed"}`}
            supplier={selectedSupplier}
            onClose={() => {
              setIsFormOpen(false)
              setSelectedSupplierId(null)
            }}
            onSaved={handleSaved}
            createProveedor={createProveedor}
            updateProveedor={updateProveedor}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={detailOpen}
        onOpenChange={(open) => {
          setIsDetailOpen(open)
          if (!open) setDetailSupplierId(null)
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl">
              <Building2 className="h-6 w-6" />
              {detailSupplier?.razonSocial}
              {detailSupplier && supplierStatusBadge(detailSupplier.activo)}
            </DialogTitle>
            <DialogDescription>
              {detailSupplier?.nroDocumento ?? "Sin CUIT"}
              {detailSupplier?.condicionIvaDescripcion
                ? ` · ${detailSupplier.condicionIvaDescripcion}`
                : ""}
            </DialogDescription>
          </DialogHeader>

          {detailSupplier && <SupplierDetail supplier={detailSupplier} />}

          <DialogFooter>
            <Button
              variant="outline"
              className="bg-transparent"
              onClick={() => setIsDetailOpen(false)}
            >
              Cerrar
            </Button>
            {detailSupplier && (
              <Button
                onClick={() => {
                  setIsDetailOpen(false)
                  setDetailSupplierId(null)
                  handleEdit(detailSupplier)
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                Editar proveedor
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
