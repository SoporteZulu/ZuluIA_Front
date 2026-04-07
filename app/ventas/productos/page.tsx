"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertCircle,
  AlertTriangle,
  Boxes,
  CircleDollarSign,
  Edit,
  Eye,
  PackagePlus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Tag,
  Trash2,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsTrigger } from "@/components/ui/tabs"
import { SalesDialogContent, SalesTabsList } from "@/components/ventas/sales-responsive"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { useItems, useItemsConfig } from "@/lib/hooks/useItems"
import { API_BASE_URL } from "@/lib/api-config"
import type { CreateItemDto, Item, Moneda } from "@/lib/types/items"

function formatMoney(value: number, currency = "ARS") {
  return value.toLocaleString("es-AR", { style: "currency", currency })
}

function formatNumber(value: number) {
  return value.toLocaleString("es-AR")
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`
}

function getMargin(item: Pick<Item, "precioCosto" | "precioVenta">) {
  if (item.precioVenta <= 0) return null
  return ((item.precioVenta - item.precioCosto) / item.precioVenta) * 100
}

function getMarkup(item: Pick<Item, "precioCosto" | "precioVenta">) {
  if (item.precioCosto <= 0) return null
  return (item.precioVenta / item.precioCosto - 1) * 100
}

function getMarginTone(item: Pick<Item, "precioCosto" | "precioVenta">) {
  const margin = getMargin(item)

  if (item.precioVenta <= 0) {
    return {
      label: "Precio pendiente",
      description: "Todavía no hay precio de venta cargado.",
    }
  }

  if (margin === null) {
    return {
      label: "Sin lectura de margen",
      description: "No hay datos suficientes para calcular la rentabilidad.",
    }
  }

  if (margin < 0) {
    return {
      label: "Rentabilidad negativa",
      description: "El precio de venta está por debajo del costo visible.",
    }
  }

  if (margin < 20) {
    return {
      label: "Margen ajustado",
      description: "Conviene revisar precio, costo o política comercial.",
    }
  }

  return {
    label: "Margen saludable",
    description: "La rentabilidad visible opera dentro de un rango cómodo.",
  }
}

function getStock(item: Pick<Item, "stock">) {
  return Number(item.stock ?? 0)
}

function getStockTone(item: Pick<Item, "manejaStock" | "stock" | "stockMinimo" | "stockMaximo">) {
  const stock = getStock(item)
  if (!item.manejaStock) {
    return {
      label: "No stockeable",
      badge: "secondary" as const,
      description: "El artículo opera sin control de existencias.",
    }
  }
  if (stock <= item.stockMinimo) {
    return {
      label: "Reposición urgente",
      badge: "destructive" as const,
      description: "El stock está en o por debajo del mínimo operativo.",
    }
  }
  if (item.stockMaximo !== null && stock > item.stockMaximo) {
    return {
      label: "Sobre stock",
      badge: "outline" as const,
      description: "La existencia visible supera el máximo sugerido.",
    }
  }
  return {
    label: "Cobertura sana",
    badge: "default" as const,
    description: "El stock visible opera dentro del rango esperado.",
  }
}

function getCommercialProfile(item: Item) {
  if (item.esProducto && item.esServicio) return "Producto + servicio"
  if (item.esProducto) return "Producto"
  if (item.esServicio) return "Servicio"
  if (item.esFinanciero) return "Ítem financiero"
  return "Ítem general"
}

function getCoverageLabels(item: Item) {
  return [
    item.categoriaDescripcion ? "Categoría visible" : "Sin categoría",
    item.unidadMedidaDescripcion ? "Unidad comercial" : "Unidad pendiente",
    item.codigoBarras ? "Código de barras" : "Sin código de barras",
    item.codigoAfip ? "Código fiscal" : "Sin código fiscal",
    item.manejaStock ? "Control de stock" : "Sin control de stock",
    item.precioVenta > 0 ? "Precio de venta" : "Precio pendiente",
  ]
}

function resolveCurrency(item: Pick<Item, "monedaId" | "monedaSimbol">, monedas: Moneda[]) {
  return item.monedaSimbol ?? monedas.find((entry) => entry.id === item.monedaId)?.simbolo ?? "$"
}

function DetailFieldGrid({ fields }: { fields: Array<{ label: string; value: string }> }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {fields.map((field) => (
        <div key={field.label} className="rounded-xl border bg-muted/30 p-3">
          <span className="mb-1 block text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            {field.label}
          </span>
          <p className="text-sm font-medium wrap-break-word text-foreground">{field.value}</p>
        </div>
      ))}
    </div>
  )
}

const EMPTY_FORM: CreateItemDto = {
  codigo: "",
  descripcion: "",
  descripcionAdicional: null,
  categoriaId: null,
  unidadMedidaId: 0,
  alicuotaIvaId: 0,
  monedaId: 0,
  esProducto: true,
  esServicio: false,
  esFinanciero: false,
  manejaStock: true,
  precioCosto: 0,
  precioVenta: 0,
  stockMinimo: 0,
  stockMaximo: null,
  codigoBarras: null,
  codigoAfip: null,
}

function buildFormState(item: Item | null): CreateItemDto {
  if (!item) return { ...EMPTY_FORM }

  return {
    codigo: item.codigo,
    descripcion: item.descripcion,
    descripcionAdicional: item.descripcionAdicional,
    categoriaId: item.categoriaId,
    unidadMedidaId: item.unidadMedidaId,
    alicuotaIvaId: item.alicuotaIvaId,
    monedaId: item.monedaId,
    esProducto: item.esProducto,
    esServicio: item.esServicio,
    esFinanciero: item.esFinanciero,
    manejaStock: item.manejaStock,
    precioCosto: item.precioCosto,
    precioVenta: item.precioVenta,
    stockMinimo: item.stockMinimo,
    stockMaximo: item.stockMaximo,
    codigoBarras: item.codigoBarras,
    codigoAfip: item.codigoAfip,
  }
}

interface ProductFormProps {
  item: Item | null
  onClose: () => void
  onSaved: () => void
  createItem: (dto: CreateItemDto) => Promise<boolean>
  updateItem: (id: number, dto: Partial<CreateItemDto>) => Promise<boolean>
}

function ProductForm({ item, onClose, onSaved, createItem, updateItem }: ProductFormProps) {
  const { categorias, unidades, alicuotas, monedas } = useItemsConfig()
  const [tab, setTab] = useState("identificacion")
  const [form, setForm] = useState<CreateItemDto>(() => buildFormState(item))
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    setForm(buildFormState(item))
  }, [item])

  useEffect(() => {
    if (item) return

    setForm((current) => ({
      ...current,
      unidadMedidaId: current.unidadMedidaId || unidades[0]?.id || 0,
      alicuotaIvaId: current.alicuotaIvaId || alicuotas[0]?.id || 0,
      monedaId: current.monedaId || monedas[0]?.id || 0,
    }))
  }, [alicuotas, item, monedas, unidades])

  const set = (key: keyof CreateItemDto, value: string | number | boolean | null) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const margin =
    form.precioVenta > 0 ? ((form.precioVenta - form.precioCosto) / form.precioVenta) * 100 : null
  const markup = form.precioCosto > 0 ? (form.precioVenta / form.precioCosto - 1) * 100 : null
  const contribution = form.precioVenta - form.precioCosto
  const marginTone = getMarginTone(form)

  const validate = () => {
    if (!form.codigo.trim()) return "El código interno es obligatorio"
    if (!form.descripcion.trim()) return "La descripción comercial es obligatoria"
    if (!form.unidadMedidaId) return "Debe seleccionar una unidad de medida"
    if (!form.alicuotaIvaId) return "Debe seleccionar una alícuota de IVA"
    if (!form.monedaId) return "Debe seleccionar una moneda"
    if (!form.esProducto && !form.esServicio && !form.esFinanciero) {
      return "El ítem debe tener al menos un perfil operativo activo"
    }
    if (form.stockMaximo !== null && form.stockMaximo < form.stockMinimo) {
      return "El stock máximo no puede ser menor que el mínimo"
    }
    return null
  }

  const handleSave = async () => {
    const error = validate()
    if (error) {
      setFormError(error)
      return
    }

    setSaving(true)
    setFormError(null)
    const ok = item ? await updateItem(item.id, form) : await createItem(form)
    setSaving(false)

    if (ok) onSaved()
    else setFormError("No se pudo guardar el producto")
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        <Card className="border-sky-200 bg-sky-50/70">
          <CardContent className="space-y-1 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-sky-700">Ficha</p>
            <p className="text-base font-semibold text-sky-950 wrap-break-word">
              {form.descripcion || "Nuevo producto"}
            </p>
            <p className="text-xs text-sky-800">{form.codigo || "Definí el código comercial"}</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50/70">
          <CardContent className="space-y-1 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-700">Precio</p>
            <p className="text-base font-semibold text-emerald-950">
              {formatMoney(form.precioVenta || 0)}
            </p>
            <p className="text-xs text-emerald-800">
              {margin !== null
                ? `${marginTone.label} · ${formatPercent(margin)}`
                : marginTone.description}
            </p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/70">
          <CardContent className="space-y-1 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-amber-700">Operación</p>
            <p className="text-base font-semibold text-amber-950">
              {getCommercialProfile({
                ...item,
                ...form,
                id: item?.id ?? 0,
                stock: item?.stock,
                activo: item?.activo ?? true,
                createdAt: item?.createdAt ?? new Date().toISOString(),
                sucursalId: item?.sucursalId ?? null,
              } as Item)}
            </p>
            <p className="text-xs text-amber-800">
              {form.manejaStock ? "Con control de stock" : "Sin control de existencias"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <SalesTabsList className="gap-2 md:grid-cols-4">
          <TabsTrigger value="identificacion" className="py-2 text-xs">
            Identificación
          </TabsTrigger>
          <TabsTrigger value="fiscal" className="py-2 text-xs">
            Fiscal y comercial
          </TabsTrigger>
          <TabsTrigger value="precios" className="py-2 text-xs">
            Precios
          </TabsTrigger>
          <TabsTrigger value="stock" className="py-2 text-xs">
            Stock
          </TabsTrigger>
        </SalesTabsList>

        <TabsContent value="identificacion" className="mt-4 space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(260px,0.9fr)]">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Datos principales</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>
                    Código interno <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="PROD-001"
                    value={form.codigo}
                    onChange={(event) => set("codigo", event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Categoría</Label>
                  <Select
                    value={form.categoriaId ? String(form.categoriaId) : "__none__"}
                    onValueChange={(value) =>
                      set("categoriaId", value === "__none__" ? null : Number(value))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sin categoría</SelectItem>
                      {categorias.map((categoria) => (
                        <SelectItem key={categoria.id} value={String(categoria.id)}>
                          {categoria.descripcion}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>
                    Descripción comercial <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="Nombre visible para ventas, listas y documentos"
                    value={form.descripcion}
                    onChange={(event) => set("descripcion", event.target.value)}
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Descripción extendida</Label>
                  <Textarea
                    className="h-28 resize-none"
                    placeholder="Detalle útil para vendedores, backoffice o facturación"
                    value={form.descripcionAdicional ?? ""}
                    onChange={(event) => set("descripcionAdicional", event.target.value || null)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Unidad de medida</Label>
                  <Select
                    value={form.unidadMedidaId ? String(form.unidadMedidaId) : "__none__"}
                    onValueChange={(value) =>
                      set("unidadMedidaId", value === "__none__" ? 0 : Number(value))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar unidad" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Seleccionar unidad</SelectItem>
                      {unidades.map((unidad) => (
                        <SelectItem key={unidad.id} value={String(unidad.id)}>
                          {unidad.descripcion} ({unidad.codigo})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Código de barras</Label>
                  <Input
                    placeholder="7790000000000"
                    value={form.codigoBarras ?? ""}
                    onChange={(event) => set("codigoBarras", event.target.value || null)}
                  />
                </div>
                <div className="flex flex-wrap gap-3 md:col-span-2">
                  <div className="flex items-center gap-2 rounded-xl border px-3 py-2">
                    <Switch
                      id="es-producto"
                      checked={form.esProducto}
                      onCheckedChange={(checked) => set("esProducto", checked)}
                    />
                    <Label htmlFor="es-producto">Es producto</Label>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border px-3 py-2">
                    <Switch
                      id="es-servicio"
                      checked={form.esServicio}
                      onCheckedChange={(checked) => set("esServicio", checked)}
                    />
                    <Label htmlFor="es-servicio">Es servicio</Label>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border px-3 py-2">
                    <Switch
                      id="es-financiero"
                      checked={form.esFinanciero}
                      onCheckedChange={(checked) => set("esFinanciero", checked)}
                    />
                    <Label htmlFor="es-financiero">Es financiero</Label>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border px-3 py-2">
                    <Switch
                      id="maneja-stock"
                      checked={form.manejaStock}
                      onCheckedChange={(checked) => set("manejaStock", checked)}
                    />
                    <Label htmlFor="maneja-stock">Maneja stock</Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Lectura rápida</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="rounded-xl border bg-muted/30 p-3">
                  <p className="text-[11px] uppercase tracking-[0.16em]">Cobertura</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[
                      form.categoriaId ? "Categoría" : "Sin categoría",
                      form.unidadMedidaId ? "Unidad" : "Falta unidad",
                      form.codigoBarras ? "Barras" : "Sin barras",
                      form.codigoAfip ? "Fiscal" : "Sin fiscal",
                    ].map((entry) => (
                      <Badge key={entry} variant="outline" className="max-w-full wrap-break-word">
                        {entry}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border bg-muted/30 p-3">
                  <p className="text-[11px] uppercase tracking-[0.16em]">Texto comercial</p>
                  <p className="mt-2 wrap-break-word text-foreground">
                    {form.descripcionAdicional?.trim() || "Todavía no hay descripción extendida."}
                  </p>
                </div>
                <div className="rounded-xl border bg-muted/30 p-3">
                  <p className="text-[11px] uppercase tracking-[0.16em]">Perfil</p>
                  <p className="mt-2 font-medium text-foreground">
                    {form.esProducto
                      ? "Listo para catálogo y documentos"
                      : "Configuración especial"}
                  </p>
                  <p className="mt-1 text-xs">
                    La ficha usa textos simples y consistentes para ventas, listas y facturación.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="fiscal" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Datos fiscales y comerciales</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1.5">
                <Label>Moneda</Label>
                <Select
                  value={form.monedaId ? String(form.monedaId) : "__none__"}
                  onValueChange={(value) =>
                    set("monedaId", value === "__none__" ? 0 : Number(value))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar moneda" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Seleccionar moneda</SelectItem>
                    {monedas.map((moneda) => (
                      <SelectItem key={moneda.id} value={String(moneda.id)}>
                        {moneda.descripcion} ({moneda.simbolo})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Alícuota IVA</Label>
                <Select
                  value={form.alicuotaIvaId ? String(form.alicuotaIvaId) : "__none__"}
                  onValueChange={(value) =>
                    set("alicuotaIvaId", value === "__none__" ? 0 : Number(value))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar IVA" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Seleccionar IVA</SelectItem>
                    {alicuotas.map((alicuota) => (
                      <SelectItem key={alicuota.id} value={String(alicuota.id)}>
                        {alicuota.descripcion} ({alicuota.porcentaje}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 xl:col-span-2">
                <Label>Código fiscal o AFIP</Label>
                <Input
                  placeholder="Código externo, fiscal o interno complementario"
                  value={form.codigoAfip ?? ""}
                  onChange={(event) => set("codigoAfip", event.target.value || null)}
                />
              </div>
            </CardContent>
          </Card>
          <Alert>
            <ShieldCheck className="h-4 w-4" />
            <AlertDescription>
              Esta ficha concentra los datos fiscales y comerciales realmente soportados hoy por la
              API, sin mezclar etiquetas técnicas innecesarias en la interfaz.
            </AlertDescription>
          </Alert>
        </TabsContent>

        <TabsContent value="precios" className="mt-4 space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.9fr)]">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Costos y precio de venta</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Precio costo</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.precioCosto}
                    onChange={(event) => set("precioCosto", parseFloat(event.target.value) || 0)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Precio venta</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.precioVenta}
                    onChange={(event) => set("precioVenta", parseFloat(event.target.value) || 0)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Resumen de rentabilidad</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="rounded-xl border bg-muted/30 p-3">
                  <p className="text-[11px] uppercase tracking-[0.16em]">Margen</p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">
                    {margin !== null ? formatPercent(margin) : "-"}
                  </p>
                </div>
                <div className="rounded-xl border bg-muted/30 p-3">
                  <p className="text-[11px] uppercase tracking-[0.16em]">Contribución unitaria</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {formatMoney(contribution || 0)}
                  </p>
                </div>
                <div className="rounded-xl border bg-muted/30 p-3">
                  <p className="text-[11px] uppercase tracking-[0.16em]">Markup</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {markup !== null ? formatPercent(markup) : "-"}
                  </p>
                </div>
                <p
                  className={`text-xs ${margin !== null && margin < 0 ? "text-red-600" : "text-muted-foreground"}`}
                >
                  {marginTone.description}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="stock" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Política de stock</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Stock mínimo</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.stockMinimo}
                  onChange={(event) => set("stockMinimo", parseInt(event.target.value, 10) || 0)}
                  disabled={!form.manejaStock}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Stock máximo</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.stockMaximo ?? ""}
                  onChange={(event) =>
                    set("stockMaximo", event.target.value ? parseInt(event.target.value, 10) : null)
                  }
                  disabled={!form.manejaStock}
                />
              </div>
              <div className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
                <p className="text-[11px] uppercase tracking-[0.16em]">Lectura operativa</p>
                <p className="mt-2 font-medium text-foreground">
                  {form.manejaStock
                    ? "Se controlan mínimos y máximos visibles."
                    : "El artículo no exige política de stock."}
                </p>
                <p className="mt-1 wrap-break-word">
                  La unidad comercial queda preparada para documentos y para lectura de inventario
                  cuando exista stock asociado.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {formError ? (
        <p className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          {formError}
        </p>
      ) : null}

      <div className="flex justify-end gap-2 border-t pt-3">
        <Button variant="outline" onClick={onClose} className="bg-transparent">
          <X className="mr-2 h-4 w-4" /> Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Guardando..." : item ? "Guardar cambios" : "Crear producto"}
        </Button>
      </div>
    </div>
  )
}

function ProductDetail({
  item,
  monedas,
  onClose,
  onEdit,
}: {
  item: Item
  monedas: Moneda[]
  onClose: () => void
  onEdit: () => void
}) {
  const [tab, setTab] = useState("resumen")
  const stockTone = getStockTone(item)
  const margin = getMargin(item)
  const markup = getMarkup(item)
  const marginTone = getMarginTone(item)
  const currency = resolveCurrency(item, monedas)
  const stock = getStock(item)

  const summaryFields = [
    { label: "Código", value: item.codigo },
    { label: "Descripción", value: item.descripcion },
    { label: "Categoría", value: item.categoriaDescripcion || "Sin categoría" },
    { label: "Perfil", value: getCommercialProfile(item) },
    { label: "Unidad", value: item.unidadMedidaDescripcion || "Sin unidad" },
    { label: "Estado", value: item.activo ? "Activo" : "Inactivo" },
  ]

  const fiscalFields = [
    { label: "Moneda", value: `${currency} · ${item.monedaId}` },
    { label: "IVA", value: item.alicuotaIvaDescripcion || `#${item.alicuotaIvaId}` },
    { label: "Código de barras", value: item.codigoBarras || "Sin código" },
    { label: "Código fiscal", value: item.codigoAfip || "Sin código" },
  ]

  const priceFields = [
    { label: "Costo", value: formatMoney(item.precioCosto) },
    { label: "Venta", value: formatMoney(item.precioVenta) },
    { label: "Margen", value: margin !== null ? formatPercent(margin) : "-" },
    { label: "Markup", value: markup !== null ? formatPercent(markup) : "-" },
  ]

  const stockFields = [
    { label: "Stock visible", value: item.manejaStock ? formatNumber(stock) : "No aplica" },
    {
      label: "Stock mínimo",
      value: item.manejaStock ? formatNumber(item.stockMinimo) : "No aplica",
    },
    {
      label: "Stock máximo",
      value: item.manejaStock
        ? item.stockMaximo !== null
          ? formatNumber(item.stockMaximo)
          : "Sin tope"
        : "No aplica",
    },
    { label: "Lectura", value: stockTone.description },
  ]

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-4">
        <Card className="border-sky-200 bg-sky-50/70 md:col-span-2">
          <CardContent className="space-y-1 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-sky-700">
              Producto enfocado
            </p>
            <p className="text-xl font-semibold text-sky-950 wrap-break-word">{item.descripcion}</p>
            <p className="text-xs text-sky-800 wrap-break-word">
              {item.descripcionAdicional || "Sin descripción comercial ampliada."}
            </p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50/70">
          <CardContent className="space-y-1 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-700">Venta</p>
            <p className="text-lg font-semibold text-emerald-950">
              {formatMoney(item.precioVenta)}
            </p>
            <p className="text-xs text-emerald-800">
              {marginTone.label} · costo {formatMoney(item.precioCosto)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/70">
          <CardContent className="space-y-1 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-amber-700">Stock</p>
            <p className="text-lg font-semibold text-amber-950">
              {item.manejaStock ? formatNumber(stock) : "N/A"}
            </p>
            <p className="text-xs text-amber-800">{stockTone.label}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <SalesTabsList className="gap-2 md:grid-cols-4">
          <TabsTrigger value="resumen" className="py-2 text-xs">
            Resumen
          </TabsTrigger>
          <TabsTrigger value="fiscal" className="py-2 text-xs">
            Fiscal
          </TabsTrigger>
          <TabsTrigger value="precios" className="py-2 text-xs">
            Precios
          </TabsTrigger>
          <TabsTrigger value="stock" className="py-2 text-xs">
            Stock
          </TabsTrigger>
        </SalesTabsList>

        <TabsContent value="resumen" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Ficha principal</CardTitle>
            </CardHeader>
            <CardContent>
              <DetailFieldGrid fields={summaryFields} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Cobertura visible</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {getCoverageLabels(item).map((entry) => (
                  <Badge key={entry} variant="outline" className="max-w-full wrap-break-word">
                    {entry}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fiscal" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Información fiscal y comercial</CardTitle>
            </CardHeader>
            <CardContent>
              <DetailFieldGrid fields={fiscalFields} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="precios" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Lectura económica</CardTitle>
            </CardHeader>
            <CardContent>
              <DetailFieldGrid fields={priceFields} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stock" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Existencias y umbrales</CardTitle>
            </CardHeader>
            <CardContent>
              <DetailFieldGrid fields={stockFields} />
            </CardContent>
          </Card>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{stockTone.description}</AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>

      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={onClose} className="bg-transparent">
          Cerrar
        </Button>
        <Button onClick={onEdit}>
          <Edit className="mr-2 h-4 w-4" /> Editar producto
        </Button>
      </DialogFooter>
    </div>
  )
}

export default function ProductosPage() {
  const {
    items,
    loading,
    error,
    totalCount,
    page,
    setPage,
    totalPages,
    setSearch,
    createItem,
    updateItem,
    deleteItem,
    refetch,
  } = useItems()
  const { categorias, monedas } = useItemsConfig()

  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("todos")
  const [typeFilter, setTypeFilter] = useState("todos")
  const [stockFilter, setStockFilter] = useState("todos")
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null)
  const [editingItemId, setEditingItemId] = useState<number | null>(null)
  const [detailItemId, setDetailItemId] = useState<number | null>(null)
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesCategory =
        categoryFilter === "todos" || String(item.categoriaId ?? "sin-categoria") === categoryFilter

      const matchesType =
        typeFilter === "todos" ||
        (typeFilter === "producto" && item.esProducto && !item.esServicio) ||
        (typeFilter === "servicio" && item.esServicio && !item.esProducto) ||
        (typeFilter === "mixto" && item.esProducto && item.esServicio) ||
        (typeFilter === "financiero" && item.esFinanciero)

      const stock = getStock(item)
      const margin = getMargin(item) ?? 0
      const matchesStock =
        stockFilter === "todos" ||
        (stockFilter === "critico" && item.manejaStock && stock <= item.stockMinimo) ||
        (stockFilter === "sin-stock" && item.manejaStock && stock === 0) ||
        (stockFilter === "rentabilidad" && margin < 20) ||
        (stockFilter === "sin-control" && !item.manejaStock)

      return matchesCategory && matchesType && matchesStock
    })
  }, [categoryFilter, items, stockFilter, typeFilter])

  const selectedItem =
    filteredItems.find((item) => item.id === selectedItemId) ?? filteredItems[0] ?? null
  const detailItem = items.find((item) => item.id === detailItemId) ?? null
  const editingItem = items.find((item) => item.id === editingItemId) ?? null
  const deletingItem = items.find((item) => item.id === deleteItemId) ?? null

  const kpis = useMemo(() => {
    const visible = filteredItems
    const stockAlerts = visible.filter(
      (item) => item.manejaStock && getStock(item) <= item.stockMinimo
    )
    const active = visible.filter((item) => item.activo).length
    const marginAverage =
      visible.length > 0
        ? visible.reduce((sum, item) => sum + (getMargin(item) ?? 0), 0) / visible.length
        : 0

    return {
      visible: visible.length,
      active,
      stockAlerts: stockAlerts.length,
      marginAverage,
      totalValue: visible.reduce((sum, item) => sum + item.precioCosto * getStock(item), 0),
      noCategory: visible.filter((item) => !item.categoriaDescripcion).length,
    }
  }, [filteredItems])

  const categorySummary = useMemo(() => {
    const groups = new Map<string, { count: number; value: number }>()

    filteredItems.forEach((item) => {
      const key = item.categoriaDescripcion || "Sin categoría"
      const current = groups.get(key) ?? { count: 0, value: 0 }
      current.count += 1
      current.value += item.precioCosto * getStock(item)
      groups.set(key, current)
    })

    return Array.from(groups.entries())
      .map(([label, values]) => ({ label, ...values }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 5)
  }, [filteredItems])

  const alerts = useMemo(() => {
    return filteredItems
      .map((item) => {
        const stock = getStock(item)
        const margin = getMargin(item) ?? 0

        if (item.manejaStock && stock <= item.stockMinimo && margin < 20) {
          return {
            id: item.id,
            title: item.descripcion,
            subtitle: item.codigo,
            note: "Stock crítico y margen corto",
          }
        }
        if (item.manejaStock && stock <= item.stockMinimo) {
          return {
            id: item.id,
            title: item.descripcion,
            subtitle: item.codigo,
            note: "Requiere reposición",
          }
        }
        if (margin < 20) {
          return {
            id: item.id,
            title: item.descripcion,
            subtitle: item.codigo,
            note: "Margen por debajo del umbral",
          }
        }
        return null
      })
      .filter(
        (entry): entry is { id: number; title: string; subtitle: string; note: string } =>
          entry !== null
      )
      .slice(0, 6)
  }, [filteredItems])

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    setSearch(value)
  }

  const handleSaved = () => {
    setIsFormOpen(false)
    setEditingItemId(null)
    void refetch()
  }

  const openCreate = () => {
    setEditingItemId(null)
    setIsFormOpen(true)
  }

  const openEdit = (item: Item) => {
    setEditingItemId(item.id)
    setIsFormOpen(true)
  }

  const openDetail = (item: Item) => {
    setSelectedItemId(item.id)
    setDetailItemId(item.id)
    setIsDetailOpen(true)
  }

  const openDelete = (item: Item) => {
    setDeleteItemId(item.id)
    setIsDeleteOpen(true)
  }

  const confirmDelete = async () => {
    if (!deletingItem) return

    setDeleting(true)
    const ok = await deleteItem(deletingItem.id)
    setDeleting(false)

    if (!ok) return

    setIsDeleteOpen(false)
    setDeleteItemId(null)
    if (selectedItemId === deletingItem.id) setSelectedItemId(null)
    void refetch()
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Productos</h1>
          <p className="max-w-3xl text-muted-foreground">
            Maestro comercial de productos para ventas, con catálogo claro, lectura operativa útil y
            formularios alineados al contrato actual de ítems.
          </p>
        </div>
        <Button onClick={openCreate}>
          <PackagePlus className="mr-2 h-4 w-4" /> Nuevo producto
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">En pantalla</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.visible}</div>
            <p className="mt-1 text-xs text-muted-foreground">{kpis.active} activos en la vista</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Stock crítico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{kpis.stockAlerts}</div>
            <p className="mt-1 text-xs text-muted-foreground">Con reposición pendiente</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Valor visible
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{formatMoney(kpis.totalValue)}</div>
            <p className="mt-1 text-xs text-muted-foreground">Valorizado al costo</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Margen promedio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatPercent(kpis.marginAverage)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Promedio del conjunto visible</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sin categoría
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{kpis.noCategory}</div>
            <p className="mt-1 text-xs text-muted-foreground">Pendientes de orden comercial</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total general
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
            <p className="mt-1 text-xs text-muted-foreground">Conteo reportado por API</p>
          </CardContent>
        </Card>
      </div>

      {selectedItem ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.8fr)]">
          <Card className="border-sky-200 bg-linear-to-br from-sky-50 via-white to-cyan-50">
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <CardDescription>Producto seleccionado</CardDescription>
                <CardTitle className="text-2xl wrap-break-word">
                  {selectedItem.descripcion}
                </CardTitle>
                <p className="max-w-3xl text-sm text-muted-foreground wrap-break-word">
                  {selectedItem.descripcionAdicional ||
                    "Sin descripción comercial ampliada. El producto ya puede leerse con código, precio, datos fiscales y política de stock visibles."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant={getStockTone(selectedItem).badge}>
                  {getStockTone(selectedItem).label}
                </Badge>
                <Badge variant="outline">{getCommercialProfile(selectedItem)}</Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border bg-white/80 p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Código
                </p>
                <p className="mt-1 font-semibold wrap-break-word">{selectedItem.codigo}</p>
              </div>
              <div className="rounded-xl border bg-white/80 p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Venta
                </p>
                <p className="mt-1 font-semibold">{formatMoney(selectedItem.precioVenta)}</p>
              </div>
              <div className="rounded-xl border bg-white/80 p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Margen
                </p>
                <p className="mt-1 font-semibold">
                  {getMargin(selectedItem) !== null
                    ? formatPercent(getMargin(selectedItem) ?? 0)
                    : "-"}
                </p>
              </div>
              <div className="rounded-xl border bg-white/80 p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Stock
                </p>
                <p className="mt-1 font-semibold">
                  {selectedItem.manejaStock ? formatNumber(getStock(selectedItem)) : "N/A"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Atención prioritaria</CardTitle>
              <CardDescription>Productos que hoy conviene revisar primero.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {alerts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No hay alertas relevantes dentro del conjunto filtrado.
                </p>
              ) : (
                alerts.map((alert) => (
                  <div key={alert.id} className="rounded-xl border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium wrap-break-word">{alert.title}</p>
                        <p className="text-xs text-muted-foreground">{alert.subtitle}</p>
                      </div>
                      <Badge variant="outline" className="max-w-40 wrap-break-word text-right">
                        {alert.note}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
          <CardDescription>
            Buscá por código o descripción y recortá la vista según perfil, categoría o cobertura.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px_220px_220px_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por código o descripción..."
                value={searchTerm}
                onChange={(event) => handleSearchChange(event.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas las categorías</SelectItem>
                <SelectItem value="sin-categoria">Sin categoría</SelectItem>
                {categorias.map((categoria) => (
                  <SelectItem key={categoria.id} value={String(categoria.id)}>
                    {categoria.descripcion}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Perfil" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los perfiles</SelectItem>
                <SelectItem value="producto">Producto</SelectItem>
                <SelectItem value="servicio">Servicio</SelectItem>
                <SelectItem value="mixto">Producto + servicio</SelectItem>
                <SelectItem value="financiero">Financiero</SelectItem>
              </SelectContent>
            </Select>
            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Stock" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Toda la cobertura</SelectItem>
                <SelectItem value="critico">Stock crítico</SelectItem>
                <SelectItem value="sin-stock">Sin stock</SelectItem>
                <SelectItem value="rentabilidad">Margen bajo</SelectItem>
                <SelectItem value="sin-control">Sin control de stock</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="bg-transparent" onClick={() => void refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" /> Recargar
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Catálogo visible ({filteredItems.length})</CardTitle>
            <CardDescription>
              La tabla prioriza lectura rápida, precios y cobertura operativa sin romper la
              composición visual.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-14 text-muted-foreground">
                <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> Cargando productos...
              </div>
            ) : error ? (
              <div className="space-y-3 px-6 py-10 text-center">
                <p className="text-sm text-red-600 wrap-break-word">
                  {error.includes("fetch") || error.includes("network") || error.includes("Failed")
                    ? `No se pudo conectar con el backend. Verificá que la API esté disponible en ${API_BASE_URL}.`
                    : error}
                </p>
                <Button variant="outline" className="bg-transparent" onClick={() => void refetch()}>
                  <RefreshCw className="mr-2 h-4 w-4" /> Reintentar
                </Button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table className="min-w-245">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Producto</TableHead>
                        <TableHead>Categoría</TableHead>
                        <TableHead>Perfil</TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                        <TableHead className="text-right">Venta</TableHead>
                        <TableHead className="text-right">Margen</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={8}
                            className="py-12 text-center text-muted-foreground"
                          >
                            No se encontraron productos para los filtros actuales.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredItems.map((item) => {
                          const margin = getMargin(item)
                          const stockTone = getStockTone(item)

                          return (
                            <TableRow
                              key={item.id}
                              className="cursor-pointer hover:bg-muted/40"
                              onClick={() => {
                                setSelectedItemId(item.id)
                              }}
                            >
                              <TableCell className="font-mono text-xs font-semibold">
                                {item.codigo}
                              </TableCell>
                              <TableCell>
                                <div className="min-w-0">
                                  <p className="font-medium wrap-break-word">{item.descripcion}</p>
                                  <p className="text-xs text-muted-foreground wrap-break-word">
                                    {item.descripcionAdicional ||
                                      item.codigoBarras ||
                                      "Sin detalle comercial adicional"}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>{item.categoriaDescripcion || "Sin categoría"}</TableCell>
                              <TableCell>{getCommercialProfile(item)}</TableCell>
                              <TableCell className="text-right">
                                <Badge
                                  variant={stockTone.badge}
                                  className="max-w-full wrap-break-word"
                                >
                                  {item.manejaStock
                                    ? `${formatNumber(getStock(item))} u.`
                                    : "No aplica"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatMoney(item.precioVenta)}
                              </TableCell>
                              <TableCell className="text-right">
                                {margin !== null ? formatPercent(margin) : "-"}
                              </TableCell>
                              <TableCell
                                className="text-right"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <div className="flex justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openDetail(item)}
                                    title="Ver detalle"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openEdit(item)}
                                    title="Editar"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openDelete(item)}
                                    title="Eliminar"
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>

                {totalPages > 1 ? (
                  <div className="flex items-center justify-between border-t px-6 py-4">
                    <p className="text-sm text-muted-foreground">
                      Página {page} de {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage(page - 1)}
                      >
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages}
                        onClick={() => setPage(page + 1)}
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cobertura por categoría</CardTitle>
              <CardDescription>Resumen comercial del conjunto filtrado.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {categorySummary.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No hay categorías visibles para resumir.
                </p>
              ) : (
                categorySummary.map((category) => (
                  <div key={category.label} className="rounded-xl border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium wrap-break-word">{category.label}</p>
                      <Badge variant="outline">{category.count}</Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Valor al costo {formatMoney(category.value)}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Alcance actual</CardTitle>
              <CardDescription>
                Se muestran sólo campos y formularios sostenidos por el backend actual.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-3 rounded-xl border p-3">
                <Tag className="mt-0.5 h-4 w-4 text-sky-600" />
                <p className="wrap-break-word">
                  Identificación comercial clara con código, nombre, categoría, unidad y
                  descripciones.
                </p>
              </div>
              <div className="flex items-start gap-3 rounded-xl border p-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-600" />
                <p className="wrap-break-word">
                  Datos fiscales y comerciales reales: IVA, moneda, código de barras y código
                  fiscal.
                </p>
              </div>
              <div className="flex items-start gap-3 rounded-xl border p-3">
                <CircleDollarSign className="mt-0.5 h-4 w-4 text-amber-600" />
                <p className="wrap-break-word">
                  Formación de precio con lectura inmediata de margen, markup y contribución.
                </p>
              </div>
              <div className="flex items-start gap-3 rounded-xl border p-3">
                <Boxes className="mt-0.5 h-4 w-4 text-rose-600" />
                <p className="wrap-break-word">
                  Política de stock con mínimos, máximos y alertas visuales de reposición.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog
        open={isDetailOpen}
        onOpenChange={(open) => {
          setIsDetailOpen(open)
          if (!open) setDetailItemId(null)
        }}
      >
        <SalesDialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Detalle del producto</DialogTitle>
            <DialogDescription>
              {detailItem
                ? `${detailItem.codigo} · ${detailItem.descripcion}`
                : "Cargando detalle..."}
            </DialogDescription>
          </DialogHeader>
          {detailItem ? (
            <ProductDetail
              item={detailItem}
              monedas={monedas}
              onClose={() => {
                setIsDetailOpen(false)
                setDetailItemId(null)
              }}
              onEdit={() => {
                setIsDetailOpen(false)
                setDetailItemId(null)
                openEdit(detailItem)
              }}
            />
          ) : (
            <div className="py-10 text-center text-muted-foreground">
              No fue posible cargar el detalle del producto.
            </div>
          )}
        </SalesDialogContent>
      </Dialog>

      <Dialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open)
          if (!open) setEditingItemId(null)
        }}
      >
        <SalesDialogContent size="lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Editar producto" : "Nuevo producto"}</DialogTitle>
            <DialogDescription>
              {editingItem
                ? "Actualizá la ficha comercial y operativa del producto seleccionado."
                : "Completá los campos necesarios para incorporar un producto al maestro de ventas."}
            </DialogDescription>
          </DialogHeader>
          <ProductForm
            key={`${editingItem?.id ?? "new-item"}-${isFormOpen ? "open" : "closed"}`}
            item={editingItem}
            onClose={() => {
              setIsFormOpen(false)
              setEditingItemId(null)
            }}
            onSaved={handleSaved}
            createItem={createItem}
            updateItem={updateItem}
          />
        </SalesDialogContent>
      </Dialog>

      <Dialog
        open={isDeleteOpen}
        onOpenChange={(open) => {
          setIsDeleteOpen(open)
          if (!open) setDeleteItemId(null)
        }}
      >
        <SalesDialogContent size="sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Confirmar desactivación
            </DialogTitle>
            <DialogDescription>
              El producto se desactivará desde el maestro actual y dejará de operar como activo.
            </DialogDescription>
          </DialogHeader>
          {deletingItem ? (
            <Card>
              <CardContent className="space-y-2 p-4 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Código</span>
                  <span className="font-mono font-medium">{deletingItem.codigo}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Producto</span>
                  <span className="text-right font-medium wrap-break-word">
                    {deletingItem.descripcion}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Categoría</span>
                  <span className="text-right wrap-break-word">
                    {deletingItem.categoriaDescripcion || "Sin categoría"}
                  </span>
                </div>
              </CardContent>
            </Card>
          ) : null}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              className="bg-transparent"
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => void confirmDelete()} disabled={deleting}>
              <Trash2 className="mr-2 h-4 w-4" /> {deleting ? "Desactivando..." : "Desactivar"}
            </Button>
          </DialogFooter>
        </SalesDialogContent>
      </Dialog>
    </div>
  )
}
