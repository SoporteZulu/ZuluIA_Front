"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
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
  Percent,
  AlertCircle,
  Plus,
  Eye,
  Tags,
  CalendarClock,
  Filter,
  Edit,
  Layers3,
  ShieldCheck,
} from "lucide-react"
import { useDescuentosComerciales } from "@/lib/hooks/useDescuentosComerciales"
import { useLegacyLocalCollection } from "@/lib/hooks/useLegacyLocalCollection"
import { useTerceros } from "@/lib/hooks/useTerceros"
import { useItems } from "@/lib/hooks/useItems"
import type {
  CreateDescuentoComercialDto,
  DescuentoComercial,
} from "@/lib/types/descuentos-comerciales"
import type { Item } from "@/lib/types/items"
import type { Tercero } from "@/lib/types/terceros"
import {
  buildLegacyDiscountProfile,
  type LegacyDiscountProfile,
  type LegacyDiscountWindow,
} from "@/lib/ventas-descuentos-legacy"

const EMPTY_FORM: CreateDescuentoComercialDto = {
  terceroId: undefined,
  itemId: undefined,
  porcentaje: 0,
  desde: undefined,
  hasta: undefined,
}

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleDateString("es-AR") : "-"
}

function formatMoney(value: number) {
  return value.toLocaleString("es-AR", { style: "currency", currency: "ARS" })
}

function formatCustomerAddress(customer?: Tercero | null) {
  if (!customer) return "-"
  const parts = [
    [customer.calle, customer.nro].filter(Boolean).join(" "),
    customer.piso ? `Piso ${customer.piso}` : null,
    customer.dpto ? `Dto ${customer.dpto}` : null,
    customer.localidadDescripcion,
    customer.codigoPostal,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(", ") : "-"
}

function getDiscountScope(discount: Pick<DescuentoComercial, "terceroId" | "itemId">) {
  if (discount.terceroId && discount.itemId) return "Cliente + producto"
  if (discount.terceroId) return "Por cliente"
  if (discount.itemId) return "Por producto"
  return "General"
}

function getDaysUntil(value?: string) {
  if (!value) return null
  const targetDate = new Date(value)
  const today = new Date()
  targetDate.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  return Math.floor((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function getValidityStatus(discount: DescuentoComercial) {
  if (!discount.activo) return "Regla inactiva"
  const today = new Date().toISOString().slice(0, 10)
  if (discount.desde && discount.desde > today) {
    return `Comienza el ${formatDate(discount.desde)}`
  }
  if (discount.hasta && discount.hasta < today) {
    return `Vencido el ${formatDate(discount.hasta)}`
  }
  if (discount.hasta) {
    const days = getDaysUntil(discount.hasta)
    if (days !== null && days >= 0) return `Vigente por ${days} días más`
  }
  return "Vigente sin vencimiento inmediato"
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

function createLegacyDiscountWindow(): LegacyDiscountWindow {
  return {
    id: `window-${globalThis.crypto.randomUUID()}`,
    descripcion: "",
    desde: "",
    hasta: "",
  }
}

interface DiscountFormProps {
  onClose: () => void
  onSaved: () => void
}

function DiscountForm({ onClose, onSaved }: DiscountFormProps) {
  const { crear } = useDescuentosComerciales()
  const { terceros } = useTerceros()
  const { items } = useItems()
  const [tab, setTab] = useState("principal")
  const [form, setForm] = useState<CreateDescuentoComercialDto>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (key: keyof CreateDescuentoComercialDto, value: number | string | undefined) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const selectedCustomer =
    form.terceroId !== undefined
      ? terceros.find((tercero) => tercero.id === form.terceroId) ?? null
      : null
  const selectedItem =
    form.itemId !== undefined ? items.find((item) => item.id === form.itemId) ?? null : null

  const handleSave = async () => {
    if (!form.porcentaje || form.porcentaje <= 0) {
      setError("El porcentaje debe ser mayor a 0")
      return
    }

    setSaving(true)
    setError(null)
    const ok = await crear(form)
    setSaving(false)

    if (ok) onSaved()
    else setError("No se pudo crear el descuento")
  }

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid h-auto w-full grid-cols-3">
          <TabsTrigger value="principal" className="py-2 text-xs">
            Alcance
          </TabsTrigger>
          <TabsTrigger value="vigencia" className="py-2 text-xs">
            Vigencia
          </TabsTrigger>
          <TabsTrigger value="legado" className="py-2 text-xs">
            Cobertura actual
          </TabsTrigger>
        </TabsList>

        <TabsContent value="principal" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Porcentaje</Label>
              <Input
                type="number"
                min={0.01}
                max={100}
                step={0.01}
                value={form.porcentaje || ""}
                onChange={(event) => set("porcentaje", parseFloat(event.target.value) || 0)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <Select
                value={form.terceroId ? String(form.terceroId) : "__all__"}
                onValueChange={(value) =>
                  set("terceroId", value === "__all__" ? undefined : Number(value))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los clientes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos los clientes</SelectItem>
                  {terceros.map((tercero) => (
                    <SelectItem key={tercero.id} value={String(tercero.id)}>
                      {tercero.razonSocial}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Producto</Label>
              <Select
                value={form.itemId ? String(form.itemId) : "__all__"}
                onValueChange={(value) =>
                  set("itemId", value === "__all__" ? undefined : Number(value))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los productos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos los productos</SelectItem>
                  {items.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      {item.codigo} · {item.descripcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Cliente vinculado</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm md:grid-cols-2">
                <div className="rounded-lg border bg-muted/30 p-3 md:col-span-2">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Razón social</p>
                  <p className="mt-1 font-medium wrap-break-word">
                    {selectedCustomer?.razonSocial ?? "Todos los clientes"}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">CUIT</p>
                  <p className="mt-1 font-medium wrap-break-word">
                    {selectedCustomer?.nroDocumento ?? "No aplica"}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">IVA</p>
                  <p className="mt-1 font-medium wrap-break-word">
                    {selectedCustomer?.condicionIvaDescripcion ?? "No aplica"}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3 md:col-span-2">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Domicilio</p>
                  <p className="mt-1 font-medium wrap-break-word">
                    {formatCustomerAddress(selectedCustomer)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Producto vinculado</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm md:grid-cols-2">
                <div className="rounded-lg border bg-muted/30 p-3 md:col-span-2">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Producto</p>
                  <p className="mt-1 font-medium wrap-break-word">
                    {selectedItem
                      ? `${selectedItem.codigo} · ${selectedItem.descripcion}`
                      : "Todos los productos"}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Categoría</p>
                  <p className="mt-1 font-medium wrap-break-word">
                    {selectedItem?.categoriaDescripcion ?? "General"}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Precio actual</p>
                  <p className="mt-1 font-medium wrap-break-word">
                    {selectedItem ? formatMoney(selectedItem.precioVenta) : "No aplica"}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3 md:col-span-2">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Cobertura</p>
                  <p className="mt-1 font-medium wrap-break-word">{getDiscountScope(form)}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="vigencia" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Desde</Label>
              <Input
                type="date"
                value={form.desde ?? ""}
                onChange={(event) => set("desde", event.target.value || undefined)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Hasta</Label>
              <Input
                type="date"
                value={form.hasta ?? ""}
                onChange={(event) => set("hasta", event.target.value || undefined)}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="legado" className="mt-4 space-y-4">
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              El circuito histórico de descuentos contemplaba reglas por rubro, zona, listas
              especiales, promociones combinadas y aprobaciones. La vista actual deja preparada esa
              ampliación luego del alta, sin forzar contratos inexistentes sobre la API actual.
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
          {saving ? "Guardando..." : "Guardar descuento"}
        </Button>
      </div>
    </div>
  )
}

function DiscountDetail({
  descuento,
  customer,
  item,
  legacyProfile,
}: {
  descuento: DescuentoComercial
  customer?: Tercero | null
  item?: Item | null
  legacyProfile: LegacyDiscountProfile
}) {
  const today = new Date().toISOString().slice(0, 10)
  const vigente =
    descuento.activo &&
    (!descuento.desde || descuento.desde <= today) &&
    (!descuento.hasta || descuento.hasta >= today)

  const principalFields = [
    { label: "Porcentaje", value: `${descuento.porcentaje}%` },
    { label: "Cliente", value: customer?.razonSocial ?? "Todos" },
    { label: "Producto", value: item ? `${item.codigo} · ${item.descripcion}` : "Todos" },
    { label: "Estado", value: descuento.activo ? "Activo" : "Inactivo" },
  ]

  const vigenciaFields = [
    { label: "Desde", value: formatDate(descuento.desde) },
    { label: "Hasta", value: formatDate(descuento.hasta) },
    {
      label: "Aplicación",
      value: descuento.terceroId || descuento.itemId ? "Segmentada" : "General",
    },
    { label: "Vigente hoy", value: vigente ? "Sí" : "No" },
  ]

  const circuitFields = [
    { label: "Alcance comercial", value: getDiscountScope(descuento) },
    { label: "Estado de vigencia", value: getValidityStatus(descuento) },
    {
      label: "Intensidad del descuento",
      value:
        descuento.porcentaje >= 25
          ? "Alto impacto comercial"
          : descuento.porcentaje >= 10
            ? "Impacto intermedio"
            : "Ajuste comercial liviano",
    },
    {
      label: "Cobertura operativa",
      value:
        descuento.terceroId && descuento.itemId
          ? "Condición puntual por cliente y producto"
          : descuento.terceroId
            ? "Condición aplicada al cliente seleccionado"
            : descuento.itemId
              ? "Condición aplicada al producto seleccionado"
              : "Condición general para toda la cartera",
    },
  ]

  const customerFields = [
    { label: "Razón social", value: customer?.razonSocial ?? "Todos los clientes" },
    { label: "Fantasia", value: customer?.nombreFantasia ?? "-" },
    { label: "CUIT", value: customer?.nroDocumento ?? "-" },
    { label: "Condición IVA", value: customer?.condicionIvaDescripcion ?? "-" },
    { label: "Domicilio", value: formatCustomerAddress(customer) },
    { label: "Contacto", value: customer?.email ?? customer?.telefono ?? customer?.celular ?? "-" },
    {
      label: "Límite crédito",
      value:
        typeof customer?.limiteCredito === "number" ? formatMoney(customer.limiteCredito) : "-",
    },
    { label: "Facturable", value: customer ? (customer.facturable ? "Sí" : "No") : "No aplica" },
  ]

  const itemFields = [
    { label: "Código", value: item?.codigo ?? "Todos los productos" },
    { label: "Descripción", value: item?.descripcion ?? "Cobertura general" },
    { label: "Adicional", value: item?.descripcionAdicional ?? "-" },
    { label: "Categoría", value: item?.categoriaDescripcion ?? "-" },
    { label: "Unidad", value: item?.unidadMedidaDescripcion ?? "-" },
    { label: "Precio venta", value: item ? formatMoney(item.precioVenta) : "No aplica" },
    { label: "Código barras", value: item?.codigoBarras ?? "-" },
    {
      label: "Stock",
      value: item ? (item.manejaStock ? "Controlado" : "No controlado") : "No aplica",
    },
  ]

  const legacyScopeFields = [
    { label: "Campaña", value: legacyProfile.campania || "Sin campaña específica" },
    { label: "Zona", value: legacyProfile.zona || "Sin zona" },
    { label: "Canal", value: legacyProfile.canal || "Sin canal" },
    { label: "Sucursal", value: legacyProfile.sucursal || "Sin sucursal" },
    { label: "Lista especial", value: legacyProfile.listaEspecial || "No aplica" },
    { label: "Rubro", value: legacyProfile.rubro || "No definido" },
    { label: "Subrubro", value: legacyProfile.subrubro || "No definido" },
  ]

  const legacyApprovalFields = [
    {
      label: "Requiere aprobación",
      value: legacyProfile.requiereAprobacion ? "Sí" : "No",
    },
    { label: "Aprobado", value: legacyProfile.aprobado ? "Sí" : "No" },
    { label: "Aprobado por", value: legacyProfile.aprobadoPor || "Pendiente" },
    {
      label: "Fecha aprobación",
      value: legacyProfile.fechaAprobacion ? formatDate(legacyProfile.fechaAprobacion) : "-",
    },
  ]

  const legacyStackingFields = [
    { label: "Combinable", value: legacyProfile.combinable ? "Sí" : "No" },
    { label: "Prioridad", value: String(legacyProfile.prioridad) },
    { label: "Regla base", value: legacyProfile.reglaBase || "Sin regla base" },
    {
      label: "Franjas operativas",
      value:
        legacyProfile.franjas.length > 0
          ? `${legacyProfile.franjas.length} configurada(s)`
          : "Sin franjas",
    },
  ]

  return (
    <Tabs defaultValue="principal" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="principal">Principal</TabsTrigger>
        <TabsTrigger value="circuito">Circuito</TabsTrigger>
        <TabsTrigger value="vigencia">Vigencia</TabsTrigger>
        <TabsTrigger value="legado">Cobertura actual</TabsTrigger>
      </TabsList>

      <TabsContent value="principal" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Tags className="h-4 w-4" /> Alcance Comercial
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DetailFieldGrid fields={principalFields} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cliente vinculado</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailFieldGrid fields={customerFields} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Producto vinculado</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailFieldGrid fields={itemFields} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="vigencia" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4" /> Vigencia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DetailFieldGrid fields={vigenciaFields} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="circuito" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="h-4 w-4" /> Estado operativo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DetailFieldGrid fields={circuitFields} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="legado" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Segmentación ampliada</CardTitle>
            <CardDescription>
              Rubro, zona, canal, sucursal y listas especiales visibles sin inventar backend.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DetailFieldGrid fields={legacyScopeFields} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Aprobación y encadenamiento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DetailFieldGrid fields={legacyApprovalFields} />
            <DetailFieldGrid fields={legacyStackingFields} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Observaciones y franjas</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>{legacyProfile.observaciones || "Sin observaciones registradas."}</p>
            <div className="mt-4 space-y-2">
              {legacyProfile.franjas.length > 0 ? (
                legacyProfile.franjas.map((franja) => (
                  <div key={franja.id} className="rounded-lg border bg-muted/30 p-3">
                    <p className="font-medium text-foreground">
                      {franja.descripcion || "Franja sin descripción"}
                    </p>
                    <p>
                      Desde: {formatDate(franja.desde || undefined)} · Hasta:{" "}
                      {formatDate(franja.hasta || undefined)}
                    </p>
                  </div>
                ))
              ) : (
                <p>No hay franjas adicionales configuradas.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

function LegacyDiscountDialog({
  descuento,
  initialProfile,
  onClose,
  onSave,
}: {
  descuento: DescuentoComercial
  initialProfile: LegacyDiscountProfile
  onClose: () => void
  onSave: (profile: LegacyDiscountProfile) => void
}) {
  const [profile, setProfile] = useState<LegacyDiscountProfile>(initialProfile)

  const set = (
    key: keyof LegacyDiscountProfile,
    value: string | number | boolean | LegacyDiscountWindow[]
  ) => {
    setProfile((prev) => ({ ...prev, [key]: value }))
  }

  const updateWindow = (id: string, patch: Partial<LegacyDiscountWindow>) => {
    setProfile((prev) => ({
      ...prev,
      franjas: prev.franjas.map((franja) => (franja.id === id ? { ...franja, ...patch } : franja)),
    }))
  }

  const removeWindow = (id: string) => {
    setProfile((prev) => ({
      ...prev,
      franjas: prev.franjas.filter((franja) => franja.id !== id),
    }))
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
        La segmentación ampliada del descuento #{descuento.id} se completa localmente mientras la
        API actual sigue concentrada en porcentaje, cliente, producto y vigencia.
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Campaña</Label>
          <Input
            value={profile.campania}
            onChange={(event) => set("campania", event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Lista especial</Label>
          <Input
            value={profile.listaEspecial}
            onChange={(event) => set("listaEspecial", event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Zona</Label>
          <Input value={profile.zona} onChange={(event) => set("zona", event.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Canal</Label>
          <Input value={profile.canal} onChange={(event) => set("canal", event.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Sucursal</Label>
          <Input
            value={profile.sucursal}
            onChange={(event) => set("sucursal", event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Rubro / Subrubro</Label>
          <div className="grid gap-2 md:grid-cols-2">
            <Input
              value={profile.rubro}
              onChange={(event) => set("rubro", event.target.value)}
              placeholder="Rubro"
            />
            <Input
              value={profile.subrubro}
              onChange={(event) => set("subrubro", event.target.value)}
              placeholder="Subrubro"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4" /> Aprobación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium">Requiere aprobación</p>
                <p className="text-sm text-muted-foreground">
                  Para descuentos excepcionales fuera del circuito estándar.
                </p>
              </div>
              <Switch
                checked={profile.requiereAprobacion}
                onCheckedChange={(value) => set("requiereAprobacion", value)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium">Aprobado</p>
                <p className="text-sm text-muted-foreground">
                  Registrar aprobación formal del descuento heredado.
                </p>
              </div>
              <Switch
                checked={profile.aprobado}
                onCheckedChange={(value) => set("aprobado", value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Aprobado por</Label>
              <Input
                value={profile.aprobadoPor}
                onChange={(event) => set("aprobadoPor", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha de aprobación</Label>
              <Input
                type="date"
                value={profile.fechaAprobacion}
                onChange={(event) => set("fechaAprobacion", event.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers3 className="h-4 w-4" /> Encadenamiento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium">Combinable</p>
                <p className="text-sm text-muted-foreground">
                  Permite convivencia con otras reglas promocionales.
                </p>
              </div>
              <Switch
                checked={profile.combinable}
                onCheckedChange={(value) => set("combinable", value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Prioridad</Label>
              <Input
                type="number"
                min={1}
                max={999}
                value={profile.prioridad}
                onChange={(event) => set("prioridad", Number(event.target.value) || 0)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Regla base</Label>
              <Input
                value={profile.reglaBase}
                onChange={(event) => set("reglaBase", event.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Franjas y ventanas</CardTitle>
            <CardDescription>
              Permite documentar campañas por período o ventana operativa del legado.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            className="bg-transparent"
            onClick={() => set("franjas", [...profile.franjas, createLegacyDiscountWindow()])}
          >
            <Plus className="mr-2 h-4 w-4" /> Agregar franja
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {profile.franjas.length > 0 ? (
            profile.franjas.map((franja) => (
              <div
                key={franja.id}
                className="grid gap-3 rounded-lg border p-3 md:grid-cols-[1.2fr_1fr_1fr_auto]"
              >
                <Input
                  value={franja.descripcion}
                  onChange={(event) => updateWindow(franja.id, { descripcion: event.target.value })}
                  placeholder="Descripción"
                />
                <Input
                  type="date"
                  value={franja.desde}
                  onChange={(event) => updateWindow(franja.id, { desde: event.target.value })}
                />
                <Input
                  type="date"
                  value={franja.hasta}
                  onChange={(event) => updateWindow(franja.id, { hasta: event.target.value })}
                />
                <Button type="button" variant="ghost" onClick={() => removeWindow(franja.id)}>
                  Quitar
                </Button>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Sin franjas configuradas.</p>
          )}
        </CardContent>
      </Card>

      <div className="space-y-1.5">
        <Label>Observaciones</Label>
        <Textarea
          value={profile.observaciones}
          onChange={(event) => set("observaciones", event.target.value)}
          placeholder={`Notas operativas para el descuento #${descuento.id}`}
          rows={5}
        />
      </div>

      <DialogFooter>
        <Button variant="outline" className="bg-transparent" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={() => onSave(profile)}>Guardar contexto ampliado</Button>
      </DialogFooter>
    </div>
  )
}

export default function DescuentosComercialesPage() {
  const { descuentos, loading, error, refetch } = useDescuentosComerciales()
  const { terceros } = useTerceros()
  const { items } = useItems()
  const { rows: legacyProfiles, setRows: setLegacyProfiles } =
    useLegacyLocalCollection<LegacyDiscountProfile>("ventas-descuentos-legacy", [])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterEstado, setFilterEstado] = useState("todos")
  const [filterAlcance, setFilterAlcance] = useState("todos")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [detailDiscount, setDetailDiscount] = useState<DescuentoComercial | null>(null)
  const [legacyDiscount, setLegacyDiscount] = useState<DescuentoComercial | null>(null)

  const today = new Date().toISOString().slice(0, 10)

  const customerNameById = new Map(terceros.map((tercero) => [tercero.id, tercero.razonSocial]))
  const itemNameById = new Map(
    items.map((item) => [item.id, `${item.codigo} · ${item.descripcion}`])
  )
  const legacyProfileByDiscountId = new Map(
    legacyProfiles.map((profile) => [profile.discountId, profile])
  )

  const getCustomerName = (terceroId?: number) => {
    if (!terceroId) return "Todos"
    return customerNameById.get(terceroId) ?? `#${terceroId}`
  }

  const getCustomer = (terceroId?: number) => {
    if (!terceroId) return null
    return terceros.find((tercero) => tercero.id === terceroId) ?? null
  }

  const getItemName = (itemId?: number) => {
    if (!itemId) return "Todos"
    return itemNameById.get(itemId) ?? `#${itemId}`
  }

  const getItem = (itemId?: number) => {
    if (!itemId) return null
    return items.find((item) => item.id === itemId) ?? null
  }

  const getLegacyProfile = (discount: DescuentoComercial) => {
    return legacyProfileByDiscountId.get(discount.id) ?? buildLegacyDiscountProfile(discount)
  }

  const saveLegacyProfile = (profile: LegacyDiscountProfile) => {
    setLegacyProfiles((prev) => {
      const index = prev.findIndex((row) => row.discountId === profile.discountId)
      if (index === -1) return [...prev, profile]
      return prev.map((row) => (row.discountId === profile.discountId ? profile : row))
    })
    setLegacyDiscount(null)
  }

  const normalizedSearchTerm = searchTerm.toLowerCase().trim()

  const filtered = descuentos.filter((discount) => {
    const matchesSearch =
      normalizedSearchTerm === "" ||
      discount.porcentaje.toString().includes(normalizedSearchTerm) ||
      (discount.terceroId
        ? (customerNameById.get(discount.terceroId) ?? `#${discount.terceroId}`)
            .toLowerCase()
            .includes(normalizedSearchTerm)
        : "todos".includes(normalizedSearchTerm)) ||
      (discount.itemId
        ? (itemNameById.get(discount.itemId) ?? `#${discount.itemId}`)
            .toLowerCase()
            .includes(normalizedSearchTerm)
        : "todos".includes(normalizedSearchTerm))

    const matchesEstado =
      filterEstado === "todos" ||
      (filterEstado === "activos" && discount.activo) ||
      (filterEstado === "inactivos" && !discount.activo) ||
      (filterEstado === "vigentes" &&
        discount.activo &&
        (!discount.desde || discount.desde <= today) &&
        (!discount.hasta || discount.hasta >= today)) ||
      (filterEstado === "vencidos" && !!discount.hasta && discount.hasta < today)

    const isGeneral = !discount.terceroId && !discount.itemId
    const isCliente = !!discount.terceroId && !discount.itemId
    const isProducto = !discount.terceroId && !!discount.itemId
    const isMixto = !!discount.terceroId && !!discount.itemId

    const matchesAlcance =
      filterAlcance === "todos" ||
      (filterAlcance === "general" && isGeneral) ||
      (filterAlcance === "cliente" && isCliente) ||
      (filterAlcance === "producto" && isProducto) ||
      (filterAlcance === "mixto" && isMixto)

    return matchesSearch && matchesEstado && matchesAlcance
  })

  const activos = descuentos.filter((discount) => discount.activo).length
  const vigentes = descuentos.filter(
    (discount) =>
      discount.activo &&
      (!discount.desde || discount.desde <= today) &&
      (!discount.hasta || discount.hasta >= today)
  ).length
  const generales = descuentos.filter((discount) => !discount.terceroId && !discount.itemId).length
  const segmentados = descuentos.filter(
    (discount) => !!discount.terceroId || !!discount.itemId
  ).length
  const legacyConfigured = descuentos.filter((discount) =>
    legacyProfileByDiscountId.has(discount.id)
  ).length
  const approvalsRequired = legacyProfiles.filter((profile) => profile.requiereAprobacion).length
  const combinables = legacyProfiles.filter((profile) => profile.combinable).length
  const averagePct =
    descuentos.length > 0
      ? descuentos.reduce((acc, discount) => acc + discount.porcentaje, 0) / descuentos.length
      : 0
  const highlightedDiscount =
    detailDiscount && filtered.some((discount) => discount.id === detailDiscount.id)
      ? detailDiscount
      : (filtered[0] ?? null)
  const highlightedCustomer = highlightedDiscount
    ? getCustomer(highlightedDiscount.terceroId)
    : null
  const highlightedItem = highlightedDiscount ? getItem(highlightedDiscount.itemId) : null
  const highlightedLegacy = highlightedDiscount ? getLegacyProfile(highlightedDiscount) : null
  const highlightedFields = highlightedDiscount
    ? [
        { label: "Alcance", value: getDiscountScope(highlightedDiscount) },
        { label: "Cliente", value: highlightedCustomer?.razonSocial ?? "Todos" },
        {
          label: "Producto",
          value: highlightedItem
            ? `${highlightedItem.codigo} · ${highlightedItem.descripcion}`
            : "Todos",
        },
        { label: "Estado de vigencia", value: getValidityStatus(highlightedDiscount) },
        { label: "Desde", value: formatDate(highlightedDiscount.desde) },
        { label: "Hasta", value: formatDate(highlightedDiscount.hasta) },
        {
          label: "Canal / zona",
          value: highlightedLegacy
            ? [highlightedLegacy.canal || "Sin canal", highlightedLegacy.zona || "Sin zona"].join(
                " · "
              )
            : "Sin overlay",
        },
        {
          label: "Aprobación",
          value: highlightedLegacy?.requiereAprobacion
            ? highlightedLegacy.aprobado
              ? `Aprobado por ${highlightedLegacy.aprobadoPor || "usuario no informado"}`
              : "Pendiente"
            : "No requerida",
        },
      ]
    : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Descuentos Comerciales</h1>
          <p className="text-muted-foreground">
            Maestro operativo de descuentos por cliente, producto y vigencia, con cobertura
            ampliada para campañas, segmentación y aprobaciones cuando el circuito lo necesita.
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo descuento
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{descuentos.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activos}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Vigentes Hoy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{vigentes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Generales / Segmentados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {generales} / {segmentados}
            </div>
          </CardContent>
        </Card>
      </div>

      {highlightedDiscount ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardDescription>Regla destacada</CardDescription>
              <CardTitle className="mt-1 text-xl">
                {highlightedDiscount.porcentaje}% ·{" "}
                {highlightedCustomer?.razonSocial ?? "Todos los clientes"}
              </CardTitle>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                {highlightedItem
                  ? `${highlightedItem.codigo} · ${highlightedItem.descripcion}`
                  : "Cobertura general sin producto específico."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={highlightedDiscount.activo ? "default" : "secondary"}>
                {highlightedDiscount.activo ? "Activo" : "Inactivo"}
              </Badge>
              <Badge variant="outline">{getValidityStatus(highlightedDiscount)}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <DetailFieldGrid fields={highlightedFields} />
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Percent className="h-4 w-4" /> Cobertura comercial
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {vigentes} reglas vigentes hoy con un promedio de {averagePct.toFixed(2)}% de descuento
            en el maestro actual.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Tags className="h-4 w-4" /> Segmentación visible
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {generales} reglas generales y {segmentados} segmentadas ya muestran el alcance
            comercial sin lógica adicional.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers3 className="h-4 w-4" /> Cobertura ampliada
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {legacyConfigured} reglas ya documentan zona, canal, listas o campañas;{" "}
            {approvalsRequired} requieren aprobación y {combinables} permiten encadenamiento.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4" /> Gobierno comercial
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {approvalsRequired} reglas requieren aprobación formal y {Math.max(
              legacyConfigured - approvalsRequired,
              0
            )} ya pueden administrarse sin validación adicional.
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" /> Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-[1fr_220px_220px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por porcentaje, cliente o producto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterEstado} onValueChange={setFilterEstado}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="activos">Activos</SelectItem>
                <SelectItem value="inactivos">Inactivos</SelectItem>
                <SelectItem value="vigentes">Vigentes hoy</SelectItem>
                <SelectItem value="vencidos">Vencidos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterAlcance} onValueChange={setFilterAlcance}>
              <SelectTrigger>
                <SelectValue placeholder="Alcance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="cliente">Por cliente</SelectItem>
                <SelectItem value="producto">Por producto</SelectItem>
                <SelectItem value="mixto">Cliente + producto</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reglas de Descuento ({filtered.length})</CardTitle>
          <CardDescription>
            El modelo actual soporta alta real y deja preparada la ampliación a promociones más
            complejas y segmentación comercial adicional.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Porcentaje</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Alcance</TableHead>
                <TableHead>Circuito</TableHead>
                <TableHead>Desde</TableHead>
                <TableHead>Hasta</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Contexto</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    Cargando...
                  </TableCell>
                </TableRow>
              )}
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    <Percent className="mx-auto mb-2 h-8 w-8 opacity-50" />
                    No hay descuentos registrados
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((descuento) => (
                <TableRow
                  key={descuento.id}
                  className="cursor-pointer hover:bg-muted/40"
                  onClick={() => setDetailDiscount(descuento)}
                >
                  <TableCell className="font-bold text-lg">{descuento.porcentaje}%</TableCell>
                  <TableCell>{getCustomerName(descuento.terceroId)}</TableCell>
                  <TableCell>{getItemName(descuento.itemId)}</TableCell>
                  <TableCell>{getDiscountScope(descuento)}</TableCell>
                  <TableCell className="max-w-65 text-sm text-muted-foreground">
                    {getValidityStatus(descuento)}
                  </TableCell>
                  <TableCell>{formatDate(descuento.desde)}</TableCell>
                  <TableCell>{formatDate(descuento.hasta)}</TableCell>
                  <TableCell>
                    <Badge variant={descuento.activo ? "default" : "secondary"}>
                      {descuento.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {legacyProfileByDiscountId.has(descuento.id) ? (
                      <Badge variant="outline">Ampliado</Badge>
                    ) : (
                      <Badge variant="secondary">Base actual</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDetailDiscount(descuento)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setLegacyDiscount(descuento)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo descuento comercial</DialogTitle>
            <DialogDescription>
              Alta operativa sobre la API actual con estructura preparada para segmentación,
              aprobaciones y campañas más complejas.
            </DialogDescription>
          </DialogHeader>
          <DiscountForm
            onClose={() => setIsFormOpen(false)}
            onSaved={() => {
              setIsFormOpen(false)
              refetch()
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={detailDiscount !== null}
        onOpenChange={(open) => {
          if (!open) setDetailDiscount(null)
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle de descuento</DialogTitle>
            <DialogDescription>
              {detailDiscount ? `${detailDiscount.porcentaje}%` : ""}
            </DialogDescription>
          </DialogHeader>
          {detailDiscount && (
            <DiscountDetail
              descuento={detailDiscount}
              customer={getCustomer(detailDiscount.terceroId)}
              item={getItem(detailDiscount.itemId)}
              legacyProfile={getLegacyProfile(detailDiscount)}
            />
          )}
          <DialogFooter>
            {detailDiscount ? (
              <Button
                variant="outline"
                className="bg-transparent"
                onClick={() => setLegacyDiscount(detailDiscount)}
              >
                Ampliar contexto
              </Button>
            ) : null}
            <Button
              variant="outline"
              className="bg-transparent"
              onClick={() => setDetailDiscount(null)}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={legacyDiscount !== null}
        onOpenChange={(open) => {
          if (!open) setLegacyDiscount(null)
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Contexto ampliado del descuento</DialogTitle>
            <DialogDescription>
              Canal, zona, listas especiales, aprobación y encadenamiento persistidos sólo en el
              frontend mientras no exista un contrato específico.
            </DialogDescription>
          </DialogHeader>
          {legacyDiscount ? (
            <LegacyDiscountDialog
              descuento={legacyDiscount}
              initialProfile={getLegacyProfile(legacyDiscount)}
              onClose={() => setLegacyDiscount(null)}
              onSave={saveLegacyProfile}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
